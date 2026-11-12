"use client";

import { useEffect, useState } from "react";
import { useStore } from "./store";

export function Newsletter({ dark = false }: { dark?: boolean }) {
  const { country } = useStore();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, country }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Something went wrong");
      setState("done");
      setMsg(j.code);
    } catch (err) {
      setState("error");
      setMsg((err as Error).message);
    }
  };
  return (
    <form className={`newsletter ${dark ? "dark" : ""}`} onSubmit={submit}>
      {state === "done" ? (
        <p className="nl-done">
          You&rsquo;re in. Use <b className="code">{msg}</b> for 10% off your first order.
        </p>
      ) : (
        <>
          <label htmlFor="nl-email" className="sr-only">
            Email address
          </label>
          <input
            id="nl-email"
            type="email"
            required
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <button className="btn btn-red" disabled={state === "busy"}>
            {state === "busy" ? "…" : "Get 10% off"}
          </button>
          {state === "error" && <p className="form-error">{msg}</p>}
        </>
      )}
    </form>
  );
}

type ShipQuote = { zone: string; standard_days: string; express_days: string; standard_usd: number; free_over_usd: number };

export function ShippingEstimate() {
  const { country, money } = useStore();
  const [q, setQ] = useState<ShipQuote | null>(null);
  useEffect(() => {
    fetch(`/api/shipping?country=${country}`)
      .then((r) => r.json())
      .then((j) => setQ(j.quote))
      .catch(() => {});
  }, [country]);
  const dates = (range: string) => {
    const [a, b] = range.split("–").map(Number);
    const add = (n: number) => {
      const d = new Date();
      let left = n;
      while (left > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) left--;
      }
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };
    return `${add(a)} – ${add(b)}`;
  };
  if (!q) return <p className="ship-est muted">Calculating delivery…</p>;
  return (
    <div className="ship-est">
      <p>
        <b>Arrives {dates(q.standard_days)}</b> to {country} with tracked shipping.
      </p>
      <p className="muted small">
        Free over {money(q.free_over_usd)}, otherwise {money(q.standard_usd)}. Express ({q.express_days} business days) at checkout.
      </p>
    </div>
  );
}
