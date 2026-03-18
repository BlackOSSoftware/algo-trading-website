import type { Metadata } from "next";
import Link from "next/link";
import { ContentImageCard } from "@/components/marketing/ContentImageCard";
import { MarketingIcon } from "@/components/marketing/MarketingIcon";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { Reveal } from "@/components/marketing/Reveal";
import { howItWorksSteps, marketingImages } from "@/components/marketing/siteData";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Learn how Emotionless Traders connects Chartink and TradingView alerts to a clean, fast signal delivery workflow.",
};

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <PageIntro
        eyebrow="How It Works"
        title="A clear signal delivery process built for disciplined traders"
        description="From scanner alerts to action-ready signal delivery, every step is designed to be simple, fast, and easy to trust."
        icon="route"
        actions={
          <>
            <Link className="btn btn-primary btn-glow" href="/register">
              <MarketingIcon name="userPlus" />
              Get Started
            </Link>
            <Link className="btn btn-secondary" href="/contact">
              <MarketingIcon name="message" />
              Need Help?
            </Link>
          </>
        }
      />

      <section className="container section how-page-grid">
        <Reveal>
          <div className="card marketing-proof-card">
            <div>
              <span className="badge">Workflow Summary</span>
            </div>
            <ContentImageCard
              asset={marketingImages.workflow}
              eyebrow="Execution Desk"
              description="A practical workstation view reinforces the step-by-step signal journey from setup to action."
              compact
            />
            <div className="marketing-proof-list">
              {howItWorksSteps.map((step, index) => (
                <div className="marketing-proof-item proof-summary-item" key={step.title}>
                  <strong className="proof-summary-title">
                    <span className="icon-chip icon-chip-small">
                      <MarketingIcon name={step.icon} />
                    </span>
                    <span>
                      0{index + 1}. {step.title}
                    </span>
                  </strong>
                  <span>{step.description}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
        <div className="how-timeline">
          {howItWorksSteps.map((step, index) => (
            <Reveal key={step.title}>
              <article className="card how-timeline-card">
                <div className="how-timeline-marker">0{index + 1}</div>
                <div className="section-icon">
                  <MarketingIcon name={step.icon} />
                </div>
                <h2>{step.title}</h2>
                <p>{step.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
