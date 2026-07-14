"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import EditableElement, { type ElementPatch } from "@/components/deck-editor/EditableElement";
import type { CanvasSlide } from "@/types/teardown";

interface MarqueeRect { x: number; y: number; w: number; h: number }

interface KonvaCanvasInnerProps {
  slide: CanvasSlide;
  width: number;
  height: number;
  scale: number;
  selectedIds: Set<string>;
  onSelect: (id: string, additive: boolean) => void;
  onMarqueeSelect: (ids: string[]) => void;
  onDeselectAll: () => void;
  onChangeElement: (id: string, patch: ElementPatch) => void;
  onLiveDrag: (id: string, patch: ElementPatch) => void;
  onStageMount?: (stage: Konva.Stage | null) => void;
}

export default function KonvaCanvasInner({
  slide, width, height, scale,
  selectedIds, onSelect, onMarqueeSelect, onDeselectAll, onChangeElement, onLiveDrag, onStageMount,
}: KonvaCanvasInnerProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef<Map<string, Konva.Group>>(new Map());
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

  const registerNode = useCallback((id: string, node: Konva.Group | null) => {
    if (node) nodesRef.current.set(id, node);
    else nodesRef.current.delete(id);
  }, []);

  useEffect(() => {
    onStageMount?.(stageRef.current);
    return () => onStageMount?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the Transformer's bound nodes in sync with selection — nodes can (re)mount as
  // elements are added/removed/reordered, so this re-resolves refs after every commit.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = Array.from(selectedIds)
      .map((id) => nodesRef.current.get(id))
      .filter((n): n is Konva.Group => !!n && !slide.elements.find((e) => e.id === n.id())?.locked);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  });

  function handleStageMouseDown(e: KonvaEventObject<MouseEvent | TouchEvent>) {
    const stage = stageRef.current;
    if (!stage) return;
    // Only start a marquee when clicking truly empty canvas (the stage or its bg rect).
    const clickedEmpty = e.target === stage || (e.target as Konva.Node).name() === "slide-bg";
    if (!clickedEmpty) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    marqueeStart.current = pos;
    setMarquee({ x: pos.x, y: pos.y, w: 0, h: 0 });
    onDeselectAll();
  }

  function handleStageMouseMove() {
    if (!marqueeStart.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    const start = marqueeStart.current;
    setMarquee({
      x: Math.min(start.x, pos.x), y: Math.min(start.y, pos.y),
      w: Math.abs(pos.x - start.x), h: Math.abs(pos.y - start.y),
    });
  }

  function handleStageMouseUp() {
    if (!marqueeStart.current || !marquee) {
      marqueeStart.current = null;
      setMarquee(null);
      return;
    }
    if (marquee.w > 4 || marquee.h > 4) {
      const hits: string[] = [];
      for (const el of slide.elements) {
        if (el.hidden) continue;
        const node = nodesRef.current.get(el.id);
        if (!node) continue;
        const box = node.getClientRect({ relativeTo: node.getStage() ?? undefined });
        const intersects = box.x < marquee.x + marquee.w && box.x + box.width > marquee.x &&
          box.y < marquee.y + marquee.h && box.y + box.height > marquee.y;
        if (intersects) hits.push(el.id);
      }
      onMarqueeSelect(hits);
    }
    marqueeStart.current = null;
    setMarquee(null);
  }

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Stage
      ref={stageRef}
      width={width * scale} height={height * scale}
      scaleX={scale} scaleY={scale}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onTouchStart={handleStageMouseDown}
      onTouchMove={handleStageMouseMove}
      onTouchEnd={handleStageMouseUp}
    >
      <Layer>
        <Rect name="slide-bg" x={0} y={0} width={width} height={height}
          fill={slide.background.type === "solid" ? slide.background.value : "#FFFFFF"} />
        {sorted.map((el) => (
          <EditableElement
            key={el.id}
            el={el}
            onSelect={onSelect}
            onDragMove={onLiveDrag}
            onChange={onChangeElement}
            registerNode={registerNode}
          />
        ))}
        <Transformer
          ref={transformerRef}
          rotateEnabled
          keepRatio={false}
          boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
        />
        {marquee && (
          <Rect
            x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h}
            fill="rgba(194,69,30,0.1)" stroke="#C2451E" strokeWidth={1 / scale} dash={[4 / scale, 4 / scale]}
          />
        )}
      </Layer>
    </Stage>
  );
}
