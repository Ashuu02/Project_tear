"use client";

import { Text as KonvaText } from "react-konva";
import type { CanvasElement } from "@/types/teardown";

export default function TextShape({ el }: { el: Extract<CanvasElement, { type: "text" }> }) {
  const fontStyle = [el.fontWeight >= 700 ? "bold" : "", el.italic ? "italic" : ""].filter(Boolean).join(" ") || "normal";
  return (
    <KonvaText
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
      text={el.text} fontFamily={el.fontFamily} fontSize={el.fontSize} fontStyle={fontStyle}
      fill={el.color} align={el.align} lineHeight={el.lineHeight} wrap="word"
    />
  );
}
