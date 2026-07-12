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
import DeckEditorCanvas from "@/components/deck-editor/DeckEditorCanvas";
import PropertiesPanel, { type ElementPropsPatch } from "@/components/deck-editor/PropertiesPanel";
import InsertPanel from "@/components/deck-editor/InsertPanel";
import ThemeSwitcher from "@/components/deck-editor/ThemeSwitcher";
import SlideNavigator from "@/components/deck-editor/SlideNavigator";
import ExportMenu from "@/components/deck-editor/ExportMenu";
import OffscreenSlideCapture from "@/components/deck-editor/OffscreenSlideCapture";
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

  const [ready, setReady]               = useState(false);
  const [seeding, setSeeding]           = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scale, setScale]               = useState(0.5);
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
  const [magicDesignBusy, setMagicDesignBusy] = useState(false);
  const [improveSlideBusy, setImproveSlideBusy] = useState(false);
  const [captureSlide, setCaptureSlide] = useState<CanvasSlide | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainStageRef = useRef<Konva.Stage | null>(null);
  const captureResolveRef = useRef<((url: string) => void) | null>(null);
  const initializedRef = useRef(false);
  const skipNextAutosaveRef = useRef(true); // don't autosave the instant we finish seeding
  const clipboardRef = useRef<CanvasElement[]>([]);

  const history = useHistoryState<CanvasSlide[]>([]);
  const slides = history.state;
  const total = slides.length;
  const slide = slides[currentSlide];

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

  // A drag/resize/multi-panel canvas editor doesn't translate to a phone screen — rather
  // than cram it in, point small viewports at the read-only viewer instead.
  const MOBILE_BREAKPOINT = 900;
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function checkWidth() { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const fitToContainer = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const padding = 48;
    const availW = el.clientWidth - padding;
    const availH = el.clientHeight - padding;
    setScale(Math.min(availW / SLIDE_WIDTH, availH / SLIDE_HEIGHT, 1));
  }, []);

  useEffect(() => {
    fitToContainer();
    window.addEventListener("resize", fitToContainer);
    return () => window.removeEventListener("resize", fitToContainer);
  }, [fitToContainer]);

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

  // ── AI: Magic Design + Improve this slide ──────────────────────────────────
  const handleMagicDesign = useCallback(async () => {
    if (!productName || !researchDoc) return;
    if (!window.confirm(`This replaces all ${total} slides with a new AI-generated layout. This can be undone with Cmd/Ctrl+Z. Continue?`)) return;
    setMagicDesignBusy(true);
    try {
      const res = await fetch("/api/deck/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName, researchDoc, model: selectedModel ?? "claude",
          themeKey: appliedTheme.key, sessionId,
        }),
      });
      const data = await res.json() as { canvasSlides?: CanvasSlide[] };
      if (data.canvasSlides && data.canvasSlides.length > 0) {
        history.commit(() => data.canvasSlides!);
        setCurrentSlide(0);
        setSelectedIds(new Set());
      }
    } catch {
      // Non-fatal — user can retry.
    } finally {
      setMagicDesignBusy(false);
    }
  }, [productName, researchDoc, selectedModel, appliedTheme, sessionId, total, history]);

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

  if (isMobile) {
    return (
      <div className="h-screen bg-tear-bg flex flex-col items-center justify-center gap-4 px-8 text-center font-dm-sans">
        <span className="text-3xl">🖥️</span>
        <p className="text-[15px] font-medium text-tear-text">The deck editor works best on a larger screen</p>
        <p className="text-[13px] text-tear-muted max-w-xs">Drag, resize, and multi-panel editing need more room than this screen has. View the finished deck instead.</p>
        <Link
          href={`/deck/${sessionId}`}
          className="mt-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-tear-primary rounded-lg hover:bg-tear-primary-dark transition-colors"
        >
          View deck →
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#2B2724] flex flex-col font-dm-sans text-tear-text overflow-hidden">
      <link rel="stylesheet" href={buildGoogleFontsHref()} />

      <nav className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-black/20 bg-[#221F1D]">
        <div className="flex items-center gap-4">
          <Link href={`/deck/${sessionId}`} className="flex items-center gap-2 text-white/70 hover:text-white text-[13px] transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 7h-9M6 3.5 2.5 7 6 10.5" />
            </svg>
            Read-only viewer
          </Link>
          <span className="text-white/30">·</span>
          <span className="text-[13px] text-white/70">{productName} · Deck Editor (preview)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/30 w-14 text-right">
            {autosaveStatus === "saving" && "Saving…"}
            {autosaveStatus === "saved" && "Saved"}
            {autosaveStatus === "error" && <span className="text-red-400/70">Save failed</span>}
          </span>
          <button
            onClick={handleMagicDesign}
            disabled={magicDesignBusy || !researchDoc}
            title={researchDoc ? "AI-generate a full deck layout from your research" : "No research document available"}
            className="px-3 py-1 text-[12px] font-medium text-white bg-gradient-to-r from-[#5B3FC8] to-[#C2451E] rounded-md hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {magicDesignBusy ? "Designing…" : "✨ Magic Design"}
          </button>
          <ThemeSwitcher activeTheme={appliedTheme} onApply={handleApplyTheme} />
          <button onClick={history.undo} disabled={!history.canUndo}
            className="px-2.5 py-1 text-[12px] text-white/70 border border-white/15 rounded-md hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Undo
          </button>
          <button onClick={history.redo} disabled={!history.canRedo}
            className="px-2.5 py-1 text-[12px] text-white/70 border border-white/15 rounded-md hover:border-white/40 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            Redo
          </button>
          <span className="text-[11px] text-white/40 font-mono">Slide {currentSlide + 1} / {total}</span>
          <ExportMenu
            busyLabel={exportBusy}
            onDownloadPptx={handleDownloadPptx}
            onDownloadPdf={handleDownloadPdf}
            onDownloadPng={handleDownloadPng}
          />
        </div>
      </nav>

      <OffscreenSlideCapture slide={captureSlide} onCaptured={handleSlideCaptured} />

      <div className="flex-1 flex overflow-hidden">
        <InsertPanel
          theme={theme}
          productName={productName}
          researchDoc={researchDoc}
          currentSlide={slide}
          nextZIndex={slide ? Math.max(0, ...slide.elements.map((el) => el.zIndex)) + 1 : 0}
          onInsertElement={handleInsertElement}
          onInsertSlide={handleInsertSlide}
        />

        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-hidden">
          {slide ? (
            <div
              className="bg-white shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
              style={{ width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }}
            >
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
            <span className="text-sm text-white/50 animate-pulse">No deck data. Generate a deck first.</span>
          )}
        </div>

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
          />
        )}
      </div>

      <SlideNavigator
        slides={slides}
        currentSlide={currentSlide}
        onSelectSlide={setCurrentSlide}
        onReorderSlides={handleReorderSlides}
        onDuplicateSlide={handleDuplicateSlide}
        onDeleteSlide={handleDeleteSlide}
        onAddSlide={handleAddSlide}
      />
    </div>
  );
}
