/**
 * Prints fresh random checkpoint codes for hunt.config.ts.
 *   npm run gen-codes
 * Paste each value over the old one. Then re-print the QR sheet: old QRs stop working.
 */
import { randomBytes } from "node:crypto";

const TRACKS = ["A", "B", "C", "D"] as const;
const CHECKPOINTS = 6;
// 12 base64url chars = 72 bits of randomness: unguessable, still short enough for a dense-free QR.
const code = () => randomBytes(9).toString("base64url");

console.log("// Fresh codes — paste into hunt.config.ts\n");
for (const id of TRACKS) {
  console.log(`// Trail ${id}`);
  console.log("checkpoints: [");
  for (let i = 1; i <= CHECKPOINTS; i++) console.log(`  "${code()}", // checkpoint ${i}`);
  console.log("],\n");
}
