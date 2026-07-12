"use client";

import { Rect, Text as KonvaText } from "react-konva";
import type { CanvasElement } from "@/types/teardown";

export default function TableShape({ el }: { el: Extract<CanvasElement, { type: "table" }> }) {
  if (el.rows.length === 0) return null;
  const rowH = el.h / el.rows.length;
  const colCount = el.rows[0].length;
  const colW = el.w / colCount;
  return (
    <>
      {el.rows.map((row, ri) => (
        <Rect key={`bg-${ri}`} x={el.x} y={el.y + ri * rowH} width={el.w} height={rowH}
          fill={ri % 2 === 0 ? "#FFFFFF" : "#FBF0EB"} stroke="#E8DDD2" strokeWidth={1} />
      ))}
      {el.rows.map((row, ri) =>
        row.map((cell, ci) => (
          <KonvaText
            key={`${ri}-${ci}`}
            x={el.x + ci * colW + 8} y={el.y + ri * rowH + rowH / 2 - 7}
            width={colW - 16} height={16}
            text={cell} fontSize={11} fill="#1C1412" fontFamily="Arial" wrap="none" ellipsis
          />
        ))
      )}
    </>
  );
}
