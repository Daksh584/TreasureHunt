// Runtime-agnostic helpers (Web Crypto only) so they work in both middleware and route handlers.

export const ADMIN_COOKIE = "hunt_admin";
export const TEAM_COOKIE = "hunt_team";

/** Organizer password for /admin/login. Server-only: never imported by client components. */
export const ADMIN_PASSWORD = "Daksh";

/** Constant-time string comparison: no early exit, length mismatch folded into the result. */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Admin session token = HMAC(password, label). The raw password is never stored in the cookie. */
export async function adminToken(adminKey: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(adminKey), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("treasure-hunt-admin-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isValidAdminToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  return safeEqual(token, await adminToken(ADMIN_PASSWORD));
}

/** Only admin pages are allowed as post-login destinations (no open redirects). */
export function safeNext(v: unknown): string {
  return typeof v === "string" && /^\/admin(\/|\?|$)/.test(v) && !v.startsWith("/admin/log") ? v : "/admin";
}
