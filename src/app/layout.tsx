import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const notoSansTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#17492F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Pandian Store — Fresh Daily Groceries",
    template: "%s | Pandian Store",
  },
  description: "Your trusted neighbourhood grocery store. Fresh rice, dal, oils, spices, and daily kitchen essentials.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansTamil.variable} h-full antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col font-sans bg-page text-ink selection:bg-turmeric selection:text-ink">
        {children}
      </body>
    </html>
  );
}
