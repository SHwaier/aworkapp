"use client";

import { useState, type ReactNode } from "react";
import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Small, dependency-free charts for the analysis report.
 * Conventions (see the dataviz guidance): thin marks, 2px surface gaps between
 * touching fills, 4px rounded data-ends, hairline grid, text in text tokens
 * (never the series color), and a hover/focus tooltip on every mark. Each chart
 * has a table/list twin elsewhere on the page so tooltips never gate a value.
 */

export type StatusTone = "good" | "warning" | "critical";

export const TONE_VAR: Record<StatusTone, string> = {
  good: "var(--viz-good)",
  warning: "var(--viz-warning)",
  critical: "var(--viz-critical)",
};

// ─── Tooltip ───

interface TipState {
  x: number;
  y: number;
  /** Which edge of the tooltip sits at x, so it never spills out of the chart */
  align: "start" | "center" | "end";
  content: ReactNode;
}

const TIP_EDGE_PX = 110;

/** One tooltip per chart, positioned inside the chart's relative container. */
function useTooltip() {
  // Callback ref in state (not useRef) so nothing reads a ref during render
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  function showAt(clientX: number, clientY: number, content: ReactNode) {
    const box = container?.getBoundingClientRect();
    if (!box) return;
    const x = clientX - box.left;
    const align = x < TIP_EDGE_PX ? "start" : x > box.width - TIP_EDGE_PX ? "end" : "center";
    setTip({ x, y: clientY - box.top, align, content });
  }

  function showForElement(el: Element, content: ReactNode) {
    const r = el.getBoundingClientRect();
    showAt(r.left + r.width / 2, r.top, content);
  }

  const hide = () => setTip(null);

  const node = tip ? (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-20 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md",
        tip.align === "center" && "-translate-x-1/2",
        tip.align === "end" && "-translate-x-full"
      )}
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.content}
    </div>
  ) : null;

  return { attach: setContainer, showAt, showForElement, hide, node };
}

function TipRow({ value, label, swatch }: { value: ReactNode; label: ReactNode; swatch?: string }) {
  return (
    <div className="flex items-center gap-2">
      {swatch && <span className="h-0.5 w-3 rounded-full" style={{ background: swatch }} />}
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Meter: a single ratio against a limit ───

export function Meter({
  value,
  max,
  color = "var(--viz-series-1)",
  label,
  className,
}: {
  value: number;
  max: number;
  color?: string;
  /** Accessible description, e.g. "3 of 5 required requirements met" */
  label: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[var(--viz-track)]", className)}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

// ─── Coverage: horizontal stacked bars of met / partial / missing ───

export const COVERAGE_STATES = [
  { key: "met", label: "Met", tone: "good", Icon: CircleCheck },
  { key: "partial", label: "Partial", tone: "warning", Icon: CircleDashed },
  { key: "missing", label: "Missing", tone: "critical", Icon: CircleX },
] as const;

export type CoverageKey = (typeof COVERAGE_STATES)[number]["key"];

export function CoverageLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {COVERAGE_STATES.map(({ key, label, tone, Icon }) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color: TONE_VAR[tone] }} aria-hidden />
          {label}
        </span>
      ))}
    </div>
  );
}

export interface CoverageRow {
  label: string;
  met: number;
  partial: number;
  missing: number;
}

