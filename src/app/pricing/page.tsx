import type { Metadata } from "next";
import Link from "next/link";
import { ContentImageCard } from "@/components/marketing/ContentImageCard";
import { MarketingIcon } from "@/components/marketing/MarketingIcon";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { Reveal } from "@/components/marketing/Reveal";
import { marketingImages, pricingPlans } from "@/components/marketing/siteData";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Choose an Emotionless Traders plan for real-time trading signals, webhook support, and fast delivery.",
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageIntro
        eyebrow="Pricing"
        title="Choose the right signal plan for your trading style"
        description="Each plan is designed to keep your workflow fast, structured, and easy to manage as your trading needs grow."
        icon="wallet"
      />

      <section className="container section">
        <Reveal>
          <ContentImageCard
            asset={marketingImages.pricing}
            eyebrow="Plan Clarity"
            description="Clear pricing works best when traders can quickly compare plan value, strategy limits, and workflow fit."
          />
        </Reveal>
      </section>

      <section className="container section">
        <div className="pricing-grid">
          {pricingPlans.map((plan) => (
            <Reveal key={plan.name}>
              <article
                className={`card pricing-card${plan.highlighted ? " pricing-card-highlight" : ""}`}
              >
                {plan.highlighted ? <div className="badge">Most Popular</div> : null}
                <div className="pricing-card-header">
                  <span className="icon-chip">
                    <MarketingIcon name={plan.highlighted ? "spark" : "wallet"} />
                  </span>
                  <h2>{plan.name}</h2>
                </div>
                <div className="pricing-price">{plan.price}</div>
                <p className="helper">{plan.subtitle}</p>
                <div className="pricing-list">
                  {plan.items.map((item) => (
                    <div className="pricing-item" key={item}>
                      <span className="icon-chip icon-chip-small">
                        <MarketingIcon name="check" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  className={`btn ${plan.highlighted ? "btn-primary btn-glow" : "btn-secondary"}`}
                  href="/register"
                >
                  <MarketingIcon name="arrow" />
                  Subscribe Now
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
