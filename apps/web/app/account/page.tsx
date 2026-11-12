import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { api, getUser } from "@/lib/session";
import { STATUS_LABEL } from "@/lib/status";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Order = {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  tracking_number: string | null;
  carrier: string | null;
  items: { slug: string; name: string; qty: number }[];
};


export default async function Account() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const data = await api<{ orders: Order[] }>("/v1/account/orders");
  const orders = data?.orders ?? [];
  const first = (user.name || user.email).split(/[ @]/)[0];
  return (
    <div className="wrap dash-page">
      <header className="dash-head">
        <div className="who">
          {user.avatar ? (
            <img src={user.avatar} alt="" width={56} height={56} className="avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="avatar avatar-letter">{first[0]?.toUpperCase()}</span>
          )}
          <div>
            <span className="eyebrow">Your account</span>
            <h1>Hello, {first}</h1>
            <p className="muted small">{user.email}</p>
          </div>
        </div>
        <div className="dash-actions">
          {user.role === "admin" && (
            <Link href="/admin" className="btn btn-ghost">
              Store dashboard
            </Link>
          )}
          <form method="post" action="/api/auth/logout">
            <button className="btn btn-ghost">Sign out</button>
          </form>
        </div>
      </header>

      <section className="panel">
        <h2>Your orders</h2>
        {orders.length === 0 ? (
          <div className="empty">
            <p className="muted">No orders yet. Orders you place with {user.email} will appear here automatically.</p>
            <Link href="/shop" className="btn btn-red">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="order-list">
            {orders.map((o) => (
              <li key={o.id}>
                <div className="order-thumbs">
                  {o.items.slice(0, 3).map((i) => (
                    <Image key={i.slug} src={`/media/products/${i.slug}-sq.jpg`} alt={i.name} width={56} height={56} />
                  ))}
                </div>
                <div className="order-main">
                  <b>{o.id}</b>
                  <span className="muted small">
                    {new Date(o.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}
                  </span>
                  {o.tracking_number && (
                    <a className="gold small" href={`https://parcelsapp.com/en/tracking/${o.tracking_number}`} target="_blank" rel="noopener">
                      Track {o.tracking_number} →
                    </a>
                  )}
                </div>
                <div className="order-side">
                  <span className={`status status-${o.status}`}>{STATUS_LABEL[o.status] ?? o.status}</span>
                  <b>
                    {o.currency} {o.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </b>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
