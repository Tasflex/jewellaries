"use client";

import Image from "next/image";
import { useState } from "react";
import { useStore } from "./store";

type Piece = { slug: string; name: string; price: number; layer: string | null };

/**
 * "Build your stack": tap pieces to layer them. Shows the running total and,
 * when the picks match a curated set, points to the set price (real saving:
 * the set costs less than the pieces bought separately).
 */
export default function StackBuilder({
  pieces,
  set,
}: {
  pieces: Piece[];
  set: { slug: string; name: string; price: number; bundle: string[] } | null;
}) {
  const { money, add } = useStore();
  const [picked, setPicked] = useState<string[]>(pieces.slice(0, 2).map((p) => p.slug));
  const toggle = (s: string) => setPicked((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s].slice(-3)));
  const chosen = pieces.filter((p) => picked.includes(p.slug));
  const total = chosen.reduce((s, p) => s + p.price, 0);
  const matchesSet = set && set.bundle.length === chosen.length && set.bundle.every((b) => picked.includes(b));
  return (
    <div className="stack">
      <div className="stack-stage" aria-live="polite">
        {chosen.length === 0 && <p className="muted">Tap a piece to start your stack</p>}
        {chosen.map((p, i) => (
          <Image
            key={p.slug}
            src={`/media/products/${p.slug}-2.webp`}
            alt={p.name}
            width={600}
            height={750}
            className="stack-layer"
            style={{ transform: `translateY(${i * 9}%) scale(${1 - i * 0.05})`, zIndex: 10 - i }}
          />
        ))}
      </div>
      <div className="stack-panel">
        <ol className="stack-picks">
          {pieces.map((p) => (
            <li key={p.slug}>
              <button className={picked.includes(p.slug) ? "on" : ""} aria-pressed={picked.includes(p.slug)} onClick={() => toggle(p.slug)}>
                <Image src={`/media/products/${p.slug}-sq.jpg`} alt="" width={64} height={64} />
                <span>
                  {p.name}
                  <small>{money(p.price)}</small>
                </span>
                <span className="tick" aria-hidden>
                  {picked.includes(p.slug) ? "✓" : "+"}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="stack-total">
          <span>Your stack</span>
          <b>{money(total)}</b>
        </div>
        {matchesSet && set ? (
          <button className="btn btn-red btn-block" onClick={() => add(set.slug)}>
            Get it as {set.name} · {money(set.price)} (save {money(total - set.price)})
          </button>
        ) : (
          <button className="btn btn-red btn-block" disabled={!chosen.length} onClick={() => chosen.forEach((p) => add(p.slug))}>
            Add {chosen.length || ""} to bag
          </button>
        )}
        {set && !matchesSet && (
          <p className="muted small">
            Pick all three for {set.name}: {money(set.price)} in one gift box.
          </p>
        )}
      </div>
    </div>
  );
}
