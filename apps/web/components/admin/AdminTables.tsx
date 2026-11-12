"use client";

import { useState } from "react";
import { STATUSES, STATUS_LABEL } from "@/lib/status";

type Order = {
  id: string;
  email: string;
  status: string;
  items: { name: string; qty: number }[];
  address: { name?: string; city?: string; country?: string };
  total_usd: number;
  charge_amount: number;
  charge_currency: string;
  created_at: string;
  gift: boolean;
  supplier_order_id: string | null;
  tracking_number: string | null;
  carrier: string | null;
};

async function call(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
  return j;
}

function OrderRow({ o }: { o: Order }) {
  const [status, setStatus] = useState(o.status);
  const [tracking, setTracking] = useState(o.tracking_number ?? "");
  const [carrier, setCarrier] = useState(o.carrier ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = status !== o.status || tracking !== (o.tracking_number ?? "") || carrier !== (o.carrier ?? "");
  const save = async () => {
    setMsg("Saving…");
    try {
      await call(`/api/admin/orders/${o.id}/fulfilment`, "POST", {
        status,
        tracking_number: tracking || undefined,
        carrier: carrier || undefined,
      });
      setMsg(status === "shipped" && tracking ? "Saved · customer emailed" : "Saved");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <tr>
      <td>
        <b>{o.id}</b>
        <small>{new Date(o.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</small>
      </td>
      <td>
        {o.address?.name}
        <small>
          {o.email} · {o.address?.city}, {o.address?.country}
          {o.gift ? " · 🎁 gift" : ""}
        </small>
      </td>
      <td>
        {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
        {o.supplier_order_id && <small>Supplier #{o.supplier_order_id}</small>}
      </td>
      <td className="num">
        ${o.total_usd.toFixed(2)}
        {o.charge_currency !== "USD" && (
          <small>
            {o.charge_currency} {o.charge_amount.toLocaleString()}
          </small>
        )}
      </td>
      <td>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={`Status for ${o.id}`}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {(status === "shipped" || tracking) && (
          <div className="inline-inputs">
            <input placeholder="Tracking no." value={tracking} onChange={(e) => setTracking(e.target.value)} />
            <input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </div>
        )}
      </td>
      <td>
        <button className="btn btn-sm btn-red" disabled={!dirty} onClick={save}>
          Save
        </button>
        {msg && <small>{msg}</small>}
      </td>
    </tr>
  );
}

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  return (
    <>
      <div className="filters">
        {["all", "paid", "processing", "shipped", "pending_payment", "delivered"].map((f) => (
          <button key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : STATUS_LABEL[f]} ({f === "all" ? orders.length : orders.filter((o) => o.status === f).length})
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="muted">No orders here yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th className="num">Total</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <OrderRow key={o.id} o={o} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

type P = { slug: string; name: string; category: string; price: number; compare_at: number; stock: number };

function ProductRow({ p }: { p: P }) {
  const [v, setV] = useState({ price: String(p.price), compare_at: String(p.compare_at), stock: String(p.stock) });
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = v.price !== String(p.price) || v.compare_at !== String(p.compare_at) || v.stock !== String(p.stock);
  const save = async () => {
    setMsg("Saving…");
    try {
      await call(`/api/admin/products/${p.slug}`, "PATCH", {
        price: Number(v.price),
        compare_at: Number(v.compare_at),
        stock: Math.round(Number(v.stock)),
      });
      setMsg("Saved · live in ~5 min");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <tr>
      <td>
        <img src={`/media/products/${p.slug}-sq.jpg`} alt="" width={44} height={44} className="thumb" />
      </td>
      <td>
        <a href={`/product/${p.slug}`} target="_blank" rel="noopener">
          {p.name}
        </a>
        <small>{p.category}</small>
      </td>
      {(["price", "compare_at", "stock"] as const).map((k) => (
        <td key={k} className="num">
          <input
            className="num-input"
            type="number"
            min={0}
            step={k === "stock" ? 1 : 0.01}
            value={v[k]}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
            aria-label={`${k} for ${p.name}`}
          />
        </td>
      ))}
      <td>
        <button className="btn btn-sm btn-red" disabled={!dirty} onClick={save}>
          Save
        </button>
        {msg && <small>{msg}</small>}
      </td>
    </tr>
  );
}

export function ProductsTable({ products }: { products: P[] }) {
  return (
    <div className="table-scroll">
      <table className="dtable">
        <thead>
          <tr>
            <th />
            <th>Product</th>
            <th className="num">Price $</th>
            <th className="num">Compare at $</th>
            <th className="num">Stock</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <ProductRow key={p.slug} p={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CsvButton({ rows, name }: { rows: Record<string, unknown>[]; name: string }) {
  const download = () => {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = (x: unknown) => `"${String(x ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  return (
    <button className="btn btn-sm btn-ghost" onClick={download} disabled={!rows.length}>
      Download CSV
    </button>
  );
}

export function CopyButton({ text, label = "Copy caption" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-sm btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}
