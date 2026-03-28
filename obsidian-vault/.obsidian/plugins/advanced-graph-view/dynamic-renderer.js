"use strict";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readCssColor(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function buildTheme(container) {
  const styles = getComputedStyle(container);
  const isDark = document.body.classList.contains("theme-dark");
  return {
    nodeText: readCssColor(styles, "--text-normal", isDark ? "#e5e7eb" : "#222331"),
    edgeText: readCssColor(styles, "--text-muted", isDark ? "#a7b2c2" : "#5b6474"),
    labelBackground: isDark ? "rgba(15, 23, 35, 0.86)" : "rgba(255, 251, 243, 0.88)",
    activeAccent: readCssColor(styles, "--interactive-accent", isDark ? "#7aa2f7" : "#2a5ea8"),
    activeAccentSoft: isDark ? "rgba(122, 162, 247, 0.14)" : "rgba(42, 94, 168, 0.12)",
    fontFamily: styles.getPropertyValue("--font-interface").trim() || styles.fontFamily || "sans-serif",
    emojiFont: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif'
  };
}

function normalizeForceSettings(options) {
  return {
    centerForce: Number.isFinite(Number(options?.centerForce)) ? Number(options.centerForce) : 0.62,
    repelForce: Number.isFinite(Number(options?.repelForce)) ? Number(options.repelForce) : 12,
    linkStrength: Number.isFinite(Number(options?.linkStrength)) ? Number(options.linkStrength) : 1,
    linkDistance: Number.isFinite(Number(options?.linkDistance)) ? Number(options.linkDistance) : 220,
    activeFps: Number.isFinite(Number(options?.activeFps)) ? clamp(Number(options.activeFps), 16, 60) : 30,
    idleFps: Number.isFinite(Number(options?.idleFps)) ? clamp(Number(options.idleFps), 2, 24) : 8,
    idleAlphaFloor: Number.isFinite(Number(options?.idleAlphaFloor)) ? clamp(Number(options.idleAlphaFloor), 0.002, 0.08) : 0.014
  };
}

function measureDistanceToSegment(pointX, pointY, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq < 0.0001) {
    return Math.hypot(pointX - x1, pointY - y1);
  }
  const t = clamp(((pointX - x1) * dx + (pointY - y1) * dy) / lengthSq, 0, 1);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(pointX - projX, pointY - projY);
}

function getPolygonPoints(sides, radius) {
  const points = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const actualRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + actualRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, actualRadius);
  ctx.arcTo(x + width, y + height, x, y + height, actualRadius);
  ctx.arcTo(x, y + height, x, y, actualRadius);
  ctx.arcTo(x, y, x + width, y, actualRadius);
  ctx.closePath();
}

function drawPolygon(ctx, centerX, centerY, radius, points) {
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = centerX + point.x;
    const y = centerY + point.y;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
}

