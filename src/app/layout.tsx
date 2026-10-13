import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sai Waters ERP — Water Jar Distribution, QR Tracking & Accounting",
  description: "Unified Enterprise Resource Planning for 20L reusable water jar distribution, camera QR tracking, billing, and double-entry accounting in India.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0284c7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
        <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
          Sai Waters ERP © 2026 • Double-Entry Accounting & QR Jar Tracking • Built for India Operations
        </footer>
      </body>
    </html>
  );
}
