"use client";

import { Image as KonvaImage, Rect } from "react-konva";
import { useKonvaImage } from "@/components/deck-editor/useKonvaImage";
import type { CanvasElement } from "@/types/teardown";

type ImageElement = Extract<CanvasElement, { type: "image" }>;

export default function CanvasImageShape({ el }: { el: ImageElement }) {
  const image = useKonvaImage(el.src);

  if (!image) {
    return <Rect x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation} fill="#F5EFE4" stroke="#E8DDD2" strokeWidth={1} />;
  }

  const hasCrop = el.cropW !== undefined && el.cropH !== undefined;
  return (
    <KonvaImage
      x={el.x} y={el.y} width={el.w} height={el.h} rotation={el.rotation}
      image={image}
      crop={hasCrop ? { x: el.cropX ?? 0, y: el.cropY ?? 0, width: el.cropW!, height: el.cropH! } : undefined}
    />
  );
}
