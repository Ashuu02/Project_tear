"use client";

import dynamic from "next/dynamic";
import type Konva from "konva";
import type { CanvasSlide } from "@/types/teardown";
import type { ElementPatch } from "@/components/deck-editor/EditableElement";

const KonvaCanvasInner = dynamic(() => import("@/components/deck-editor/KonvaCanvasInner"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center text-sm text-tear-muted animate-pulse">Loading canvas…</div>,
});

interface DeckEditorCanvasProps {
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

export default function DeckEditorCanvas(props: DeckEditorCanvasProps) {
  return <KonvaCanvasInner {...props} />;
}
