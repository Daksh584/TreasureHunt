import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD, adminToken, safeEqual, safeNext } from "@/lib/crypto";
import { isRateLimited, recordHit } from "@/lib/store";
import { clientIp, redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const password = form?.get("password");
  const next = safeNext(form?.get("next"));
  const ip = clientIp(req);
  const back = (e: string) => `/admin/login?e=${e}&next=${encodeURIComponent(next)}`;

  // Wrong passwords share the per-IP failure budget with bad scan/team codes.
  if (await isRateLimited(ip).catch(() => false)) return redirectTo(req, back("slow"));
  if (typeof password !== "string" || !safeEqual(password, ADMIN_PASSWORD)) {
    await recordHit(ip).catch(() => {});
    return redirectTo(req, back("wrong"));
  }

  const res = redirectTo(req, next);
  res.cookies.set(ADMIN_COOKIE, await adminToken(ADMIN_PASSWORD), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
