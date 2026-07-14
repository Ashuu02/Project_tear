import type { CanvasElement, CanvasSlide, DeckSlide, DeckTheme } from "@/types/teardown";
import { inch } from "@/lib/deckThemes";

function newId(): string {
  return crypto.randomUUID();
}

// Parses formatted research stat values ("$400–600M", "30M+", "10%", "$10B") into a
// plain number so they can drive an auto-generated chart. Returns null when the value
// isn't meaningfully numeric (e.g. "Sequoia + Coatue") — those stay as plain stat cards.
export function parseStatValue(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  const rangeMatch = cleaned.match(/([\d.]+)\s*[–-]\s*([\d.]+)\s*([kmb%]?)/i);
  if (rangeMatch) {
    const [, lo, hi, suffix] = rangeMatch;
    const mult = multiplierFor(suffix);
    return ((parseFloat(lo) + parseFloat(hi)) / 2) * mult;
  }
  const single = cleaned.match(/([\d.]+)\s*([kmb%]?)/i);
  if (single) {
    const [, num, suffix] = single;
    return parseFloat(num) * multiplierFor(suffix);
  }
  return null;
}

function multiplierFor(suffix: string): number {
  switch (suffix.toLowerCase()) {
    case "k": return 1_000;
    case "m": return 1_000_000;
    case "b": return 1_000_000_000;
    default:  return 1;
  }
}

function threatToNum(threat: string): number {
  if (threat === "High") return 3;
  if (threat === "Medium") return 2;
  return 1;
}

let zCounter = 0;
function nextZ(): number {
  return zCounter++;
}

function textEl(partial: Omit<Extract<CanvasElement, { type: "text" }>, "id" | "type" | "zIndex" | "italic" | "rotation"> & { rotation?: number; italic?: boolean }): CanvasElement {
  return { id: newId(), type: "text", rotation: 0, zIndex: nextZ(), ...partial };
}

function shapeEl(partial: Omit<Extract<CanvasElement, { type: "shape" }>, "id" | "type" | "zIndex" | "rotation"> & { rotation?: number }): CanvasElement {
  return { id: newId(), type: "shape", rotation: 0, zIndex: nextZ(), ...partial };
}

function chartEl(partial: Omit<Extract<CanvasElement, { type: "chart" }>, "id" | "type" | "zIndex" | "rotation"> & { rotation?: number }): CanvasElement {
  return { id: newId(), type: "chart", rotation: 0, zIndex: nextZ(), ...partial };
}

function tableEl(partial: Omit<Extract<CanvasElement, { type: "table" }>, "id" | "type" | "zIndex" | "rotation"> & { rotation?: number }): CanvasElement {
  return { id: newId(), type: "table", rotation: 0, zIndex: nextZ(), ...partial };
}

function addHeader(theme: DeckTheme, sectionNum: string | undefined, title: string): CanvasElement[] {
  const els: CanvasElement[] = [];
  if (sectionNum) {
    els.push(textEl({
      x: inch(0.7), y: inch(0.45), w: inch(1.5), h: inch(0.35),
      text: sectionNum, fontFamily: theme.fontBody, fontSize: 13, fontWeight: 700,
      color: theme.palette.primary, align: "left", lineHeight: 1.2,
    }));
  }
  els.push(textEl({
    x: inch(0.7), y: inch(0.82), w: inch(11.5), h: inch(0.62),
    text: title, fontFamily: theme.fontHeading, fontSize: 29, fontWeight: 700,
    color: theme.palette.text, align: "left", lineHeight: 1.15,
  }));
  els.push(shapeEl({
    x: inch(0.7), y: inch(1.5), w: inch(11.5), h: inch(0.03),
    shape: "rect", fill: theme.palette.border, opacity: 1,
  }));
  return els;
}

