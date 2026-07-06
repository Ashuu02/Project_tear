"use client";

import { useEffect, useRef } from "react";
import { useSessionStore } from "@/store/session";
import type { ResearchSection, TableData, ChartData } from "@/types/teardown";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";

const CHART_COLORS = ["#C2451E", "#E07A5F", "#F2CC8F", "#81B29A", "#3D405B", "#F4F1DE", "#A89890", "#7C6E68"];

function Cite({ num }: { num: number }) {
  return (
    <sup className="text-tear-primary text-[10px] font-mono cursor-pointer hover:underline ml-[1px]">
      [{num}]
    </sup>
  );
}

function SectionHeading({ num, title, id, hasHistory, onUndo }: {
  num: string; title: string; id: string; hasHistory: boolean; onUndo: () => void;
}) {
  return (
    <div id={id} className="flex items-baseline gap-3 pt-12 pb-3 border-b-[1.5px] border-tear-border mb-5 scroll-mt-6">
      <span className="font-mono text-[11px] text-tear-primary font-medium flex-shrink-0">{num}</span>
      <h2 className="font-lora text-[22px] font-semibold text-tear-text tracking-[-0.02em] flex-1">{title}</h2>
      {hasHistory && (
        <button
          onClick={onUndo}
          className="flex-shrink-0 flex items-center gap-1 text-[11px] text-tear-muted hover:text-tear-primary transition-colors duration-150 px-2 py-1 rounded border border-tear-border hover:border-tear-primary"
          title="Undo last edit"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5H8.5a3 3 0 1 1 0 6H5" />
            <path d="M5 2.5 2 5l3 2.5" />
          </svg>
          Undo
        </button>
      )}
    </div>
  );
}

function InsightBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 px-5 py-4 bg-[#FBF0EB] border-l-[3px] border-tear-primary rounded-r-[8px]">
      <span className="text-[10.5px] font-semibold tracking-[0.13em] uppercase text-tear-primary mb-2 block">
        Key Insight
      </span>
      <p className="text-[13.5px] leading-[1.7] text-[#3D2F2B] font-medium">{children}</p>
    </div>
  );
}

