"use client";

import { Rect, Ellipse, Line, Arrow } from "react-konva";
import type { CanvasElement } from "@/types/teardown";

export default function ShapeShape({ el }: { el: Extract<CanvasElement, { type: "shape" }> }) {
  if (el.shape === "ellipse") {
    return (
      <Ellipse
        x={el.x + el.w / 2} y={el.y + el.h / 2} radiusX={el.w / 2} radiusY={el.h / 2} rotation={el.rotation}
        fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} opacity={el.opacity}
      />
    );
  }
  if (el.shape === "line") {
    return (
      <Line
        x={el.x} y={el.y} rotation={el.rotation}
        points={[0, el.h / 2, el.w, el.h / 2]}
        stroke={el.stroke ?? el.fill} strokeWidth={el.strokeWidth ?? 2} opacity={el.opacity}
      />
    );
  }
  if (el.shape === "arrow") {
    return (
      <Arrow
        x={el.x} y={el.y} rotation={el.rotation}
        points={[0, el.h / 2, el.w, el.h / 2]}
        stroke={el.stroke ?? el.fill} fill={el.stroke ?? el.fill} strokeWidth={el.strokeWidth ?? 2}
        pointerLength={10} pointerWidth={10} opacity={el.opacity}
      />
    );
  }
  return (
    <Rect
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
      fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} cornerRadius={el.cornerRadius} opacity={el.opacity}
    />
  );
}
