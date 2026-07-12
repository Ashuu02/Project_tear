import type { CanvasElement, CanvasSlide, DeckTheme } from "@/types/teardown";
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "@/lib/deckThemes";

// Re-theming an already-edited canvas can't just re-run deckSlideToCanvasSlide (that would
// wipe any text/position/data edits the user has made). Instead, swap only the exact colors
// and fonts that came from the OLD theme's palette — anything the user customized to a color
// outside that palette is left untouched. Imperfect (a manually-picked color that happens to
// match a palette slot gets swapped too) but non-destructive, which matters more here.
type PaletteSlot = keyof DeckTheme["palette"];
const SHAPE_SLOTS: PaletteSlot[] = ["primary", "secondary", "accent", "background", "text", "border", "surface"];
// Several themes' `surface`/`accent`/`background` swatches happen to equal plain white or
// near-white (e.g. Warm Editorial's surface is #FFFFFF, same as the cover title's hardcoded
// white) — swapping text through those slots misfires exactly like that case: a color that's
// white for structural reasons (a card background), not thematic ones, gets "corrected" into
// a dark theme's dark surface color and the text goes invisible. Text only ever legitimately
// carries a primary/secondary/text-role color, so restrict its swap candidates to those.
const TEXT_SLOTS: PaletteSlot[] = ["primary", "secondary", "text"];

function swapColor(color: string, oldTheme: DeckTheme, newTheme: DeckTheme, slots: PaletteSlot[]): string {
  const oldP = oldTheme.palette;
  const newP = newTheme.palette;
  const match = slots.find((slot) => oldP[slot].toLowerCase() === color.toLowerCase());
  return match ? newP[match] : color;
}

function swapFont(font: string, oldTheme: DeckTheme, newTheme: DeckTheme): string {
  if (font === oldTheme.fontHeading) return newTheme.fontHeading;
  if (font === oldTheme.fontBody) return newTheme.fontBody;
  return font;
}

export function rethemeElement(el: CanvasElement, oldTheme: DeckTheme, newTheme: DeckTheme): CanvasElement {
  if (el.type === "text") {
    return {
      ...el,
      color: swapColor(el.color, oldTheme, newTheme, TEXT_SLOTS),
      fontFamily: swapFont(el.fontFamily, oldTheme, newTheme),
    };
  }
  if (el.type === "shape") {
    return {
      ...el,
      fill: swapColor(el.fill, oldTheme, newTheme, SHAPE_SLOTS),
      stroke: el.stroke ? swapColor(el.stroke, oldTheme, newTheme, SHAPE_SLOTS) : el.stroke,
    };
  }
  return el;
}

// Cover slides always paint a full-bleed dark overlay over the theme background (see
// deckSlideToCanvasSlide's "cover" case), reusing the *text* color slot as a stand-in for
// "dark" on themes that aren't inherently dark — e.g. Warm Editorial's cover overlay is
// filled with its `text` color (#1C1412, near-black), not `background`. The generic
// swapColor heuristic doesn't know that convention: it just sees a shape filled with the
// old theme's text color and maps it to the new theme's text color, which for a light
// theme like Light Minimal is near-white — a fine "text" color, a broken cover background.
// Recompute that one shape with the same rule the converter used, instead of swapping it.
function isFullBleedShape(el: CanvasElement): el is Extract<CanvasElement, { type: "shape" }> {
  return el.type === "shape" && el.x <= 5 && el.y <= 5 && el.w >= SLIDE_WIDTH * 0.9 && el.h >= SLIDE_HEIGHT * 0.9;
}

function coverOverlayFill(theme: DeckTheme): string {
  return theme.key === "dark" || theme.key === "midnight" ? theme.palette.background : theme.palette.text;
}

export function rethemeSlide(slide: CanvasSlide, oldTheme: DeckTheme, newTheme: DeckTheme): CanvasSlide {
  const isCover = slide.sourceSlideType === "cover";
  let sawFullBleed = false;

  const elements = slide.elements.map((el) => {
    if (isCover && !sawFullBleed && isFullBleedShape(el)) {
      sawFullBleed = true;
      return { ...el, fill: coverOverlayFill(newTheme) };
    }
    return rethemeElement(el, oldTheme, newTheme);
  });

  return {
    ...slide,
    background: slide.background.type === "solid"
      ? { ...slide.background, value: swapColor(slide.background.value, oldTheme, newTheme, SHAPE_SLOTS) }
      : slide.background,
    elements,
  };
}
