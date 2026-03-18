export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export type StatItem = {
  label: string;
  value: number;
  suffix?: string;
};

export type StepItem = {
  title: string;
  description: string;
  icon: IconName;
};

export type FeatureItem = {
  title: string;
  description: string;
  icon: IconName;
};

export type PlanItem = {
  name: string;
  subtitle: string;
  price: string;
  highlighted: boolean;
  items: string[];
};

export type TestimonialItem = {
  name: string;
  role: string;
  review: string;
};

export type VisualCard = {
  title: string;
  description: string;
  icon: IconName;
};

export type MarketingImageAsset = {
  src: string;
  sourceHref: string;
  title: string;
  alt: string;
  photographer: string;
};

export type IconName =
  | "signal"
  | "chart"
  | "tradingview"
  | "speed"
  | "tracking"
  | "plans"
  | "connect"
  | "receive"
  | "execute"
  | "discipline"
  | "flow"
  | "active"
  | "reliable"
  | "check"
  | "menu"
  | "close"
  | "mail"
  | "clock"
  | "x"
  | "instagram"
  | "linkedin"
  | "telegram"
  | "shield"
  | "spark"
  | "arrow"
  | "home"
  | "route"
  | "wallet"
  | "message"
  | "login"
  | "userPlus"
  | "quote"
  | "star"
  | "fileText";

export const siteConfig = {
  name: "Emotionless Traders",
  shortTagline: "Disciplined signals for focused traders",
  supportEmail: "support@emotionlesstraders.com",
  supportResponseTime: "Within 24 hours",
  copyright: "2026 Emotionless Traders. All rights reserved.",
};

export const marketingNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "How It Works", href: "/how-it-works", icon: "route" },
  { label: "Pricing", href: "/pricing", icon: "wallet" },
  { label: "Reviews", href: "/reviews", icon: "star" },
  { label: "Contact", href: "/contact", icon: "message" },
];

export const homeStats: StatItem[] = [
  { label: "Signals delivered", value: 12840, suffix: "+" },
  { label: "Strategies connected", value: 1240, suffix: "+" },
  { label: "Active trader setups", value: 850, suffix: "+" },
];

export const builtForCards: VisualCard[] = [
  {
    title: "Speed-first delivery",
    description: "Signals move quickly from your scanner to your workflow without extra noise.",
    icon: "speed",
  },
  {
    title: "Trustworthy signal flow",
    description: "A clean structure that helps you stay aligned with your plan.",
    icon: "shield",
  },
  {
    title: "Simple subscription control",
    description: "Access plans and features that match your trading frequency and strategy count.",
    icon: "plans",
  },
  {
    title: "Focused execution",
    description: "Built for traders who value consistency more than clutter.",
    icon: "discipline",
  },
];

export const howItWorksSteps: StepItem[] = [
  {
    title: "Connect Alerts",
    description: "Set your strategy on Chartink and attach your webhook.",
    icon: "connect",
  },
  {
    title: "Receive Signals",
    description: "Signals are processed instantly and delivered without delay.",
    icon: "receive",
  },
  {
    title: "Execute Trades",
    description: "Act on signals manually or integrate with your system.",
    icon: "execute",
  },
];

export const platformFeatures: FeatureItem[] = [
  {
    title: "Real-time signal alerts",
    description: "Stay on top of live market conditions with immediate alert delivery.",
    icon: "signal",
  },
  {
    title: "Chartink integration",
    description: "Connect your Chartink scanners to a clean and consistent delivery flow.",
    icon: "chart",
  },
  {
    title: "TradingView webhook support",
    description: "Send TradingView strategy alerts using the same focused workflow.",
    icon: "tradingview",
  },
  {
    title: "Fast processing",
    description: "Built to handle signal flow quickly during active market sessions.",
    icon: "speed",
  },
  {
    title: "Signal tracking",
    description: "Review signal activity in a structured way without overwhelming the trader experience.",
    icon: "tracking",
  },
  {
    title: "Subscription management",
    description: "Simple access control for plans, usage, and feature availability.",
    icon: "plans",
  },
];

