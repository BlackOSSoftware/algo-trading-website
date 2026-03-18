import type { Metadata } from "next";
import PublicHome from "@/components/PublicHome";

export const metadata: Metadata = {
  title: "Emotionless Traders | Trading Signals via Chartink & TradingView Webhooks",
  description:
    "Get real-time trading signals using Chartink alerts and TradingView webhook integration. Built for speed, accuracy, and disciplined trading.",
  keywords: [
    "trading signals",
    "chartink alerts",
    "webhook trading",
    "tradingview alerts",
    "algo signals",
  ],
};

export default function Home() {
  return <PublicHome />;
}
