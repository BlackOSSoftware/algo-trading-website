import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Fraunces } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://emotionlesstraders.com"),
  title: "Emotionless Traders | Trading Signals via Chartink & TradingView Webhooks",
  description:
    "Get real-time trading signals using Chartink alerts and TradingView webhook integration. Built for speed, accuracy, and disciplined trading.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  keywords: [
    "trading signals",
    "chartink alerts",
    "webhook trading",
    "tradingview alerts",
    "algo signals",
  ],
  openGraph: {
    title: "Emotionless Traders | Trading Signals via Chartink & TradingView Webhooks",
    description:
      "Get real-time trading signals using Chartink alerts and TradingView webhook integration. Built for speed, accuracy, and disciplined trading.",
    type: "website",
    siteName: "Emotionless Traders",
    images: ["/logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Emotionless Traders | Trading Signals via Chartink & TradingView Webhooks",
    description:
      "Get real-time trading signals using Chartink alerts and TradingView webhook integration. Built for speed, accuracy, and disciplined trading.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
        {children}
      </body>
    </html>
  );
}
