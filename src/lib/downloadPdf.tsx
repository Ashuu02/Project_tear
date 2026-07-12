import { Fragment } from "react";
import { pdf, Document, Page, Text, View, StyleSheet, Svg, Rect, Circle, Path, Line } from "@react-pdf/renderer";
import type { ResearchDoc, ChartData } from "@/types/teardown";

const CHART_COLORS = ["#C2451E", "#E07A5F", "#F2CC8F", "#81B29A", "#3D405B", "#F4F1DE", "#A89890", "#7C6E68"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Pie wedge as an SVG path: center -> arc start -> arc end -> back to center.
function pieSlicePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const p1 = polarToCartesian(cx, cy, r, startAngle);
  const p2 = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
}

// Donut segment: outer arc out, inner arc back — an annular wedge rather than a full pie slice.
function donutSlicePath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number): string {
  const o1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const o2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const i1 = polarToCartesian(cx, cy, rInner, endAngle);
  const i2 = polarToCartesian(cx, cy, rInner, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${o1.x} ${o1.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${i2.x} ${i2.y} Z`;
}

function fmtVal(v: number, unit?: string): string {
  return unit ? `${unit}${v}` : String(v);
}

function truncateLabel(s: string, max = 12): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// @react-pdf/renderer's SVGTextProps type omits `fontSize` (it's only on the generic Style
// type used elsewhere in the lib) even though the renderer honors it fine via `style` at
// runtime — this wrapper isolates the one unavoidable `any` needed to work around that gap.
function SvgLabel({ x, y, fontSize, fill, textAnchor, children }: {
  x: number; y: number; fontSize: number; fill: string; textAnchor: "start" | "middle" | "end"; children: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style = { fontSize } as any;
  return (
    <Text x={x} y={y} fill={fill} textAnchor={textAnchor} style={style}>
      {children}
    </Text>
  );
}

const chartStyles = StyleSheet.create({
  wrap: { marginTop: 14, marginBottom: 6 },
  title: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#A89890", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  legendCol: { flexDirection: "column", marginLeft: 16, gap: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 2, marginRight: 5 },
  legendText: { fontSize: 8, color: "#1C1412" },
});

function PdfBarChart({ chart }: { chart: ChartData }) {
  const W = 460, H = 150, padLeft = 4, padBottom = 26, padTop = 16;
  const plotW = W - padLeft * 2;
  const plotH = H - padBottom - padTop;
  const maxVal = Math.max(...chart.data.map((d) => d.value), 1);
  const barW = plotW / chart.data.length;
  return (
    <Svg width={W} height={H}>
      <Line x1={padLeft} y1={padTop + plotH} x2={W - padLeft} y2={padTop + plotH} stroke="#E8DDD2" strokeWidth={1} />
      {chart.data.map((d, i) => {
        const barH = maxVal > 0 ? (d.value / maxVal) * plotH : 0;
        const x = padLeft + i * barW + barW * 0.18;
        const w = barW * 0.64;
        const y = padTop + plotH - barH;
        const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
        return (
          <Fragment key={i}>
            <Rect x={x} y={y} width={w} height={Math.max(barH, 1)} fill={color} rx={2} />
            <SvgLabel x={x + w / 2} y={H - 14} fontSize={7} fill="#7C6E68" textAnchor="middle">
              {truncateLabel(d.label)}
            </SvgLabel>
            <SvgLabel x={x + w / 2} y={y - 4} fontSize={7} fill="#1C1412" textAnchor="middle">
              {fmtVal(d.value, chart.unit)}
            </SvgLabel>
          </Fragment>
        );
      })}
    </Svg>
  );
}

function PdfLineChart({ chart }: { chart: ChartData }) {
  const W = 460, H = 150, padLeft = 6, padBottom = 26, padTop = 10;
  const plotW = W - padLeft * 2;
  const plotH = H - padBottom - padTop;
  const values = chart.data.map((d) => d.value);
  const maxVal = Math.max(...values, 1);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const stepX = chart.data.length > 1 ? plotW / (chart.data.length - 1) : 0;
  const points = chart.data.map((d, i) => ({
    x: padLeft + i * stepX,
    y: padTop + plotH - ((d.value - minVal) / range) * plotH,
    label: d.label,
    value: d.value,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <Svg width={W} height={H}>
      <Line x1={padLeft} y1={padTop + plotH} x2={W - padLeft} y2={padTop + plotH} stroke="#E8DDD2" strokeWidth={1} />
      <Path d={pathD} stroke="#C2451E" strokeWidth={2} fill="none" />
      {points.map((p, i) => (
        <Fragment key={i}>
          <Circle cx={p.x} cy={p.y} r={2.6} fill="#C2451E" />
          <SvgLabel x={p.x} y={H - 14} fontSize={7} fill="#7C6E68" textAnchor="middle">
            {truncateLabel(p.label)}
          </SvgLabel>
        </Fragment>
      ))}
    </Svg>
  );
}

function PdfPieChart({ chart, donut }: { chart: ChartData; donut?: boolean }) {
  const size = 130;
  const cx = size / 2, cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = donut ? rOuter * 0.55 : 0;
  const total = chart.data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = 0;
  return (
    <View style={chartStyles.row}>
      <Svg width={size} height={size}>
        {chart.data.map((d, i) => {
          const sweep = (d.value / total) * 360;
          const start = angle;
          const end = angle + sweep;
          angle = end;
          const color = d.color ?? CHART_COLORS[i % CHART_COLORS.length];
          const path = donut ? donutSlicePath(cx, cy, rOuter, rInner, start, end) : pieSlicePath(cx, cy, rOuter, start, end);
          return <Path key={i} d={path} fill={color} />;
        })}
      </Svg>
      <View style={chartStyles.legendCol}>
        {chart.data.map((d, i) => (
          <View key={i} style={chartStyles.legendItem}>
            <View style={[chartStyles.legendDot, { backgroundColor: d.color ?? CHART_COLORS[i % CHART_COLORS.length] }]} />
            <Text style={chartStyles.legendText}>
              {d.label} — {Math.round((d.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PdfChart({ chart }: { chart: ChartData }) {
  return (
    <View style={chartStyles.wrap} wrap={false}>
      <Text style={chartStyles.title}>{chart.title}</Text>
      {chart.type === "bar" && <PdfBarChart chart={chart} />}
      {chart.type === "line" && <PdfLineChart chart={chart} />}
      {chart.type === "pie" && <PdfPieChart chart={chart} />}
      {chart.type === "donut" && <PdfPieChart chart={chart} donut />}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    backgroundColor: "#FDFAF6",
    fontFamily: "Helvetica",
  },
  coverPage: {
    padding: 48,
    backgroundColor: "#1C1412",
    fontFamily: "Helvetica",
    flex: 1,
    justifyContent: "center",
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  coverSub: {
    fontSize: 14,
    color: "#A89890",
    marginBottom: 32,
  },
  coverAccent: {
    width: 48,
    height: 3,
    backgroundColor: "#C2451E",
    marginBottom: 16,
  },
  coverTag: {
    fontSize: 10,
    color: "#7C6E68",
  },
  sectionNum: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#C2451E",
    marginBottom: 4,
  },
  heading: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1C1412",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#E8DDD2",
    marginBottom: 16,
  },
  body: {
    fontSize: 10,
    color: "#1C1412",
    lineHeight: 1.7,
    marginBottom: 16,
  },
  insightBox: {
    backgroundColor: "#FBF0EB",
    borderLeftWidth: 3,
    borderLeftColor: "#C2451E",
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  insightText: {
    fontSize: 10,
    color: "#C2451E",
    fontFamily: "Helvetica-Oblique",
    lineHeight: 1.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F5EFE4",
    padding: 10,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#C2451E",
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 8,
    color: "#1C1412",
  },
  statSub: {
    fontSize: 7,
    color: "#A89890",
    marginTop: 2,
  },
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#D1C4BE",
  },
  sourceItem: {
    fontSize: 10,
    color: "#7C6E68",
    marginBottom: 6,
    lineHeight: 1.4,
  },
});

function ResearchPdfDoc({ productName, doc }: { productName: string; doc: ResearchDoc }) {
  return (
    <Document title={`${productName} | Product Teardown`} author="Tear">
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverAccent} />
        <Text style={styles.coverTitle}>{productName}</Text>
        <Text style={styles.coverSub}>AI-Powered Product Teardown</Text>
        <Text style={styles.coverTag}>Generated by Tear</Text>
        <View style={styles.pageFooter}>
          <Text style={styles.footerText}>Tear · Product Teardown Platform</Text>
        </View>
      </Page>

      {/* One page per section */}
      {doc.sections.map((section, idx) => (
        <Page key={section.id} size="A4" style={styles.page}>
          <Text style={styles.sectionNum}>{String(idx + 1).padStart(2, "0")}</Text>
          <Text style={styles.heading}>{section.title}</Text>
          <View style={styles.divider} />
          <Text style={styles.body}>{section.content}</Text>
          {section.keyInsight && (
            <View style={styles.insightBox}>
              <Text style={styles.insightText}>→ {section.keyInsight}</Text>
            </View>
          )}
          {section.stats && section.stats.length > 0 && (
            <View style={styles.statsRow}>
              {section.stats.map((stat, i) => (
                <View key={i} style={styles.statBox}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  {stat.sub && <Text style={styles.statSub}>{stat.sub}</Text>}
                </View>
              ))}
            </View>
          )}
          {section.chartData?.map((chart) => (
            <PdfChart key={chart.id} chart={chart} />
          ))}
          <View style={styles.pageFooter}>
            <Text style={styles.footerText}>Tear · {productName} Teardown</Text>
            <Text style={styles.footerText}>{idx + 1} / {doc.sections.length}</Text>
          </View>
        </Page>
      ))}

      {/* Sources */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Sources</Text>
        <View style={styles.divider} />
        {doc.sources.map((source) => (
          <Text key={source.num} style={styles.sourceItem}>
            [{source.num}] {source.title} | {source.domain}
          </Text>
        ))}
        <View style={styles.pageFooter}>
          <Text style={styles.footerText}>Tear · {productName} Teardown</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadResearchPdf(productName: string, doc: ResearchDoc) {
  const blob = await pdf(<ResearchPdfDoc productName={productName} doc={doc} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${productName.replace(/\s+/g, "-").toLowerCase()}-teardown.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
