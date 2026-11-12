"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn't switched on yet. Please use your email for now.",
  cancelled: "Google sign-in was cancelled.",
  expired: "That sign-in took too long. Please try again.",
  state: "Something didn't match up. Please try again.",
  google: "Google couldn't sign you in just now. Please try again.",
  unverified: "Your Google email isn't verified yet.",
  link_expired: "That email link has expired or was already used. Request a new one below.",
  server: "Something went wrong on our side. Please try again.",
};

function Inner() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/account";
  const err = sp.get("error");
  const [providers, setProviders] = useState<{ google: boolean; email: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "disabled" | "error">("idle");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(() => setProviders({ google: false, email: false }));
  }, []);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const r = await fetch("/api/auth/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, next }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Couldn't send the link");
      setState(j.delivery === "disabled" ? "disabled" : "sent");
    } catch (e2) {
      setState("error");
      setMsg((e2 as Error).message);
    }
  };
  return (
    <div className="auth-card">
      <span className="eyebrow">Your account</span>
      <h1>Sign in</h1>
      <p className="muted">Track orders, reorder favourites and save your details for a faster checkout.</p>
      {err && <p className="form-error">{ERRORS[err] ?? "Sign-in failed. Please try again."}</p>}

      <a
        href={`/api/auth/google/start?next=${encodeURIComponent(next)}`}
        className={`btn btn-google btn-block ${providers && !providers.google ? "is-off" : ""}`}
        aria-disabled={providers ? !providers.google : undefined}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continue with Google
      </a>

      <div className="auth-or">
        <span>or use your email</span>
      </div>

      {state === "sent" ? (
        <div className="auth-sent">
          <b>Check your inbox.</b>
          <p className="muted">
            If {email} can receive mail, a sign-in link is on its way. It works once and expires in 15 minutes.
          </p>
        </div>
      ) : state === "disabled" ? (
        <p className="form-error">Email sign-in isn&rsquo;t switched on yet. Please continue with Google.</p>
      ) : (
        <form onSubmit={send}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-red btn-block" disabled={state === "busy"}>
            {state === "busy" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && <p className="form-error">{msg}</p>}
        </form>
      )}
      <p className="muted small" style={{ marginTop: "1.5rem" }}>
        No password needed. By signing in you agree to our <Link href="/help/terms" className="gold">terms</Link> and{" "}
        <Link href="/help/privacy" className="gold">privacy policy</Link>.
      </p>
    </div>
  );
}

export default function Login() {
  return (
    <div className="wrap auth-wrap">
      <Suspense>
        <Inner />
      </Suspense>
    </div>
  );
}
