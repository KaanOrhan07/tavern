import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DigioFooter } from "@/components/DigioFooter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Tavern",
  description: "Manage. Grow. Thrive.",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      translate="no"
      className={`${geistSans.variable} ${geistMono.variable} notranslate h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <DigioFooter />
      </body>
    </html>
  );
}
