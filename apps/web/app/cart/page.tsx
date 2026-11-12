"use client";

import Image from "next/image";
import Link from "next/link";
import { FreeShipBar, useQuote } from "@/components/CartDrawer";
import { useStore } from "@/components/store";

export default function CartPage() {
  const { cart, products, setQty, money } = useStore();
  const { quote, error } = useQuote();
  if (!cart.length) {
    return (
      <div className="wrap" style={{ padding: "6rem 20px", textAlign: "center" }}>
        <h1>Your bag is empty</h1>
        <p className="muted">Find something that catches the light.</p>
        <Link href="/shop" className="btn btn-red">
          Shop bestsellers
        </Link>
      </div>
    );
  }
  return (
    <div className="wrap checkout">
      <div>
        <h1>Your bag</h1>
        {quote && <FreeShipBar remainingUsd={quote.free_shipping_remaining_usd} />}
        <ul className="cart-lines">
          {cart.map((l) => {
            const p = products[l.slug];
            if (!p) return null;
            return (
              <li key={`${l.slug}-${l.size ?? ""}`}>
                <Image src={`/media/products/${l.slug}-1.webp`} alt="" width={72} height={90} />
                <div>
                  <Link href={`/product/${l.slug}`} className="line-name">
                    {p.name}
                  </Link>
                  {l.size && <small className="muted">Size {l.size}</small>}
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
                <span>{money(p.price * l.qty)}</span>
              </li>
            );
          })}
        </ul>
      </div>
      <aside className="summary">
        {error && <p className="form-error">{error}</p>}
        {quote && (
          <>
            <div className="row-between">
              <span>Subtotal</span>
              <span>
                {quote.display.symbol}
                {quote.display.subtotal.toLocaleString()}
              </span>
            </div>
            <div className="row-between">
              <span>Shipping to {quote.delivery.zone}</span>
              <span>{quote.display.shipping === 0 ? "Free" : `${quote.display.symbol}${quote.display.shipping.toLocaleString()}`}</span>
            </div>
            <div className="row-between total">
              <b>Estimated total</b>
              <b>
                {quote.display.symbol}
                {quote.display.total.toLocaleString()}
              </b>
            </div>
            <p className="muted small">Delivery in {quote.delivery.standard_days} business days. Gift box included.</p>
          </>
        )}
        <Link href="/checkout" className="btn btn-red btn-block btn-xl">
          Checkout securely
        </Link>
      </aside>
    </div>
  );
}
