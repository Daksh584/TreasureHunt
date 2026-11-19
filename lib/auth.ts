import { cookies, headers } from "next/headers";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/crypto";

/** Server-side admin check (defense in depth — middleware.ts already gates /admin/*). */
export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return isValidAdminToken(token);
}

/** Origin of the current request, e.g. https://hunt.vercel.app — used to build QR URLs. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host")?.split(",")[0].trim() || h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto")?.split(",")[0].trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
