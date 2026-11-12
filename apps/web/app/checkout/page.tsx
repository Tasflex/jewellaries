"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuote } from "@/components/CartDrawer";
import { useStore } from "@/components/store";
import { track } from "@/lib/analytics";

const COUNTRIES: [string, string][] = [
  ["US", "United States"], ["GB", "United Kingdom"], ["CA", "Canada"], ["AU", "Australia"], ["NZ", "New Zealand"],
  ["IE", "Ireland"], ["DE", "Germany"], ["FR", "France"], ["IT", "Italy"], ["ES", "Spain"], ["NL", "Netherlands"],
  ["BE", "Belgium"], ["PT", "Portugal"], ["AT", "Austria"], ["SE", "Sweden"], ["DK", "Denmark"], ["FI", "Finland"],
  ["NO", "Norway"], ["CH", "Switzerland"], ["PL", "Poland"], ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"],
  ["QA", "Qatar"], ["KW", "Kuwait"], ["KE", "Kenya"], ["UG", "Uganda"], ["TZ", "Tanzania"], ["RW", "Rwanda"],
  ["NG", "Nigeria"], ["GH", "Ghana"], ["ZA", "South Africa"], ["EG", "Egypt"], ["MA", "Morocco"], ["IN", "India"],
  ["SG", "Singapore"], ["MY", "Malaysia"], ["JP", "Japan"], ["KR", "South Korea"], ["BR", "Brazil"], ["MX", "Mexico"],
];