function addStatCards(
  theme: DeckTheme,
  stats: Array<{ label: string; value: string; sub?: string }>,
  y: number,
): CanvasElement[] {
  const els: CanvasElement[] = [];
  const count = stats.length;
  const boxW = Math.min(3.6, (11.5 - (count - 1) * 0.2) / count);
  stats.forEach((stat, i) => {
    const x = 0.7 + i * (boxW + 0.2);
    els.push(shapeEl({
      x: inch(x), y: inch(y), w: inch(boxW), h: inch(1.35),
      shape: "rect", fill: theme.palette.surface, stroke: theme.palette.border, strokeWidth: 1.5,
      cornerRadius: 6, opacity: 1,
    }));
    els.push(textEl({
      x: inch(x + 0.15), y: inch(y + 0.12), w: inch(boxW - 0.3), h: inch(0.52),
      text: stat.value, fontFamily: theme.fontHeading, fontSize: 22, fontWeight: 700,
      color: theme.palette.primary, align: "left", lineHeight: 1.1,
    }));
    els.push(textEl({
      x: inch(x + 0.15), y: inch(y + 0.65), w: inch(boxW - 0.3), h: inch(0.3),
      text: stat.label, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 400,
      color: theme.palette.text, align: "left", lineHeight: 1.2,
    }));
    if (stat.sub) {
      els.push(textEl({
        x: inch(x + 0.15), y: inch(y + 0.95), w: inch(boxW - 0.3), h: inch(0.28),
        text: stat.sub, fontFamily: theme.fontBody, fontSize: 9, fontWeight: 400,
        color: theme.palette.secondary, align: "left", lineHeight: 1.2,
      }));
    }
  });
  return els;
}

// Builds an auto-populated bar chart from a stats array when the values are numeric
// enough to be meaningfully charted (per the Phase 2 spec: "critically, turn every
// stats array into a chart element"). Returns null when the data isn't chart-worthy.
function autoChartFromStats(
  stats: Array<{ label: string; value: string }> | undefined,
  x: number, y: number, w: number, h: number,
  sourceStatId: string,
): CanvasElement | null {
  if (!stats || stats.length < 2) return null;
  const parsed = stats
    .map((s) => ({ label: s.label, value: parseStatValue(s.value) }))
    .filter((p): p is { label: string; value: number } => p.value !== null && p.value > 0);
  if (parsed.length < 2) return null; // not chart-worthy — leave as plain stat cards

  // Research stats routinely mix wildly different units on the same slide (e.g. "$70B GMV"
  // next to "18% take rate" next to "3 channels") — charting all of them together produces
  // one giant bar and several invisible ones. Rather than bailing out of the whole chart
  // (which left almost every real deck without a single chart), keep the largest subset of
  // stats whose magnitudes are within a sane ratio of each other and chart just those.
  const sorted = [...parsed].sort((a, b) => a.value - b.value);
  let best: typeof sorted = [];
  for (let i = 0; i < sorted.length; i++) {
    const cluster = [sorted[i]];
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].value / sorted[i].value <= 20) cluster.push(sorted[j]);
      else break;
    }
    if (cluster.length > best.length) best = cluster;
  }
  if (best.length < 2) return null;

  return chartEl({
    x: inch(x), y: inch(y), w: inch(w), h: inch(h),
    chartType: "bar",
    title: "Overview",
    data: [{ name: "Value", labels: best.map((p) => p.label), values: best.map((p) => p.value) }],
    sourceStatId,
  });
}

