import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import { useFieldnote } from '../store/useFieldnote';
import type { BoardObject, ConnectorObject, Side } from '../types';
import { COLORS } from '../lib/theme';
import { sidePoint } from '../lib/seed';
import { haptic } from '../lib/haptics';
import { resolveMediaSrc } from '../lib/blobs';
import { moveMindSubtree } from '../lib/mindmap';

function useHtmlImage(src?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }
    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (!cancelled) setImg(image);
    };
    void resolveMediaSrc(src).then((resolved) => {
      if (!cancelled) image.src = resolved;
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return img;
}

function ConnectorLine({
  conn,
  objects,
  semantic,
}: {
  conn: ConnectorObject;
  objects: BoardObject[];
  semantic: boolean;
}) {
  const from = objects.find((o) => o.id === conn.fromId);
  const to = objects.find((o) => o.id === conn.toId);
  if (!from || !to) return null;
  const a = sidePoint(from, conn.fromSide);
  const b = sidePoint(to, conn.toSide);
  const glowing =
    conn.kind === 'dependency' &&
    from.type === 'task' &&
    from.done;

  const midX = (a.x + b.x) / 2;
  const points = conn.curved
    ? [a.x, a.y, midX, a.y, midX, b.y, b.x, b.y]
    : [a.x, a.y, b.x, b.y];

  return (
    <Line
      points={points}
      bezier={!!conn.curved}
      stroke={glowing ? COLORS.glow : conn.stroke ?? COLORS.connector}
      strokeWidth={glowing ? (semantic ? 4 : 3.5) : semantic ? 3 : 2.25}
      shadowColor={glowing ? COLORS.glow : undefined}
      shadowBlur={glowing ? 12 : 0}
      shadowOpacity={glowing ? 0.65 : 0}
      lineCap="round"
      lineJoin="round"
      hitStrokeWidth={28}
      tension={conn.curved ? 0.3 : 0}
    />
  );
}

function ConnectorDots({
  obj,
  scale,
  onStart,
}: {
  obj: BoardObject;
  scale: number;
  onStart: (side: Side) => void;
}) {
  if (obj.type === 'connector' || obj.type === 'drawing' || obj.type === 'region') return null;
  const r = Math.max(7, 9 / scale);
  const hit = Math.max(18, 22 / scale);
  const sides: Side[] = ['top', 'right', 'bottom', 'left'];
  return (
    <>
      {sides.map((side) => {
        const p = sidePoint(obj, side);
        return (
          <Circle
            key={side}
            x={p.x}
            y={p.y}
            radius={r}
            fill={COLORS.clayDeep}
            stroke={COLORS.cream}
            strokeWidth={2 / scale}
            hitStrokeWidth={hit}
            onMouseDown={(e) => {
              e.cancelBubble = true;
              onStart(side);
            }}
            onTouchStart={(e) => {
              e.cancelBubble = true;
              onStart(side);
            }}
          />
        );
      })}
    </>
  );
}

function ObjectNode({
  obj,
  selected,
  editing,
  scale,
  semantic,
}: {
  obj: BoardObject;
  selected: boolean;
  editing: boolean;
  scale: number;
  semantic: boolean;
}) {
  const img = useHtmlImage(obj.type === 'image' || obj.type === 'pdf' ? (obj as { src: string; coverDataUrl?: string }).coverDataUrl ?? (obj as { src: string }).src : undefined);
  const store = useFieldnote();

  if (obj.type === 'connector') return null;

  const common = {
    id: obj.id,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
    opacity: obj.opacity ?? 1,
    draggable: store.tool !== 'draw' && !obj.locked && store.editingId !== obj.id,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      store.select([obj.id], store.tool === 'multi' || e.evt.shiftKey);
    },
    onTap: (e: Konva.KonvaEventObject<Event>) => {
      e.cancelBubble = true;
      store.select([obj.id], store.tool === 'multi');
    },
    onDblClick: () => {
      if (obj.type === 'text' || obj.type === 'task' || obj.type === 'mindmap') {
        store.setEditing(obj.id);
      }
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      if (obj.type === 'mindmap') {
        const dx = node.x() - obj.x;
        const dy = node.y() - obj.y;
        store.updateObjects((objs) => moveMindSubtree(objs, obj.id, dx, dy), true);
        haptic('drop');
        return;
      }

      store.updateObjects(
        (objs) =>
          objs.map((o) =>
            o.id === obj.id ? { ...o, x: node.x(), y: node.y() } : o,
          ),
        true,
      );
      haptic('drop');
    },
  };

  const stroke = selected ? COLORS.selection : 'transparent';
  const strokeWidth = selected ? 2.5 / Math.max(scale, 0.4) : 0;

  if (obj.type === 'region') {
    return (
      <Group {...common} draggable={!obj.locked && store.tool !== 'draw'}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.fill ?? 'rgba(233,178,127,0.16)'}
          cornerRadius={18}
          stroke={selected ? COLORS.selection : 'rgba(52,38,29,0.12)'}
          strokeWidth={selected ? 2 : 1}
          dash={selected ? undefined : [8, 6]}
        />
        {!semantic && (
          <Text
            text={obj.label}
            x={14}
            y={12}
            fontSize={16}
            fill={COLORS.muted}
            fontStyle="bold"
          />
        )}
      </Group>
    );
  }

  if (obj.type === 'drawing') {
    return (
      <Group {...common}>
        {obj.paths.map((path, i) => (
          <Line
            key={i}
            points={path.points}
            stroke={path.color}
            strokeWidth={path.width}
            lineCap="round"
            lineJoin="round"
            globalCompositeOperation={path.tool === 'eraser' ? 'destination-out' : 'source-over'}
            opacity={path.tool === 'highlighter' ? 0.4 : 1}
          />
        ))}
        {selected && (
          <Rect width={obj.width} height={obj.height} stroke={COLORS.selection} strokeWidth={1} dash={[4, 4]} />
        )}
      </Group>
    );
  }

  if (obj.type === 'mindmap') {
    const hidden =
      obj.collapsed
        ? store.objects.filter((o) => o.type === 'mindmap' && o.parentId === obj.id).length
        : 0;
    return (
      <Group {...common}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.fill ?? COLORS.paper}
          cornerRadius={999}
          shadowColor="#4d341f"
          shadowBlur={semantic ? 0 : 10}
          shadowOpacity={semantic ? 0 : 0.12}
          shadowOffsetY={semantic ? 0 : 4}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Text
          text={obj.text}
          width={obj.width}
          height={obj.height}
          align="center"
          verticalAlign="middle"
          fontSize={semantic ? 14 : 15}
          fill={COLORS.ink}
          padding={8}
        />
        {hidden > 0 && (
          <Group x={obj.width - 18} y={-6}>
            <Circle radius={10} fill={obj.branchColor} />
            <Text
              text={String(hidden)}
              offsetX={4}
              offsetY={6}
              fontSize={10}
              fill={COLORS.cream}
            />
          </Group>
        )}
        {selected && (
          <ConnectorDots
            obj={obj}
            scale={scale}
            onStart={(side) => store.beginConnect(obj.id, side)}
          />
        )}
      </Group>
    );
  }

  if (obj.type === 'task') {
    const glow = obj.state === 'done';
    const blocked = obj.state === 'blocked';
    return (
      <Group {...common}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.fill ?? COLORS.paperStrong}
          cornerRadius={16}
          shadowColor={glow ? COLORS.glow : '#4d341f'}
          shadowBlur={glow ? 18 : semantic ? 0 : 12}
          shadowOpacity={glow ? 0.45 : 0.1}
          stroke={blocked ? 'rgba(196,92,92,0.5)' : stroke}
          strokeWidth={blocked ? 2 : strokeWidth}
        />
        <Rect
          x={16}
          y={obj.height / 2 - 11}
          width={22}
          height={22}
          cornerRadius={6}
          stroke={COLORS.ink}
          strokeWidth={2}
          fill={obj.done ? COLORS.clayDeep : 'transparent'}
          onClick={(e) => {
            e.cancelBubble = true;
            store.toggleTask(obj.id);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            store.toggleTask(obj.id);
          }}
        />
        {obj.done && (
          <Text text="✓" x={19} y={obj.height / 2 - 10} fontSize={14} fill={COLORS.cream} />
        )}
        <Text
          text={obj.text}
          x={48}
          y={14}
          width={obj.width - 64}
          height={obj.height - 28}
          fontSize={semantic ? 14 : 18}
          fill={obj.done ? COLORS.muted : COLORS.ink}
          textDecoration={obj.done ? 'line-through' : undefined}
        />
        {!semantic && (
          <Text
            text={obj.state.toUpperCase()}
            x={48}
            y={obj.height - 22}
            fontSize={10}
            fill={blocked ? '#c45c5c' : glow ? COLORS.glow : COLORS.muted}
          />
        )}
        {selected && (
          <ConnectorDots
            obj={obj}
            scale={scale}
            onStart={(side) => store.beginConnect(obj.id, side)}
          />
        )}
      </Group>
    );
  }

  if (obj.type === 'image' || obj.type === 'pdf') {
    return (
      <Group {...common}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={COLORS.paper}
          cornerRadius={16}
          shadowBlur={semantic ? 0 : 12}
          shadowOpacity={0.12}
          shadowColor="#4d341f"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        {img && (
          <KonvaImage
            image={img}
            width={obj.width}
            height={obj.height}
            cornerRadius={16}
          />
        )}
        {obj.type === 'pdf' && (
          <Text
            text={obj.name}
            y={obj.height - 28}
            width={obj.width}
            align="center"
            fontSize={12}
            fill={COLORS.cream}
          />
        )}
        {selected && (
          <ConnectorDots
            obj={obj}
            scale={scale}
            onStart={(side) => store.beginConnect(obj.id, side)}
          />
        )}
      </Group>
    );
  }

  if (obj.type === 'file' || obj.type === 'markdown' || obj.type === 'audio') {
    return (
      <Group {...common}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.fill ?? COLORS.paperStrong}
          cornerRadius={16}
          shadowBlur={semantic ? 0 : 10}
          shadowOpacity={0.1}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Text
          text={obj.type === 'audio' ? 'AUDIO' : obj.type === 'file' ? 'DOC' : 'MD'}
          x={16}
          y={18}
          fontSize={obj.type === 'audio' ? 14 : 18}
          fontStyle="bold"
          fill={COLORS.muted}
        />
        <Text
          text={obj.name}
          x={16}
          y={52}
          width={obj.width - 32}
          fontSize={15}
          fill={COLORS.ink}
        />
        {selected && (
          <ConnectorDots
            obj={obj}
            scale={scale}
            onStart={(side) => store.beginConnect(obj.id, side)}
          />
        )}
      </Group>
    );
  }

  if (obj.type === 'shape') {
    return (
      <Group {...common}>
        {obj.shape === 'ellipse' ? (
          <Circle
            x={obj.width / 2}
            y={obj.height / 2}
            radius={Math.min(obj.width, obj.height) / 2 - 4}
            fill={obj.fill ?? 'transparent'}
            stroke={COLORS.ink}
            strokeWidth={2}
          />
        ) : (
          <Rect
            width={obj.width}
            height={obj.height}
            fill={obj.fill ?? 'transparent'}
            stroke={COLORS.ink}
            strokeWidth={2}
            cornerRadius={12}
          />
        )}
      </Group>
    );
  }

  // text
  if (obj.type === 'text') {
    return (
      <Group {...common}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={obj.fill ?? COLORS.paper}
          cornerRadius={16}
          shadowBlur={semantic ? 0 : 12}
          shadowOpacity={0.1}
          shadowColor="#4d341f"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <Text
          text={editing ? obj.text : obj.text || 'Write something…'}
          width={obj.width}
          height={obj.height}
          padding={18}
          fontSize={semantic ? Math.min(18, obj.fontSize * 0.55) : obj.fontSize}
          fontStyle={obj.fontWeight >= 600 ? 'bold' : 'normal'}
          fill={obj.color}
          align={obj.align ?? 'left'}
          wrap="word"
        />
        {selected && !editing && (
          <ConnectorDots
            obj={obj}
            scale={scale}
            onStart={(side) => store.beginConnect(obj.id, side)}
          />
        )}
        {selected && !editing && (
          <>
            {[
              [0, 0],
              [obj.width, 0],
              [0, obj.height],
              [obj.width, obj.height],
            ].map(([hx, hy], i) => (
              <Circle
                key={i}
                x={hx}
                y={hy}
                radius={Math.max(5, 7 / scale)}
                fill={COLORS.cream}
                stroke={COLORS.ink}
                strokeWidth={2 / scale}
              />
            ))}
          </>
        )}
      </Group>
    );
  }

  return null;
}

