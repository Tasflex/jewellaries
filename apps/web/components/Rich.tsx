import Link from "next/link";
import { Fragment, type ReactNode } from "react";

// [label](href) links and **bold**, as used in Journal articles. Internal paths become Next
// links; anything else opens as a normal external link.
const TOKEN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

export default function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    if (m[1] !== undefined) {
      const href = m[2];
      out.push(
        href.startsWith("/") ? (
          <Link key={i} href={href}>
            {m[1]}
          </Link>
        ) : (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer">
            {m[1]}
          </a>
        ),
      );
    } else {
      out.push(<strong key={i}>{m[3]}</strong>);
    }
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <Fragment>{out}</Fragment>;
}