function StatRow({ label, value, sub, change }: { label: string; value: string; sub?: string; change?: string }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-tear-border last:border-0">
      <span className="text-[13px] text-tear-muted">{label}</span>
      <div className="text-right">
        <span className="text-[13px] font-semibold text-tear-text block">{value}</span>
        {sub && <span className="text-[11px] text-[#A89890]">{sub}</span>}
        {change && (
          <span className={`text-[11px] font-medium ${change.startsWith("+") ? "text-green-600" : change.startsWith("-") ? "text-red-500" : "text-[#A89890]"}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

function BulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="my-4 flex flex-col gap-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-[6px] w-1.5 h-1.5 rounded-full bg-tear-primary flex-shrink-0" />
          <span className="text-[13.5px] leading-[1.7] text-tear-text">{b}</span>
        </li>
      ))}
    </ul>
  );
}

function DataTable({ table }: { table: TableData }) {
  return (
    <div className="my-6">
      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A89890] mb-3">{table.title}</p>
      <div className="overflow-x-auto rounded-xl border border-tear-border">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-[#F5EFE4] border-b border-tear-border">
              {table.headers.map((h) => (
                <th key={h} className="px-4 py-2.5 text-left font-semibold text-tear-text whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className={`border-b border-tear-border last:border-0 ${ri % 2 === 0 ? "bg-white" : "bg-[#FDFAF6]"}`}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2.5 text-tear-muted leading-[1.5]">
                    {ci === 0 ? <span className="font-medium text-tear-text">{cell}</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionChart({ chart }: { chart: ChartData }) {
  const height = 220;

  return (
    <div className="my-6 p-5 bg-white border border-tear-border rounded-xl">
      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A89890] mb-4">{chart.title}</p>
      <div style={{ width: "100%", height }}>
        {(chart.type === "bar") && (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chart.data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DF" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7C6E68" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7C6E68" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => chart.unit ? `${chart.unit}${v}` : String(v)} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E8DDD2", borderRadius: 8, background: "#FBF0EB" }}
                formatter={(v) => [chart.unit ? `${chart.unit}${v ?? 0}` : (v ?? 0), chart.yAxis ?? "Value"]}
              />
              <Bar dataKey="value" fill="#C2451E" radius={[4, 4, 0, 0]}>
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {(chart.type === "pie" || chart.type === "donut") && (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={chart.type === "donut" ? 75 : 80}
                innerRadius={chart.type === "donut" ? 45 : 0}
                paddingAngle={2}
              >
                {chart.data.map((_, i) => (
                  <Cell key={i} fill={chart.data[i].color ?? CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E8DDD2", borderRadius: 8, background: "#FBF0EB" }}
                formatter={(v) => [`${v ?? 0}%`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: "#7C6E68" }} />
            </PieChart>
          </ResponsiveContainer>
        )}

        {(chart.type === "line") && (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chart.data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0E8DF" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7C6E68" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#7C6E68" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => chart.unit ? `${chart.unit}${v}` : String(v)} />
              <Tooltip
                contentStyle={{ fontSize: 12, border: "1px solid #E8DDD2", borderRadius: 8, background: "#FBF0EB" }}
                formatter={(v) => [chart.unit ? `${chart.unit}${v ?? 0}` : (v ?? 0), chart.yAxis ?? "Value"]}
              />
              <Line type="monotone" dataKey="value" stroke="#C2451E" strokeWidth={2} dot={{ fill: "#C2451E", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function DynamicSection({ section, index, overrideContent, hasHistory, onUndo }: {
  section: ResearchSection;
  index: number;
  overrideContent?: string;
  hasHistory: boolean;
  onUndo: () => void;
}) {
  const num = String(index + 1).padStart(2, "0");
  const content = overrideContent ?? section.content;
  const paragraphs = content?.split("\n\n").filter(Boolean) ?? [];

  return (
    <div>
      <SectionHeading id={section.id} num={num} title={section.title} hasHistory={hasHistory} onUndo={onUndo} />

      {/* Paragraphs */}
      {paragraphs.map((para, i) => (
        <p key={i} className="text-[14.5px] leading-[1.8] text-tear-text mb-4">
          {para}
          {i === 0 && <Cite num={index + 1} />}
        </p>
      ))}

      {/* Key insight */}
      {section.keyInsight && <InsightBox>{section.keyInsight}</InsightBox>}

      {/* Bullet points */}
      {section.bullets && section.bullets.length > 0 && (
        <div className="my-4">
          <p className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-[#A89890] mb-2">Key Takeaways</p>
          <BulletList bullets={section.bullets} />
        </div>
      )}

      {/* Stats row */}
      {section.stats && section.stats.length > 0 && (
        <div className="my-5 bg-[#F9F5EF] rounded-xl border border-tear-border px-4 py-1">
          {section.stats.map((s) => (
            <StatRow key={s.label} label={s.label} value={s.value} sub={s.sub} change={s.change} />
          ))}
        </div>
      )}

      {/* Charts */}
      {section.chartData?.map((chart) => (
        <SectionChart key={chart.id} chart={chart} />
      ))}

      {/* Tables */}
      {section.tables?.map((table) => (
        <DataTable key={table.id} table={table} />
      ))}
    </div>
  );
}

interface DocumentBodyProps {
  productName: string;
  activeSection: string;
  onSectionChange: (id: string) => void;
  sectionOverrides?: Record<string, string>;
  sectionVersions?: Record<string, string[]>;
  onUndoSection?: (sectionId: string) => void;
}

export default function DocumentBody({
  productName,
  activeSection,
  sectionOverrides,
  sectionVersions,
  onUndoSection,
}: DocumentBodyProps) {
  const researchDoc   = useSessionStore((s) => s.researchDoc);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const el = document.getElementById(activeSection);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeSection]);

  if (!researchDoc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-tear-muted animate-pulse">Document not found. Run the pipeline first.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-14 pb-24">
      {researchDoc.sections.map((section, i) => (
        <DynamicSection
          key={section.id}
          section={section}
          index={i}
          overrideContent={sectionOverrides?.[section.id]}
          hasHistory={(sectionVersions?.[section.id]?.length ?? 0) > 0}
          onUndo={() => onUndoSection?.(section.id)}
        />
      ))}
      <p className="text-[12px] text-[#A89890] mt-8 pt-4 border-t border-tear-border">
        Research generated by Tear AI Pipeline · {productName} · {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}
