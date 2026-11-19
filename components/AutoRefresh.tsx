"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Re-fetches the server-rendered page every `seconds` (only while the tab is visible) and
 * immediately when the user comes back to the tab, e.g. after using the camera app.
 * `clearParams` removes one-time query params (like ?m=found) so banners don't repeat.
 */
export default function AutoRefresh({ seconds, clearParams = [] }: { seconds: number; clearParams?: string[] }) {
  const router = useRouter();
  const clearKey = clearParams.join(",");

  useEffect(() => {
    const keys = clearKey ? clearKey.split(",") : [];
    const url = new URL(window.location.href);
    if (keys.some((k) => url.searchParams.has(k))) {
      keys.forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }

    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds, clearKey]);

  return null;
}
