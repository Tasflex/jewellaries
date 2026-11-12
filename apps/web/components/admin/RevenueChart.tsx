"use client";

import { useState } from "react";

type Day = { date: string; revenue: number; orders: number };

/**
 * Daily revenue, one series: single hue (theme gold ink), thin bars with 4px
 * rounded tops on the baseline, a 2px gap between bars, recessive axis, a
 * hover tooltip per bar, and a table view for screen readers / exact values.
 */
export default function RevenueChart({ days, span }: { days: Day[]; span: number }) {
  // Fill gaps so every day in the window has a bar (zero days stay visible as no bar).
  const end = new Date();
  const series: Day[] = [];
  const by = Object.fromEntries(days.map((d) => [d.date, d]));
  for (let i = span - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
    series.push(by[d] ?? { date: d, revenue: 0, orders: 0 });
  }
  const max = Math.max(1, ...series.map((d) => d.revenue));
  const nice = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / nice) * nice;
  const W = 720, H = 220, padL = 44, padB = 22, padT = 8;
  const bw = (W - padL) / series.length;
  const [hover, setHover] = useState<number | null>(null);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const ticks = [0, top / 2, top];
  const fmt = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const h = hover !== null ? series[hover] : null;
  return (
    <figure className="chart">
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Revenue per day over the last ${span} days`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="chart-grid" />
              <text x={padL - 8} y={y(t) + 4} className="chart-axis" textAnchor="end">
                {fmt(t)}
              </text>
            </g>
          ))}
          {series.map((d, i) => {
            const x = padL + i * bw + 1;
            const w = Math.max(1, bw - 2);
            const top_ = y(d.revenue);
            const base = y(0);
            const hgt = base - top_;
            const r = Math.min(4, w / 2, hgt);
            return (
              <g key={d.date} onMouseEnter={() => setHover(i)}>
                {/* generous hit target, bigger than the mark */}
                <rect x={padL + i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
                {d.revenue > 0 && (
                  <path
                    className={`chart-bar ${hover === i ? "on" : ""}`}
                    d={`M${x},${base} V${top_ + r} Q${x},${top_} ${x + r},${top_} H${x + w - r} Q${x + w},${top_} ${x + w},${top_ + r} V${base} Z`}
                  />
                )}
              </g>
            );
          })}
          <line x1={padL} x2={W} y1={y(0)} y2={y(0)} className="chart-base" />
          {[0, Math.floor(series.length / 2), series.length - 1].map((i) => (
            <text key={i} x={padL + i * bw + bw / 2} y={H - 6} className="chart-axis" textAnchor="middle">
              {new Date(series[i].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          ))}
        </svg>
        {h && hover !== null && (
          <div className="chart-tip" style={{ left: `${((padL + hover * bw + bw / 2) / W) * 100}%` }}>
            <b>{new Date(h.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</b>
            <span>
              {fmt(h.revenue)} · {h.orders} order{h.orders === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Show as table</summary>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Revenue (USD)</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {series
              .filter((d) => d.orders > 0)
              .map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{fmt(d.revenue)}</td>
                  <td>{d.orders}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
