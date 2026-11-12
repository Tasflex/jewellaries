import { cookies } from "next/headers";

export type User = { id: number; email: string; name: string | null; avatar: string | null; role: "admin" | "customer" };

const API = process.env.API_URL || "http://127.0.0.1:8300";

/** Server-side call to the Rust API on behalf of the signed-in visitor (forwards the session cookie). */
export async function api<T>(path: string): Promise<T | null> {
  const jar = await cookies();
  const s = jar.get("jw_session");
  try {
    const r = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: s ? { cookie: `jw_session=${s.value}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<User | null> {
  const r = await api<{ user: User }>("/v1/auth/me");
  return r?.user ?? null;
}
