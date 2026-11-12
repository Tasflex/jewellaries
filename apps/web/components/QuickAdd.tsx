"use client";

import Link from "next/link";
import { useStore } from "./store";

export default function QuickAdd({ slug, needsSize }: { slug: string; needsSize: boolean }) {
  const { add } = useStore();
  if (needsSize) {
    return (
      <Link href={`/product/${slug}`} className="quick-add" aria-label="Choose a size">
        Size
      </Link>
    );
  }
  return (
    <button className="quick-add" onClick={() => add(slug)} aria-label="Add to bag">
      + Add
    </button>
  );
}
