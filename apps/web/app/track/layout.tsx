import type { Metadata } from "next";

export const metadata: Metadata = { title: "Track Your Order", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
