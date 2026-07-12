"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import { parseStatValue } from "@/lib/deckSlideToCanvasSlide";
import type { ResearchDoc } from "@/types/teardown";

const CHART_COLORS = ["#C2451E", "#E07A5F", "#F2CC8F", "#81B29A", "#3D405B", "#F4F1DE", "#A89890", "#7C6E68"];
const CHART_TYPES = ["bar", "line", "area", "pie", "doughnut", "radar", "scatter"] as const;
type ChartType = (typeof CHART_TYPES)[number];

interface StatSource {
  sectionId: string;
  sectionTitle: string;
  labels: string[];
  values: number[];
}

interface ChartInsertModalProps {
  researchDoc: ResearchDoc | null;
  onInsert: (chartType: ChartType, labels: string[], values: number[], seriesName: string, sourceStatId?: string) => void;
  onClose: () => void;
}

export default function ChartInsertModal({ researchDoc, onInsert, onClose }: ChartInsertModalProps) {
  const statSources = useMemo<StatSource[]>(() => {
    if (!researchDoc) return [];
    return researchDoc.sections
      .filter((s) => s.stats && s.stats.length >= 2)
      .map((s) => {
        const parsed = s.stats!.map((st) => ({ label: st.label, value: parseStatValue(st.value) }));
        return { sectionId: s.id, sectionTitle: s.title, labels: parsed.map((p) => p.label), values: parsed.map((p) => p.value ?? 0) };
      });
  }, [researchDoc]);

  const [sourceIndex, setSourceIndex] = useState<number>(-1); // -1 = blank sample data
  const [chartType, setChartType] = useState<ChartType>("bar");

  const source = sourceIndex >= 0 ? statSources[sourceIndex] : null;
  const labels = source?.labels ?? ["A", "B", "C"];
  const values = source?.values ?? [30, 55, 40];
  const seriesName = source?.sectionTitle ?? "Sample data";
  const previewData = labels.map((label, i) => ({ label, value: values[i] }));

  function handleInsert() {
    onInsert(chartType, labels, values, seriesName, source?.sectionId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[520px] max-h-[80vh] overflow-y-auto bg-[#221F1D] border border-white/15 rounded-xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-semibold text-white">Insert chart</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 text-xl leading-none">×</button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/50">Data source</span>
          <select
            value={sourceIndex}
            onChange={(e) => setSourceIndex(Number(e.target.value))}
            className="px-2 py-1.5 text-[12px] bg-black/20 border border-white/15 rounded text-white/80 focus:outline-none focus:border-tear-primary"
          >
            <option value={-1}>Sample data (not from research)</option>
            {statSources.map((s, i) => (
              <option key={s.sectionId} value={i}>{s.sectionTitle} ({s.labels.length} stats)</option>
            ))}
          </select>
          {statSources.length === 0 && (
            <span className="text-[10px] text-white/30">No research sections with chartable stats were found — using sample data.</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-white/50">Chart type</span>
          <div className="grid grid-cols-4 gap-1.5">
            {CHART_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-2 py-1.5 text-[11px] rounded-md border transition-colors ${
                  chartType === t ? "bg-tear-primary text-white border-tear-primary" : "bg-black/20 text-white/60 border-white/15 hover:bg-white/10"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </label>

        <div className="bg-white rounded-lg p-3" style={{ height: 220 }}>
          {(chartType === "bar") && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={previewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DF" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#C2451E" radius={[4, 4, 0, 0]}>
                  {previewData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {(chartType === "line" || chartType === "radar" || chartType === "scatter") && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={previewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DF" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#C2451E" strokeWidth={2} dot={{ fill: "#C2451E", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {chartType === "area" && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={previewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DF" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#C2451E" fill="#C2451E" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {(chartType === "pie" || chartType === "doughnut") && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={previewData} dataKey="value" nameKey="label" cx="50%" cy="50%"
                  outerRadius={chartType === "doughnut" ? 75 : 85} innerRadius={chartType === "doughnut" ? 45 : 0} paddingAngle={2}>
                  {previewData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {(chartType === "radar" || chartType === "scatter") && (
          <span className="text-[10px] text-white/30 -mt-2">Preview shown as a line — will render as {chartType} once inserted on the canvas.</span>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 text-[12px] text-white/60 hover:text-white/90">Cancel</button>
          <button onClick={handleInsert} className="px-4 py-1.5 text-[12px] font-medium bg-tear-primary text-white rounded-md hover:opacity-90">
            Insert chart
          </button>
        </div>
      </div>
    </div>
  );
}
