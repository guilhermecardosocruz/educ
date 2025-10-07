import "../styles/globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "educ",
  description: "App educacional PWA",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/icons/icon-192.png" },
    { rel: "apple-touch-icon", url: "/icons/icon-192.png" }
  ]
};

export const viewport: Viewport = {
  themeColor: "#0A66FF"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-white text-neutral-900">{children}</body>
    </html>
  );
}
