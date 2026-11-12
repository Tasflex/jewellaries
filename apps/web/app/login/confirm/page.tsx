import type { Metadata } from "next";

export const metadata: Metadata = { title: "Confirm sign-in", robots: { index: false, follow: false } };

/**
 * The emailed link lands here. Signing in takes one more tap (a POST), so
 * email security scanners that pre-open links can't use up the token.
 */
export default async function Confirm({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="wrap auth-wrap">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <span className="eyebrow">Almost there</span>
        <h1>Sign in to Jewellariess</h1>
        {token && /^[0-9a-f]{64}$/.test(token) ? (
          <form method="post" action="/api/auth/email/confirm">
            <input type="hidden" name="token" value={token} />
            <button className="btn btn-red btn-block btn-xl">Sign me in</button>
          </form>
        ) : (
          <p className="form-error">This link is incomplete. Please request a new one.</p>
        )}
      </div>
    </div>
  );
}