export function CoverageBars({ rows }: { rows: CoverageRow[] }) {
  const { attach, showAt, showForElement, hide, node: tooltipNode } = useTooltip();
  return (
    <div ref={attach} className="relative space-y-3" onMouseLeave={hide}>
      {rows.map((row) => {
        const total = row.met + row.partial + row.missing;
        const segments = COVERAGE_STATES.map((s) => ({ ...s, count: row[s.key] })).filter(
          (s) => s.count > 0
        );
        return (
          <div key={row.label} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3">
            <span className="truncate text-sm" title={row.label}>
              {row.label}
            </span>
            <div
              className="flex h-4 gap-[2px]"
              role="img"
              aria-label={`${row.label}: ${row.met} met, ${row.partial} partial, ${row.missing} missing`}
            >
              {segments.map((s, i) => (
                <div
                  key={s.key}
                  tabIndex={0}
                  className={cn(
                    "relative h-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring",
                    i === segments.length - 1 && "rounded-r-[4px]"
                  )}
                  style={{ flexGrow: s.count, flexBasis: 0, background: TONE_VAR[s.tone] }}
                  onMouseMove={(e) =>
                    showAt(
                      e.clientX,
                      e.clientY,
                      <TipRow
                        value={`${s.count} of ${total}`}
                        label={`${s.label.toLowerCase()} · ${row.label}`}
                        swatch={TONE_VAR[s.tone]}
                      />
                    )
                  }
                  onFocus={(e) =>
                    showForElement(
                      e.currentTarget,
                      <TipRow
                        value={`${s.count} of ${total}`}
                        label={`${s.label.toLowerCase()} · ${row.label}`}
                        swatch={TONE_VAR[s.tone]}
                      />
                    )
                  }
                  onBlur={hide}
                />
              ))}
            </div>
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {row.met}/{total}
            </span>
          </div>
        );
      })}
      {tooltipNode}
    </div>
  );
}

// ─── Ranked bars: one series, magnitude, value at the tip ───

export interface RankedBar {
  label: string;
  value: number;
  /** Shown under the label, e.g. "Required · missing" */
  detail?: string;
}

export function RankedBars({
  items,
  formatValue = (v) => String(v),
  valueLabel,
}: {
  items: RankedBar[];
  formatValue?: (v: number) => string;
  /** Tooltip suffix, e.g. "points" */
  valueLabel: string;
}) {
  const { attach, showAt, showForElement, hide, node: tooltipNode } = useTooltip();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div ref={attach} className="relative space-y-3.5" onMouseLeave={hide}>
      {items.map((item) => (
        <div
          key={item.label}
          tabIndex={0}
          className="group space-y-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onMouseMove={(e) =>
            showAt(
              e.clientX,
              e.clientY,
              <TipRow
                value={formatValue(item.value)}
                label={valueLabel}
                swatch="var(--viz-series-1)"
              />
            )
          }
          onFocus={(e) =>
            showForElement(
              e.currentTarget,
              <TipRow
                value={formatValue(item.value)}
                label={valueLabel}
                swatch="var(--viz-series-1)"
              />
            )
          }
          onBlur={hide}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="line-clamp-1 text-sm" title={item.label}>
              {item.label}
            </span>
            {item.detail && (
              <span className="shrink-0 text-[11px] text-muted-foreground">{item.detail}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 flex-1">
              <div
                className="h-full rounded-r-[4px] transition-[width,opacity] duration-700 group-hover:opacity-80"
                style={{ width: `${(item.value / max) * 100}%`, background: "var(--viz-series-1)" }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
              {formatValue(item.value)}
            </span>
          </div>
        </div>
      ))}
      {tooltipNode}
    </div>
  );
}

// ─── Line chart: score over time (single series, so no legend) ───

export interface LinePoint {
  label: string;
  value: number;
  detail: string;
}

export function ScoreLineChart({ points }: { points: LinePoint[] }) {
  const { attach, showAt, hide, node: tooltipNode } = useTooltip();
  const [active, setActive] = useState<number | null>(null);

  const W = 640;
  const H = 200;
  const pad = { top: 16, right: 40, bottom: 28, left: 32 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i: number) =>
    pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - (v / 100) * innerH;
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = points.length - 1;

  function nearest(clientX: number, svg: SVGSVGElement) {
    const box = svg.getBoundingClientRect();
    const sx = ((clientX - box.left) / box.width) * W;
    let best = 0;
    points.forEach((_, i) => {
      if (Math.abs(x(i) - sx) < Math.abs(x(best) - sx)) best = i;
    });
    return best;
  }

  function show(i: number, svg: SVGSVGElement) {
    setActive(i);
    const box = svg.getBoundingClientRect();
    const p = points[i];
    showAt(
      box.left + (x(i) / W) * box.width,
      box.top + (y(p.value) / H) * box.height,
      <div className="space-y-0.5">
        <TipRow value={p.value} label="match score" swatch="var(--viz-series-1)" />
        <div className="text-muted-foreground">{p.detail}</div>
      </div>
    );
  }

  return (
    <div ref={attach} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible outline-none"
        role="img"
        aria-label={`Match score over ${points.length} analyses, from ${points[0].value} to ${points[last].value}`}
        tabIndex={0}
        onPointerMove={(e) => show(nearest(e.clientX, e.currentTarget), e.currentTarget)}
        onPointerLeave={() => {
          setActive(null);
          hide();
        }}
        onFocus={(e) => show(last, e.currentTarget)}
        onBlur={() => {
          setActive(null);
          hide();
        }}
        onKeyDown={(e) => {
          if (active === null) return;
          if (e.key === "ArrowLeft") show(Math.max(0, active - 1), e.currentTarget);
          if (e.key === "ArrowRight") show(Math.min(last, active + 1), e.currentTarget);
        }}
      >
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(t)}
              y2={y(t)}
              stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={pad.left - 8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-muted-foreground text-[11px] tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={
              points.length > 1 && i === 0
                ? "start"
                : points.length > 1 && i === last
                  ? "end"
                  : "middle"
            }
            className="fill-muted-foreground text-[11px]"
          >
            {p.label}
          </text>
        ))}
        <path d={area} fill="var(--viz-series-1-wash)" />
        <path
          d={path}
          fill="none"
          stroke="var(--viz-series-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {active !== null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={pad.top}
            y2={y(0)}
            stroke="var(--viz-axis)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={i === active ? 5.5 : 4}
            fill="var(--viz-series-1)"
            stroke="var(--viz-surface)"
            strokeWidth={2}
          />
        ))}
        {/* Direct label on the latest value only */}
        <text
          x={x(last) + 10}
          y={y(points[last].value)}
          dy="0.32em"
          className="fill-foreground text-xs font-semibold"
        >
          {points[last].value}
        </text>
      </svg>
      {tooltipNode}
    </div>
  );
}

