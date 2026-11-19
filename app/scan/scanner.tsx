"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

type Controls = { stop: () => void };

/** Only follow links into this hunt on this site — never navigate to arbitrary QR targets. */
function huntPath(text: string): string | null {
  try {
    const url = new URL(text, window.location.href);
    // Allow QRs printed for another host of this same app (e.g. printed from the deployed
    // domain while testing on a LAN IP) — we only ever navigate to the path on *this* origin.
    return /^\/(s\/[A-Za-z0-9_-]+|t\/[A-Za-z0-9-]+|register)\/?$/.test(url.pathname) ? url.pathname : null;
  } catch {
    return null;
  }
}

const loadReader = async () => new (await import("@zxing/browser")).BrowserQRCodeReader();

export default function Scanner() {
  const video = useRef<HTMLVideoElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // null until mounted, so server and client markup match.
  const [liveSupported, setLiveSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setLiveSupported(Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia));
  }, []);

  const go = (text: string) => {
    const path = huntPath(text);
    if (!path) {
      setError("That QR code isn’t part of this hunt.");
      return false;
    }
    navigator.vibrate?.(60);
    window.location.assign(path);
    return true;
  };

  // Live video scanning (needs https or localhost).
  useEffect(() => {
    if (!active) return;
    let controls: Controls | undefined;
    let cancelled = false;

    (async () => {
      try {
        // Loaded on demand so the decoder never slows down the clue page.
        const reader = await loadReader();
        if (cancelled || !video.current) return;
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video.current,
          (result) => {
            if (!result || cancelled) return;
            if (go(result.getText())) {
              cancelled = true;
              controls?.stop();
            }
          },
        );
        if (cancelled) controls.stop();
      } catch {
        if (!cancelled) {
          setError("Couldn’t open the live camera. Allow camera access, or use “Take a photo” below.");
          setActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  // Photo scanning: <input capture> opens the camera on any origin, including plain http.
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const result = await (await loadReader()).decodeFromImageUrl(url);
      go(result.getText());
    } catch {
      setError("Couldn’t find a QR code in that photo. Fill the frame with the code and try again.");
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  };

  return (
    <section className="card scanner">
      {liveSupported && (
        <div className="scanner-frame">
          <video ref={video} muted playsInline aria-label="Live camera preview" />
          {!active && <div className="scanner-idle">📷</div>}
          {active && <div className="scanner-target" aria-hidden="true" />}
        </div>
      )}
      {liveSupported === false && (
        <p className="banner banner-warn">
          Live camera preview needs a secure (https) link, so snap a photo of the QR instead — it works just as well.
        </p>
      )}
      {error && (
        <p className="banner banner-bad" role="alert">
          {error}
        </p>
      )}
      {liveSupported && (
        <button
          className="button wide"
          onClick={() => {
            setError("");
            setActive((a) => !a);
          }}
        >
          {active ? "Stop camera" : "Start camera"}
        </button>
      )}
      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPhoto}
      />
      <button
        className={`button wide ${liveSupported ? "ghost" : ""}`}
        disabled={busy}
        onClick={() => {
          setActive(false);
          photoInput.current?.click();
        }}
      >
        {busy ? "Reading QR…" : "📸 Take a photo of the QR"}
      </button>
    </section>
  );
}
