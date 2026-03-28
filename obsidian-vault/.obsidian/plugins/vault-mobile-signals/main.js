"use strict";

const { MarkdownView, Notice, Plugin, TFile, TFolder } = require("obsidian");

const PLUGIN_ID = "vault-mobile-signals";
const GRAPH_VISIBILITY_STORAGE_KEY = "thomas-vault-hidden-top-level-folders";
const GRAPH_CHANGE_EVENT = "thomas-vault-graph-groups-changed";
const EXPLORER_SELECTOR = '.workspace-leaf-content[data-type="file-explorer"]';
const ROW_SELECTOR = ".nav-folder-title, .nav-file-title";
const TITLE_CONTENT_SELECTOR = ".nav-folder-title-content, .nav-file-title-content";
const TRIPLE_TAP_WINDOW_MS = 720;
const TRIPLE_TAP_DISTANCE_PX = 30;
const EXPLORER_REFRESH_DELAY_MS = 28;
const DEFAULT_TEXT_SCALE = 1;
const MIN_TEXT_SCALE = 0.36;
const MAX_TEXT_SCALE = 3;
const TEXT_SCALE_EASING = 0.72;
const PINCH_SUPPRESS_TRIPLE_TAP_MS = 520;
const GRAPH_SOLO_HOLD_MS = 420;
const MARKDOWN_LEAF_SELECTOR = ".workspace-leaf";
const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6";
const TASK_CHECKBOX_SELECTOR = '.task-list-item-checkbox, input[type="checkbox"][data-task]';
const TOP_LEVEL_META = {
  "00_Inbox": {
    color: "#ff9b42",
    folderIcon: "📥",
    noteIcon: "📝",
    subfolderIcons: ["📥", "🧺", "📨", "🪶"]
  },
  "01_Daily": {
    color: "#f2c14e",
    folderIcon: "📅",
    noteIcon: "🗒️",
    subfolderIcons: ["🗓️", "🌤️", "⏱️", "📆"]
  },
  "02_Action": {
    color: "#e9b95e",
    folderIcon: "✅",
    noteIcon: "☑️",
    subfolderIcons: ["🧭", "🛠️", "🎯", "📌"]
  },
  "03_Notes": {
    color: "#8a7dff",
    folderIcon: "🧠",
    noteIcon: "✦",
    subfolderIcons: ["🧠", "💡", "🧩", "🔍"]
  },
  "04_Maps": {
    color: "#3ccfcf",
    folderIcon: "🗺️",
    noteIcon: "🧭",
    subfolderIcons: ["🗺️", "🛰️", "🧭", "🌐"]
  },
  "05_Sources": {
    color: "#53a8ff",
    folderIcon: "📘",
    noteIcon: "📄",
    subfolderIcons: ["📚", "📎", "🧾", "🔖"]
  },
  "06_Reference": {
    color: "#69c17d",
    folderIcon: "📚",
    noteIcon: "📑",
    subfolderIcons: ["📚", "🏷️", "📙", "🧾"]
  },
  "07_Persona": {
    color: "#d96faf",
    folderIcon: "👤",
    noteIcon: "✍️",
    subfolderIcons: ["👤", "🪞", "🎭", "🗣️"]
  },
  "08_System": {
    color: "#a3b3c7",
    folderIcon: "⚙️",
    noteIcon: "🧩",
    subfolderIcons: ["⚙️", "🧱", "📐", "🧪"]
  },
  "90_Archive": {
    color: "#6a7282",
    folderIcon: "🗄️",
    noteIcon: "🪫",
    subfolderIcons: ["🗄️", "📦", "💤", "🪦"]
  },
  "99_Templates": {
    color: "#cbb48f",
    folderIcon: "🧰",
    noteIcon: "🧷",
    subfolderIcons: ["🧰", "🪄", "📋", "🪜"]
  },
  "_Assets": {
    color: "#7d8aa6",
    folderIcon: "🖼️",
    noteIcon: "🖼️",
    subfolderIcons: ["🖼️", "📸", "🎞️", "🧿"]
  }
};