export const whyChooseUsCards: FeatureItem[] = [
  {
    title: "Removes emotional decision-making",
    description: "Reduce reaction-based behavior with a clear, rules-first signal workflow.",
    icon: "discipline",
  },
  {
    title: "Clean signal flow",
    description: "Receive only the important information needed to stay in sync with your setup.",
    icon: "flow",
  },
  {
    title: "Built for active traders",
    description: "Designed for users who rely on dependable alerts during fast market windows.",
    icon: "active",
  },
  {
    title: "Fast and reliable system",
    description: "A stable signal platform that emphasizes consistency, clarity, and speed.",
    icon: "reliable",
  },
];

export const pricingPlans: PlanItem[] = [
  {
    name: "Basic",
    subtitle: "For traders starting with essential alerts",
    price: "Rs 999/mo",
    highlighted: false,
    items: [
      "Signal access",
      "Webhook support",
      "Up to 2 strategies",
      "Standard speed priority",
    ],
  },
  {
    name: "Pro",
    subtitle: "For serious traders who need faster execution flow",
    price: "Rs 1,999/mo",
    highlighted: true,
    items: [
      "Signal access",
      "Webhook support",
      "Up to 10 strategies",
      "Priority speed processing",
    ],
  },
  {
    name: "Advanced",
    subtitle: "For multi-setup traders who need scale and control",
    price: "Rs 3,499/mo",
    highlighted: false,
    items: [
      "Signal access",
      "Webhook support",
      "Higher strategy limits",
      "Highest speed priority",
    ],
  },
];

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export const testimonials: TestimonialItem[] = [
  {
    name: "Aarav Sharma",
    role: "Options Trader",
    review: "This platform helped me stay disciplined in trading.",
  },
  {
    name: "Priya Mehta",
    role: "Intraday Trader",
    review: "Signals are fast and very reliable.",
  },
  {
    name: "Rohan Verma",
    role: "Systematic Trader",
    review: "The setup was simple and the webhook flow feels clean.",
  },
  {
    name: "Neha Gupta",
    role: "Swing Trader",
    review: "I finally stopped missing alerts during active sessions.",
  },
  {
    name: "Kunal Arora",
    role: "Momentum Trader",
    review: "The delivery speed gave me more confidence in my routine.",
  },
  {
    name: "Simran Kaur",
    role: "Equity Trader",
    review: "Emotionless Traders keeps my signal workflow focused and easy to follow.",
  },
];

export const marketingSocials = [
  { label: "X", href: "#", icon: "x" as const },
  { label: "Instagram", href: "#", icon: "instagram" as const },
  { label: "LinkedIn", href: "#", icon: "linkedin" as const },
  { label: "Telegram", href: "#", icon: "telegram" as const },
];

export const marketingImages = {
  hero: {
    src: "https://unsplash.com/photos/w3WnEO4FNuo/download?force=true&w=1600",
    sourceHref:
      "https://unsplash.com/photos/a-remote-control-sitting-next-to-a-computer-monitor-w3WnEO4FNuo",
    title: "Trading desk snapshot",
    alt: "Phone and computer monitor displaying market information on a trading desk",
    photographer: "Kelly Sikkema",
  },
  workflow: {
    src: "https://unsplash.com/photos/5mK7vv6dHlg/download?force=true&w=1600",
    sourceHref:
      "https://unsplash.com/photos/a-computer-monitor-sitting-on-top-of-a-wooden-desk-5mK7vv6dHlg",
    title: "Workflow command center",
    alt: "Computer monitor on a wooden desk showing a crypto trading workstation",
    photographer: "Behnam Norouzi",
  },
  pricing: {
    src: "https://unsplash.com/photos/eGI0aGwuE-A/download?force=true&w=1600",
    sourceHref:
      "https://unsplash.com/photos/a-person-pointing-at-a-calculator-on-a-desk-eGI0aGwuE-A",
    title: "Planning and pricing",
    alt: "Hand pointing at a calculator beside papers and a computer on a desk",
    photographer: "Jakub Zerdzicki",
  },
  contact: {
    src: "https://unsplash.com/photos/eLnrrITCy6Q/download?force=true&w=1600",
    sourceHref:
      "https://unsplash.com/photos/man-signs-document-at-a-service-counter-eLnrrITCy6Q",
    title: "Support and onboarding",
    alt: "Customer signing a document at a professional service counter",
    photographer: "blue sky",
  },
} satisfies Record<string, MarketingImageAsset>;