export function deckSlideToCanvasSlide(slide: DeckSlide, theme: DeckTheme, index: number): CanvasSlide {
  zCounter = 0;
  const els: CanvasElement[] = [];
  const bg = { type: "solid" as const, value: theme.palette.background };

  switch (slide.type) {
    case "cover": {
      els.push(shapeEl({
        x: 0, y: 0, w: inch(13.333), h: inch(7.5),
        shape: "rect", fill: theme.key === "dark" || theme.key === "midnight" ? theme.palette.background : theme.palette.text,
        opacity: 1,
      }));
      els.push(shapeEl({
        x: inch(0.7), y: inch(2.6), w: inch(0.6), h: inch(0.07),
        shape: "rect", fill: theme.palette.primary, opacity: 1,
      }));
      els.push(textEl({
        x: inch(0.7), y: inch(2.8), w: inch(9), h: inch(1.1),
        text: slide.title, fontFamily: theme.fontHeading, fontSize: 44, fontWeight: 700,
        color: "#FFFFFF", align: "left", lineHeight: 1.1,
      }));
      els.push(textEl({
        x: inch(0.7), y: inch(4.0), w: inch(9), h: inch(0.5),
        text: slide.subtitle ?? "", fontFamily: theme.fontBody, fontSize: 17, fontWeight: 400,
        color: theme.palette.secondary, align: "left", lineHeight: 1.3,
      }));
      els.push(textEl({
        x: inch(0.7), y: inch(6.6), w: inch(5), h: inch(0.35),
        text: "Generated by Tear", fontFamily: theme.fontBody, fontSize: 10, fontWeight: 400,
        color: theme.palette.secondary, align: "left", lineHeight: 1.2,
      }));
      break;
    }

    case "bullets": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      slide.bullets?.forEach((b, i) => {
        els.push(textEl({
          x: inch(0.7), y: inch(1.65 + i * 0.88), w: inch(7.5), h: inch(0.78),
          text: b.sub ? `${b.text}\n${b.sub}` : b.text,
          fontFamily: theme.fontBody, fontSize: 14, fontWeight: 700,
          color: theme.palette.text, align: "left", lineHeight: 1.35,
        }));
      });
      // No auto-chart here (unlike stats/pricing/funding): header + 4 bullets + stat
      // cards already fill ~6.4in of the 7.5in slide, leaving no room for one without overlap.
      if (slide.stats) {
        els.push(...addStatCards(theme, slide.stats, 5.3));
      }
      break;
    }

    case "features": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      slide.items?.forEach((item, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 0.7 + col * 4.1;
        const y = 1.65 + row * 1.55;
        els.push(shapeEl({
          x: inch(x), y: inch(y), w: inch(3.8), h: inch(1.35),
          shape: "rect", fill: theme.palette.surface, stroke: theme.palette.border, strokeWidth: 1,
          cornerRadius: 6, opacity: 1,
        }));
        els.push(textEl({
          x: inch(x + 0.2), y: inch(y + 0.1), w: inch(3.4), h: inch(0.4),
          text: item.name, fontFamily: theme.fontBody, fontSize: 14, fontWeight: 700,
          color: theme.palette.primary, align: "left", lineHeight: 1.2,
        }));
        els.push(textEl({
          x: inch(x + 0.2), y: inch(y + 0.5), w: inch(3.4), h: inch(0.7),
          text: item.desc, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 400,
          color: theme.palette.text, align: "left", lineHeight: 1.4,
        }));
      });
      break;
    }

    case "pricing": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      slide.tiers?.forEach((tier, i) => {
        const x = 0.7 + i * 3.05;
        const highlighted = !!tier.highlight;
        els.push(shapeEl({
          x: inch(x), y: inch(1.6), w: inch(2.8), h: inch(2.2),
          shape: "rect", fill: highlighted ? theme.palette.primary : theme.palette.surface,
          stroke: highlighted ? theme.palette.primary : theme.palette.border, strokeWidth: 1.5,
          cornerRadius: 8, opacity: 1,
        }));
        els.push(textEl({
          x: inch(x), y: inch(1.75), w: inch(2.8), h: inch(0.4),
          text: tier.name, fontFamily: theme.fontBody, fontSize: 14, fontWeight: 700,
          color: highlighted ? "#FFFFFF" : theme.palette.text, align: "center", lineHeight: 1.2,
        }));
        els.push(textEl({
          x: inch(x), y: inch(2.25), w: inch(2.8), h: inch(0.55),
          text: tier.price, fontFamily: theme.fontHeading, fontSize: 24, fontWeight: 700,
          color: highlighted ? "#FFFFFF" : theme.palette.primary, align: "center", lineHeight: 1.1,
        }));
        els.push(textEl({
          x: inch(x), y: inch(2.88), w: inch(2.8), h: inch(0.35),
          text: tier.target, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 400,
          color: highlighted ? "#FFFFFF" : theme.palette.secondary, align: "center", lineHeight: 1.2,
        }));
      });
      if (slide.revenueStats) {
        els.push(...addStatCards(theme, slide.revenueStats, 4.6));
        // Below the stat row, not beside it — stat cards fill the full 11.5in row width
        // when there are only a few of them (addStatCards grows box width to fill).
        const chart = autoChartFromStats(slide.revenueStats, 0.7, 6.05, 11.5, 1.2, "revenueStats");
        if (chart) els.push(chart);
      }
      break;
    }

    case "gtm": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      slide.phases?.forEach((phase, i) => {
        const x = 0.7 + i * 4.15;
        els.push(shapeEl({
          x: inch(x), y: inch(1.6), w: inch(3.9), h: inch(3.0),
          shape: "rect", fill: theme.palette.surface, stroke: theme.palette.border, strokeWidth: 1.5,
          cornerRadius: 6, opacity: 1,
        }));
        els.push(textEl({
          x: inch(x + 0.2), y: inch(1.75), w: inch(0.6), h: inch(0.4),
          text: String(i + 1).padStart(2, "0"), fontFamily: theme.fontBody, fontSize: 13, fontWeight: 700,
          color: theme.palette.primary, align: "left", lineHeight: 1.2,
        }));
        els.push(textEl({
          x: inch(x + 0.2), y: inch(2.2), w: inch(3.5), h: inch(0.45),
          text: phase.label, fontFamily: theme.fontHeading, fontSize: 16, fontWeight: 700,
          color: theme.palette.text, align: "left", lineHeight: 1.2,
        }));
        els.push(textEl({
          x: inch(x + 0.2), y: inch(2.75), w: inch(3.5), h: inch(1.0),
          text: phase.desc, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 400,
          color: theme.palette.text, align: "left", lineHeight: 1.4,
        }));
        if (phase.metric) {
          els.push(textEl({
            x: inch(x + 0.2), y: inch(4.1), w: inch(3.5), h: inch(0.35),
            text: phase.metric, fontFamily: theme.fontBody, fontSize: 12, fontWeight: 700,
            color: theme.palette.primary, align: "left", lineHeight: 1.2,
          }));
        }
      });
      break;
    }

    case "techstack": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      slide.layers?.forEach((layer, i) => {
        const y = 1.6 + i * 0.82;
        els.push(shapeEl({
          x: inch(0.7), y: inch(y), w: inch(11.5), h: inch(0.72),
          shape: "rect", fill: i % 2 === 0 ? theme.palette.surface : theme.palette.accent,
          stroke: theme.palette.border, strokeWidth: 1, opacity: 1,
        }));
        els.push(textEl({
          x: inch(0.9), y: inch(y + 0.05), w: inch(2.5), h: inch(0.62),
          text: layer.layer, fontFamily: theme.fontBody, fontSize: 13, fontWeight: 700,
          color: theme.palette.text, align: "left", lineHeight: 1.4,
        }));
        els.push(textEl({
          x: inch(3.6), y: inch(y + 0.05), w: inch(8.4), h: inch(0.62),
          text: layer.detail, fontFamily: theme.fontBody, fontSize: 13, fontWeight: 400,
          color: theme.palette.secondary, align: "left", lineHeight: 1.4,
        }));
      });
      break;
    }

    case "competitive": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      if (slide.tam) {
        els.push(textEl({
          x: inch(0.7), y: inch(1.45), w: inch(6.5), h: inch(0.32),
          text: `TAM: ${slide.tam}  ·  CAGR: ${slide.cagr ?? ""}`, fontFamily: theme.fontBody, fontSize: 12, fontWeight: 400,
          color: theme.palette.secondary, align: "left", lineHeight: 1.2,
        }));
      }
      ["Competitor", "Angle", "Threat Level"].forEach((h, hi) => {
        els.push(textEl({
          x: inch(0.7 + hi * 4.0), y: inch(1.88), w: inch(3.7), h: inch(0.35),
          text: h, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 700,
          color: theme.palette.text, align: "left", lineHeight: 1.2,
        }));
      });
      slide.competitors?.forEach((comp, i) => {
        const y = 2.3 + i * 0.68;
        const threatColor = comp.threat === "High" ? theme.palette.primary : comp.threat === "Medium" ? "#D97706" : theme.palette.secondary;
        els.push(shapeEl({
          x: inch(0.7), y: inch(y), w: inch(11.5), h: inch(0.6),
          shape: "rect", fill: i % 2 === 0 ? theme.palette.surface : theme.palette.accent,
          stroke: theme.palette.border, strokeWidth: 1, opacity: 1,
        }));
        els.push(textEl({
          x: inch(0.9), y: inch(y + 0.04), w: inch(3.7), h: inch(0.52),
          text: comp.name, fontFamily: theme.fontBody, fontSize: 12, fontWeight: 400,
          color: theme.palette.text, align: "left", lineHeight: 1.3,
        }));
        els.push(textEl({
          x: inch(4.7), y: inch(y + 0.04), w: inch(3.7), h: inch(0.52),
          text: comp.angle, fontFamily: theme.fontBody, fontSize: 12, fontWeight: 400,
          color: theme.palette.secondary, align: "left", lineHeight: 1.3,
        }));
        els.push(textEl({
          x: inch(8.7), y: inch(y + 0.04), w: inch(2.5), h: inch(0.52),
          text: comp.threat, fontFamily: theme.fontBody, fontSize: 12, fontWeight: 700,
          color: threatColor, align: "left", lineHeight: 1.3,
        }));
      });
      // "competitive → radar": auto chart the categorical threat levels as a radar series,
      // sized to whatever room is actually left below the competitor rows (radar charts
      // need roughly square dimensions to read correctly — skip rather than render a sliver
      // if the table left less than ~1.2in of usable height).
      if (slide.competitors && slide.competitors.length >= 3) {
        const tableEndY = 2.3 + slide.competitors.length * 0.68;
        const availH = 7.2 - tableEndY;
        if (availH >= 1.2) {
          const size = Math.min(availH, 2.6);
          els.push(chartEl({
            x: inch((13.333 - size) / 2), y: inch(tableEndY + 0.15), w: inch(size), h: inch(size),
            chartType: "radar",
            title: "Threat Radar",
            data: [{
              name: "Threat Level",
              labels: slide.competitors.map((c) => c.name),
              values: slide.competitors.map((c) => threatToNum(c.threat)),
            }],
            sourceStatId: "competitors",
          }));
        }
      }
      break;
    }

    case "stats": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      let statsChart: CanvasElement | null = null;
      if (slide.stats) {
        els.push(...addStatCards(theme, slide.stats, 1.65));
        statsChart = autoChartFromStats(slide.stats, 0.7, 3.2, 11.5, 1.9, "stats");
        if (statsChart) els.push(statsChart);
      }
      if (slide.insight) {
        const insightY = statsChart ? 5.35 : 4.3;
        els.push(shapeEl({
          x: inch(0.7), y: inch(insightY), w: inch(11.5), h: inch(1.3),
          shape: "rect", fill: theme.palette.accent, stroke: theme.palette.primary, strokeWidth: 1.5,
          cornerRadius: 8, opacity: 1,
        }));
        els.push(textEl({
          x: inch(0.9), y: inch(insightY + 0.1), w: inch(11.1), h: inch(1.1),
          text: "→ " + slide.insight, fontFamily: theme.fontBody, fontSize: 12, fontWeight: 400, italic: true,
          color: theme.palette.primary, align: "left", lineHeight: 1.4,
        }));
      }
      break;
    }

    case "funding": {
      els.push(...addHeader(theme, slide.sectionNum, slide.title));
      ["Round", "Year", "Amount", "Lead Investor"].forEach((h, hi) => {
        els.push(textEl({
          x: inch(0.7 + hi * 2.9), y: inch(1.6), w: inch(2.7), h: inch(0.35),
          text: h, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 700,
          color: theme.palette.text, align: "left", lineHeight: 1.2,
        }));
      });
      if (slide.rounds && slide.rounds.length) {
        els.push(tableEl({
          x: inch(0.7), y: inch(2.0), w: inch(11.5), h: inch(0.65 * slide.rounds.length),
          rows: slide.rounds.map((r) => [r.round, r.year, r.amount, r.lead]),
        }));
      }
      const summaryStats = [
        ...(slide.totalRaised ? [{ label: "Total Raised", value: slide.totalRaised }] : []),
        ...(slide.valuation ? [{ label: "Valuation", value: slide.valuation }] : []),
        ...(slide.arr ? [{ label: "Est. ARR", value: slide.arr }] : []),
      ];
      if (summaryStats.length) {
        els.push(...addStatCards(theme, summaryStats, 5.05));
        // Below the stat row — see the pricing-slide comment above for why.
        const chart = autoChartFromStats(summaryStats, 0.7, 6.5, 11.5, 0.75, "fundingSummary");
        if (chart) els.push(chart);
      }
      break;
    }

    case "sources": {
      els.push(textEl({
        x: inch(0.7), y: inch(0.8), w: inch(11.5), h: inch(0.75),
        text: slide.title, fontFamily: theme.fontHeading, fontSize: 26, fontWeight: 700,
        color: theme.palette.text, align: "left", lineHeight: 1.15,
      }));
      els.push(shapeEl({
        x: inch(0.7), y: inch(1.6), w: inch(11.5), h: inch(0.03),
        shape: "rect", fill: theme.palette.border, opacity: 1,
      }));
      slide.sources?.forEach((src, i) => {
        els.push(textEl({
          x: inch(0.7), y: inch(1.85 + i * 0.55), w: inch(11.5), h: inch(0.45),
          text: src, fontFamily: theme.fontBody, fontSize: 11, fontWeight: 400,
          color: theme.palette.secondary, align: "left", lineHeight: 1.3,
        }));
      });
      break;
    }
  }

  // Footer, every slide except cover.
  if (slide.type !== "cover") {
    els.push(shapeEl({
      x: 0, y: inch(7.35), w: inch(13.333), h: inch(0.15),
      shape: "rect", fill: theme.palette.primary, opacity: 1,
    }));
  }

  return {
    id: `slide-${index}-${newId()}`,
    background: bg,
    elements: els,
    sourceSlideType: slide.type,
  };
}

export function deckDataToCanvasSlides(slides: DeckSlide[], theme: DeckTheme): CanvasSlide[] {
  return slides.map((s, i) => deckSlideToCanvasSlide(s, theme, i));
}
