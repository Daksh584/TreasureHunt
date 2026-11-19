import type { NextRequest } from "next/server";
import { joinWithCode } from "@/lib/join";
import { redirectTo } from "@/lib/request";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return redirectTo(req, "/join?e=bad-code");
  return joinWithCode(req, form.get("code"));
}