class DynamicForceRenderer {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.surface = document.createElement("div");
    this.surface.className = "agv-dynamic-surface";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "agv-dynamic-canvas";
    this.canvas.style.touchAction = "none";
    this.surface.appendChild(this.canvas);
    this.statusEl = document.createElement("div");
    this.statusEl.className = "agv-dynamic-status";
    this.surface.appendChild(this.statusEl);
    this.container.appendChild(this.surface);
    this.ctx = this.canvas.getContext("2d");
    this.isAvailable = Boolean(this.ctx);
    this.theme = buildTheme(this.container);
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.pixelRatio = 1;
    this.hasViewport = false;
    this.lastViewportWidth = 0;
    this.lastViewportHeight = 0;
    this.hasUserViewportIntent = false;
    this.autoViewportRecoveryAttempts = 0;
    this.offscreenFrameCount = 0;
    this.deferredRecoveryTimers = [];
    this.forceSettings = normalizeForceSettings();
    this.nodes = [];
    this.edges = [];
    this.nodeLookup = new Map();
    this.edgeLookup = new Map();
    this.imageCache = new Map();
    this.selectedNodeId = null;
    this.selectedEdgeId = null;
    this.hoveredNodeId = null;
    this.dragNodeId = null;
    this.draggingCanvas = false;
    this.pointerMoved = false;
    this.pointerDown = null;
    this.animationFrame = 0;
    this.activeFrameBudget = 0;
    this.alpha = 0;
    this.lowEnergyFrames = 0;
    this.lastFrameAt = 0;
    this.lastAmbientNudgeAt = 0;
    this.bindEvents();
    this.onWindowResize = () => this.resize();
    window.addEventListener("resize", this.onWindowResize, { passive: true });
    this.resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => this.resize()) : null;
    this.resizeObserver?.observe(this.container);
    if (!this.isAvailable) {
      this.setStatus("Dynamic renderer is unavailable on this device.\nSwitch Render to classic to keep using the graph.", "error");
    }
    this.resize();
    this.queueBootstrapResize(18);
    this.queueBootstrapResize(90);
    this.queueBootstrapResize(260);
    this.queueBootstrapResize(800);
  }

  setStatus(message, tone = "info") {
    if (!(this.statusEl instanceof HTMLElement)) {
      return;
    }
    const text = String(message ?? "").trim();
    this.statusEl.textContent = text;
    this.statusEl.classList.toggle("is-visible", Boolean(text));
    this.statusEl.classList.toggle("is-error", tone === "error");
    this.statusEl.classList.toggle("is-warning", tone === "warning");
  }

  clearStatus() {
    this.setStatus("");
  }

  bindEvents() {
    this.onPointerDown = (event) => this.handlePointerDown(event);
    this.onPointerMove = (event) => this.handlePointerMove(event);
    this.onPointerUp = (event) => this.handlePointerUp(event);
    this.onPointerLeave = () => {
      if (!this.pointerDown) {
        this.hoveredNodeId = null;
        this.draw();
      }
    };
    this.onWheel = (event) => this.handleWheel(event);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("pointerleave", this.onPointerLeave);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  queueBootstrapResize(delay) {
    const timer = window.setTimeout(() => {
      this.deferredRecoveryTimers = this.deferredRecoveryTimers.filter((handle) => handle !== timer);
      this.resize();
      if (this.nodes.length > 0 && (this.lastViewportWidth <= 48 || this.lastViewportHeight <= 48)) {
        this.queueBootstrapResize(Math.min(420, delay + 120));
      }
    }, delay);
    this.deferredRecoveryTimers.push(timer);
  }

  resize() {
    const containerRect = this.container.getBoundingClientRect();
    const surfaceRect = this.surface.getBoundingClientRect();
    const width = Math.max(1, Math.floor(Math.max(containerRect.width, surfaceRect.width)));
    const height = Math.max(1, Math.floor(Math.max(containerRect.height, surfaceRect.height)));
    const previousWidth = this.lastViewportWidth;
    const previousHeight = this.lastViewportHeight;
    const hadTinyViewport = previousWidth <= 24 || previousHeight <= 24;
    const hasUsableViewport = width > 48 && height > 48;
    this.lastViewportWidth = width;
    this.lastViewportHeight = height;
    this.pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this.canvas.width = Math.max(1, Math.round(width * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.round(height * this.pixelRatio));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    if (!this.isAvailable) {
      this.setStatus("Dynamic renderer is unavailable on this device.\nSwitch Render to classic to keep using the graph.", "error");
      return;
    }
    if (!hasUsableViewport) {
      this.setStatus("Preparing graph area...", "warning");
      return;
    }
    if (this.nodes.length > 0 && ((!this.hasViewport && hasUsableViewport) || (hadTinyViewport && hasUsableViewport))) {
      this.fit();
      this.scheduleViewportRecoverySequence();
      return;
    }
    this.draw();
  }

  render(model, viewOptions) {
    if (!this.isAvailable) {
      this.setStatus("Dynamic renderer is unavailable on this device.\nSwitch Render to classic to keep using the graph.", "error");
      return;
    }
    this.model = model;
    this.viewOptions = viewOptions;
    this.theme = buildTheme(this.container);
    this.forceSettings = normalizeForceSettings(viewOptions);
    if (this.lastViewportWidth <= 48 || this.lastViewportHeight <= 48) {
      this.resize();
    }
    if (!viewOptions.preservePositions) {
      this.hasUserViewportIntent = false;
      this.autoViewportRecoveryAttempts = 0;
      this.offscreenFrameCount = 0;
    }
    const previousNodeLookup = this.nodeLookup;
    const previousSelectedNodeId = this.selectedNodeId;
    const previousSelectedEdgeId = this.selectedEdgeId;
    const visibleNodes = model.nodes.filter((node) => model.visibleNodeIds.has(node.id));
    const visibleEdges = model.edges.filter((edge) => model.visibleEdgeIds.has(edge.id) && model.visibleNodeIds.has(edge.source) && model.visibleNodeIds.has(edge.target));
    if (visibleNodes.length === 0) {
      this.nodes = [];
      this.edges = [];
      this.nodeLookup = new Map();
      this.edgeLookup = new Map();
      this.selectedNodeId = null;
      this.selectedEdgeId = null;
      this.setStatus("No visible nodes.\nClear filters or show hidden top-level folders.", "warning");
      this.draw();
      return;
    }
    this.clearStatus();
    const seedPositions = this.buildSeedPositions(visibleNodes, visibleEdges, viewOptions.layout);
    this.nodeLookup = new Map();
    this.nodes = visibleNodes.map((node, index) => {
      const previous = previousNodeLookup.get(node.id);
      const seeded = seedPositions.get(node.id) ?? { x: (index % 8) * 120, y: Math.floor(index / 8) * 120 };
      const simulationNode = {
        id: node.id,
        payload: node,
        x: viewOptions.preservePositions && previous ? previous.x : seeded.x,
        y: viewOptions.preservePositions && previous ? previous.y : seeded.y,
        vx: previous?.vx ?? 0,
        vy: previous?.vy ?? 0,
        radius: Math.max(16, Math.min(56, (node.style.size ?? 38) * 0.6)),
        mass: 1 + ((node.style.size ?? 38) / 50),
        degree: 0,
        screenX: 0,
        screenY: 0,
        screenRadius: 0
      };
      this.nodeLookup.set(node.id, simulationNode);
      return simulationNode;
    });
    this.edges = visibleEdges.map((edge) => {
      const sourceNode = this.nodeLookup.get(edge.source);
      const targetNode = this.nodeLookup.get(edge.target);
      if (!sourceNode || !targetNode) {
        return null;
      }
      sourceNode.degree += 1;
      targetNode.degree += 1;
      return { id: edge.id, payload: edge, sourceNode, targetNode };
    }).filter(Boolean);
    this.edgeLookup = new Map(this.edges.map((edge) => [edge.id, edge]));
    const shouldResetViewport = !this.hasViewport || !viewOptions.preservePositions;
    if (shouldResetViewport) {
      this.hasViewport = true;
    }
    if (!viewOptions.preservePositions) {
      this.restartLayout(viewOptions.layout);
      this.fit();
    } else if (viewOptions.runLayout) {
      this.restartPhysics(1.15, { frameBudget: 124, nudgeScale: 0.52 });
    } else {
      this.restartPhysics(0.7, { frameBudget: 76, nudgeScale: 0.22 });
    }
    if (shouldResetViewport && viewOptions.preservePositions) {
      this.fit();
    }
    this.scheduleViewportRecoverySequence();
    if (previousSelectedNodeId && this.nodeLookup.has(previousSelectedNodeId)) {
      this.selectedNodeId = previousSelectedNodeId;
      this.selectedEdgeId = null;
      this.emitSelection();
    } else if (previousSelectedEdgeId && this.edgeLookup.has(previousSelectedEdgeId)) {
      this.selectedEdgeId = previousSelectedEdgeId;
      this.selectedNodeId = null;
      this.emitSelection();
    } else {
      this.selectedNodeId = null;
      this.selectedEdgeId = null;
      this.callbacks.onSelectionChange?.(null);
    }
    this.draw();
  }

  clearViewportRecoveryTimers() {
    for (const timer of this.deferredRecoveryTimers) {
      window.clearTimeout(timer);
    }
    this.deferredRecoveryTimers = [];
  }

  queueViewportRecovery(delay, options = {}) {
    const timer = window.setTimeout(() => {
      this.deferredRecoveryTimers = this.deferredRecoveryTimers.filter((handle) => handle !== timer);
      if (this.nodes.length === 0 || this.hasUserViewportIntent) {
        return;
      }
      const width = this.canvas.width / Math.max(this.pixelRatio, 1);
      const height = this.canvas.height / Math.max(this.pixelRatio, 1);
      if (width <= 48 || height <= 48) {
        return;
      }
      this.autoViewportRecoveryAttempts += 1;
      this.fit();
      this.restartPhysics(options.alpha ?? 0.92, {
        frameBudget: options.frameBudget ?? 116,
        nudgeScale: options.nudgeScale ?? 0.3
      });
    }, delay);
    this.deferredRecoveryTimers.push(timer);
  }

  scheduleViewportRecoverySequence() {
    this.clearViewportRecoveryTimers();
    if (this.nodes.length === 0 || this.hasUserViewportIntent) {
      return;
    }
    [
      { delay: 0, alpha: 0.94, frameBudget: 124, nudgeScale: 0.34 },
      { delay: 120, alpha: 0.88, frameBudget: 110, nudgeScale: 0.26 },
      { delay: 360, alpha: 0.82, frameBudget: 96, nudgeScale: 0.22 },
      { delay: 820, alpha: 0.76, frameBudget: 82, nudgeScale: 0.18 }
    ].forEach((entry) => this.queueViewportRecovery(entry.delay, entry));
  }

  buildSeedPositions(nodes, edges, layout) {
    const positions = new Map();
    if (nodes.length === 0) {
      return positions;
    }
    const degrees = new Map(nodes.map((node) => [node.id, 0]));
    edges.forEach((edge) => {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
    });
    const ordered = [...nodes].sort((left, right) => (degrees.get(right.id) ?? 0) - (degrees.get(left.id) ?? 0));
    switch (layout) {
      case "circle": {
        const radius = Math.max(160, nodes.length * 14);
        ordered.forEach((node, index) => {
          const angle = index / ordered.length * Math.PI * 2;
          positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        });
        break;
      }
      case "concentric": {
        const ringSize = 10;
        ordered.forEach((node, index) => {
          const ring = Math.floor(index / ringSize);
          const indexInRing = index % ringSize;
          const itemsInRing = Math.min(ringSize, ordered.length - ring * ringSize);
          const radius = 120 + ring * 110;
          const angle = itemsInRing <= 1 ? 0 : indexInRing / itemsInRing * Math.PI * 2;
          positions.set(node.id, { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
        });
        break;
      }
      case "grid": {
        const columns = Math.max(2, Math.ceil(Math.sqrt(nodes.length)));
        ordered.forEach((node, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          positions.set(node.id, {
            x: (column - (columns - 1) / 2) * 170,
            y: (row - (Math.ceil(nodes.length / columns) - 1) / 2) * 145
          });
        });
        break;
      }
      case "breadthfirst": {
        const root = ordered[0]?.id;
        const adjacency = new Map(nodes.map((node) => [node.id, []]));
        edges.forEach((edge) => {
          adjacency.get(edge.source)?.push(edge.target);
          adjacency.get(edge.target)?.push(edge.source);
        });
        const queue = root ? [root] : [];
        const depths = new Map(root ? [[root, 0]] : []);
        while (queue.length > 0) {
          const current = queue.shift();
          const depth = depths.get(current) ?? 0;
          for (const neighbor of adjacency.get(current) ?? []) {
            if (!depths.has(neighbor)) {
              depths.set(neighbor, depth + 1);
              queue.push(neighbor);
            }
          }
        }
        const lanes = new Map();
        ordered.forEach((node) => {
          if (!depths.has(node.id)) {
            depths.set(node.id, lanes.size + 1);
          }
          const depth = depths.get(node.id) ?? 0;
          const bucket = lanes.get(depth) ?? [];
          bucket.push(node);
          lanes.set(depth, bucket);
        });
        for (const [depth, bucket] of lanes.entries()) {
          bucket.forEach((node, index) => {
            positions.set(node.id, { x: (index - (bucket.length - 1) / 2) * 170, y: depth * 150 });
          });
        }
        break;
      }
      case "cose":
      default: {
        ordered.forEach((node, index) => {
          const angle = index / Math.max(ordered.length, 1) * Math.PI * 2;
          const radius = 80 + Math.sqrt(index + 1) * 52;
          positions.set(node.id, {
            x: Math.cos(angle) * radius + (Math.random() - 0.5) * 36,
            y: Math.sin(angle) * radius + (Math.random() - 0.5) * 36
          });
        });
        break;
      }
    }
    return positions;
  }

  restartLayout(layout) {
    const seeds = this.buildSeedPositions(this.nodes.map((node) => node.payload), this.edges.map((edge) => edge.payload), layout);
    this.nodes.forEach((node) => {
      const seeded = seeds.get(node.id);
      if (!seeded) {
        return;
      }
      node.x = seeded.x;
      node.y = seeded.y;
      node.vx = 0;
      node.vy = 0;
    });
    this.restartPhysics(1.15, { frameBudget: 140, nudgeScale: 0.64 });
  }

  nudgeNodes(scale = 0.24) {
    if (scale <= 0) {
      return;
    }
    for (const node of this.nodes) {
      if (this.dragNodeId === node.id) {
        continue;
      }
      const degreeBoost = 1 + Math.min(node.degree ?? 0, 6) * 0.04;
      node.vx += (Math.random() - 0.5) * scale * degreeBoost;
      node.vy += (Math.random() - 0.5) * scale * degreeBoost;
    }
  }

  restartPhysics(alpha = 1, options = {}) {
    const idleAlphaFloor = this.forceSettings?.idleAlphaFloor ?? 0.014;
    this.alpha = Math.max(this.alpha, alpha, idleAlphaFloor * 4.5);
    this.lowEnergyFrames = 0;
    const frameBudget = Number.isFinite(options.frameBudget) ? options.frameBudget : Math.round(clamp(alpha, 0.45, 1.4) * (this.forceSettings?.activeFps ?? 30) * 3.1);
    this.activeFrameBudget = Math.max(this.activeFrameBudget, frameBudget);
    const nudgeScale = Number.isFinite(options.nudgeScale) ? options.nudgeScale : Math.max(0.18, Math.min(alpha * 0.28, 0.52));
    if (options.nudge !== false) {
      this.nudgeNodes(nudgeScale);
    }
    if (!this.animationFrame) {
      this.tick();
    }
  }

  tick(frameTime = 0) {
    this.animationFrame = window.requestAnimationFrame((now) => this.tick(now));
    if (this.nodes.length === 0) {
      this.lastFrameAt = frameTime || 0;
      this.draw();
      return;
    }
    const activeFps = Math.max(4, this.forceSettings?.activeFps ?? 30);
    const idleFps = Math.max(2, Math.min(activeFps, this.forceSettings?.idleFps ?? 8));
    const idleAlphaFloor = this.forceSettings?.idleAlphaFloor ?? 0.014;
    const shouldUseActiveCadence = Boolean(this.dragNodeId || this.draggingCanvas || this.activeFrameBudget > 0 || this.alpha > idleAlphaFloor * 3);
    const targetFps = shouldUseActiveCadence ? activeFps : idleFps;
    const minFrameDelta = 1e3 / Math.max(targetFps, 1);
    if (this.lastFrameAt && frameTime && frameTime - this.lastFrameAt < minFrameDelta) {
      return;
    }
    const deltaMs = this.lastFrameAt && frameTime ? Math.max(8, Math.min(80, frameTime - this.lastFrameAt)) : 16;
    this.lastFrameAt = frameTime || performance.now();
    this.stepSimulation(deltaMs);
    this.draw();
  }

  stepSimulation(deltaMs = 16) {
    if (this.nodes.length === 0) {
      return;
    }
    const timeScale = clamp(deltaMs / 16, 0.55, 1.9);
    const idleAlphaFloor = this.forceSettings.idleAlphaFloor;
    const centerStrength = 0.0017 * this.forceSettings.centerForce;
    const repelStrength = 1800 * this.forceSettings.repelForce;
    const linkStrength = 0.0035 * this.forceSettings.linkStrength;
    const linkDistance = this.forceSettings.linkDistance;
    const targetAlpha = this.dragNodeId ? Math.max(idleAlphaFloor * 10, 0.22) : this.activeFrameBudget > 0 ? Math.max(idleAlphaFloor * 5.5, 0.08) : idleAlphaFloor;
    this.alpha += (targetAlpha - this.alpha) * Math.min(0.36, 0.12 * timeScale);
    const alpha = Math.max(this.alpha, idleAlphaFloor);
    const gridSize = Math.max(42, Math.min(220, linkDistance * 0.72));
    const spatialGrid = new Map();
    this.nodes.forEach((node, index) => {
      node.simIndex = index;
      node.gridX = Math.floor(node.x / gridSize);
      node.gridY = Math.floor(node.y / gridSize);
      const key = `${node.gridX}:${node.gridY}`;
      const bucket = spatialGrid.get(key);
      if (bucket) {
        bucket.push(node);
      } else {
        spatialGrid.set(key, [node]);
      }
    });
    for (const node of this.nodes) {
      if (this.dragNodeId === node.id) {
        continue;
      }
      node.vx += -node.x * centerStrength * alpha * timeScale;
      node.vy += -node.y * centerStrength * alpha * timeScale;
    }
    for (const left of this.nodes) {
      for (let gridX = left.gridX - 1; gridX <= left.gridX + 1; gridX += 1) {
        for (let gridY = left.gridY - 1; gridY <= left.gridY + 1; gridY += 1) {
          const bucket = spatialGrid.get(`${gridX}:${gridY}`);
          if (!bucket) {
            continue;
          }
          for (const right of bucket) {
            if (right.simIndex <= left.simIndex) {
              continue;
            }
            const dx = right.x - left.x;
            const dy = right.y - left.y;
            const distanceSq = Math.max(dx * dx + dy * dy, 18);
            const distance = Math.sqrt(distanceSq);
            const repulsion = repelStrength * alpha * timeScale / distanceSq;
            const offsetX = dx / distance * repulsion;
            const offsetY = dy / distance * repulsion;
            if (this.dragNodeId !== left.id) {
              left.vx -= offsetX / left.mass;
              left.vy -= offsetY / left.mass;
            }
            if (this.dragNodeId !== right.id) {
              right.vx += offsetX / right.mass;
              right.vy += offsetY / right.mass;
            }
            const minDistance = left.radius + right.radius + 14;
            if (distance < minDistance) {
              const collision = (minDistance - distance) * 0.025 * timeScale;
              const collisionX = dx / distance * collision;
              const collisionY = dy / distance * collision;
              if (this.dragNodeId !== left.id) {
                left.vx -= collisionX;
                left.vy -= collisionY;
              }
              if (this.dragNodeId !== right.id) {
                right.vx += collisionX;
                right.vy += collisionY;
              }
            }
          }
        }
      }
    }
    for (const edge of this.edges) {
      const dx = edge.targetNode.x - edge.sourceNode.x;
      const dy = edge.targetNode.y - edge.sourceNode.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const stretch = (distance - linkDistance) * linkStrength * alpha * timeScale;
      const offsetX = dx / distance * stretch;
      const offsetY = dy / distance * stretch;
      if (this.dragNodeId !== edge.sourceNode.id) {
        edge.sourceNode.vx += offsetX;
        edge.sourceNode.vy += offsetY;
      }
      if (this.dragNodeId !== edge.targetNode.id) {
        edge.targetNode.vx -= offsetX;
        edge.targetNode.vy -= offsetY;
      }
    }
    let totalVelocity = 0;
    const damping = this.dragNodeId ? 0.88 : this.activeFrameBudget > 0 ? 0.905 : 0.94;
    const maxVelocity = this.activeFrameBudget > 0 ? 12 : 6.5;
    for (const node of this.nodes) {
      if (this.dragNodeId === node.id) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= Math.pow(damping, timeScale);
      node.vy *= Math.pow(damping, timeScale);
      node.vx = clamp(node.vx, -maxVelocity, maxVelocity);
      node.vy = clamp(node.vy, -maxVelocity, maxVelocity);
      node.x += node.vx * timeScale;
      node.y += node.vy * timeScale;
      totalVelocity += Math.abs(node.vx) + Math.abs(node.vy);
    }
    if (this.activeFrameBudget > 0) {
      this.activeFrameBudget -= 1;
    }
    const averageVelocity = totalVelocity / Math.max(this.nodes.length, 1);
    if (alpha <= idleAlphaFloor * 1.3 && averageVelocity < 0.03) {
      this.lowEnergyFrames += 1;
    } else {
      this.lowEnergyFrames = 0;
    }
    if (!this.dragNodeId && this.activeFrameBudget === 0 && this.lowEnergyFrames > 42) {
      const now = performance.now();
      if (now - this.lastAmbientNudgeAt > 1600) {
        this.lastAmbientNudgeAt = now;
        this.nudgeNodes(Math.min(0.035, idleAlphaFloor * 2.4));
      }
    }
  }

  draw() {
    if (!this.ctx) {
      return;
    }
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    if (width <= 48 || height <= 48) {
      this.setStatus("Preparing graph area...", "warning");
      return;
    }
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
    if (this.nodes.length === 0) {
      if (!this.statusEl.textContent) {
        this.setStatus("No visible nodes.\nClear filters or show hidden top-level folders.", "warning");
      }
      this.ctx.save();
      this.ctx.fillStyle = this.theme.edgeText;
      this.ctx.globalAlpha = 0.9;
      this.ctx.font = `600 15px ${this.theme.fontFamily}`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("No visible graph nodes", width / 2, height / 2 - 12);
      this.ctx.globalAlpha = 0.72;
      this.ctx.font = `500 12px ${this.theme.fontFamily}`;
      this.ctx.fillText("Check graph filters or hidden folder groups.", width / 2, height / 2 + 12);
      this.ctx.restore();
      return;
    }
    let onScreenNodes = 0;
    for (const node of this.nodes) {
      const projected = this.projectNode(node);
      if (this.isProjectedOnScreen(projected, width, height)) {
        onScreenNodes += 1;
      }
    }
    if (onScreenNodes === 0 && width > 80 && height > 80) {
      this.offscreenFrameCount += 1;
      if (!this.hasUserViewportIntent && this.offscreenFrameCount === 1 && this.autoViewportRecoveryAttempts < 6) {
        this.scheduleViewportRecoverySequence();
      }
      this.setStatus("Centering graph...\nRecovering the mobile viewport.", "warning");
      this.ctx.save();
      this.ctx.fillStyle = this.theme.edgeText;
      this.ctx.globalAlpha = 0.92;
      this.ctx.font = `600 15px ${this.theme.fontFamily}`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("Centering graph...", width / 2, height / 2 - 12);
      this.ctx.globalAlpha = 0.72;
      this.ctx.font = `500 12px ${this.theme.fontFamily}`;
      this.ctx.fillText("Recovering the mobile viewport.", width / 2, height / 2 + 12);
      this.ctx.restore();
      return;
    }
    this.offscreenFrameCount = 0;
    this.clearStatus();
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    const labelThreshold = clamp((this.zoom - 0.55) / 0.45, 0, 1);
    this.edges.forEach((edge) => this.drawEdge(edge, labelThreshold));
    this.nodes.forEach((node) => this.drawNode(node));
    this.drawLabels(labelThreshold);
  }

  isProjectedOnScreen(projected, width, height, margin = 64) {
    return projected.x >= -margin && projected.x <= width + margin && projected.y >= -margin && projected.y <= height + margin;
  }

  drawEdge(edge, labelThreshold) {
    const ctx = this.ctx;
    const source = this.projectNode(edge.sourceNode);
    const target = this.projectNode(edge.targetNode);
    const style = edge.payload.style;
    const selected = this.selectedEdgeId === edge.id;
    ctx.save();
    ctx.strokeStyle = selected ? this.theme.activeAccent : style.color;
    ctx.globalAlpha = clamp(style.opacity ?? 0.72, 0.08, 1);
    ctx.lineWidth = clamp((style.width ?? 1.6) + (selected ? 0.9 : 0), 1, 8);
    if (style.dashStyle === "dashed") {
      ctx.setLineDash([10, 8]);
    } else if (style.dashStyle === "dotted") {
      ctx.setLineDash([2, 7]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    this.drawArrowHead(source, target, style.arrowShape, selected ? this.theme.activeAccent : style.color, ctx.lineWidth, ctx.globalAlpha);
    ctx.restore();
    const edgeLabelCapReached = this.edges.length > 260 && !selected;
    if (this.viewOptions?.showEdgeLabels && !edgeLabelCapReached && (labelThreshold > 0.35 || selected) && edge.payload.style.displayLabel) {
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      ctx.save();
      ctx.globalAlpha = selected ? 1 : clamp(labelThreshold, 0.18, 0.9);
      ctx.fillStyle = selected ? this.theme.activeAccent : this.theme.edgeText;
      ctx.font = `600 11px ${this.theme.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = this.theme.labelBackground;
      ctx.shadowBlur = 10;
      ctx.fillText(edge.payload.style.displayLabel, midX, midY - 10);
      ctx.restore();
    }
  }

  drawArrowHead(source, target, shape, color, lineWidth, opacity) {
    if (!shape || shape === "none") {
      return;
    }
    const ctx = this.ctx;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const size = clamp(7 + lineWidth * 1.2, 6, 14);
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    if (shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.75, size * 0.5);
      ctx.lineTo(-size * 1.5, 0);
      ctx.lineTo(-size * 0.75, -size * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (shape === "circle") {
      ctx.beginPath();
      ctx.arc(-size, 0, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 1.45, size * 0.72);
      ctx.lineTo(-size * 1.45, -size * 0.72);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawNode(node) {
    const ctx = this.ctx;
    const projected = this.projectNode(node);
    const style = node.payload.style;
    const selected = this.selectedNodeId === node.id;
    const hovered = this.hoveredNodeId === node.id;
    if (selected || hovered) {
      ctx.save();
      ctx.fillStyle = this.theme.activeAccentSoft;
      ctx.globalAlpha = selected ? 0.9 : 0.55;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, projected.radius + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = clamp(style.opacity ?? 1, 0.1, 1);
    this.traceNodeShape(projected, style.shape);
    if (this.viewOptions?.emojiMode && style.emoji) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, projected.radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = style.fillColor;
      ctx.globalAlpha = selected ? 0.2 : hovered ? 0.15 : 0.11;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, projected.radius + 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = selected ? this.theme.activeAccent : style.borderColor;
      ctx.globalAlpha = selected ? 0.92 : 0.5;
      ctx.lineWidth = clamp((style.borderWidth ?? 1.25) + (selected ? 0.55 : 0), 1, 4);
      ctx.stroke();
      ctx.font = `${Math.round(projected.radius * 1.36)}px ${this.theme.emojiFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.18)";
      ctx.shadowBlur = selected ? 12 : 6;
      ctx.fillStyle = this.theme.nodeText;
      ctx.globalAlpha = 1;
      ctx.fillText(style.emoji, projected.x, projected.y + 1.5);
      ctx.restore();
      return;
    }
    const image = this.resolveNodeImage(style.backgroundImage);
    if (image && this.viewOptions?.imageMode && !this.viewOptions?.performanceMode) {
      ctx.save();
      this.traceNodeShape(projected, style.shape);
      ctx.clip();
      ctx.drawImage(image, projected.x - projected.radius, projected.y - projected.radius, projected.radius * 2, projected.radius * 2);
      ctx.restore();
      ctx.save();
      this.traceNodeShape(projected, style.shape);
      ctx.strokeStyle = selected ? this.theme.activeAccent : style.borderColor;
      ctx.lineWidth = clamp(style.borderWidth ?? 1.25, 1, 4);
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = style.fillColor;
    ctx.fill();
    ctx.strokeStyle = selected ? this.theme.activeAccent : style.borderColor;
    ctx.lineWidth = clamp((style.borderWidth ?? 1.25) + (selected ? 0.4 : 0), 1, 4);
    ctx.stroke();
    ctx.restore();
  }

  drawLabels(labelThreshold) {
    const ctx = this.ctx;
    const showNodeLabels = this.viewOptions?.showNodeLabels;
    const denseGraph = this.nodes.length > 220;
    let renderedLabels = 0;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 12px ${this.theme.fontFamily}`;
    ctx.shadowColor = this.theme.labelBackground;
    ctx.shadowBlur = 12;
    for (const node of this.nodes) {
      const projected = this.projectNode(node);
      const selected = this.selectedNodeId === node.id;
      const hovered = this.hoveredNodeId === node.id;
      const style = node.payload.style;
      if (denseGraph && !selected && !hovered && renderedLabels >= 48) {
        continue;
      }
      const opacity = selected || hovered ? 1 : showNodeLabels && style.labelVisibility !== false ? labelThreshold : 0;
      if (opacity <= 0.02) {
        continue;
      }
      ctx.globalAlpha = clamp(opacity, 0, 1);
      ctx.fillStyle = selected ? this.theme.activeAccent : this.theme.nodeText;
      ctx.fillText(node.payload.label, projected.x, projected.y + projected.radius + 14);
      renderedLabels += 1;
    }
    ctx.restore();
  }

  traceNodeShape(projected, shape) {
    const radius = projected.radius;
    switch (shape) {
      case "triangle":
        drawPolygon(this.ctx, projected.x, projected.y, radius, getPolygonPoints(3, radius));
        break;
      case "diamond":
        drawPolygon(this.ctx, projected.x, projected.y, radius, [
          { x: 0, y: -radius },
          { x: radius, y: 0 },
          { x: 0, y: radius },
          { x: -radius, y: 0 }
        ]);
        break;
      case "hexagon":
        drawPolygon(this.ctx, projected.x, projected.y, radius, getPolygonPoints(6, radius));
        break;
      case "round-rectangle":
      case "roundrectangle":
        drawRoundedRect(this.ctx, projected.x - radius * 1.18, projected.y - radius * 0.8, radius * 2.36, radius * 1.6, radius * 0.42);
        break;
      case "rectangle":
        this.ctx.beginPath();
        this.ctx.rect(projected.x - radius * 1.15, projected.y - radius * 0.82, radius * 2.3, radius * 1.64);
        break;
      default:
        this.ctx.beginPath();
        this.ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
        break;
    }
  }

  resolveNodeImage(source) {
    if (!source) {
      return null;
    }
    if (this.imageCache.has(source)) {
      return this.imageCache.get(source);
    }
    const image = new Image();
    image.decoding = "async";
    image.src = source;
    image.onload = () => { image.onload = null; image.onerror = null; this.draw(); };
    image.onerror = () => { image.onload = null; image.onerror = null; this.imageCache.delete(source); };
    this.imageCache.set(source, image);
    return image.complete ? image : null;
  }

  projectNode(node) {
    const screenRadius = clamp(node.radius * this.zoom, 7, 54);
    node.screenX = node.x * this.zoom + this.panX;
    node.screenY = node.y * this.zoom + this.panY;
    node.screenRadius = screenRadius;
    return { x: node.screenX, y: node.screenY, radius: screenRadius };
  }

  getWorldPoint(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      screenX,
      screenY,
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom
    };
  }

  hitTestNode(screenX, screenY) {
    for (let index = this.nodes.length - 1; index >= 0; index -= 1) {
      const node = this.nodes[index];
      const projected = this.projectNode(node);
      if (Math.hypot(screenX - projected.x, screenY - projected.y) <= projected.radius + 6) {
        return node;
      }
    }
    return null;
  }

  hitTestEdge(screenX, screenY) {
    if (this.edges.length > 900 && this.viewOptions?.performanceMode) {
      return null;
    }
    let closestEdge = null;
    let closestDistance = Infinity;
    for (const edge of this.edges) {
      const source = this.projectNode(edge.sourceNode);
      const target = this.projectNode(edge.targetNode);
      const distance = measureDistanceToSegment(screenX, screenY, source.x, source.y, target.x, target.y);
      if (distance < 10 && distance < closestDistance) {
        closestDistance = distance;
        closestEdge = edge;
      }
    }
    return closestEdge;
  }

  handlePointerDown(event) {
    event.preventDefault();
    try { this.canvas.setPointerCapture(event.pointerId); } catch (_) { /* pointer may be invalid */ }
    const point = this.getWorldPoint(event.clientX, event.clientY);
    const hitNode = this.hitTestNode(point.screenX, point.screenY);
    const hitEdge = hitNode ? null : this.hitTestEdge(point.screenX, point.screenY);
    this.pointerDown = {
      pointerId: event.pointerId,
      startScreenX: point.screenX,
      startScreenY: point.screenY,
      startPanX: this.panX,
      startPanY: this.panY,
      hitNodeId: hitNode?.id ?? null,
      hitEdgeId: hitEdge?.id ?? null
    };
    this.pointerMoved = false;
    if (hitNode) {
      this.dragNodeId = hitNode.id;
      hitNode.vx = 0;
      hitNode.vy = 0;
      this.selectedNodeId = hitNode.id;
      this.selectedEdgeId = null;
      this.emitSelection();
      this.restartPhysics(0.72, { frameBudget: 84, nudge: false });
      return;
    }
    this.draggingCanvas = true;
  }

  handlePointerMove(event) {
    const point = this.getWorldPoint(event.clientX, event.clientY);
    if (!this.pointerDown) {
      const hoveredNode = this.hitTestNode(point.screenX, point.screenY);
      const nextHoveredId = hoveredNode?.id ?? null;
      if (nextHoveredId !== this.hoveredNodeId) {
        this.hoveredNodeId = nextHoveredId;
        this.draw();
      }
      return;
    }
    const deltaX = point.screenX - this.pointerDown.startScreenX;
    const deltaY = point.screenY - this.pointerDown.startScreenY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      this.pointerMoved = true;
    }
    if (this.dragNodeId) {
      const dragNode = this.nodeLookup.get(this.dragNodeId);
      if (!dragNode) {
        return;
      }
      this.hasUserViewportIntent = true;
      dragNode.x = point.x;
      dragNode.y = point.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
      this.alpha = Math.max(this.alpha, 0.45);
      this.draw();
      return;
    }
    if (this.draggingCanvas) {
      this.hasUserViewportIntent = true;
      this.panX = this.pointerDown.startPanX + deltaX;
      this.panY = this.pointerDown.startPanY + deltaY;
      this.draw();
    }
  }

  handlePointerUp(event) {
    if (this.pointerDown?.pointerId !== event.pointerId) {
      return;
    }
    if (this.dragNodeId) {
      this.restartPhysics(1.02, { frameBudget: 110, nudgeScale: 0.34 });
    } else if (!this.pointerMoved) {
      if (this.pointerDown.hitEdgeId && this.edgeLookup.has(this.pointerDown.hitEdgeId)) {
        this.selectedEdgeId = this.pointerDown.hitEdgeId;
        this.selectedNodeId = null;
        this.emitSelection();
      } else if (!this.pointerDown.hitNodeId) {
        this.selectedNodeId = null;
        this.selectedEdgeId = null;
        this.callbacks.onSelectionChange?.(null);
      }
    }
    this.dragNodeId = null;
    this.draggingCanvas = false;
    this.pointerDown = null;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.draw();
  }

  handleWheel(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.zoomAt(zoomFactor, cursorX, cursorY);
  }

  zoomAt(factor, screenX, screenY) {
    const nextZoom = clamp(this.zoom * factor, 0.18, 3.25);
    const worldX = (screenX - this.panX) / this.zoom;
    const worldY = (screenY - this.panY) / this.zoom;
    this.zoom = nextZoom;
    this.hasUserViewportIntent = true;
    this.panX = screenX - worldX * this.zoom;
    this.panY = screenY - worldY * this.zoom;
    this.hasViewport = true;
    this.draw();
  }

  fit() {
    if (this.nodes.length === 0) {
      return;
    }
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    this.nodes.forEach((node) => {
      minX = Math.min(minX, node.x - node.radius);
      minY = Math.min(minY, node.y - node.radius);
      maxX = Math.max(maxX, node.x + node.radius);
      maxY = Math.max(maxY, node.y + node.radius);
    });
    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const padding = 54;
    this.zoom = clamp(Math.min((width - padding * 2) / graphWidth, (height - padding * 2) / graphHeight), 0.18, 2.2);
    this.panX = width / 2 - (minX + maxX) / 2 * this.zoom;
    this.panY = height / 2 - (minY + maxY) / 2 * this.zoom;
    this.hasViewport = true;
    this.draw();
  }

  zoomIn() {
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.zoomAt(1.15, width / 2, height / 2);
  }

  zoomOut() {
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.zoomAt(1 / 1.15, width / 2, height / 2);
  }

  resetLayout(layout, forceSettings = {}) {
    this.forceSettings = normalizeForceSettings(forceSettings);
    this.restartLayout(layout);
    this.fit();
  }

  emitSelection() {
    if (this.selectedNodeId && this.nodeLookup.has(this.selectedNodeId)) {
      this.callbacks.onSelectionChange?.({ kind: "node", node: this.nodeLookup.get(this.selectedNodeId).payload });
      return;
    }
    if (this.selectedEdgeId && this.edgeLookup.has(this.selectedEdgeId)) {
      this.callbacks.onSelectionChange?.({ kind: "edge", edge: this.edgeLookup.get(this.selectedEdgeId).payload });
      return;
    }
    this.callbacks.onSelectionChange?.(null);
  }

  destroy() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = 0;
    }
    this.clearViewportRecoveryTimers();
    window.removeEventListener("resize", this.onWindowResize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.surface.remove();
  }
}

module.exports = {
  DynamicForceRenderer
};
