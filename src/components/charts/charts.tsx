"use client";

import { useEffect, useId, useMemo, useState } from "react";

/**
 * Bağımlılıksız SVG grafik seti (Tavern 3.0).
 * - Renkler --chart-N tokenlarından gelir (koyu/açık panel temasına uyar).
 * - Her grafik: sr-only özet + "tablo olarak göster" alternatifi, boş durum, klavye ile gezilebilir noktalar.
 */

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export type Point = { label: string; value: number; sub?: string };

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
export const fmtMoney = (n: number) => `${nf.format(Math.round(n))} ₺`;
export const fmtNum = (n: number) => nf.format(Math.round(n));

/** Kapsayıcı genişliğini ölçer: SVG 1:1 çizilir, yazılar mobilde küçülmez */
function useWidth(fallback = 640): [(node: HTMLDivElement | null) => void, number] {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!el) return;
    const update = () => setW(Math.max(260, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, w];
}

const compact = (v: number) => (v >= 1000 ? `${nf.format(v / 1000)}K` : nf.format(v));

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * p;
}

function EmptyChart({ height, text }: { height: number; text: string }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-ink-line text-sm text-cream-dim"
      style={{ height }}
    >
      {text}
    </div>
  );
}

export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <div className="skeleton w-full" style={{ height }} aria-hidden />;
}

