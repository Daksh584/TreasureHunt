import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, isValidAdminToken } from "@/lib/crypto";

export const config = { matcher: ["/admin", "/admin/:path*"] };

const PUBLIC = new Set(["/admin/login", "/admin/login/submit", "/admin/logout"]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.has(pathname)) return NextResponse.next();
  if (await isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  // Form posts / API calls get a plain 401; page visits go to the login form.
  if (req.method !== "GET") return new NextResponse("Unauthorized", { status: 401 });
  const login = new URL("/admin/login", req.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(new URL(login.pathname + login.search, originOf(req)), 303);
}

function originOf(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || req.nextUrl.protocol.replace(":", "");
  return host ? `${proto}://${host}` : req.url;
}
