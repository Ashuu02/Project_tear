"use client";

import { useEffect, useRef } from "react";
import { Group } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import TextShape from "@/components/deck-editor/shapes/TextShape";
import ShapeShape from "@/components/deck-editor/shapes/ShapeShape";
import CanvasImageShape from "@/components/deck-editor/CanvasImageShape";
import CanvasChartShape from "@/components/deck-editor/CanvasChartShape";
import TableShape from "@/components/deck-editor/shapes/TableShape";
import type { CanvasElement } from "@/types/teardown";

export type ElementPatch = Partial<Pick<CanvasElement, "x" | "y" | "w" | "h" | "rotation">>;

interface EditableElementProps {
  el: CanvasElement;
  onSelect: (id: string, additive: boolean) => void;
  onDragMove: (id: string, patch: ElementPatch) => void;
  onChange: (id: string, patch: ElementPatch) => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
}

// Renders the shape at local (0,0) — the wrapping <Group> below owns x/y/rotation, so
// drag/resize/rotate math is identical across text/shape/image/chart/table.
function renderLocalShape(el: CanvasElement) {
  const local = { ...el, x: 0, y: 0, rotation: 0 } as CanvasElement;
  switch (local.type) {
    case "text":  return <TextShape el={local} />;
    case "shape": return <ShapeShape el={local} />;
    case "image": return <CanvasImageShape el={local} />;
    case "chart": return <CanvasChartShape el={local} />;
    case "table": return <TableShape el={local} />;
    default:      return null;
  }
}

export default function EditableElement({ el, onSelect, onDragMove, onChange, registerNode }: EditableElementProps) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    registerNode(el.id, groupRef.current);
    return () => registerNode(el.id, null);
  }, [el.id, registerNode]);

  if (el.hidden) return null;

  function handleDragMove(e: KonvaEventObject<DragEvent>) {
    onDragMove(el.id, { x: e.target.x(), y: e.target.y() });
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent>) {
    onChange(el.id, { x: e.target.x(), y: e.target.y() });
  }

  function handleTransformEnd(e: KonvaEventObject<Event>) {
    const node = e.target as Konva.Group;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange(el.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      w: Math.max(10, el.w * scaleX),
      h: Math.max(10, el.h * scaleY),
    });
  }

  return (
    <Group
      ref={groupRef}
      id={el.id}
      x={el.x} y={el.y} rotation={el.rotation}
      draggable={!el.locked}
      onClick={(e) => { e.cancelBubble = true; onSelect(el.id, e.evt.shiftKey); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(el.id, false); }}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {renderLocalShape(el)}
    </Group>
  );
}
