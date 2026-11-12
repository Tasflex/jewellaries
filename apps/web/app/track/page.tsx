"use client";

import { useState } from "react";

type T = { id: string; status: string; tracking_number?: string; carrier?: string; created_at: string; items: { name: string; qty: number }[] };

const STEPS = ["pending_payment", "paid", "processing", "shipped", "delivered"];
const LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Payment confirmed",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function Track() {
  const [res, setRes] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErr(null);
    setRes(null);
    const r = await fetch(`/api/orders/${encodeURIComponent(String(f.get("id")).trim())}?email=${encodeURIComponent(String(f.get("email")).trim())}`);
    const j = await r.json();
    if (!r.ok) setErr(j.error || "Not found");
    else setRes(j);
  };
  const at = res ? STEPS.indexOf(res.status) : -1;
  return (
    <div className="wrap" style={{ maxWidth: 640, padding: "4rem 20px" }}>
      <h1>Track your order</h1>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="id">Order number</label>
          <input id="id" name="id" placeholder="AR-XXXXXXXX" required />
        </div>
        <div className="field">
          <label htmlFor="email">Email used at checkout</label>
          <input id="email" name="email" type="email" required />
        </div>
        <button className="btn btn-red">Track</button>
      </form>
      {err && <p className="form-error">{err}</p>}
      {res && (
        <div className="summary" style={{ marginTop: "2rem", position: "static" }}>
          <h2 style={{ fontSize: "1.4rem" }}>{LABEL[res.status] ?? res.status}</h2>
          <ol style={{ paddingLeft: "1.2rem" }}>
            {STEPS.map((s, i) => (
              <li key={s} style={{ color: i <= at ? "var(--champagne)" : "var(--muted)" }}>
                {LABEL[s]}
              </li>
            ))}
          </ol>
          {res.tracking_number && (
            <p>
              Tracking: <b>{res.tracking_number}</b> {res.carrier && `(${res.carrier})`}{" "}
              <a className="gold" href={`https://parcelsapp.com/en/tracking/${res.tracking_number}`} target="_blank" rel="noopener">
                Follow parcel →
              </a>
            </p>
          )}
          <p className="muted small">{res.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}</p>
        </div>
      )}
    </div>
  );
}
