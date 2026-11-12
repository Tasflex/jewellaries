"use client";

import { useState } from "react";
import { useStore } from "./store";

export default function AddToBag({
  slug,
  sizes,
  stock,
  name,
}: {
  slug: string;
  sizes: string[] | null;
  stock: number;
  name: string;
}) {
  const { add, money, products } = useStore();
  const [size, setSize] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const soldOut = stock <= 0;
  const price = products[slug]?.price ?? 0;

  const onAdd = () => {
    if (sizes && !size) {
      setNudge(true);
      return;
    }
    add(slug, 1, size);
  };

  return (
    <div className="buy-box">
      {sizes && (
        <fieldset className={`sizes ${nudge && !size ? "nudge" : ""}`}>
          <legend>
            Ring size <a href="/help/sizing">Size guide</a>
          </legend>
          <div className="size-row">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                className={s === size ? "on" : ""}
                aria-pressed={s === size}
                onClick={() => {
                  setSize(s);
                  setNudge(false);
                }}
              >
                {s}
              </button>
            ))}
          </div>
          {nudge && !size && <p className="form-error">Choose your size first.</p>}
        </fieldset>
      )}
      {stock > 0 && stock <= 10 && <p className="low-stock">Only {stock} left in stock</p>}
      <button className="btn btn-red btn-block btn-xl" onClick={onAdd} disabled={soldOut}>
        {soldOut ? "Sold out" : `Add to bag · ${money(price)}`}
      </button>
      {/* sticky bar for phones */}
      <div className="sticky-buy" aria-hidden>
        <span>{name}</span>
        <button className="btn btn-red" onClick={onAdd} disabled={soldOut} tabIndex={-1}>
          {soldOut ? "Sold out" : "Add to bag"}
        </button>
      </div>
    </div>
  );
}
