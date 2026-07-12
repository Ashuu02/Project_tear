import type { DeckTheme } from "@/types/teardown";

// One shared px-per-inch constant so the canvas editor and the PPTX export
// (13.333in x 7.5in "LAYOUT_WIDE") agree pixel-for-pixel.
export const PX_PER_INCH = 96;
export const SLIDE_WIDTH_IN = 13.333;
export const SLIDE_HEIGHT_IN = 7.5;
export const SLIDE_WIDTH = Math.round(SLIDE_WIDTH_IN * PX_PER_INCH);   // 1280
export const SLIDE_HEIGHT = Math.round(SLIDE_HEIGHT_IN * PX_PER_INCH); // 720

export function inch(v: number): number {
  return Math.round(v * PX_PER_INCH);
}

export const DECK_THEMES: DeckTheme[] = [
  {
    key: "dark",
    name: "Dark Executive",
    palette: {
      primary: "#C2451E",
      secondary: "#7C6E68",
      accent: "#E8B4A0",
      background: "#18181B",
      text: "#F5F0EA",
      border: "#332F2D",
      surface: "#232326",
    },
    fontHeading: "Playfair Display",
    fontBody: "Inter",
  },
  {
    key: "light",
    name: "Light Minimal",
    palette: {
      primary: "#C2451E",
      secondary: "#7C6E68",
      accent: "#F5EFE4",
      background: "#FFFFFF",
      text: "#1C1412",
      border: "#E8DDD2",
      surface: "#FFFFFF",
    },
    fontHeading: "Inter",
    fontBody: "Inter",
  },
  {
    key: "gradient",
    name: "Gradient Modern",
    palette: {
      primary: "#5B3FC8",
      secondary: "#2D7EE7",
      accent: "#EAF2FF",
      background: "#FFFFFF",
      text: "#1C1412",
      border: "#D9E4F5",
      surface: "#F7FAFF",
    },
    fontHeading: "Poppins",
    fontBody: "Inter",
  },
  {
    key: "warm",
    name: "Warm Editorial",
    palette: {
      primary: "#C2451E",
      secondary: "#7C6E68",
      accent: "#FBF0EB",
      background: "#F5EFE4",
      text: "#1C1412",
      border: "#E8DDD2",
      surface: "#FFFFFF",
    },
    fontHeading: "Lora",
    fontBody: "DM Sans",
  },
  {
    key: "midnight",
    name: "Midnight Tech",
    palette: {
      primary: "#4C8DFF",
      secondary: "#8B93A7",
      accent: "#1E2A44",
      background: "#0F1420",
      text: "#F0F4FA",
      border: "#232D42",
      surface: "#161C2B",
    },
    fontHeading: "Space Grotesk",
    fontBody: "IBM Plex Sans",
  },
  {
    key: "sage",
    name: "Sage Editorial",
    palette: {
      primary: "#4A6B4D",
      secondary: "#8A9A85",
      accent: "#E4E8DE",
      background: "#F6F5F0",
      text: "#1F2A1D",
      border: "#DDE2D6",
      surface: "#FFFFFF",
    },
    fontHeading: "Fraunces",
    fontBody: "Work Sans",
  },
];

export function getThemeByKey(key: string | undefined): DeckTheme {
  return DECK_THEMES.find((t) => t.key === key) ?? DECK_THEMES[3]; // default: Warm Editorial
}

// Konva draws text on a <canvas>, matching fontFamily against whatever font families the
// browser has actually loaded — so we load the literal Google Fonts family names via a
// stylesheet link (next/font/google renames families internally for self-hosting, which
// would break that name match) rather than next/font. Scoped to the editor route only.
export function buildGoogleFontsHref(): string {
  const families = Array.from(new Set(DECK_THEMES.flatMap((t) => [t.fontHeading, t.fontBody])));
  const query = families
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
