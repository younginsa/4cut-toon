import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
