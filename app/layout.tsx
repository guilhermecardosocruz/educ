import "../styles/globals.css";
import type { Metadata, Viewport } from "next";
import ClientShell from "@/components/ClientShell";

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
  themeColor: "#0A66FF",
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-dvh bg-white text-neutral-900">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
