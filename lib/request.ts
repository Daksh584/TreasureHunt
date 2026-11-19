import { NextResponse, type NextRequest } from "next/server";

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** 303 redirect that is never cached, so every scan always reaches the server. */
export function redirectTo(req: NextRequest, path: string): NextResponse {
  // Use the host the phone actually requested (req.url can be the bind address, e.g. 0.0.0.0).
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || req.nextUrl.protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : req.url;
  const res = NextResponse.redirect(new URL(path, base), 303);
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

// Chat apps fetch links to build previews; they must never start a team's clock.
const PREVIEW_BOTS =
  /bot\b|crawler|spider|facebookexternalhit|whatsapp\/|skypeuripreview|embedly|iframely|microsoft office|bingpreview/i;

export function isLinkPreviewBot(req: NextRequest): boolean {
  return PREVIEW_BOTS.test(req.headers.get("user-agent") ?? "");
}

export function teamCookieOptions(req: NextRequest) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24,
    path: "/",
  };
}
