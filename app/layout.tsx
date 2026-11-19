import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { huntConfig } from "@/hunt.config";

export const metadata: Metadata = {
  title: huntConfig.huntName,
  description: "A QR-code office treasure hunt",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1720",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
