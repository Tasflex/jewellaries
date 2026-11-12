"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CURRENCIES } from "@/lib/currency";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useStore } from "./store";

const NAV = [
  { href: "/shop/necklaces", label: "Necklaces" },
  { href: "/shop/earrings", label: "Earrings" },
  { href: "/shop/rings", label: "Rings" },
  { href: "/shop/bracelets", label: "Bracelets" },
  { href: "/gifts", label: "Gifts" },
  { href: "/watch", label: "Watch & Shop" },
];

export function CurrencySelect({ compact = false }: { compact?: boolean }) {
  const { currency, setCurrency } = useStore();
  return (
    <label className={`cur-select ${compact ? "compact" : ""}`}>
      <span className="sr-only">Currency</span>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Header() {
  const { count, setDrawer } = useStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <div className="announce" role="note">
        <span>Free worldwide shipping over $59</span>
        <span className="dot" aria-hidden>
          ✦
        </span>
        <span>Every order arrives in our signature red box</span>
      </div>
      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <div className="wrap header-row">
          <button className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <span className="burger" />
          </button>
          <Link href="/" className="logo" aria-label="Jewellariess home">
            <Logo height={30} />
          </Link>
          <nav className={`main-nav ${open ? "open" : ""}`} aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <Link href="/journal" onClick={() => setOpen(false)} className="nav-muted">
              Journal
            </Link>
          </nav>
          <div className="header-tools">
            <Link href="/shop" className="icon-btn" aria-label="Search the shop">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <CurrencySelect compact />
            <ThemeToggle />
            <Link href="/account" className="icon-btn" aria-label="Your account">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </svg>
            </Link>
            <button className="icon-btn bag-btn" onClick={() => setDrawer(true)} aria-label={`Open bag, ${count} items`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 8h14l-1 12H6L5 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              {count > 0 && <span className="bag-count">{count}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
