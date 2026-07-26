"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@/store/session";
import { getMockDeckData } from "@/data/mockPipeline";
import { deckDataToCanvasSlides, deckSlideToCanvasSlide } from "@/lib/deckSlideToCanvasSlide";
import { getBlankSlide } from "@/lib/blankSlideTemplates";
import { DECK_THEMES, SLIDE_WIDTH, SLIDE_HEIGHT, buildGoogleFontsHref, getThemeByKey } from "@/lib/deckThemes";
import { rethemeSlide } from "@/lib/retheme";
import { downloadPptxFromCanvas } from "@/lib/downloadPptx";
import { downloadDeckPdf } from "@/lib/downloadDeckPdf";
import { downloadDataUrl } from "@/lib/downloadPng";
import { useHistoryState } from "@/lib/useHistoryState";
import { useElementSize } from "@/hooks/useElementSize";
import { useViewportWidth } from "@/hooks/useViewportWidth";
import stageStyles from "@/components/deck-editor/DeckStage.module.css";
import DeckEditorCanvas from "@/components/deck-editor/DeckEditorCanvas";
import PropertiesPanel, { type ElementPropsPatch } from "@/components/deck-editor/PropertiesPanel";
import InsertPanel from "@/components/deck-editor/InsertPanel";
import SlideNavigator from "@/components/deck-editor/SlideNavigator";
import ExportMenu from "@/components/deck-editor/ExportMenu";
import TokenUsagePopover from "@/components/deck-editor/TokenUsagePopover";
import OffscreenSlideCapture from "@/components/deck-editor/OffscreenSlideCapture";
import EditorOrientationBar from "@/components/deck-editor/EditorOrientationBar";
import PresentMode from "@/components/deck-editor/PresentMode";
import PostDownloadConfirmation from "@/components/deck-editor/PostDownloadConfirmation";
import MobileSheet from "@/components/deck-editor/MobileSheet";
import EditorNavOverflowMenu from "@/components/deck-editor/EditorNavOverflowMenu";
import SlideNavBar from "@/components/deck-editor/SlideNavBar";
import DeckEndCard from "@/components/deck-editor/DeckEndCard";
import type Konva from "konva";
import type { CanvasElement, CanvasSlide, DeckTheme } from "@/types/teardown";
import type { ElementPatch } from "@/components/deck-editor/EditableElement";

const AUTOSAVE_DEBOUNCE_MS = 1500;

const NUDGE = 1;
const NUDGE_FAST = 10;

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

function groupMembersOf(slide: CanvasSlide, id: string): string[] {
  const el = slide.elements.find((e) => e.id === id);
  if (!el?.groupId) return [id];
  return slide.elements.filter((e) => e.groupId === el.groupId).map((e) => e.id);
}

function mapSlide(slides: CanvasSlide[], index: number, fn: (elements: CanvasElement[]) => CanvasElement[]): CanvasSlide[] {
  return slides.map((s, i) => (i !== index ? s : { ...s, elements: fn(s.elements) }));
}

