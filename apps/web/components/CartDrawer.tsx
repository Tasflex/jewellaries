"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore } from "./store";

type Quote = {
  usd: { subtotal: number; shipping: number; discount: number; total: number };
  display: { currency: string; symbol: string; subtotal: number; shipping: number; discount: number; total: number };
  free_shipping_remaining_usd: number;
  delivery: { standard_days: string; zone: string };
};

export function useQuote(extra?: { promo?: string; shipping?: string; country?: string }) {
  const { cart, currency, country } = useStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify([cart, currency, country, extra]);
  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      return;
    }
    const ctl = new AbortController();
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: cart, currency, country: extra?.country || country, promo: extra?.promo, shipping: extra?.shipping }),
      signal: ctl.signal,
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Could not price your bag");
        setQuote(j);
        setError(null);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { quote, error };
}

export function FreeShipBar({ remainingUsd }: { remainingUsd: number }) {
  const { money } = useStore();
  const pct = Math.min(100, ((59 - remainingUsd) / 59) * 100);
  return (
    <div className="ship-bar">
      <p>{remainingUsd > 0 ? <>You&rsquo;re <b>{money(remainingUsd)}</b> away from free shipping</> : <>✦ You&rsquo;ve unlocked <b>free worldwide shipping</b></>}</p>
      <div className="ship-track" aria-hidden>
        <div className="ship-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CartDrawer() {
  const { cart, drawer, setDrawer, setQty, products, money } = useStore();
  const { quote, error } = useQuote();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setDrawer]);
  return (
    <div className={`drawer-root ${drawer ? "open" : ""}`} aria-hidden={!drawer}>
      <div className="drawer-scrim" onClick={() => setDrawer(false)} />
      <aside className="drawer" role="dialog" aria-label="Your bag" aria-modal="true">
        <div className="drawer-head">
          <h2>Your bag</h2>
          <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Close bag">
            ✕
          </button>
        </div>
        {cart.length === 0 ? (
          <div className="drawer-empty">
            <p>Your bag is empty, but it doesn&rsquo;t have to be.</p>
            <Link href="/shop" className="btn btn-red" onClick={() => setDrawer(false)}>
              Shop bestsellers
            </Link>
          </div>
        ) : (
          <>
            {quote && <FreeShipBar remainingUsd={quote.free_shipping_remaining_usd} />}
            <ul className="drawer-lines">
              {cart.map((l) => {
                const p = products[l.slug];
                if (!p) return null;
                return (
                  <li key={`${l.slug}-${l.size ?? ""}`}>
                    <Image src={`/media/products/${l.slug}-1.webp`} alt="" width={72} height={90} />
                    <div>
                      <Link href={`/product/${l.slug}`} onClick={() => setDrawer(false)} className="line-name">
                        {p.name}
                      </Link>
                      {l.size && <small>Size {l.size}</small>}
                      <div className="qty">
                        <button onClick={() => setQty(l.slug, l.size, l.qty - 1)} aria-label="Decrease quantity">
                          −
                        </button>
                        <span>{l.qty}</span>
                        <button onClick={() => setQty(l.slug, l.size, l.qty + 1)} aria-label="Increase quantity">
                          +
                        </button>
                      </div>
                    </div>
                    <span className="line-price">{money(p.price * l.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="drawer-foot">
              {error && <p className="form-error">{error}</p>}
              <div className="row-between">
                <span>Subtotal</span>
                <b>{quote ? `${quote.display.symbol}${quote.display.subtotal.toLocaleString()}` : "…"}</b>
              </div>
              <p className="muted small">Gift box included. Shipping and any code are applied at checkout.</p>
              <Link href="/checkout" className="btn btn-red btn-block" onClick={() => setDrawer(false)}>
                Checkout securely
              </Link>
              <Link href="/cart" className="btn btn-ghost btn-block" onClick={() => setDrawer(false)}>
                View bag
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
