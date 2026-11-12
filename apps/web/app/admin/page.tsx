import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyButton, CsvButton, OrdersTable, ProductsTable } from "@/components/admin/AdminTables";
import RevenueChart from "@/components/admin/RevenueChart";
import { getCatalog, getVideos } from "@/lib/catalog";
import { api, getUser } from "@/lib/session";

export const metadata: Metadata = { title: "Store dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Stats = {
  revenue_usd: number;
  orders: number;
  aov_usd: number;
  awaiting_payment: number;
  new_subscribers: number;
  new_customers: number;
  queue: { paid: number; processing: number; shipped: number };
  subscribers_total: number;
  customers_total: number;
  by_day: { date: string; revenue: number; orders: number }[];
  by_country: { country: string | null; orders: number; revenue: number }[];
  top_products: { slug: string; name: string; qty: number; revenue: number }[];
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "videos", label: "Videos" },
];
const RANGES = [7, 30, 90, 365];
const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; days?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") {
    return (
      <div className="wrap auth-wrap">
        <div className="auth-card">
          <h1>Admins only</h1>
          <p className="muted">
            {user.email} doesn&rsquo;t have access to the store dashboard. <Link href="/account" className="gold">Go to your account</Link>.
          </p>
        </div>
      </div>
    );
  }
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "overview";
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const tabHref = (k: string) => `/admin?tab=${k}&days=${days}`;

  return (
    <div className="wrap dash-page">
      <header className="dash-head">
        <div>
          <span className="eyebrow">Jewellariess</span>
          <h1>Store dashboard</h1>
        </div>
        <div className="dash-actions">
          <span className="muted small">Signed in as {user.email}</span>
          <form method="post" action="/api/auth/logout">
            <button className="btn btn-ghost btn-sm">Sign out</button>
          </form>
        </div>
      </header>
      <nav className="dash-tabs" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <Link key={t.key} href={tabHref(t.key)} className={tab === t.key ? "on" : ""} aria-current={tab === t.key ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      {tab === "overview" && <Overview days={days} />}
      {tab === "orders" && <Orders />}
      {tab === "products" && <Products />}
      {tab === "customers" && <Customers />}
      {tab === "videos" && <Videos />}
    </div>
  );
}

