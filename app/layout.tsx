import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "하루네컷 — 오늘 하루, 네 컷으로",
  description: "한 줄만 적으면 오늘 하루가 네컷만화가 됩니다. 주인공은 당신이 정하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Script
          defer
          src="https://umami-theta-woad.vercel.app/script.js"
          data-website-id="fa5ed2d7-dada-4503-83ca-48207559810d"
          data-domains="4cut-toon.vercel.app"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
