import Link from "next/link";
import Scanner from "./scanner";

export const metadata = { title: "Scan a QR" };

export default function ScanPage() {
  return (
    <main className="shell">
      <p className="eyebrow">In-app scanner</p>
      <h1 className="play-title">Scan a QR</h1>
      <p className="lede">Your phone’s normal camera app works too — this is just a backup.</p>
      <Scanner />
      <p className="small">
        <Link href="/play">← Back to my clue</Link>
      </p>
    </main>
  );
}
