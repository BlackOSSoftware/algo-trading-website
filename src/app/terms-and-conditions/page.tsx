import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions for using Emotionless Traders, including risk disclosure, subscriptions, and user responsibilities.",
};

const sections = [
  {
    title: "No Financial Advice",
    body:
      "Emotionless Traders provides trading signal delivery and workflow tools only. Nothing on this website should be treated as financial, investment, or legal advice.",
  },
  {
    title: "User Responsibility",
    body:
      "You are fully responsible for your own trading decisions, order execution, broker setup, and risk management. Always verify your own strategy rules before acting on any signal.",
  },
  {
    title: "Risk Disclosure",
    body:
      "Trading in financial markets involves significant risk. Losses can exceed expectations, and past results do not guarantee future performance.",
  },
  {
    title: "Subscription Rules",
    body:
      "Paid plans provide access according to the selected subscription level. Access may be limited, paused, or changed if payments fail or account misuse is detected.",
  },
  {
    title: "Refund Policy",
    body:
      "If a refund policy applies to your plan, it will be handled according to the offer shown at the time of purchase. If no refund promise is shown, payments should be treated as non-refundable unless required by law.",
  },
];

export default function TermsAndConditionsPage() {
  return (
    <MarketingShell>
      <PageIntro
        eyebrow="Legal"
        title="Terms & Conditions"
        description="Please read these terms carefully before using Emotionless Traders."
        icon="fileText"
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
