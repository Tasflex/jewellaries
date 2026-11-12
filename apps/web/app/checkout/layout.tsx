import type { Metadata } from "next";

export const metadata: Metadata = { title: "Secure Checkout", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