async function Overview({ days }: { days: number }) {
  const s = await api<Stats>(`/v1/admin/stats?days=${days}`);
  if (!s) return <p className="form-error">Couldn&rsquo;t load stats.</p>;
  const kpis = [
    { label: "Revenue", value: usd(s.revenue_usd), note: `last ${days} days` },
    { label: "Paid orders", value: s.orders.toLocaleString(), note: `${s.awaiting_payment} awaiting payment` },
    { label: "Average order", value: usd(s.aov_usd), note: "per paid order" },
    { label: "To fulfil", value: (s.queue.paid + s.queue.processing).toLocaleString(), note: `${s.queue.shipped} in transit`, alert: s.queue.paid > 0 },
    { label: "Customers", value: s.customers_total.toLocaleString(), note: `+${s.new_customers} new` },
    { label: "Subscribers", value: s.subscribers_total.toLocaleString(), note: `+${s.new_subscribers} new` },
  ];
  return (
    <>
      <div className="filters" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <Link key={r} href={`/admin?tab=overview&days=${r}`} className={`chip ${r === days ? "on" : ""}`}>
            {r === 365 ? "12 months" : `${r} days`}
          </Link>
        ))}
      </div>
      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`kpi ${k.alert ? "alert" : ""}`}>
            <span>{k.label}</span>
            <b>{k.value}</b>
            <small>{k.note}</small>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Revenue per day</h2>
        <RevenueChart days={s.by_day} span={days} />
      </section>
      <div className="panel-grid">
        <section className="panel">
          <h2>Top products</h2>
          {s.top_products.length === 0 ? (
            <p className="muted">No paid orders in this period yet.</p>
          ) : (
            <table className="dtable compact">
              <tbody>
                {s.top_products.map((p) => (
                  <tr key={p.slug}>
                    <td>{p.name}</td>
                    <td className="num">{p.qty} sold</td>
                    <td className="num">{usd(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="panel">
          <h2>Where orders ship</h2>
          {s.by_country.length === 0 ? (
            <p className="muted">No paid orders in this period yet.</p>
          ) : (
            <table className="dtable compact">
              <tbody>
                {s.by_country.map((c) => (
                  <tr key={c.country ?? "?"}>
                    <td>{c.country ?? "Unknown"}</td>
                    <td className="num">{c.orders} orders</td>
                    <td className="num">{usd(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}

async function Orders() {
  const d = await api<{ orders: Parameters<typeof OrdersTable>[0]["orders"] }>("/v1/admin/orders");
  return (
    <section className="panel">
      <h2>Orders</h2>
      <p className="muted small">
        Paid orders go to the supplier automatically every 5 minutes. Mark an order <b>Shipped</b> with a tracking number and the customer gets an email.
      </p>
      <OrdersTable orders={d?.orders ?? []} />
    </section>
  );
}

async function Products() {
  const c = await getCatalog();
  return (
    <section className="panel">
      <h2>Products</h2>
      <p className="muted small">Edit price, compare-at price and stock. Changes reach the storefront within about 5 minutes.</p>
      <ProductsTable products={c.products.map(({ slug, name, category, price, compare_at, stock }) => ({ slug, name, category, price, compare_at, stock }))} />
    </section>
  );
}

type Customer = { email: string; name: string | null; google: boolean; created_at: string; last_login_at: string | null; orders: number; spent_usd: number };
type Sub = { email: string; country: string | null; created_at: string };

async function Customers() {
  const [c, s] = await Promise.all([api<{ customers: Customer[] }>("/v1/admin/customers"), api<{ subscribers: Sub[] }>("/v1/admin/subscribers")]);
  const customers = c?.customers ?? [];
  const subs = s?.subscribers ?? [];
  const date = (x: string | null) => (x ? new Date(x).toLocaleDateString(undefined, { dateStyle: "medium" }) : "—");
  return (
    <div className="panel-grid">
      <section className="panel">
        <div className="row-between">
          <h2>Customers ({customers.length})</h2>
          <CsvButton rows={customers} name="customers" />
        </div>
        <div className="table-scroll">
          <table className="dtable compact">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Sign-in</th>
                <th className="num">Orders</th>
                <th className="num">Spent</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((u) => (
                <tr key={u.email}>
                  <td>
                    {u.name ?? u.email}
                    <small>
                      {u.email} · joined {date(u.created_at)}
                    </small>
                  </td>
                  <td>{u.google ? "Google" : "Email"}</td>
                  <td className="num">{u.orders}</td>
                  <td className="num">{usd(u.spent_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <div className="row-between">
          <h2>Subscribers ({subs.length})</h2>
          <CsvButton rows={subs} name="subscribers" />
        </div>
        <div className="table-scroll">
          <table className="dtable compact">
            <tbody>
              {subs.slice(0, 200).map((x) => (
                <tr key={x.email}>
                  <td>{x.email}</td>
                  <td>{x.country ?? ""}</td>
                  <td className="num">{date(x.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

async function Videos() {
  const [videos, c] = await Promise.all([getVideos(), getCatalog()]);
  const by = Object.fromEntries(c.products.map((p) => [p.slug, p]));
  return (
    <section className="panel">
      <h2>Social videos ({videos.length})</h2>
      <p className="muted small">
        Made by our own video engine (9:16, ready for TikTok, Reels and Shorts). Download, then paste the caption. Each link carries UTM tags so sales show up by
        format.
      </p>
      <div className="video-lib">
        {videos.map((v) => {
          const full = `${v.caption}\n\n${v.hashtags.join(" ")}`;
          return (
            <article key={v.video}>
              <video src={v.video} poster={v.poster} controls preload="none" playsInline />
              <b>{by[v.slug]?.name ?? v.slug}</b>
              <small className="muted">
                {v.format} · {Math.round(v.duration)}s · “{v.hook}”
              </small>
              <div className="row-gap">
                <a className="btn btn-sm btn-red" href={v.video} download>
                  Download
                </a>
                <CopyButton text={full} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
