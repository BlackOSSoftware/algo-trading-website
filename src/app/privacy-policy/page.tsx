import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Emotionless Traders collects, uses, and protects account, signal, and contact information.",
};

const sections = [
  {
    title: "Information We Collect",
    body:
      "We may collect account details, subscription information, signal-related activity, and contact form submissions needed to operate the service.",
  },
  {
    title: "How We Use Information",
    body:
      "Information is used to provide access, process subscriptions, deliver alerts, respond to support requests, and improve product reliability.",
  },
  {
    title: "Data Security",
    body:
      "We use reasonable safeguards to protect your information, but no online platform can guarantee absolute security.",
  },
  {
    title: "Third-Party Services",
    body:
      "Certain actions may rely on third-party providers such as payment processors, email providers, Chartink, TradingView, or broker-side tools. Their own policies may also apply.",
  },
  {
    title: "Contact",
    body:
      "If you have questions about privacy or your data, please contact support@emotionlesstraders.com.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <MarketingShell>
      <PageIntro
        eyebrow="Legal"
        title="Privacy Policy"
        description="This policy explains how Emotionless Traders handles your information."
        icon="shield"
      />
      <div className="container static-page">
        <div className="card static-page-card">
          <div className="static-section-list">
            {sections.map((section) => (
              <section className="static-section" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