// ─── Priority matrix: impact × effort grid of numbered action steps ───

const LEVELS = ["high", "medium", "low"] as const;
type Level = (typeof LEVELS)[number];

export function PriorityMatrix({
  steps,
}: {
  steps: { number: number; title: string; impact: Level; effort: Level }[];
}) {
  const { attach, showAt, showForElement, hide, node: tooltipNode } = useTooltip();
  const effortCols: Level[] = ["low", "medium", "high"];
  return (
    <div ref={attach} className="relative" onMouseLeave={hide}>
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-[2px] text-xs">
        <div />
        {effortCols.map((e) => (
          <div key={e} className="pb-1 text-center capitalize text-muted-foreground">
            {e} effort
          </div>
        ))}
        {LEVELS.map((impact) => (
          <div key={impact} className="contents">
            <div className="flex items-center pr-2 capitalize text-muted-foreground">
              {impact} impact
            </div>
            {effortCols.map((effort) => {
              const inCell = steps.filter((s) => s.impact === impact && s.effort === effort);
              const quickWin = impact === "high" && effort === "low";
              return (
                <div
                  key={effort}
                  className={cn(
                    "flex min-h-14 flex-wrap content-center items-center justify-center gap-1.5 rounded-[4px] p-2",
                    quickWin
                      ? "bg-[var(--viz-series-1-wash)] ring-1 ring-inset ring-[var(--viz-series-1)]/30"
                      : "bg-muted/40"
                  )}
                  aria-label={`${impact} impact, ${effort} effort: ${inCell.length ? inCell.map((s) => `step ${s.number}`).join(", ") : "none"}`}
                >
                  {quickWin && inCell.length === 0 && (
                    <span className="text-[10px] text-muted-foreground">Quick wins</span>
                  )}
                  {inCell.map((s) => (
                    <button
                      key={s.number}
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white outline-none ring-2 ring-[var(--viz-surface)] focus-visible:ring-ring"
                      style={{ background: "var(--viz-series-1)" }}
                      onMouseMove={(e) => showAt(e.clientX, e.clientY, <span>{s.title}</span>)}
                      onFocus={(e) => showForElement(e.currentTarget, <span>{s.title}</span>)}
                      onBlur={hide}
                      onClick={() =>
                        document
                          .getElementById(`step-${s.number}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "center" })
                      }
                      aria-label={`Step ${s.number}: ${s.title}`}
                    >
                      {s.number}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {tooltipNode}
    </div>
  );
}