function slugify(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function hashString(value) {
  let hash = 0;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getTouchDistance(touches) {
  if (!touches || touches.length < 2) {
    return 0;
  }
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function getTopLevelFolder(path) {
  return String(path ?? "").split("/").find(Boolean) ?? "";
}

function pickInitialTextScale(stored) {
  const shared = Number(stored?.textScale);
  if (Number.isFinite(shared)) {
    return shared;
  }
  const reading = Number(stored?.readingTextScale);
  const editing = Number(stored?.editingTextScale);
  if (Number.isFinite(reading) && Number.isFinite(editing)) {
    return (reading + editing) / 2;
  }
  if (Number.isFinite(reading)) {
    return reading;
  }
  if (Number.isFinite(editing)) {
    return editing;
  }
  return DEFAULT_TEXT_SCALE;
}

function readHiddenGroups() {
  try {
    const raw = window.localStorage.getItem(GRAPH_VISIBILITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  } catch {
    return new Set();
  }
}

function writeHiddenGroups(groups) {
  window.localStorage.setItem(GRAPH_VISIBILITY_STORAGE_KEY, JSON.stringify([...groups].sort()));
}

function clearBodyClassPrefix(prefix) {
  [...document.body.classList].forEach((className) => {
    if (className.startsWith(prefix)) {
      document.body.classList.remove(className);
    }
  });
}

function getRowPath(row) {
  return row.getAttribute("data-path") || row.closest("[data-path]")?.getAttribute("data-path") || "";
}

class VaultMobileSignalsPlugin extends Plugin {
  async onload() {
    const stored = await this.loadData();
    this.settings = {
      textScale: this.normalizeTextScale(pickInitialTextScale(stored)),
      treeScale: this.normalizeTreeScale(stored?.treeScale ?? 1)
    };
    this.hiddenGroups = readHiddenGroups();
    this.boundExplorers = new WeakSet();
    this.treePinchStates = new WeakMap();
    this.boundMarkdownLeaves = new WeakSet();
    this.refreshQueued = false;
    this.isRefreshing = false;
    this.refreshTimer = 0;
    this.markdownRefreshQueued = false;
    this.markdownRefreshTimer = 0;
    this.noteContextToken = 0;
    this.collapsedHeadingsByFile = new Map();
    this.recentCheckboxesByFile = new Map();
    this.lastModeToggleAt = 0;
    this.saveTimer = 0;
    this.registerEvent(this.app.workspace.on("layout-change", () => {
      this.bindExplorers();
      this.bindMarkdownLeaves();
      this.scheduleExplorerRefresh();
      this.scheduleMarkdownRefresh();
    }));
    this.registerEvent(this.app.workspace.on("file-open", () => {
      this.scheduleExplorerRefresh();
      this.scheduleMarkdownRefresh();
      void this.updateActiveNoteClasses();
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => {
      this.scheduleMarkdownRefresh();
      void this.updateActiveNoteClasses();
    }));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => {
      if (file.path === this.app.workspace.getActiveFile()?.path) {
        this.scheduleMarkdownRefresh();
        void this.updateActiveNoteClasses();
      }
      this.scheduleExplorerRefresh();
    }));
    this.registerEvent(this.app.vault.on("create", () => this.scheduleExplorerRefresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleExplorerRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleExplorerRefresh()));
    this.addCommand({
      id: "reset-mobile-text-scales",
      name: "Reset shared mobile text scale",
      callback: () => {
        void this.resetTextScales();
      }
    });
    this.addCommand({
      id: "show-all-graph-groups",
      name: "Show all top-level graph groups",
      callback: () => {
        this.clearHiddenGroups();
        new Notice("All top-level graph groups are visible.");
      }
    });
    this.addCommand({
      id: "show-only-active-note-group",
      name: "Show only the active note's top-level graph group",
      callback: () => {
        const topFolder = this.getActiveTopLevelFolder();
        if (!topFolder) {
          new Notice("Open a note inside a top-level folder first.");
          return;
        }
        this.isolateGraphGroup(topFolder);
        new Notice(`Showing only ${topFolder} in the graph.`);
      }
    });
    this.addCommand({
      id: "reset-mobile-runtime-state",
      name: "Reset mobile runtime state",
      callback: () => {
        void this.resetRuntimeState();
      }
    });
    this.addCommand({
      id: "open-runtime-troubleshooting-note",
      name: "Open runtime troubleshooting note",
      callback: () => {
        void this.openNoteByPath("08_System/SYS-R – Runtime troubleshooting.md");
      }
    });
    this.addCommand({
      id: "open-recovery-quick-actions-note",
      name: "Open recovery quick actions note",
      callback: () => {
        void this.openNoteByPath("08_System/SYS-T – Recovery quick actions.md");
      }
    });
    this.addCommand({
      id: "reset-runtime-and-open-troubleshooting",
      name: "Reset mobile runtime state and open troubleshooting",
      callback: () => {
        void this.resetRuntimeStateAndOpenTroubleshooting();
      }
    });
    this.register(() => {
      if (this.refreshTimer) {
        window.clearTimeout(this.refreshTimer);
      }
      if (this.markdownRefreshTimer) {
        window.clearTimeout(this.markdownRefreshTimer);
      }
      if (this.saveTimer) {
        window.clearTimeout(this.saveTimer);
        this.saveTimer = 0;
        void this.saveData(this.settings);
      }
    });
    document.body.classList.add("vms-enabled");
    this.applyTextScaleVariables();
    this.applyTreeScale();
    this.register(() => {
      document.body.classList.remove("vms-enabled");
      document.body.style.removeProperty("--vms-text-scale");
      this.clearActiveNoteClasses();
    });
    this.bindExplorers();
    this.bindMarkdownLeaves();
    this.scheduleExplorerRefresh();
    this.scheduleMarkdownRefresh();
    await this.updateActiveNoteClasses();
  }

  onunload() {
    this.clearActiveNoteClasses();
    document.querySelectorAll(".vms-row-icon-wrap, .vms-row-toggle-wrap").forEach((element) => element.remove());
    document.querySelectorAll(ROW_SELECTOR).forEach((row) => {
      row.classList.remove("vms-row", "vms-group-hidden", "vms-top-folder-row");
      row.style.removeProperty("--vms-accent");
      delete row.dataset.vmsTopFolder;
    });
    document.querySelectorAll(".vms-collapsible-heading").forEach((heading) => {
      heading.classList.remove("vms-collapsible-heading", "is-collapsed");
      delete heading.dataset.vmsHeadingKey;
    });
    document.querySelectorAll("[data-vms-collapsed-parent]").forEach((element) => {
      element.classList.remove("vms-collapsed-block");
      delete element.dataset.vmsCollapsedParent;
    });
    document.querySelectorAll("[data-vms-task-key], [data-vms-recent-order]").forEach((element) => {
      delete element.dataset.vmsTaskKey;
      delete element.dataset.vmsRecentOrder;
      element.classList.remove("vms-recent-checkbox");
    });
  }

  isMobileContext() {
    return document.body.classList.contains("is-mobile") || window.innerWidth <= 960;
  }

  bindExplorers() {
    document.querySelectorAll(EXPLORER_SELECTOR).forEach((explorer) => {
      if (this.boundExplorers.has(explorer)) {
        return;
      }
      const onExplorerClick = (event) => {
        if (!(event.target instanceof Element) || !event.target.closest(ROW_SELECTOR)) {
          return;
        }
        this.scheduleExplorerRefresh();
      };
      explorer.addEventListener("click", onExplorerClick, true);
      this.boundExplorers.add(explorer);
      this.register(() => explorer.removeEventListener("click", onExplorerClick, true));
      this.bindExplorerPinch(explorer);
    });
  }

  bindExplorerPinch(explorer) {
    if (this.treePinchStates.has(explorer)) {
      return;
    }
    const pinch = { active: false, startDistance: 0, startScale: 1 };
    this.treePinchStates.set(explorer, pinch);
    const scrollEl = explorer.querySelector(".nav-files-container") ?? explorer;

    const onTouchStart = (event) => {
      if (event.touches.length !== 2) {
        return;
      }
      const dist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      if (dist <= 0) {
        return;
      }
      pinch.active = true;
      pinch.startDistance = dist;
      pinch.startScale = this.settings.treeScale ?? 1;
      event.preventDefault();
    };

    const onTouchMove = (event) => {
      if (!pinch.active || event.touches.length !== 2) {
        return;
      }
      const dist = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      if (dist <= 0) {
        return;
      }
      const next = this.normalizeTreeScale(pinch.startScale * (dist / pinch.startDistance));
      if (Math.abs(next - (this.settings.treeScale ?? 1)) > 0.005) {
        this.settings.treeScale = next;
        this.applyTreeScale();
      }
      event.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pinch.active) {
        return;
      }
      pinch.active = false;
      this.scheduleSettingsSave();
    };

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: false });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd, true);
    scrollEl.addEventListener("touchcancel", onTouchEnd, true);

    this.register(() => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd, true);
      scrollEl.removeEventListener("touchcancel", onTouchEnd, true);
    });
  }

  normalizeTreeScale(value) {
    const numeric = Number(value);
    return Math.max(0.7, Math.min(1.6, Number.isFinite(numeric) ? numeric : 1));
  }

  applyTreeScale() {
    const scale = this.normalizeTreeScale(this.settings.treeScale ?? 1);
    document.documentElement.style.setProperty("--vms-tree-scale", String(scale));
  }

  bindMarkdownLeaves() {
    document.querySelectorAll(MARKDOWN_LEAF_SELECTOR).forEach((leaf) => {
      if (!(leaf instanceof HTMLElement) || this.boundMarkdownLeaves.has(leaf) || !this.isMarkdownLeaf(leaf)) {
        return;
      }
      const state = {
        tapHistory: [],
        pinchState: null,
        lastPinchAt: 0
      };
      const onPointerUp = (event) => this.handleLeafPointerUp(leaf, state, event);
      const onTouchStart = (event) => this.handleLeafTouchStart(leaf, state, event);
      const onTouchMove = (event) => this.handleLeafTouchMove(leaf, state, event);
      const onTouchEnd = (event) => this.handleLeafTouchEnd(leaf, state, event);
      const onTouchCancel = () => this.finishLeafPinch(state, true);
      const onClick = (event) => this.handleLeafClick(leaf, event);
      const onChange = (event) => this.handleLeafChange(leaf, event);
      leaf.addEventListener("pointerup", onPointerUp, true);
      leaf.addEventListener("touchstart", onTouchStart, true);
      leaf.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });
      leaf.addEventListener("touchend", onTouchEnd, true);
      leaf.addEventListener("touchcancel", onTouchCancel, true);
      leaf.addEventListener("click", onClick, true);
      leaf.addEventListener("change", onChange, true);
      this.boundMarkdownLeaves.add(leaf);
      this.register(() => {
        leaf.removeEventListener("pointerup", onPointerUp, true);
        leaf.removeEventListener("touchstart", onTouchStart, true);
        leaf.removeEventListener("touchmove", onTouchMove, true);
        leaf.removeEventListener("touchend", onTouchEnd, true);
        leaf.removeEventListener("touchcancel", onTouchCancel, true);
        leaf.removeEventListener("click", onClick, true);
        leaf.removeEventListener("change", onChange, true);
      });
    });
  }

  scheduleMarkdownRefresh() {
    if (this.markdownRefreshQueued) {
      return;
    }
    this.markdownRefreshQueued = true;
    if (this.markdownRefreshTimer) {
      window.clearTimeout(this.markdownRefreshTimer);
    }
    this.markdownRefreshTimer = window.setTimeout(() => {
      this.markdownRefreshTimer = 0;
      window.requestAnimationFrame(() => {
        this.markdownRefreshQueued = false;
        this.bindMarkdownLeaves();
        this.refreshMarkdownLeaves();
      });
    }, 40);
  }

  refreshMarkdownLeaves() {
    document.querySelectorAll(MARKDOWN_LEAF_SELECTOR).forEach((leaf) => {
      if (!(leaf instanceof HTMLElement) || !this.isMarkdownLeaf(leaf)) {
        return;
      }
      const filePath = this.getMarkdownLeafPath(leaf);
      if (!filePath) {
        return;
      }
      const preview = leaf.querySelector(".markdown-reading-view .markdown-preview-view");
      if (preview instanceof HTMLElement && preview.isConnected) {
        this.decoratePreviewHeadings(preview, filePath);
        this.decoratePreviewCheckboxes(preview, filePath);
      }
    });
  }

  isMarkdownLeaf(leaf) {
    return leaf.querySelector(".markdown-reading-view, .markdown-source-view.mod-cm6") instanceof Element;
  }

  getMarkdownLeafPath(leafEl) {
    const markdownLeaf = this.app.workspace.getLeavesOfType("markdown").find((leaf) => leaf.containerEl === leafEl);
    return markdownLeaf?.view?.file?.path ?? "";
  }

  scheduleExplorerRefresh() {
    if (this.refreshQueued) {
      return;
    }
    this.refreshQueued = true;
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        this.refreshQueued = false;
        this.bindExplorers();
        this.refreshExplorers();
      });
    }, EXPLORER_REFRESH_DELAY_MS);
  }

  refreshExplorers() {
    this.isRefreshing = true;
    try {
      document.querySelectorAll(EXPLORER_SELECTOR).forEach((explorer) => {
        this.decorateExplorer(explorer);
      });
    } finally {
      this.isRefreshing = false;
    }
  }

  decorateExplorer(explorer) {
    explorer.querySelectorAll(ROW_SELECTOR).forEach((row) => this.decorateRow(row));
  }

  decorateRow(row) {
    const path = getRowPath(row);
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    if (!path || !file) {
      return;
    }
    const isFolder = file instanceof TFolder;
    const contentEl = row.querySelector(TITLE_CONTENT_SELECTOR);
    if (!(contentEl instanceof HTMLElement)) {
      return;
    }
    const meta = this.getVisualMeta(path, file, isFolder);
    row.classList.add("vms-row");
    row.style.setProperty("--vms-accent", meta.color);
    row.dataset.vmsTopFolder = meta.topFolderSlug;
    row.classList.toggle("vms-group-hidden", meta.topFolderHidden);
    row.classList.toggle("vms-top-folder-row", meta.isTopFolder);
    this.ensureRowIcon(contentEl, meta);
    this.ensureGraphToggle(row, meta);
  }

  getVisualMeta(path, file, isFolder) {
    const topFolder = getTopLevelFolder(path);
    const topLevel = TOP_LEVEL_META[topFolder] ?? {
      color: "var(--text-muted)",
      folderIcon: "📁",
      noteIcon: "📄",
      subfolderIcons: ["📁", "📂", "🗂️", "📦"]
    };
    const isTopFolder = isFolder && Boolean(topFolder) && path === topFolder;
    const subfolderName = path.split("/").slice(1).join("/");
    const subfolderIcon = topLevel.subfolderIcons[hashString(subfolderName || path) % topLevel.subfolderIcons.length];
    const icon = isFolder
      ? (isTopFolder ? topLevel.folderIcon : subfolderIcon)
      : topLevel.noteIcon;
    return {
      color: topLevel.color,
      icon,
      topFolder,
      topFolderSlug: slugify(topFolder || "root"),
      topFolderHidden: Boolean(topFolder) && this.hiddenGroups.has(topFolder.toLowerCase()),
      isTopFolder,
      canToggleGraph: isTopFolder && topFolder in TOP_LEVEL_META
    };
  }

  ensureRowIcon(contentEl, meta) {
    let labelWrap = contentEl.querySelector(".vms-row-label");
    if (!(labelWrap instanceof HTMLElement)) {
      labelWrap = document.createElement("span");
      labelWrap.className = "vms-row-label";
      const nodesToMove = [...contentEl.childNodes].filter((node) => {
        return !(node instanceof HTMLElement && node.classList.contains("vms-row-icon-wrap"));
      });
      contentEl.prepend(labelWrap);
      nodesToMove.forEach((node) => labelWrap.appendChild(node));
    }
    let iconWrap = contentEl.querySelector(".vms-row-icon-wrap");
    if (!(iconWrap instanceof HTMLElement)) {
      iconWrap = document.createElement("span");
      iconWrap.className = "vms-row-icon-wrap";
      iconWrap.setAttribute("aria-hidden", "true");
      contentEl.appendChild(iconWrap);
    }
    iconWrap.textContent = meta.icon;
    iconWrap.style.color = meta.color;
  }

  ensureGraphToggle(row, meta) {
    let wrap = row.querySelector(".vms-row-toggle-wrap");
    if (!meta.canToggleGraph) {
      wrap?.remove();
      return;
    }
    if (!(wrap instanceof HTMLElement)) {
      wrap = document.createElement("span");
      wrap.className = "vms-row-toggle-wrap";
      const button = document.createElement("button");
      let holdTimer = 0;
      let holdTriggered = false;
      const clearHold = () => {
        if (holdTimer) {
          window.clearTimeout(holdTimer);
          holdTimer = 0;
        }
      };
      button.className = "vms-graph-toggle";
      button.type = "button";
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        holdTriggered = false;
        clearHold();
        holdTimer = window.setTimeout(() => {
          holdTimer = 0;
          holdTriggered = true;
          this.isolateGraphGroup(meta.topFolder);
        }, GRAPH_SOLO_HOLD_MS);
      });
      ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
        button.addEventListener(eventName, clearHold);
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (holdTriggered) {
          holdTriggered = false;
          return;
        }
        this.toggleGraphGroup(meta.topFolder);
      });
      wrap.appendChild(button);
      row.appendChild(wrap);
    }
    const button = wrap.querySelector(".vms-graph-toggle");
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const hidden = this.hiddenGroups.has(meta.topFolder.toLowerCase());
    button.textContent = hidden ? "🚫" : "👁";
    button.title = hidden ? `Show ${meta.topFolder} in graph. Hold to show only this group.` : `Hide ${meta.topFolder} from graph. Hold to show only this group.`;
    button.setAttribute("aria-label", button.title);
    button.style.setProperty("--vms-accent", meta.color);
    button.classList.toggle("is-hidden-group", hidden);
  }

  getKnownTopLevelFolders() {
    const folders = new Set(Object.keys(TOP_LEVEL_META));
    for (const child of this.app.vault.getRoot().children) {
      if (child instanceof TFolder) {
        folders.add(child.name);
      }
    }
    return [...folders].filter(Boolean);
  }

  getActiveTopLevelFolder() {
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile)) {
      return "";
    }
    return getTopLevelFolder(file.path);
  }

  applyHiddenGroups(groups) {
    this.hiddenGroups = new Set([...groups].map((value) => String(value).trim().toLowerCase()).filter(Boolean));
    writeHiddenGroups(this.hiddenGroups);
    window.dispatchEvent(new Event(GRAPH_CHANGE_EVENT));
    this.scheduleExplorerRefresh();
  }

  clearHiddenGroups() {
    this.applyHiddenGroups(new Set());
  }

  toggleGraphGroup(topFolder) {
    const key = topFolder.toLowerCase();
    const nextHiddenGroups = new Set(this.hiddenGroups);
    if (nextHiddenGroups.has(key)) {
      nextHiddenGroups.delete(key);
    } else {
      nextHiddenGroups.add(key);
    }
    this.applyHiddenGroups(nextHiddenGroups);
  }

  isolateGraphGroup(topFolder) {
    const target = String(topFolder ?? "").trim();
    if (!target) {
      return;
    }
    const targetKey = target.toLowerCase();
    const hiddenGroups = new Set(
      this.getKnownTopLevelFolders()
        .map((folder) => String(folder).trim().toLowerCase())
        .filter((folder) => folder && folder !== targetKey)
    );
    this.applyHiddenGroups(hiddenGroups);
  }

  handleLeafPointerUp(leaf, state, event) {
    if (!this.isMobileContext() || event.pointerType !== "touch" || !(event.target instanceof Element)) {
      return;
    }
    if (Date.now() - this.lastModeToggleAt < 900) {
      state.tapHistory = [];
      return;
    }
    if (state.pinchState || Date.now() - state.lastPinchAt < PINCH_SUPPRESS_TRIPLE_TAP_MS) {
      state.tapHistory = [];
      return;
    }
    if (!leaf.contains(event.target) || !this.isMarkdownSurface(event.target) || this.isIgnoredMarkdownGestureTarget(event.target)) {
      return;
    }
    const leafId = leaf.className || "leaf";
    const now = Date.now();
    const tap = { time: now, x: event.clientX, y: event.clientY, leafId };
    state.tapHistory = state.tapHistory.filter((item) => {
      const withinTime = now - item.time <= TRIPLE_TAP_WINDOW_MS;
      const withinSpace = Math.hypot(item.x - tap.x, item.y - tap.y) <= TRIPLE_TAP_DISTANCE_PX;
      return withinTime && withinSpace && item.leafId === tap.leafId;
    });
    state.tapHistory.push(tap);
    if (state.tapHistory.length < 3) {
      return;
    }
    state.tapHistory = [];
    event.preventDefault();
    event.stopPropagation();
    this.toggleActiveMarkdownMode();
  }

  handleLeafTouchStart(leaf, state, event) {
    if (!this.isMobileContext()) {
      return;
    }
    if (event.touches.length === 2) {
      this.maybeStartLeafPinch(leaf, state, event);
    } else {
      this.finishLeafPinch(state, false);
    }
  }

  handleLeafTouchMove(leaf, state, event) {
    if (!this.isMobileContext()) {
      return;
    }
    if (!state.pinchState) {
      if (event.touches.length === 2) {
        this.maybeStartLeafPinch(leaf, state, event);
      }
      return;
    }
    if (event.touches.length !== 2) {
      this.finishLeafPinch(state, true);
      return;
    }
    const context = this.resolveLeafPinchContext(leaf, event.touches);
    if (!context || context.leaf !== state.pinchState.leaf) {
      this.finishLeafPinch(state, true);
      return;
    }
    const distance = getTouchDistance(event.touches);
    if (distance <= 0) {
      return;
    }
    event.preventDefault();
    const ratio = distance / state.pinchState.startDistance;
    const nextScale = this.normalizeTextScale(state.pinchState.startScale * Math.pow(ratio, TEXT_SCALE_EASING));
    this.updateTextScale(nextScale, false);
    state.lastPinchAt = Date.now();
  }

  handleLeafTouchEnd(leaf, state, event) {
    if (!state.pinchState) {
      return;
    }
    if (event.touches.length < 2) {
      this.finishLeafPinch(state, true);
    }
  }

  maybeStartLeafPinch(leaf, state, event) {
    if (state.pinchState || event.touches.length !== 2) {
      return;
    }
    const context = this.resolveLeafPinchContext(leaf, event.touches);
    const distance = getTouchDistance(event.touches);
    if (!context || distance <= 0) {
      return;
    }
    state.tapHistory = [];
    state.pinchState = {
      leaf: context.leaf,
      startDistance: distance,
      startScale: this.settings.textScale
    };
    state.lastPinchAt = Date.now();
  }

  finishLeafPinch(state, persist = false) {
    if (!state?.pinchState) {
      return;
    }
    state.pinchState = null;
    state.tapHistory = [];
    state.lastPinchAt = Date.now();
    if (persist) {
      this.scheduleSettingsSave();
    }
  }

  resolveLeafPinchContext(leaf, touches) {
    if (!touches || touches.length !== 2) {
      return null;
    }
    for (let index = 0; index < touches.length; index += 1) {
      const element = document.elementFromPoint(touches[index].clientX, touches[index].clientY);
      if (!(element instanceof Element) || !leaf.contains(element) || !this.isMarkdownSurface(element) || this.isIgnoredMarkdownGestureTarget(element)) {
        return null;
      }
    }
    return { leaf };
  }

  isMarkdownSurface(target) {
    return Boolean(this.resolveMarkdownMode(target));
  }

  resolveMarkdownMode(target) {
    if (!(target instanceof Element)) {
      return "";
    }
    if (target.closest(".markdown-source-view.mod-cm6")) {
      return "editing";
    }
    if (target.closest(".markdown-reading-view")) {
      return "reading";
    }
    return "";
  }

  isIgnoredMarkdownGestureTarget(target) {
    return Boolean(target.closest("a, button, input, textarea, select, summary, .clickable-icon, .internal-link, .cm-formatting-link, .cm-fold-indicator, .pdf-embed, .graph-view, .agv-view, .canvas-wrapper, .workspace-drawer"));
  }

  handleLeafClick(leaf, event) {
    if (!(event.target instanceof Element)) {
      return;
    }
    const preview = leaf.querySelector(".markdown-reading-view .markdown-preview-view");
    if (!(preview instanceof HTMLElement) || !preview.contains(event.target)) {
      return;
    }
    const heading = event.target.closest(HEADING_SELECTOR);
    if (!(heading instanceof HTMLElement) || !preview.contains(heading)) {
      return;
    }
    if (this.isIgnoredMarkdownGestureTarget(event.target) && event.target !== heading) {
      return;
    }
    const filePath = this.getMarkdownLeafPath(leaf);
    if (!filePath) {
      return;
    }
    const key = heading.dataset?.vmsHeadingKey;
    if (!key) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.togglePreviewHeading(filePath, preview, heading);
  }

  handleLeafChange(leaf, event) {
    if (!(event.target instanceof Element)) {
      return;
    }
    const preview = leaf.querySelector(".markdown-reading-view .markdown-preview-view");
    if (!(preview instanceof HTMLElement) || !preview.contains(event.target)) {
      return;
    }
    const checkbox = event.target.closest(TASK_CHECKBOX_SELECTOR);
    if (!(checkbox instanceof HTMLInputElement)) {
      return;
    }
    const filePath = this.getMarkdownLeafPath(leaf);
    if (!filePath) {
      return;
    }
    this.updateRecentCheckboxState(filePath, checkbox);
    this.decoratePreviewCheckboxes(preview, filePath);
  }

  decoratePreviewHeadings(preview, filePath) {
    const headings = [...preview.querySelectorAll(HEADING_SELECTOR)].filter((heading) => heading instanceof HTMLElement);
    const collapsed = this.collapsedHeadingsByFile.get(filePath) ?? new Set();
    preview.querySelectorAll("[data-vms-collapsed-parent]").forEach((element) => {
      element.classList.remove("vms-collapsed-block");
      delete element.dataset.vmsCollapsedParent;
    });
    headings.forEach((heading, index) => {
      const key = `${filePath}::${index}::${slugify(heading.textContent).slice(0, 72)}`;
      heading.classList.add("vms-collapsible-heading");
      heading.dataset.vmsHeadingKey = key;
      heading.classList.toggle("is-collapsed", collapsed.has(key));
      if (!collapsed.has(key)) {
        return;
      }
      const level = Number(heading.tagName.slice(1));
      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (sibling.matches?.(HEADING_SELECTOR) && Number(sibling.tagName.slice(1)) <= level) {
          break;
        }
        sibling.classList.add("vms-collapsed-block");
        sibling.dataset.vmsCollapsedParent = key;
        sibling = sibling.nextElementSibling;
      }
    });
  }

  togglePreviewHeading(filePath, preview, heading) {
    const key = heading.dataset.vmsHeadingKey;
    if (!key) {
      return;
    }
    const collapsed = new Set(this.collapsedHeadingsByFile.get(filePath) ?? []);
    if (collapsed.has(key)) {
      collapsed.delete(key);
    } else {
      collapsed.add(key);
    }
    if (collapsed.size === 0) {
      this.collapsedHeadingsByFile.delete(filePath);
    } else {
      this.collapsedHeadingsByFile.set(filePath, collapsed);
    }
    this.decoratePreviewHeadings(preview, filePath);
  }

  decoratePreviewCheckboxes(preview, filePath) {
    const checkboxes = [...preview.querySelectorAll(TASK_CHECKBOX_SELECTOR)].filter((checkbox) => checkbox instanceof HTMLInputElement);
    const recent = this.recentCheckboxesByFile.get(filePath) ?? [];
    checkboxes.forEach((checkbox, index) => {
      const taskText = checkbox.closest(".task-list-item")?.textContent ?? checkbox.closest("li")?.textContent ?? "";
      const taskKey = `${filePath}::${index}::${slugify(taskText).slice(0, 72)}`;
      checkbox.dataset.vmsTaskKey = taskKey;
      const rank = recent.indexOf(taskKey);
      checkbox.classList.toggle("vms-recent-checkbox", rank >= 0);
      if (rank >= 0) {
        checkbox.dataset.vmsRecentOrder = String(rank + 1);
      } else {
        delete checkbox.dataset.vmsRecentOrder;
      }
    });
  }

  updateRecentCheckboxState(filePath, checkbox) {
    const taskKey = checkbox.dataset.vmsTaskKey;
    if (!taskKey) {
      return;
    }
    const recent = [...(this.recentCheckboxesByFile.get(filePath) ?? [])].filter((value) => value !== taskKey);
    if (checkbox.checked) {
      recent.unshift(taskKey);
    }
    this.recentCheckboxesByFile.set(filePath, recent.slice(0, 4));
  }

  toggleActiveMarkdownMode() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return;
    }
    const now = Date.now();
    if (now - this.lastModeToggleAt < 900) {
      return;
    }
    this.lastModeToggleAt = now;
    const currentMode = typeof view.getMode === "function"
      ? view.getMode()
      : view.currentMode?.type ?? "preview";
    const nextMode = currentMode === "source" ? "preview" : "source";
    if (typeof view.setMode === "function") {
      view.setMode(nextMode);
      window.setTimeout(() => this.scheduleMarkdownRefresh(), 120);
      return;
    }
    this.app.commands.executeCommandById("markdown:toggle-preview");
    window.setTimeout(() => this.scheduleMarkdownRefresh(), 120);
  }

  normalizeTextScale(value) {
    const numeric = Number(value);
    return clampNumber(Number.isFinite(numeric) ? numeric : DEFAULT_TEXT_SCALE, MIN_TEXT_SCALE, MAX_TEXT_SCALE);
  }

  applyTextScaleVariables() {
    document.body.style.setProperty("--vms-text-scale", String(this.settings.textScale));
  }

  updateTextScale(value, persist = false) {
    const nextScale = this.normalizeTextScale(value);
    if (Math.abs((this.settings.textScale ?? DEFAULT_TEXT_SCALE) - nextScale) < 0.001) {
      return;
    }
    this.settings.textScale = nextScale;
    this.applyTextScaleVariables();
    if (persist) {
      this.scheduleSettingsSave();
    }
  }

  scheduleSettingsSave() {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(async () => {
      this.saveTimer = 0;
      await this.saveData({ textScale: this.settings.textScale, treeScale: this.settings.treeScale });
    }, 180);
  }

  async resetTextScales() {
    this.settings.textScale = DEFAULT_TEXT_SCALE;
    this.applyTextScaleVariables();
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = 0;
    }
    await this.saveData({ textScale: this.settings.textScale, treeScale: this.settings.treeScale });
  }

  async resetRuntimeState() {
    this.collapsedHeadingsByFile.clear();
    this.recentCheckboxesByFile.clear();
    await this.resetTextScales();
    this.clearHiddenGroups();
    this.scheduleExplorerRefresh();
    this.scheduleMarkdownRefresh();
    await this.updateActiveNoteClasses();
    new Notice("Mobile runtime state was reset.");
  }

  async resetRuntimeStateAndOpenTroubleshooting() {
    await this.resetRuntimeState();
    await this.openNoteByPath("08_System/SYS-R – Runtime troubleshooting.md");
  }

  async openNoteByPath(notePath) {
    const normalized = String(notePath ?? "").trim();
    if (!normalized) {
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(normalized);
    if (!(file instanceof TFile)) {
      new Notice(`Could not find ${normalized}.`);
      return;
    }
    const leaf = this.app.workspace.getMostRecentLeaf?.() ?? this.app.workspace.getLeaf(true);
    await leaf.openFile(file, { active: true });
  }

  clearActiveNoteClasses() {
    clearBodyClassPrefix("vms-note-");
    clearBodyClassPrefix("vms-kind-");
    clearBodyClassPrefix("vms-folder-");
    clearBodyClassPrefix("vms-series-");
    clearBodyClassPrefix("vms-prefix-");
    clearBodyClassPrefix("vms-state-");
    delete document.body.dataset.vmsNoteType;
    delete document.body.dataset.vmsKind;
    delete document.body.dataset.vmsFolder;
    delete document.body.dataset.vmsSeries;
    delete document.body.dataset.vmsPrefix;
    delete document.body.dataset.vmsState;
  }

  async updateActiveNoteClasses() {
    const token = ++this.noteContextToken;
    const file = this.app.workspace.getActiveFile();
    if (!(file instanceof TFile) || file.extension !== "md") {
      this.clearActiveNoteClasses();
      return;
    }
    let contents = "";
    try {
      contents = await this.app.vault.cachedRead(file);
    } catch {
      contents = "";
    }
    if (token !== this.noteContextToken) {
      return;
    }
    const head = contents.split(/\r?\n/).slice(0, 48).join("\n");
    const calloutType = slugify(head.match(/^\>\s*\[\!([a-z0-9-]+)\]/im)?.[1] ?? "");
    const rawKind = head.match(/^Kind:\s*(.+)$/im)?.[1]?.trim() ?? "";
    const kind = slugify(rawKind.replace(/\s+note$/i, ""));
    const rawState = head.match(/^State:\s*(.+)$/im)?.[1]?.trim() ?? "";
    const state = slugify(rawState);
    const topFolder = slugify(getTopLevelFolder(file.path));
    const series = slugify(file.basename.match(/^([A-Z]{2,4})[-\s]/)?.[1] ?? "");
    const prefix = slugify(file.basename.match(/^([A-Z]{2,5})[-\s]/)?.[1] ?? "");
    this.clearActiveNoteClasses();
    if (calloutType !== "unknown") {
      document.body.classList.add(`vms-note-${calloutType}`);
      document.body.dataset.vmsNoteType = calloutType;
    }
    if (kind !== "unknown") {
      document.body.classList.add(`vms-kind-${kind}`);
      document.body.dataset.vmsKind = kind;
    }
    if (topFolder !== "unknown") {
      document.body.classList.add(`vms-folder-${topFolder}`);
      document.body.dataset.vmsFolder = topFolder;
    }
    if (series !== "unknown") {
      document.body.classList.add(`vms-series-${series}`);
      document.body.dataset.vmsSeries = series;
    }
    if (prefix !== "unknown") {
      document.body.classList.add(`vms-prefix-${prefix}`);
      document.body.dataset.vmsPrefix = prefix;
    }
    if (state !== "unknown") {
      document.body.classList.add(`vms-state-${state}`);
      document.body.dataset.vmsState = state;
    }
  }
}

module.exports = VaultMobileSignalsPlugin;
