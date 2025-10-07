import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EDUC",
  description: "EDUC — plataforma educacional com Next.js 15, React 19 e PWA"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
