import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: "7rem 20px", textAlign: "center" }}>
      <span className="eyebrow">404</span>
      <h1>This piece has slipped away.</h1>
      <p className="muted">The page you&rsquo;re looking for doesn&rsquo;t exist, but plenty of beautiful things do.</p>
      <Link href="/shop" className="btn btn-red">
        Shop the collection
      </Link>
    </div>
  );
}
