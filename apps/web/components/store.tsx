"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { convert, format } from "@/lib/currency";

export type CartLine = { slug: string; qty: number; size?: string | null };
export type MiniProduct = { slug: string; name: string; price: number; category: string };

type Store = {
  currency: string;
  country: string;
  setCurrency: (c: string) => void;
  money: (usd: number) => string;
  cart: CartLine[];
  count: number;
  add: (slug: string, qty?: number, size?: string | null) => void;
  setQty: (slug: string, size: string | null | undefined, qty: number) => void;
  clear: () => void;
  drawer: boolean;
  setDrawer: (v: boolean) => void;
  products: Record<string, MiniProduct>;
};

const Ctx = createContext<Store | null>(null);
const KEY = "ar_cart_v1";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function StoreProvider({
  children,
  rates,
  products,
}: {
  children: React.ReactNode;
  rates: Record<string, number>;
  products: MiniProduct[];
}) {
  // Server render and first client render use USD; the visitor's currency
  // (from the edge country cookie or their own choice) is applied after mount.
  const [currency, setCur] = useState("USD");
  const [country, setCountry] = useState("US");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    setCur(readCookie("ar_cur") || "USD");
    setCountry(readCookie("ar_country") || "US");
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) setCart(saved.filter((l) => l && typeof l.slug === "string"));
    } catch {
      /* private mode or corrupted: start empty */
    }
  }, []);

  const persist = (next: CartLine[]) => {
    setCart(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const setCurrency = useCallback((c: string) => {
    setCur(c);
    document.cookie = `ar_cur=${c}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const add = useCallback(
    (slug: string, qty = 1, size: string | null = null) => {
      setCart((prev) => {
        const i = prev.findIndex((l) => l.slug === slug && (l.size ?? null) === size);
        const next = [...prev];
        if (i >= 0) next[i] = { ...next[i], qty: Math.min(10, next[i].qty + qty) };
        else next.push({ slug, qty, size });
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      setDrawer(true);
      const p = products.find((x) => x.slug === slug);
      if (p) track("add_to_cart", [{ slug, name: p.name, price: p.price, category: p.category, qty }]);
    },
    [products]
  );

  const setQty = useCallback(
    (slug: string, size: string | null | undefined, qty: number) => {
      const next = cart
        .map((l) => (l.slug === slug && (l.size ?? null) === (size ?? null) ? { ...l, qty: Math.min(10, qty) } : l))
        .filter((l) => l.qty > 0);
      persist(next);
    },
    [cart]
  );

  const value = useMemo<Store>(() => {
    const byslug = Object.fromEntries(products.map((p) => [p.slug, p]));
    return {
      currency,
      country,
      setCurrency,
      money: (usd: number) => format(convert(usd, currency, rates), currency),
      cart,
      count: cart.reduce((s, l) => s + l.qty, 0),
      add,
      setQty,
      clear: () => persist([]),
      drawer,
      setDrawer,
      products: byslug,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, country, cart, drawer, rates, products, add, setQty, setCurrency]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export function Price({ usd, compareAt, className }: { usd: number; compareAt?: number | null; className?: string }) {
  const { money } = useStore();
  return (
    <span className={`price ${className ?? ""}`}>
      <span className="price-now">{money(usd)}</span>
      {compareAt && compareAt > usd ? (
        <>
          <s className="price-was" aria-label={`Regular price ${money(compareAt)}`}>
            {money(compareAt)}
          </s>
          <span className="price-save">Save {Math.round((1 - usd / compareAt) * 100)}%</span>
        </>
      ) : null}
    </span>
  );
}
