"use client";

import { Group, Rect, Line, Text, Arc, Circle } from "react-konva";
import type { CanvasElement } from "@/types/teardown";

// Same palette DocumentBody.tsx uses for research-doc charts, reused here so the
// canvas editor and the research document read as one visual system.
const CHART_COLORS = ["#C2451E", "#E07A5F", "#F2CC8F", "#81B29A", "#3D405B", "#F4F1DE", "#A89890", "#7C6E68"];

type ChartElement = Extract<CanvasElement, { type: "chart" }>;

// MVP note: renders the first data series only. Multi-series overlay (grouped bars,
// multi-line) is deferred to when the Insert-panel chart editor (Task 5) needs it.
export default function CanvasChartShape({ el }: { el: ChartElement }) {
  const series = el.data[0];
  if (!series || series.values.length === 0) {
    return (
      <Text x={el.x} y={el.y} width={el.w} height={el.h} text="No chart data"
        fontSize={12} fill="#A89890" align="center" verticalAlign="middle" />
    );
  }

  const padding = 8;
  const innerW = el.w - padding * 2;
  const innerH = el.h - padding * 2;

  switch (el.chartType) {
    case "bar": {
      const max = Math.max(...series.values, 1);
      const gap = 6;
      const barW = (innerW - gap * (series.values.length - 1)) / series.values.length;
      return (
        <Group x={el.x} y={el.y} rotation={el.rotation}>
          {series.values.map((v, i) => {
            const h = Math.max(2, (v / max) * (innerH - 18));
            const x = padding + i * (barW + gap);
            const y = padding + (innerH - 18) - h;
            return (
              <Group key={i}>
                <Rect x={x} y={y} width={barW} height={h} fill={CHART_COLORS[i % CHART_COLORS.length]} cornerRadius={2} />
                <Text x={x - gap / 2} y={padding + innerH - 16} width={barW + gap} height={16}
                  text={series.labels[i] ?? ""} fontSize={9} fill="#7C6E68" align="center" ellipsis wrap="none" />
              </Group>
            );
          })}
        </Group>
      );
    }

    case "line":
    case "area": {
      const max = Math.max(...series.values, 1);
      const min = Math.min(...series.values, 0);
      const range = max - min || 1;
      const stepX = series.values.length > 1 ? innerW / (series.values.length - 1) : 0;
      const points: number[] = [];
      series.values.forEach((v, i) => {
        points.push(padding + i * stepX, padding + innerH - ((v - min) / range) * innerH);
      });
      return (
        <Group x={el.x} y={el.y} rotation={el.rotation}>
          {el.chartType === "area" && (
            <Line
              points={[...points, padding + innerW, padding + innerH, padding, padding + innerH]}
              closed fill={CHART_COLORS[0]} opacity={0.15}
            />
          )}
          <Line points={points} stroke={CHART_COLORS[0]} strokeWidth={2} lineJoin="round" />
          {series.values.map((v, i) => (
            <Circle key={i} x={padding + i * stepX} y={padding + innerH - ((v - min) / range) * innerH} radius={3} fill={CHART_COLORS[0]} />
          ))}
        </Group>
      );
    }

    case "pie":
    case "doughnut": {
      const sum = series.values.reduce((a, b) => a + b, 0) || 1;
      const radius = Math.min(innerW, innerH) / 2;
      const cx = el.w / 2;
      const cy = el.h / 2;
      let angle = -90;
      return (
        <Group x={el.x} y={el.y} rotation={el.rotation}>
          {series.values.map((v, i) => {
            const sweep = (v / sum) * 360;
            const arc = (
              <Arc
                key={i}
                x={cx} y={cy}
                innerRadius={el.chartType === "doughnut" ? radius * 0.55 : 0}
                outerRadius={radius}
                angle={sweep}
                rotation={angle}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            );
            angle += sweep;
            return arc;
          })}
        </Group>
      );
    }

    case "radar": {
      const n = series.labels.length;
      const max = Math.max(...series.values, 1);
      const radius = Math.min(innerW, innerH) / 2;
      const cx = el.w / 2;
      const cy = el.h / 2;
      const angleStep = (Math.PI * 2) / n;
      const axisLines = Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + i * angleStep;
        return [cx, cy, cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
      });
      const dataPoints: number[] = [];
      series.values.forEach((v, i) => {
        const a = -Math.PI / 2 + i * angleStep;
        const r = (v / max) * radius;
        dataPoints.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      });
      return (
        <Group x={el.x} y={el.y} rotation={el.rotation}>
          {axisLines.map((pts, i) => (
            <Line key={i} points={pts} stroke="#E8DDD2" strokeWidth={1} />
          ))}
          <Line points={dataPoints} closed stroke={CHART_COLORS[0]} strokeWidth={2} fill={CHART_COLORS[0]} opacity={0.85} fillOpacity={0.2} />
        </Group>
      );
    }

    case "scatter": {
      const maxV = Math.max(...series.values, 1);
      const stepX = series.values.length > 1 ? innerW / (series.values.length - 1) : 0;
      return (
        <Group x={el.x} y={el.y} rotation={el.rotation}>
          {series.values.map((v, i) => (
            <Circle key={i} x={padding + i * stepX} y={padding + innerH - (v / maxV) * innerH} radius={4} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Group>
      );
    }

    default:
      return null;
  }
}