export default function Checkout() {
  const { cart, currency, country: guessed, clear } = useStore();
  const [country, setCountry] = useState("US");
  const [shipping, setShipping] = useState("standard");
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [gift, setGift] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: string } | null>(null);
  useEffect(() => setCountry(guessed), [guessed]);
  const { products } = useStore();
  const [tracked, setTracked] = useState(false);
  useEffect(() => {
    if (tracked || !cart.length || !Object.keys(products).length) return;
    track("begin_checkout", cart.flatMap((l) => (products[l.slug] ? [{ slug: l.slug, name: products[l.slug].name, price: products[l.slug].price, category: products[l.slug].category, qty: l.qty }] : [])));
    setTracked(true);
  }, [cart, products, tracked]);
  const { quote, error } = useQuote({ promo: appliedPromo, shipping, country });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: s("email"),
          items: cart,
          currency,
          shipping,
          promo: appliedPromo || undefined,
          gift,
          gift_note: gift ? s("gift_note") : undefined,
          address: {
            name: s("name"), line1: s("line1"), line2: s("line2") || undefined, city: s("city"),
            region: s("region") || undefined, postal_code: s("postal_code") || undefined, country, phone: s("phone") || undefined,
          },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Checkout failed, please try again");
      if (j.payment_url) {
        window.location.href = j.payment_url;
        return;
      }
      clear();
      setDone({ id: j.order_id });
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="wrap" style={{ padding: "6rem 20px", textAlign: "center", maxWidth: 640 }}>
        <span className="eyebrow">Order received</span>
        <h1>Thank you!</h1>
        <p>
          Your order <b>{done.id}</b> is reserved. We&rsquo;ll email you a secure payment link shortly, and your pieces ship as
          soon as payment is confirmed.
        </p>
        <Link href="/shop" className="btn btn-ghost">
          Keep browsing
        </Link>
      </div>
    );
  }
  if (!cart.length) {
    return (
      <div className="wrap" style={{ padding: "6rem 20px", textAlign: "center" }}>
        <h1>Your bag is empty</h1>
        <Link href="/shop" className="btn btn-red">
          Shop now
        </Link>
      </div>
    );
  }
  const d = quote?.display;
  const fmt = (n: number) => `${d?.symbol ?? ""}${n.toLocaleString()}`;
  return (
    <form className="wrap checkout" onSubmit={submit}>
      <div>
        <h1>Checkout</h1>
        <h2 style={{ fontSize: "1.4rem" }}>Contact</h2>
        <div className="field">
          <label htmlFor="email">Email (for your receipt and tracking)</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <h2 style={{ fontSize: "1.4rem", marginTop: "1.5rem" }}>Shipping address</h2>
        <div className="field">
          <label htmlFor="country">Country</label>
          <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country">
            {!COUNTRIES.some(([c]) => c === country) && <option value={country}>{country}</option>}
            {COUNTRIES.map(([c, n]) => (
              <option key={c} value={c}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" required autoComplete="name" />
        </div>
        <div className="field">
          <label htmlFor="line1">Address</label>
          <input id="line1" name="line1" required autoComplete="address-line1" />
        </div>
        <div className="field">
          <label htmlFor="line2">Apartment, suite (optional)</label>
          <input id="line2" name="line2" autoComplete="address-line2" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="city">City</label>
            <input id="city" name="city" required autoComplete="address-level2" />
          </div>
          <div className="field">
            <label htmlFor="region">State / county</label>
            <input id="region" name="region" autoComplete="address-level1" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="postal_code">Postcode</label>
            <input id="postal_code" name="postal_code" autoComplete="postal-code" />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone (for the courier)</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" />
          </div>
        </div>
        <h2 style={{ fontSize: "1.4rem", marginTop: "1.5rem" }}>Delivery</h2>
        <div className="ship-opts">
          <label>
            <input type="radio" name="ship" checked={shipping === "standard"} onChange={() => setShipping("standard")} />
            <span>
              <b>Standard, tracked</b> · {quote?.delivery.standard_days ?? "…"} business days
            </span>
          </label>
          <label>
            <input type="radio" name="ship" checked={shipping === "express"} onChange={() => setShipping("express")} />
            <span>
              <b>Express</b> · 4–7 business days
            </span>
          </label>
        </div>
        <label className="field" style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} style={{ width: "auto" }} />
          This is a gift: hide prices and add a note
        </label>
        {gift && (
          <div className="field">
            <label htmlFor="gift_note">Gift note (we&rsquo;ll handwrite it)</label>
            <textarea id="gift_note" name="gift_note" maxLength={240} rows={3} />
          </div>
        )}
      </div>
      <aside className="summary">
        <h2 style={{ fontSize: "1.5rem" }}>Order summary</h2>
        {(error || err) && <p className="form-error">{err || error}</p>}
        {d && (
          <>
            <div className="row-between">
              <span>Subtotal</span>
              <span>{fmt(d.subtotal)}</span>
            </div>
            {d.discount > 0 && (
              <div className="row-between" style={{ color: "var(--rosso-hi)" }}>
                <span>Discount ({appliedPromo.toUpperCase()})</span>
                <span>−{fmt(d.discount)}</span>
              </div>
            )}
            <div className="row-between">
              <span>Shipping</span>
              <span>{d.shipping === 0 ? "Free" : fmt(d.shipping)}</span>
            </div>
            <div className="row-between total">
              <b>Total</b>
              <b>{fmt(d.total)}</b>
            </div>
          </>
        )}
        <div className="field-row" style={{ margin: "1rem 0", gridTemplateColumns: "1fr auto" }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="promo" className="sr-only">
              Discount code
            </label>
            <input id="promo" placeholder="Discount code" value={promo} onChange={(e) => setPromo(e.target.value)} />
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => setAppliedPromo(promo.trim())}>
            Apply
          </button>
        </div>
        <button className="btn btn-red btn-block btn-xl" disabled={busy || !quote}>
          {busy ? "Securing your order…" : `Pay ${d ? fmt(d.total) : ""}`}
        </button>
        <p className="secure-note">🔒 Secure, encrypted payment · Cards &amp; mobile money</p>
        <p className="muted small" style={{ marginTop: "0.8rem" }}>
          Import duties, if your country charges any, are paid on delivery. By ordering you agree to our{" "}
          <Link href="/help/terms" className="gold">
            terms
          </Link>
          .
        </p>
      </aside>
    </form>
  );
}
