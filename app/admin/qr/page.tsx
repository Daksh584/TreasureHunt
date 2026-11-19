import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import { huntConfig } from "@/hunt.config";
import { isAdmin, requestOrigin } from "@/lib/auth";
import AdminNav, { AdminDenied } from "@/components/AdminNav";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: `QR sheet · ${huntConfig.huntName}` };

const qrSvg = (url: string) => QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 0 });

export default async function QrSheet({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) return <AdminDenied />;
  const sp = await searchParams;
  const filter = typeof sp.track === "string" ? sp.track.toUpperCase() : null;
  const showRegister = !filter || filter === "REGISTER";
  const tracks = huntConfig.tracks.filter((t) => !filter || t.id === filter);

  const base = (process.env.HUNT_BASE_URL || (await requestOrigin())).replace(/\/+$/, "");
  const host = new URL(base).hostname;
  const isLocal = host === "localhost" || /^(127\.|0\.0\.0\.0)/.test(host);
  const isLan = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  const isPreview = process.env.VERCEL_ENV === "preview";

  const registerUrl = `${base}/register`;
  const registerSvg = showRegister ? await qrSvg(registerUrl) : "";
  const sections = await Promise.all(
    tracks.map(async (t) => ({
      track: t,
      cards: await Promise.all(
        t.checkpoints.map(async (cp, i) => {
          const url = `${base}/s/${cp.code}`;
          return { key: cp.code, kind: `Checkpoint ${i + 1}`, label: cp.locationLabel, url, svg: await qrSvg(url) };
        }),
      ),
    })),
  );
  const total = sections.reduce((n, s) => n + s.cards.length, 0) + (showRegister ? 1 : 0);

  return (
    <main className="admin qr-page">
      <div className="admin-chrome">
        <header className="admin-head">
          <div>
            <p className="eyebrow">Organizer</p>
            <h1>Printable QR sheet</h1>
            <p className="admin-meta">
              {total} QR codes · pointing at <strong>{base}</strong>
            </p>
          </div>
          <PrintButton />
        </header>
        <AdminNav current="/admin/qr" />
        {isLocal && (
          <p className="banner banner-bad">
            ⚠️ These QRs point to <strong>{host}</strong>, which phones can’t reach. Print from your deployed site instead.
          </p>
        )}
        {isLan && (
          <p className="banner banner-warn">
            ⚠️ These QRs point to a local network address (<strong>{host}</strong>). Fine for testing on office Wi-Fi —
            for the real event, print from your deployed site.
          </p>
        )}
        {isPreview && (
          <p className="banner banner-warn">
            ⚠️ This is a Vercel <strong>preview</strong> deployment (usually behind Vercel login). Print from your
            production domain.
          </p>
        )}
        <p className="filters">
          Show:{" "}
          <Link href="/admin/qr" className={!filter ? "active" : ""} prefetch={false}>
            All
          </Link>
          <Link href="/admin/qr?track=register" className={filter === "REGISTER" ? "active" : ""} prefetch={false}>
            Registration poster
          </Link>
          {huntConfig.tracks.map((t) => (
            <Link key={t.id} href={`/admin/qr?track=${t.id}`} className={filter === t.id ? "active" : ""} prefetch={false}>
              {t.name}
            </Link>
          ))}
        </p>
        <p className="small">
          Print at 100% scale on A4 with “Background graphics” on. One page per trail; cut along the dashed lines. Every
          team on a trail uses the same 6 codes — progress is tracked per team.
        </p>
      </div>

      {showRegister && (
        <section className="qr-sheet poster">
          <div className="poster-card">
            <p className="poster-eyebrow">{huntConfig.huntName}</p>
            <h2 className="poster-title">Join the treasure hunt!</h2>
            <div className="qr-svg poster-qr" dangerouslySetInnerHTML={{ __html: registerSvg }} />
            <p className="poster-steps">
              📷 Scan with your phone camera → name your team → get your first clue.
              <br />
              Teammates join by scanning the team QR on your screen.
            </p>
            <p className="qr-url">{registerUrl}</p>
          </div>
        </section>
      )}

      {sections.map(({ track, cards }) => (
        <section key={track.id} className="qr-sheet" style={{ "--accent": track.color } as CSSProperties}>
          <h2 className="qr-sheet-title">
            <span className="dot" /> {track.name} <small>(trail {track.id})</small>
          </h2>
          <div className="qr-grid">
            {cards.map((c) => (
              <article key={c.key} className="qr-card">
                <header className="qr-band">
                  <span className="qr-team">{track.name}</span>
                  <span className="qr-kind">{c.kind}</span>
                </header>
                <div className="qr-svg" dangerouslySetInnerHTML={{ __html: c.svg }} />
                <p className="qr-loc">📍 {c.label}</p>
                <p className="qr-url">{c.url}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
