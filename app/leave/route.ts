import type { NextRequest } from "next/server";
import { TEAM_COOKIE } from "@/lib/crypto";
import { redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

/** Forget this browser's team (progress stays with the team). */
export async function GET(req: NextRequest) {
  const back = req.nextUrl.searchParams.get("to") === "test" ? "/admin/test?m=left" : "/";
  const res = redirectTo(req, back);
  res.cookies.delete(TEAM_COOKIE);
  return res;
}
