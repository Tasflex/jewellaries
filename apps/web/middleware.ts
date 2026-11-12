import { NextResponse, type NextRequest } from "next/server";
import { currencyForCountry } from "@/lib/currency";

/**
 * First visit: work out the shopper's country (from the CDN/edge header if
 * there is one, else from the browser language, e.g. en-GB → GB) and pick the
 * matching currency. Stored in cookies the client reads after hydration.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (req.cookies.get("ar_country")) return res;
  const h = req.headers;
  let country =
    h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || h.get("x-country") || "";
  if (!country || country === "XX" || country.length !== 2) {
    const m = (h.get("accept-language") || "").match(/[a-z]{2}-([A-Z]{2})/);
    country = m ? m[1] : "US";
  }
  country = country.toUpperCase();
  const year = 60 * 60 * 24 * 365;
  res.cookies.set("ar_country", country, { path: "/", maxAge: year, sameSite: "lax" });
  if (!req.cookies.get("ar_cur")) {
    res.cookies.set("ar_cur", currencyForCountry(country), { path: "/", maxAge: year, sameSite: "lax" });
  }
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|media|favicon|icon|robots|sitemap|feeds|llms).*)"],
};
