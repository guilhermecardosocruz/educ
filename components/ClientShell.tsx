"use client";
import PWAInstall from "@/components/PWAInstall";
export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PWAInstall />
    </>
  );
}
