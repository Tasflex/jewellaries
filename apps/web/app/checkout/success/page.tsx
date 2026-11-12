"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useStore } from "@/components/store";
import { track } from "@/lib/analytics";

function Inner() {
  const sp = useSearchParams();
  const order = sp.get("order") || sp.get("reference") || "";
  const { clear } = useStore();
  const [state, setState] = useState<"checking" | "paid" | "pending">("checking");
  useEffect(() => {
    if (!order) return setState("pending");
    fetch(`/api/payments/verify?reference=${encodeURIComponent(order)}`)
      .then((r) => r.json())
      .then((j) => {
        setState(j.paid ? "paid" : "pending");
        if (j.paid) {
          // fire once per order (refreshing this page must not double-count revenue)
          let seen = false;
          try {
            seen = sessionStorage.getItem(`jw_purchase_${order}`) === "1";
            sessionStorage.setItem(`jw_purchase_${order}`, "1");
          } catch {}
          if (!seen && Array.isArray(j.items)) {
            track(
              "purchase",
              j.items.map((i: { slug: string; name: string; unit_usd: number; qty: number }) => ({ slug: i.slug, name: i.name, price: i.unit_usd, qty: i.qty })),
              { transaction_id: order, value: j.total_usd, shipping: j.shipping_usd, currency: "USD" }
            );
          }
          clear();
        }
      })
      .catch(() => setState("pending"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);
  return (
    <div className="wrap" style={{ padding: "6rem 20px", textAlign: "center", maxWidth: 640 }}>
      {state === "checking" && <h1>Confirming your payment…</h1>}
      {state === "paid" && (
        <>
          <span className="eyebrow">Order {order}</span>
          <h1>It&rsquo;s on its way to the red box.</h1>
          <p>Thank you! Your receipt is in your inbox, and we&rsquo;ll email your tracking number as soon as it ships.</p>
          <Link href="/track" className="btn btn-ghost">
            Track your order
          </Link>
        </>
      )}
      {state === "pending" && (
        <>
          <h1>We haven&rsquo;t received your payment yet</h1>
          <p className="muted">
            If you completed payment, it can take a minute to confirm. Refresh this page, or <Link href="/cart" className="gold">return to your bag</Link>.
          </p>
        </>
      )}
    </div>
  );
}

export default function Success() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
