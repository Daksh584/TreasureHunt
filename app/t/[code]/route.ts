import type { NextRequest } from "next/server";
import { joinWithCode } from "@/lib/join";

export const dynamic = "force-dynamic";

/** Team invite link — encoded in the QR shown on a teammate's phone. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  return joinWithCode(req, (await params).code);
}