export function InfiniteCanvas() {
  const {
    objects,
    camera,
    selectedIds,
    editingId,
    tool,
    connecting,
    viewport,
    setCamera,
    setViewport,
    select,
    clearSelection,
    setEditing,
    completeConnect,
    cancelConnect,
    appendDrawPoints,
    setDrawingId,
  } = useFieldnote();

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const panStart = useRef({ x: 0, y: 0, camX: 0, camY: 0 });
  const pinchStart = useRef({ dist: 0, scale: 1, camX: 0, camY: 0, cx: 0, cy: 0 });
  const longPressTimer = useRef<number | null>(null);
  const marquee = useRef<null | { x1: number; y1: number; x2: number; y2: number }>(null);
  const [marqueeBox, setMarqueeBox] = useState<null | { x: number; y: number; w: number; h: number }>(null);
  const [connectCursor, setConnectCursor] = useState<null | { x: number; y: number }>(null);

  const semantic = camera.scale < 0.45;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setViewport(r.width, r.height);
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setViewport(r.width, r.height);
    return () => ro.disconnect();
  }, [setViewport]);

  // Hold-to-edit (~500ms) with haptic
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const content = stage.container();

    const clear = () => {
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };

    content.addEventListener('pointerup', clear);
    content.addEventListener('pointercancel', clear);
    return () => {
      content.removeEventListener('pointerup', clear);
      content.removeEventListener('pointercancel', clear);
      clear();
    };
  }, []);

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - camera.x) / camera.scale,
      y: (sy - camera.y) / camera.scale,
    }),
    [camera],
  );

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const old = camera.scale;
    const ptr = stage.getPointerPosition();
    if (!ptr) return;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1 + direction * 0.08;
    const next = Math.min(2.8, Math.max(0.2, old * factor));
    const wx = (ptr.x - camera.x) / old;
    const wy = (ptr.y - camera.y) / old;
    setCamera({
      scale: next,
      x: ptr.x - wx * next,
      y: ptr.y - wy * next,
    });
  };

  // Visible objects (culling)
  const visible = useMemo(() => {
    const pad = 200 / camera.scale;
    const minX = -camera.x / camera.scale - pad;
    const minY = -camera.y / camera.scale - pad;
    const maxX = (viewport.w - camera.x) / camera.scale + pad;
    const maxY = (viewport.h - camera.y) / camera.scale + pad;
    return objects.filter((o) => {
      if (o.type === 'connector') return true;
      return !(o.x + o.width < minX || o.x > maxX || o.y + o.height < minY || o.y > maxY);
    });
  }, [objects, camera, viewport]);

  const regions = visible.filter((o) => o.type === 'region');
  const rest = visible.filter((o) => o.type !== 'region' && o.type !== 'connector');
  const connectors = visible.filter((o) => o.type === 'connector') as ConnectorObject[];

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const evt = e.evt;
    pointers.current.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });

    // Gesture priority: 2+ pointers = navigation only
    if (pointers.current.size >= 2) {
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      marquee.current = null;
      setMarqueeBox(null);
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStart.current = {
        dist,
        scale: camera.scale,
        camX: camera.x,
        camY: camera.y,
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
      };
      // While connecting, second finger navigates without canceling
      return;
    }

    const rect = containerRef.current!.getBoundingClientRect();
    const sx = evt.clientX - rect.left;
    const sy = evt.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (connecting) {
      setConnectCursor(world);
      const target = e.target;
      const id = target.getParent()?.attrs?.id ?? target.attrs?.id;
      // completion happens on pointer up on dots / objects
      void id;
      return;
    }

    if (tool === 'draw') {
      appendDrawPoints([world.x, world.y], true);
      return;
    }

    const isStage = e.target === stage;
    if (isStage) {
      if (tool === 'multi') {
        marquee.current = { x1: world.x, y1: world.y, x2: world.x, y2: world.y };
      } else {
        panStart.current = { x: sx, y: sy, camX: camera.x, camY: camera.y };
        clearSelection();
      }
    } else {
      const group = e.target.findAncestor('Group');
      const id = group?.id();
      if (id) {
        if (!selectedIds.includes(id)) select([id], tool === 'multi');
        // schedule hold-to-edit
        const obj = objects.find((o) => o.id === id);
        if (obj && (obj.type === 'text' || obj.type === 'task' || obj.type === 'mindmap')) {
          longPressTimer.current = window.setTimeout(() => {
            setEditing(id);
          }, 500);
        }
      }
    }
  };

  const handlePointerMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const evt = e.evt;
    pointers.current.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    const rect = containerRef.current!.getBoundingClientRect();
    const sx = evt.clientX - rect.left;
    const sy = evt.clientY - rect.top;
    const world = screenToWorld(sx, sy);

    if (pointers.current.size >= 2) {
      if (longPressTimer.current) {
        window.clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2 - rect.left;
      const cy = (pts[0].y + pts[1].y) / 2 - rect.top;
      if (pinchStart.current.dist > 0) {
        const next = Math.min(
          2.8,
          Math.max(0.2, pinchStart.current.scale * (dist / pinchStart.current.dist)),
        );
        const wx = (pinchStart.current.cx - rect.left - pinchStart.current.camX) / pinchStart.current.scale;
        const wy = (pinchStart.current.cy - rect.top - pinchStart.current.camY) / pinchStart.current.scale;
        // also pan by midpoint delta
        const mdx = cx - (pinchStart.current.cx - rect.left);
        void mdx;
        setCamera({
          scale: next,
          x: cx - wx * next,
          y: cy - wy * next,
        });
        // update focal baseline gently
        pinchStart.current.cx = cx + rect.left;
        pinchStart.current.cy = cy + rect.top;
        pinchStart.current.dist = dist;
        pinchStart.current.scale = next;
        pinchStart.current.camX = cx - wx * next;
        pinchStart.current.camY = cy - wy * next;
      }
      return;
    }

    if (connecting) {
      setConnectCursor(world);
      return;
    }

    if (tool === 'draw' && pointers.current.size === 1) {
      appendDrawPoints([world.x, world.y], false);
      return;
    }

    if (marquee.current) {
      marquee.current.x2 = world.x;
      marquee.current.y2 = world.y;
      const x = Math.min(marquee.current.x1, marquee.current.x2);
      const y = Math.min(marquee.current.y1, marquee.current.y2);
      const w = Math.abs(marquee.current.x2 - marquee.current.x1);
      const h = Math.abs(marquee.current.y2 - marquee.current.y1);
      setMarqueeBox({ x, y, w, h });
      return;
    }

    // one-finger pan on empty / after stage down
    if (panStart.current && e.target === stageRef.current) {
      const dx = sx - panStart.current.x;
      const dy = sy - panStart.current.y;
      if (Math.hypot(dx, dy) > 4) {
        if (longPressTimer.current) {
          window.clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        setCamera({
          x: panStart.current.camX + dx,
          y: panStart.current.camY + dy,
        });
      }
    }
  };

  const handlePointerUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const evt = e.evt;
    pointers.current.delete(evt.pointerId);

    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (pointers.current.size < 2) {
      pinchStart.current.dist = 0;
    }

    if (marquee.current && marqueeBox) {
      const hits = objects
        .filter((o) => o.type !== 'connector' && o.type !== 'region')
        .filter(
          (o) =>
            o.x < marqueeBox.x + marqueeBox.w &&
            o.x + o.width > marqueeBox.x &&
            o.y < marqueeBox.y + marqueeBox.h &&
            o.y + o.height > marqueeBox.y,
        )
        .map((o) => o.id);
      select(hits, false);
      marquee.current = null;
      setMarqueeBox(null);
    }

    if (tool === 'draw') setDrawingId(null);

    if (connecting) {
      // try complete onto object under pointer
      const stage = stageRef.current;
      if (stage) {
        const pos = stage.getPointerPosition();
        if (pos) {
          const shape = stage.getIntersection(pos);
          const group = shape?.findAncestor('Group');
          const id = group?.id();
          if (id && id !== connecting.fromId) {
            completeConnect(id, 'left');
            setConnectCursor(null);
            return;
          }
        }
      }
      // keep connecting until explicit cancel via empty tap with no move — cancel on empty
      if (e.target === stageRef.current) {
        cancelConnect();
        setConnectCursor(null);
      }
    }
  };

  // Temporary connector preview
  const connectPreview = (() => {
    if (!connecting || !connectCursor) return null;
    const from = objects.find((o) => o.id === connecting.fromId);
    if (!from) return null;
    const a = sidePoint(from, connecting.fromSide);
    return (
      <Line
        points={[a.x, a.y, connectCursor.x, connectCursor.y]}
        stroke={COLORS.clayDeep}
        strokeWidth={2}
        dash={[8, 6]}
      />
    );
  })();

  return (
    <div ref={containerRef} className="absolute inset-0 touch-none bg-[var(--canvas)]">
      <Stage
        ref={stageRef}
        width={viewport.w}
        height={viewport.h}
        scaleX={camera.scale}
        scaleY={camera.scale}
        x={camera.x}
        y={camera.y}
        onWheel={onWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Layer listening={false}>
          {/* subtle dots via sparse circles when not semantic */}
          {!semantic &&
            Array.from({ length: 18 }).map((_, i) =>
              Array.from({ length: 12 }).map((_, j) => (
                <Circle
                  key={`${i}-${j}`}
                  x={((-camera.x / camera.scale) | 0) - 100 + i * 120}
                  y={((-camera.y / camera.scale) | 0) - 100 + j * 120}
                  radius={1.2}
                  fill="rgba(169,124,69,0.25)"
                />
              )),
            )}
        </Layer>

        <Layer>
          {regions.map((obj) => (
            <ObjectNode
              key={obj.id}
              obj={obj}
              selected={selectedIds.includes(obj.id)}
              editing={editingId === obj.id}
              scale={camera.scale}
              semantic={semantic}
            />
          ))}
        </Layer>

        <Layer>
          {connectors.map((c) => (
            <ConnectorLine key={c.id} conn={c} objects={objects} semantic={semantic} />
          ))}
          {connectPreview}
        </Layer>

        <Layer>
          {rest.map((obj) => (
            <ObjectNode
              key={obj.id}
              obj={obj}
              selected={selectedIds.includes(obj.id)}
              editing={editingId === obj.id}
              scale={camera.scale}
              semantic={semantic}
            />
          ))}
          {marqueeBox && (
            <Rect
              x={marqueeBox.x}
              y={marqueeBox.y}
              width={marqueeBox.w}
              height={marqueeBox.h}
              fill="rgba(203,125,70,0.12)"
              stroke={COLORS.clayDeep}
              dash={[6, 4]}
            />
          )}
        </Layer>
      </Stage>

      {/* HTML overlay editor for text hold-to-edit */}
      {editingId &&
        (() => {
          const obj = objects.find((o) => o.id === editingId);
          if (!obj || (obj.type !== 'text' && obj.type !== 'task' && obj.type !== 'mindmap')) return null;
          const left = camera.x + obj.x * camera.scale;
          const top = camera.y + obj.y * camera.scale;
          return (
            <textarea
              autoFocus
              className="absolute z-30 resize-none rounded-2xl border-2 border-[var(--selection)] bg-[var(--paper)] p-4 text-[var(--ink)] shadow-xl outline-none"
              style={{
                left,
                top,
                width: Math.max(160, obj.width * camera.scale),
                height: Math.max(80, obj.height * camera.scale),
                fontSize: obj.type === 'text' ? obj.fontSize * camera.scale : 16 * camera.scale,
              }}
              value={obj.text}
              onChange={(e) => useFieldnote.getState().updateText(obj.id, e.target.value)}
              onBlur={() => setEditing(null)}
            />
          );
        })()}
    </div>
  );
}