export default function DeckEditPage() {
  const router      = useRouter();
  const productName = useSessionStore((s) => s.productName);
  const sessionId   = useSessionStore((s) => s.sessionId);
  const deckData    = useSessionStore((s) => s.deckData);
  const researchDoc = useSessionStore((s) => s.researchDoc);
  const selectedModel = useSessionStore((s) => s.selectedModel);
  const deckThemeKey  = useSessionStore((s) => s.deckThemeKey);
  const setToolPanelCollapsed = useSessionStore((s) => s.setToolPanelCollapsed);

  const [ready, setReady]               = useState(false);
  const [seeding, setSeeding]           = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  // Fallback only — used when the current slide's background doesn't exactly match any
  // theme's palette (e.g. a brand-new deck before any theme's been explicitly applied).
  // Undo/redo isn't tracked here on purpose: appliedTheme itself is *derived* from slide
  // data below, so it naturally stays in sync when the user undoes a theme switch instead
  // of silently drifting the way separate untracked state would.
  // Seeded from the theme picked in deck-config, if any — falls back to Warm Editorial for
  // decks that skipped that step (e.g. the read-only viewer's demo path).
  const [themeFallback, setThemeFallback] = useState<DeckTheme>(() => getThemeByKey(deckThemeKey ?? undefined));
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [exportBusy, setExportBusy]     = useState<string | null>(null);
  const [improveSlideBusy, setImproveSlideBusy] = useState(false);
  const [presenting, setPresenting]     = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [captureSlide, setCaptureSlide] = useState<CanvasSlide | null>(null);
  const [stageRef, stageSize] = useElementSize<HTMLDivElement>();
  // Fall back to a sane default size until the stage is actually measured, rather than 0 —
  // a hard "wait for a real measurement" gate means any hiccup in that measurement (a missed
  // observer callback, a timing quirk) leaves the canvas permanently blank with no way to
  // recover. Defaulting instead means the canvas is always visible, and simply snaps to the
  // correct size the moment a real measurement comes in.
  const slideWidth = stageSize.width > 0 && stageSize.height > 0
    ? Math.min(stageSize.width, stageSize.height * (SLIDE_WIDTH / SLIDE_HEIGHT), 1080)
    : 960;
  const slideHeight = slideWidth * (SLIDE_HEIGHT / SLIDE_WIDTH);
  const scale = slideWidth / SLIDE_WIDTH;
  const mainStageRef = useRef<Konva.Stage | null>(null);
  const captureResolveRef = useRef<((url: string) => void) | null>(null);
  const initializedRef = useRef(false);
  const skipNextAutosaveRef = useRef(true); // don't autosave the instant we finish seeding
  const clipboardRef = useRef<CanvasElement[]>([]);

  const history = useHistoryState<CanvasSlide[]>([]);
  const slides = history.state;
  const total = slides.length;
  const slide = slides[currentSlide];
  const isLastSlide = total > 0 && currentSlide === total - 1;
  const sourcesSlide = deckData?.slides.find((s) => s.type === "sources");
  const sourcesCount = researchDoc?.sources?.length ?? sourcesSlide?.sources?.length ?? 0;

  const appliedTheme = useMemo(() => {
    const bg = slide?.background;
    if (bg?.type === "solid") {
      const match = DECK_THEMES.find((t) => t.palette.background.toLowerCase() === bg.value.toLowerCase());
      if (match) return match;
    }
    return themeFallback;
  }, [slide, themeFallback]);
  const theme = appliedTheme;

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready && !productName) router.replace("/");
  }, [ready, productName, router]);

  // Seed editable slide state exactly once — recomputing from `deck` on every render
  // would silently discard the user's in-progress edits. Prefer a previously-autosaved
  // canvas over a fresh conversion, so reloading the editor restores real edits.
  useEffect(() => {
    if (initializedRef.current || !productName || !sessionId) return;
    initializedRef.current = true;
    (async () => {
      let loaded: CanvasSlide[] | null = null;
      try {
        const res = await fetch(`/api/deck/canvas?sessionId=${encodeURIComponent(sessionId)}`);
        const data = await res.json() as { canvasSlides?: CanvasSlide[] };
        if (data.canvasSlides && data.canvasSlides.length > 0) loaded = data.canvasSlides;
      } catch {
        // Fall through to a fresh conversion — autosave will pick up from here.
      }
      if (loaded) {
        history.reset(loaded);
      } else {
        const deck = deckData ?? getMockDeckData(productName);
        history.reset(deckDataToCanvasSlides(deck.slides, theme));
      }
      skipNextAutosaveRef.current = true;
      setSeeding(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productName, sessionId, deckData]);

  // ── Autosave ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!initializedRef.current || slides.length === 0 || !sessionId) return;
    if (skipNextAutosaveRef.current) { skipNextAutosaveRef.current = false; return; }

    setAutosaveStatus("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/deck/canvas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, canvasSlides: slides }),
        });
        const data = await res.json() as { saved?: boolean };
        setAutosaveStatus(data.saved ? "saved" : "error");
      } catch {
        setAutosaveStatus("error");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [slides, sessionId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentSlide]);

  const viewportWidth = useViewportWidth();
  const isBelow1024 = viewportWidth < 1024;
  const [mobileSheet, setMobileSheet] = useState<"tools" | "properties" | null>(null);

  // Tools panel defaults to collapsed on narrower desktop/tablet viewports (1024–1280px), then
  // is fully user-controlled from there — this only needs to run once, on first mount.
  const toolPanelDefaultAppliedRef = useRef(false);
  useEffect(() => {
    if (toolPanelDefaultAppliedRef.current) return;
    toolPanelDefaultAppliedRef.current = true;
    if (window.innerWidth < 1280) setToolPanelCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevSlide = useCallback(() => setCurrentSlide((s) => Math.max(0, s - 1)), []);
  const nextSlide = useCallback(() => setCurrentSlide((s) => Math.min(total - 1, s + 1)), [total]);

  // ── Selection ──────────────────────────────────────────────────────────────
  const handleSelect = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (!slide) return prev;
      const members = groupMembersOf(slide, id);
      if (!additive) return new Set(members);
      const next = new Set(prev);
      const allSelected = members.every((m) => next.has(m));
      members.forEach((m) => (allSelected ? next.delete(m) : next.add(m)));
      return next;
    });
  }, [slide]);

  const handleMarqueeSelect = useCallback((ids: string[]) => {
    if (!slide) return;
    const expanded = new Set<string>();
    ids.forEach((id) => groupMembersOf(slide, id).forEach((m) => expanded.add(m)));
    setSelectedIds(expanded);
  }, [slide]);

  const handleDeselectAll = useCallback(() => setSelectedIds(new Set()), []);

  // ── Element mutation ──────────────────────────────────────────────────────
  const handleLiveDrag = useCallback((id: string, patch: ElementPatch) => {
    if (patch.x === undefined || patch.y === undefined) return;
    history.setLive((prev) => {
      const s = prev[currentSlide];
      const dragged = s?.elements.find((e) => e.id === id);
      if (!dragged) return prev;
      const dx = patch.x! - dragged.x;
      const dy = patch.y! - dragged.y;
      const idsToMove = selectedIds.has(id) && selectedIds.size > 1 ? selectedIds : new Set([id]);
      return mapSlide(prev, currentSlide, (els) =>
        els.map((e) => (idsToMove.has(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e))
      );
    });
  }, [currentSlide, selectedIds, history]);

  const handleChangeElement = useCallback((id: string, patch: ElementPatch) => {
    const isTransform = patch.w !== undefined || patch.h !== undefined || patch.rotation !== undefined;
    history.commit((prev) => {
      const s = prev[currentSlide];
      const target = s?.elements.find((e) => e.id === id);
      if (!target) return prev;
      if (isTransform || !(selectedIds.has(id) && selectedIds.size > 1)) {
        return mapSlide(prev, currentSlide, (els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      }
      // Plain drag end while multiple elements are selected — move the whole selection.
      const dx = (patch.x ?? target.x) - target.x;
      const dy = (patch.y ?? target.y) - target.y;
      return mapSlide(prev, currentSlide, (els) =>
        els.map((e) => (selectedIds.has(e.id) ? { ...e, x: e.x + dx, y: e.y + dy } : e))
      );
    });
  }, [currentSlide, selectedIds, history]);

  const handleDeleteElements = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    history.commit((prev) => mapSlide(prev, currentSlide, (els) => els.filter((el) => !idSet.has(el.id))));
    setSelectedIds(new Set());
  }, [currentSlide, history]);

  const handleUpdateElements = useCallback((ids: string[], patch: ElementPropsPatch) => {
    const idSet = new Set(ids);
    history.commit((prev) => mapSlide(prev, currentSlide, (els) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      els.map((el) => (idSet.has(el.id) ? ({ ...el, ...patch } as any) : el))
    ));
  }, [currentSlide, history]);

  const handleReorder = useCallback((ids: string[], action: "front" | "back" | "forward" | "backward") => {
    const idSet = new Set(ids);
    history.commit((prev) => mapSlide(prev, currentSlide, (els) => {
      const ordered = [...els].sort((a, b) => a.zIndex - b.zIndex);
      const selectedOrdered = ordered.filter((el) => idSet.has(el.id));
      const rest = ordered.filter((el) => !idSet.has(el.id));
      let next: CanvasElement[];
      if (action === "front") next = [...rest, ...selectedOrdered];
      else if (action === "back") next = [...selectedOrdered, ...rest];
      else {
        next = [...ordered];
        const step = action === "forward" ? 1 : -1;
        // Walk from the edge in the direction of movement so consecutive selected
        // elements shift together instead of leapfrogging each other.
        const indices = selectedOrdered.map((el) => next.indexOf(el));
        const walk = step === 1 ? [...indices].reverse() : indices;
        for (const i of walk) {
          const j = i + step;
          if (j < 0 || j >= next.length || idSet.has(next[j].id)) continue;
          [next[i], next[j]] = [next[j], next[i]];
        }
      }
      return next.map((el, i) => ({ ...el, zIndex: i }));
    }));
  }, [currentSlide, history]);

  const handleToggleLock = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    history.commit((prev) => {
      const s = prev[currentSlide];
      const allLocked = s?.elements.filter((e) => idSet.has(e.id)).every((e) => e.locked) ?? false;
      return mapSlide(prev, currentSlide, (els) => els.map((el) => (idSet.has(el.id) ? { ...el, locked: !allLocked } : el)));
    });
  }, [currentSlide, history]);

  const handleToggleHidden = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    history.commit((prev) => {
      const s = prev[currentSlide];
      const allHidden = s?.elements.filter((e) => idSet.has(e.id)).every((e) => e.hidden) ?? false;
      return mapSlide(prev, currentSlide, (els) => els.map((el) => (idSet.has(el.id) ? { ...el, hidden: !allHidden } : el)));
    });
  }, [currentSlide, history]);

  const handleChangeBackground = useCallback((bg: CanvasSlide["background"]) => {
    history.commit((prev) => prev.map((s, i) => (i !== currentSlide ? s : { ...s, background: bg })));
  }, [currentSlide, history]);

  // ── Insert ────────────────────────────────────────────────────────────────
  const handleInsertElement = useCallback((el: CanvasElement) => {
    history.commit((prev) => mapSlide(prev, currentSlide, (els) => [...els, el]));
    setSelectedIds(new Set([el.id]));
  }, [currentSlide, history]);

  const handleInsertSlide = useCallback((newSlide: CanvasSlide) => {
    history.commit((prev) => [...prev.slice(0, currentSlide + 1), newSlide, ...prev.slice(currentSlide + 1)]);
    setCurrentSlide((i) => i + 1);
  }, [currentSlide, history]);

  // ── Export ───────────────────────────────────────────────────────────────
  const handleDownloadPptx = useCallback(async () => {
    if (!productName || slides.length === 0) return;
    setExportBusy("Exporting…");
    try {
      await downloadPptxFromCanvas(productName, slides, sessionId);
      setDownloadComplete(true);
    } catch {
      // Non-fatal — user can retry.
    } finally {
      setExportBusy(null);
    }
  }, [productName, slides, sessionId]);

  const handleDownloadPng = useCallback(async () => {
    if (!slide) return;
    setExportBusy("Exporting…");
    try {
      setSelectedIds(new Set()); // no Transformer handles in the exported image
      await new Promise((r) => setTimeout(r, 100)); // let the deselect re-render land
      const stage = mainStageRef.current;
      if (!stage) return;
      const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
      downloadDataUrl(dataUrl, `${productName.replace(/\s+/g, "-").toLowerCase()}-slide-${currentSlide + 1}.png`);
    } finally {
      setExportBusy(null);
    }
  }, [slide, productName, currentSlide]);

  const captureSlideAsync = useCallback((s: CanvasSlide): Promise<string> => {
    return new Promise((resolve) => {
      captureResolveRef.current = resolve;
      setCaptureSlide(s);
    });
  }, []);

  const handleSlideCaptured = useCallback((dataUrl: string) => {
    captureResolveRef.current?.(dataUrl);
    captureResolveRef.current = null;
    setCaptureSlide(null);
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    if (!productName || slides.length === 0) return;
    setExportBusy(`Rendering 1/${slides.length}…`);
    try {
      const images: string[] = [];
      for (let i = 0; i < slides.length; i++) {
        setExportBusy(`Rendering ${i + 1}/${slides.length}…`);
        images.push(await captureSlideAsync(slides[i]));
      }
      setExportBusy("Assembling PDF…");
      await downloadDeckPdf(productName, images);
    } finally {
      setExportBusy(null);
    }
  }, [productName, slides, captureSlideAsync]);

  // ── AI: Improve this slide ──────────────────────────────────────────────────
  const handleImproveSlide = useCallback(async () => {
    if (!productName || !slide) return;
    setImproveSlideBusy(true);
    try {
      const res = await fetch("/api/deck/improve-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, slide, model: selectedModel ?? "claude", sessionId }),
      });
      const data = await res.json() as { slide?: CanvasSlide };
      if (data.slide) {
        const improved = data.slide;
        history.commit((prev) => prev.map((s, i) => (i !== currentSlide ? s : improved)));
      }
    } catch {
      // Non-fatal — user can retry.
    } finally {
      setImproveSlideBusy(false);
    }
  }, [productName, slide, selectedModel, sessionId, currentSlide, history]);

  // ── Theme ────────────────────────────────────────────────────────────────
  const handleApplyTheme = useCallback((newTheme: DeckTheme) => {
    history.commit((prev) => prev.map((s) => rethemeSlide(s, appliedTheme, newTheme)));
    setThemeFallback(newTheme);
  }, [appliedTheme, history]);

  // ── Slide navigator ────────────────────────────────────────────────────────
  const handleReorderSlides = useCallback((fromIndex: number, toIndex: number) => {
    history.commit((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setCurrentSlide(toIndex);
  }, [history]);

  const handleDuplicateSlide = useCallback((index: number) => {
    history.commit((prev) => {
      const source = prev[index];
      const idMap = new Map<string, string>();
      const clonedElements = source.elements.map((el) => {
        const newId = crypto.randomUUID();
        idMap.set(el.id, newId);
        return { ...el, id: newId };
      }).map((el) => ({ ...el, groupId: el.groupId ? (idMap.get(el.groupId) ?? el.groupId) : undefined }));
      const clone: CanvasSlide = { ...source, id: crypto.randomUUID(), elements: clonedElements };
      return [...prev.slice(0, index + 1), clone, ...prev.slice(index + 1)];
    });
    setCurrentSlide(index + 1);
  }, [history]);

  const handleDeleteSlide = useCallback((index: number) => {
    history.commit((prev) => prev.filter((_, i) => i !== index));
    setCurrentSlide((i) => Math.max(0, Math.min(i, total - 2)));
  }, [history, total]);

  const handleAddSlide = useCallback(() => {
    if (!productName) return;
    const newSlide = deckSlideToCanvasSlide(getBlankSlide("bullets", productName), appliedTheme, 0);
    history.commit((prev) => [...prev, newSlide]);
    setCurrentSlide(total);
  }, [productName, appliedTheme, history, total]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo(); else history.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); history.redo(); return; }

      if (selectedIds.size === 0) {
        if (e.key === "ArrowLeft") prevSlide();
        if (e.key === "ArrowRight") nextSlide();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDeleteElements(Array.from(selectedIds));
        return;
      }

      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const maxZ = Math.max(0, ...(slide?.elements.map((el) => el.zIndex) ?? [0]));
        const idMap = new Map<string, string>();
        const clones = (slide?.elements.filter((el) => selectedIds.has(el.id)) ?? []).map((el, i) => {
          const newId = crypto.randomUUID();
          idMap.set(el.id, newId);
          return { ...el, id: newId, x: el.x + 16, y: el.y + 16, zIndex: maxZ + 1 + i };
        }).map((el) => ({ ...el, groupId: el.groupId ? (idMap.get(el.groupId) ?? crypto.randomUUID()) : undefined }));
        history.commit((prev) => mapSlide(prev, currentSlide, (els) => [...els, ...clones]));
        setSelectedIds(new Set(clones.map((c) => c.id)));
        return;
      }

      if (mod && e.key.toLowerCase() === "c") {
        clipboardRef.current = slide?.elements.filter((el) => selectedIds.has(el.id)) ?? [];
        return;
      }

      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        if (clipboardRef.current.length === 0) return;
        const maxZ = Math.max(0, ...(slide?.elements.map((el) => el.zIndex) ?? [0]));
        const idMap = new Map<string, string>();
        const clones = clipboardRef.current.map((el, i) => {
          const newId = crypto.randomUUID();
          idMap.set(el.id, newId);
          return { ...el, id: newId, x: el.x + 16, y: el.y + 16, zIndex: maxZ + 1 + i };
        }).map((el) => ({ ...el, groupId: el.groupId ? (idMap.get(el.groupId) ?? crypto.randomUUID()) : undefined }));
        history.commit((prev) => mapSlide(prev, currentSlide, (els) => [...els, ...clones]));
        setSelectedIds(new Set(clones.map((c) => c.id)));
        return;
      }

      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) {
          history.commit((prev) => mapSlide(prev, currentSlide, (els) =>
            els.map((el) => (selectedIds.has(el.id) ? { ...el, groupId: undefined } : el))
          ));
        } else if (selectedIds.size > 1) {
          const groupId = crypto.randomUUID();
          history.commit((prev) => mapSlide(prev, currentSlide, (els) =>
            els.map((el) => (selectedIds.has(el.id) ? { ...el, groupId } : el))
          ));
        }
        return;
      }

      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const d = e.shiftKey ? NUDGE_FAST : NUDGE;
        const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
        const dy = e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0;
        history.commit((prev) => mapSlide(prev, currentSlide, (els) =>
          els.map((el) => (selectedIds.has(el.id) ? { ...el, x: el.x + dx, y: el.y + dy } : el))
        ));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIds, slide, currentSlide, history, prevSlide, nextSlide, handleDeleteElements]);

  if (!ready || !productName || seeding) {
    return (
      <div className="h-screen bg-tear-bg flex items-center justify-center font-dm-sans">
        <span className="text-sm text-tear-muted animate-pulse">Loading…</span>
      </div>
    );
  }

  const stageContent = (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={stageRef} className={stageStyles.stage}>
        {slide ? (
          <div className={stageStyles.slideWrapper} style={{ width: slideWidth, height: slideHeight }}>
            <DeckEditorCanvas
              slide={slide} width={SLIDE_WIDTH} height={SLIDE_HEIGHT} scale={scale}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onMarqueeSelect={handleMarqueeSelect}
              onDeselectAll={handleDeselectAll}
              onChangeElement={handleChangeElement}
              onLiveDrag={handleLiveDrag}
              onStageMount={(s) => { mainStageRef.current = s; }}
            />
          </div>
        ) : (
          <span className="text-sm text-tear-muted animate-pulse">No deck data. Generate a deck first.</span>
        )}
      </div>

      {isLastSlide && <DeckEndCard total={total} sourcesCount={sourcesCount} />}
      {total > 0 && <SlideNavBar total={total} currentSlide={currentSlide} onSelectSlide={setCurrentSlide} />}
    </div>
  );

  return (
    <div className="h-screen bg-tear-bg flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <link rel="stylesheet" href={buildGoogleFontsHref()} />

      <nav className="flex-shrink-0 flex items-center justify-between gap-7 px-7 py-3.5 border-b border-tear-border bg-tear-bg">
        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-5 min-w-0">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <svg width="21" height="21" viewBox="0 0 40 40" fill="none">
              <path d="M11 5 H23 L29 11 V29 Q29 32 26 32 H11 Q8 32 8 29 V8 Q8 5 11 5 Z" fill="#FDFAF6" stroke="#C2451E" strokeWidth="2.2" strokeLinejoin="round" />
              <path d="M22.5 5 V11.5 H29" stroke="#C2451E" strokeWidth="2.2" strokeLinejoin="round" fill="none" />
              <circle cx="24" cy="24" r="7" fill="#FDFAF6" stroke="#C2451E" strokeWidth="2.2" />
              <line x1="21" y1="24" x2="27" y2="24" stroke="#C2451E" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="28.9" y1="28.9" x2="34.5" y2="34.5" stroke="#C2451E" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
            <span className="font-lora text-[19px] font-semibold tracking-tight text-tear-text">Tear</span>
          </Link>
          <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
            <Link
              href={`/research/${sessionId}`}
              className="text-[13.5px] font-medium text-tear-primary hover:text-tear-primary-dark min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            >
              {productName} teardown
            </Link>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
              <polyline points="5.5,3.5 9,7 5.5,10.5" stroke="#C4B8B0" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[13.5px] text-tear-muted flex-shrink-0">Deck</span>
          </div>
        </div>

        {/* Center: slide counter — hidden below 768px, folded into the overflow menu instead */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[13px] text-tear-muted">Slide</span>
          <span className="font-mono text-[13px] font-medium text-tear-text">{currentSlide + 1}</span>
          <span className="font-mono text-[13px] text-[#C4B8B0]">/</span>
          <span className="font-mono text-[13px] text-tear-muted">{total}</span>
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
              <polyline points="1.5,5.2 3.6,7.3 8.5,2.4" stroke={autosaveStatus === "error" ? "#B45309" : "#7C6E68"} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`font-mono text-[11.5px] whitespace-nowrap ${autosaveStatus === "error" ? "text-[#B45309]" : "text-tear-muted"}`}>
              {autosaveStatus === "saving" && "Saving…"}
              {autosaveStatus === "saved" && "All changes saved"}
              {autosaveStatus === "error" && "Couldn't save"}
              {autosaveStatus === "idle" && "All changes saved"}
            </span>
          </div>

          <div className="hidden md:block">
            <TokenUsagePopover sessionId={sessionId} />
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            <button
              onClick={history.undo} disabled={!history.canUndo} title="Undo"
              className="w-8 h-8 rounded-lg border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors hover:bg-[#F0E8DF] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M4 8 H11 A3.5 3.5 0 0 1 11 15 H7" stroke={history.canUndo ? "#7C6E68" : "#C4B8B0"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <polyline points="6.8,4.8 3.5,8 6.8,11.2" stroke={history.canUndo ? "#7C6E68" : "#C4B8B0"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={history.redo} disabled={!history.canRedo} title="Redo"
              className="w-8 h-8 rounded-lg border-none bg-transparent flex items-center justify-center cursor-pointer transition-colors hover:bg-[#F0E8DF] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M14 8 H7 A3.5 3.5 0 0 0 7 15 H11" stroke={history.canRedo ? "#7C6E68" : "#C4B8B0"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <polyline points="11.2,4.8 14.5,8 11.2,11.2" stroke={history.canRedo ? "#7C6E68" : "#C4B8B0"} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="hidden md:block w-px h-[22px] bg-tear-border" />

          <button
            onClick={() => setPresenting(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-tear-primary bg-transparent text-tear-primary font-dm-sans text-[13px] font-medium cursor-pointer transition-colors hover:bg-[#FFF7ED] hover:border-tear-primary-dark hover:text-tear-primary-dark"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polygon points="3,2 10,6 3,10" fill="currentColor" /></svg>
            Present
          </button>

          <ExportMenu
            busyLabel={exportBusy}
            onDownloadPptx={handleDownloadPptx}
            onDownloadPdf={handleDownloadPdf}
            onDownloadPng={handleDownloadPng}
          />

          <div className="md:hidden">
            <EditorNavOverflowMenu
              sessionId={sessionId}
              currentSlide={currentSlide}
              totalSlides={total}
              autosaveStatus={autosaveStatus}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={history.undo}
              onRedo={history.redo}
              onPresent={() => setPresenting(true)}
            />
          </div>
        </div>
      </nav>

      <EditorOrientationBar />

      <OffscreenSlideCapture slide={captureSlide} onCaptured={handleSlideCaptured} />

      {isBelow1024 ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {stageContent}

          <div className="flex-shrink-0 flex items-center justify-center gap-2.5 px-4 py-2 border-t border-tear-border bg-tear-panel">
            <button
              onClick={() => setMobileSheet("tools")}
              className="flex-1 max-w-[200px] px-4 py-2 rounded-lg border border-tear-border bg-white text-[13px] font-medium text-tear-text hover:border-tear-primary transition-colors"
            >
              Edit slide
            </button>
            <button
              onClick={() => setMobileSheet("properties")}
              className="flex-1 max-w-[200px] px-4 py-2 rounded-lg border border-tear-border bg-white text-[13px] font-medium text-tear-text hover:border-tear-primary transition-colors"
            >
              Properties
            </button>
          </div>

          <SlideNavigator
            orientation="horizontal"
            slides={slides}
            currentSlide={currentSlide}
            onSelectSlide={setCurrentSlide}
            onReorderSlides={handleReorderSlides}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onAddSlide={handleAddSlide}
          />

          {mobileSheet === "tools" && (
            <MobileSheet title="Edit slide" onClose={() => setMobileSheet(null)}>
              <InsertPanel
                variant="sheet"
                theme={theme}
                productName={productName}
                researchDoc={researchDoc}
                currentSlide={slide}
                nextZIndex={slide ? Math.max(0, ...slide.elements.map((el) => el.zIndex)) + 1 : 0}
                onInsertElement={handleInsertElement}
                onInsertSlide={handleInsertSlide}
              />
            </MobileSheet>
          )}

          {mobileSheet === "properties" && slide && (
            <MobileSheet title="Properties" onClose={() => setMobileSheet(null)}>
              <PropertiesPanel
                variant="sheet"
                slide={slide}
                selectedIds={selectedIds}
                onUpdateElements={handleUpdateElements}
                onReorder={handleReorder}
                onToggleLock={handleToggleLock}
                onToggleHidden={handleToggleHidden}
                onDeleteElements={handleDeleteElements}
                onChangeBackground={handleChangeBackground}
                onImproveSlide={handleImproveSlide}
                improveSlideBusy={improveSlideBusy}
                activeTheme={appliedTheme}
                onApplyTheme={handleApplyTheme}
              />
            </MobileSheet>
          )}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <SlideNavigator
            slides={slides}
            currentSlide={currentSlide}
            onSelectSlide={setCurrentSlide}
            onReorderSlides={handleReorderSlides}
            onDuplicateSlide={handleDuplicateSlide}
            onDeleteSlide={handleDeleteSlide}
            onAddSlide={handleAddSlide}
          />

          <InsertPanel
            theme={theme}
            productName={productName}
            researchDoc={researchDoc}
            currentSlide={slide}
            nextZIndex={slide ? Math.max(0, ...slide.elements.map((el) => el.zIndex)) + 1 : 0}
            onInsertElement={handleInsertElement}
            onInsertSlide={handleInsertSlide}
          />

          {stageContent}

          {slide && (
            <PropertiesPanel
              slide={slide}
              selectedIds={selectedIds}
              onUpdateElements={handleUpdateElements}
              onReorder={handleReorder}
              onToggleLock={handleToggleLock}
              onToggleHidden={handleToggleHidden}
              onDeleteElements={handleDeleteElements}
              onChangeBackground={handleChangeBackground}
              onImproveSlide={handleImproveSlide}
              improveSlideBusy={improveSlideBusy}
              activeTheme={appliedTheme}
              onApplyTheme={handleApplyTheme}
            />
          )}
        </div>
      )}

      {downloadComplete && (
        <PostDownloadConfirmation sessionId={sessionId} onDismiss={() => setDownloadComplete(false)} />
      )}

      {presenting && (
        <PresentMode
          slides={slides}
          currentSlide={currentSlide}
          onNavigate={setCurrentSlide}
          onExit={() => setPresenting(false)}
        />
      )}
    </div>
  );
}
