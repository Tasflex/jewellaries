"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** Vertical video that only plays while on screen (saves data on phones). */
export default function Reel({
  src,
  poster,
  label,
  href,
  cta = "Shop this",
  priority = false,
  className = "",
}: {
  src: string;
  poster: string;
  label: string;
  href?: string;
  cta?: string;
  priority?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.45 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <figure className={`reel ${className}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop
        playsInline
        preload={priority ? "metadata" : "none"}
        aria-label={label}
      />
      <button className="reel-sound" onClick={() => setMuted(!muted)} aria-label={muted ? "Turn sound on" : "Mute"}>
        {muted ? "🔇" : "🔊"}
      </button>
      {href && (
        <figcaption>
          <span>{label}</span>
          <Link href={href} className="btn btn-red btn-sm">
            {cta}
          </Link>
        </figcaption>
      )}
    </figure>
  );
}