function DataTable({ points, valueLabel, format }: { points: Point[]; valueLabel: string; format: (n: number) => string }) {
  return (
    <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-ink-line">
      <table className="w-full text-sm">
        <thead className="bg-ink-soft text-left text-xs text-cream-dim">
          <tr>
            <th className="px-3 py-1.5 font-medium">Dönem</th>
            <th className="px-3 py-1.5 text-right font-medium">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.label} className="border-t border-ink-line">
              <td className="px-3 py-1">{p.label}</td>
              <td className="tabular px-3 py-1 text-right">{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={show}
      className="mt-2 text-xs text-cream-dim underline-offset-2 hover:text-cream hover:underline"
    >
      {show ? "Grafiği göster" : "Tablo olarak göster"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Alan / çizgi grafiği                                                */
/* ------------------------------------------------------------------ */
export function AreaChart({
  points,
  height = 220,
  format = fmtMoney,
  valueLabel = "Tutar",
  color = CHART_COLORS[0],
  emptyText = "Bu dönem için veri yok",
  title,
}: {
  points: Point[];
  height?: number;
  format?: (n: number) => string;
  valueLabel?: string;
  color?: string;
  emptyText?: string;
  title: string;
}) {
  const gid = useId().replace(/:/g, "");
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const [wrapRef, W] = useWidth();

  const H = height;
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const total = points.reduce((s, p) => s + p.value, 0);

  const geo = useMemo(() => {
    const max = niceMax(Math.max(...points.map((p) => p.value), 0));
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const x = (i: number) => pad.l + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = (v: number) => pad.t + ih - (v / max) * ih;
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const area = points.length
      ? `${line} L${x(points.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`
      : "";
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({ v: max * t, y: y(max * t) }));
    return { max, x, y, line, area, ticks, iw, ih };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, H, W]);

  if (points.length === 0 || total === 0) return <EmptyChart height={height} text={emptyText} />;

  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const a = active !== null ? points[active] : null;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        {title}. Toplam {format(total)}. En yüksek {format(Math.max(...points.map((p) => p.value)))}.
      </figcaption>
      {table ? (
        <DataTable points={points} valueLabel={valueLabel} format={format} />
      ) : (
        <div className="relative" ref={wrapRef}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={title}>
            <defs>
              <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.38" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {geo.ticks.map((t) => (
              <g key={t.v}>
                <line x1={pad.l} x2={W - pad.r} y1={t.y} y2={t.y} stroke="var(--chart-grid)" strokeDasharray="3 4" />
                <text x={pad.l - 6} y={t.y + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
                  {compact(t.v)}
                </text>
              </g>
            ))}
            <path d={geo.area} fill={`url(#g${gid})`} />
            <path
              d={geo.line}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1000}
              style={{ ["--len" as string]: 1000, strokeDasharray: 1000, animation: "draw-line 900ms var(--ease-out) both" }}
            />
            {points.map((p, i) => (
              <text
                key={p.label + i}
                x={geo.x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--chart-axis)"
                style={{ display: i % labelEvery === 0 ? undefined : "none" }}
              >
                {p.label}
              </text>
            ))}
            {active !== null && (
              <line x1={geo.x(active)} x2={geo.x(active)} y1={pad.t} y2={H - pad.b} stroke={color} strokeOpacity="0.5" />
            )}
            {points.map((p, i) => {
              const w = geo.iw / Math.max(points.length - 1, 1);
              return (
                <g key={i}>
                  <rect
                    x={geo.x(i) - w / 2}
                    y={pad.t}
                    width={w}
                    height={geo.ih}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${p.label}: ${format(p.value)}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    style={{ outline: "none" }}
                  />
                  {active === i && (
                    <circle cx={geo.x(i)} cy={geo.y(p.value)} r="5" fill={color} stroke="var(--color-ink-card)" strokeWidth="2" />
                  )}
                </g>
              );
            })}
          </svg>
          {a && active !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-ink-line bg-ink-card px-2.5 py-1.5 text-xs shadow-[var(--shadow-2)]"
              style={{
                left: `${Math.min(88, Math.max(12, (geo.x(active) / W) * 100))}%`,
                top: 0,
              }}
              role="status"
            >
              <p className="text-cream-dim">{a.label}</p>
              <p className="tabular text-sm font-semibold">{format(a.value)}</p>
              {a.sub && <p className="text-cream-dim">{a.sub}</p>}
            </div>
          )}
        </div>
      )}
      <TableToggle show={table} onToggle={() => setTable((v) => !v)} />
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Sütun grafiği                                                       */
/* ------------------------------------------------------------------ */
export function BarChart({
  points,
  height = 200,
  format = fmtNum,
  valueLabel = "Adet",
  color = CHART_COLORS[1],
  highlightMax = true,
  emptyText = "Bu dönem için veri yok",
  title,
}: {
  points: Point[];
  height?: number;
  format?: (n: number) => string;
  valueLabel?: string;
  color?: string;
  highlightMax?: boolean;
  emptyText?: string;
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const [wrapRef, W] = useWidth();
  const total = points.reduce((s, p) => s + p.value, 0);
  if (points.length === 0 || total === 0) return <EmptyChart height={height} text={emptyText} />;

  const H = height;
  const pad = { l: 36, r: 8, t: 14, b: 26 };
  const max = niceMax(Math.max(...points.map((p) => p.value)));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const slot = iw / points.length;
  const bw = Math.min(40, slot * 0.62);
  const peak = Math.max(...points.map((p) => p.value));
  const labelEvery = Math.max(1, Math.ceil(points.length / 12));
  const a = active !== null ? points[active] : null;

  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        {title}. Toplam {format(total)}. En yüksek: {points.find((p) => p.value === peak)?.label} ({format(peak)}).
      </figcaption>
      {table ? (
        <DataTable points={points} valueLabel={valueLabel} format={format} />
      ) : (
        <div className="relative" ref={wrapRef}>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={title}>
            {[0, 0.5, 1].map((t) => {
              const y = pad.t + ih - t * ih;
              return (
                <g key={t}>
                  <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--chart-grid)" strokeDasharray="3 4" />
                  <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="11" fill="var(--chart-axis)">
                    {compact(max * t)}
                  </text>
                </g>
              );
            })}
            {points.map((p, i) => {
              const h = (p.value / max) * ih;
              const cx = pad.l + slot * i + slot / 2;
              const isPeak = highlightMax && p.value === peak;
              return (
                <g key={p.label + i}>
                  <rect
                    x={cx - bw / 2}
                    y={pad.t + ih - h}
                    width={bw}
                    height={Math.max(h, p.value > 0 ? 2 : 0)}
                    rx="4"
                    fill={color}
                    fillOpacity={isPeak || active === i ? 1 : 0.55}
                    style={{ transformOrigin: `${cx}px ${pad.t + ih}px`, animation: `grow-up 600ms var(--ease-out) ${i * 18}ms both` }}
                  />
                  <rect
                    x={pad.l + slot * i}
                    y={pad.t}
                    width={slot}
                    height={ih}
                    fill="transparent"
                    tabIndex={0}
                    role="img"
                    aria-label={`${p.label}: ${format(p.value)}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    style={{ outline: "none" }}
                  />
                  {i % labelEvery === 0 && (
                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--chart-axis)">
                      {p.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {a && active !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-ink-line bg-ink-card px-2.5 py-1.5 text-xs shadow-[var(--shadow-2)]"
              style={{ left: `${Math.min(88, Math.max(12, ((pad.l + slot * active + slot / 2) / W) * 100))}%`, top: 0 }}
              role="status"
            >
              <p className="text-cream-dim">{a.label}</p>
              <p className="tabular text-sm font-semibold">{format(a.value)}</p>
            </div>
          )}
        </div>
      )}
      <TableToggle show={table} onToggle={() => setTable((v) => !v)} />
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Halka (donut) grafik + gösterge                                      */
/* ------------------------------------------------------------------ */
export function DonutChart({
  slices,
  format = fmtMoney,
  centerLabel = "Toplam",
  emptyText = "Henüz veri yok",
  title,
}: {
  slices: Point[];
  format?: (n: number) => string;
  centerLabel?: string;
  emptyText?: string;
  title: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, p) => s + p.value, 0);
  if (slices.length === 0 || total === 0) return <EmptyChart height={160} text={emptyText} />;

  const R = 56;
  const C = 2 * Math.PI * R;
  const arcs = slices.map((s, i) => ({
    ...s,
    i,
    len: (s.value / total) * C,
    off: (slices.slice(0, i).reduce((sum, x) => sum + x.value, 0) / total) * C,
  }));
  const sel = active !== null ? slices[active] : null;

  return (
    <figure className="m-0 flex flex-col items-center gap-4">
      <figcaption className="sr-only">
        {title}. {slices.map((s) => `${s.label}: ${format(s.value)} (%${Math.round((s.value / total) * 100)})`).join(", ")}.
      </figcaption>
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0 -rotate-90" role="img" aria-label={title}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-ink-line)" strokeWidth="18" strokeOpacity="0.4" />
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={CHART_COLORS[a.i % CHART_COLORS.length]}
            strokeWidth={active === a.i ? 22 : 18}
            strokeDasharray={`${Math.max(a.len - 2, 0)} ${C}`}
            strokeDashoffset={-a.off}
            onMouseEnter={() => setActive(a.i)}
            onMouseLeave={() => setActive(null)}
            style={{ transition: "stroke-width var(--dur-fast) var(--ease-out)" }}
          />
        ))}
        <g transform="rotate(90 80 80)">
          <text x="80" y="76" textAnchor="middle" fontSize="11" fill="var(--chart-axis)">
            {sel ? sel.label : centerLabel}
          </text>
          <text x="80" y="94" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--color-cream)">
            {format(sel ? sel.value : total)}
          </text>
        </g>
      </svg>
      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-sm">
        {slices.map((s, i) => (
          <li
            key={s.label}
            className="flex items-center gap-2 rounded-md px-1.5 py-1"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
            <span className="min-w-0 flex-1 truncate">{s.label}</span>
            <span className="tabular text-cream-dim">%{Math.round((s.value / total) * 100)}</span>
            <span className="tabular w-24 text-right font-medium">{format(s.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Yatay sıralı çubuklar (en çok satanlar vb.)                         */
/* ------------------------------------------------------------------ */
export function RankBars({
  items,
  format = fmtNum,
  color = CHART_COLORS[0],
  emptyText = "Henüz veri yok",
}: {
  items: Point[];
  format?: (n: number) => string;
  color?: string;
  emptyText?: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (items.length === 0 || max === 0) return <EmptyChart height={120} text={emptyText} />;
  return (
    <ol className="space-y-2.5">
      {items.map((it, i) => (
        <li key={it.label + i}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="tabular w-5 shrink-0 text-xs text-cream-dim">{i + 1}</span>
              <span className="truncate">{it.label}</span>
            </span>
            <span className="tabular shrink-0 font-medium">
              {format(it.value)}
              {it.sub && <span className="ml-1.5 text-xs font-normal text-cream-dim">{it.sub}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-soft" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{
                width: `${(it.value / max) * 100}%`,
                background: color,
                opacity: 1 - i * 0.07,
                transformOrigin: "left",
                animation: `grow-x 600ms var(--ease-out) ${i * 50}ms both`,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Mini çizgi (KPI kartı içi)                                          */
/* ------------------------------------------------------------------ */
export function Sparkline({ values, color = CHART_COLORS[0], height = 36 }: { values: number[]; color?: string; height?: number }) {
  const W = 120;
  if (values.length < 2 || values.every((v) => v === 0)) {
    return <div className="h-9 rounded bg-ink-soft/60" aria-hidden />;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 8)).toFixed(1)}`);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} aria-hidden preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Isı haritası (gün x saat)                                           */
/* ------------------------------------------------------------------ */
export function Heatmap({
  rows,
  cols,
  values,
  emptyText = "Henüz veri yok",
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  emptyText?: string;
}) {
  const max = Math.max(...values.flat(), 0);
  if (max === 0) return <EmptyChart height={140} text={emptyText} />;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: `44px repeat(${cols.length}, minmax(0,1fr))` }}>
          <span />
          {cols.map((c, i) => (
            <span key={c} className="text-center text-[10px] text-cream-dim">
              {i % 2 === 0 ? c : ""}
            </span>
          ))}
          {rows.map((r, ri) => (
            <div key={r} className="contents">
              <span className="pr-1 text-right text-[11px] leading-5 text-cream-dim">{r}</span>
              {cols.map((c, ci) => {
                const v = values[ri]?.[ci] ?? 0;
                const a = v === 0 ? 0.06 : 0.18 + (v / max) * 0.82;
                return (
                  <span
                    key={c}
                    className="h-5 rounded-[3px]"
                    title={`${r} ${c}:00 — ${fmtNum(v)}`}
                    style={{ background: `color-mix(in srgb, var(--chart-1) ${Math.round(a * 100)}%, transparent)` }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Değişim rozeti (↑ %12)                                              */
/* ------------------------------------------------------------------ */
export function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (previous <= 0 && current <= 0) return <span className="text-xs text-cream-dim">—</span>;
  if (previous <= 0) return <span className="text-xs text-ok">yeni</span>;
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`tabular inline-flex items-center gap-0.5 text-xs font-medium ${good ? "text-ok" : "text-danger"}`}>
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
        <path d={up ? "M6 2 L10 8 H2 Z" : "M6 10 L2 4 H10 Z"} fill="currentColor" />
      </svg>
      %{Math.abs(Math.round(pct))}
      <span className="sr-only">{up ? " artış" : " düşüş"}</span>
    </span>
  );
}
