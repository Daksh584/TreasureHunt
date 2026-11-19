import type { NextRequest } from "next/server";
import { ADMIN_COOKIE } from "@/lib/crypto";
import { redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const res = redirectTo(req, "/admin/login");
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
