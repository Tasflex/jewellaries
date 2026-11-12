import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "Aurum Rosso",
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0b0a0c",
    theme_color: "#0b0a0c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
