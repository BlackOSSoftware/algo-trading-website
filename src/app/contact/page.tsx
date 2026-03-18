import type { Metadata } from "next";
import { ContentImageCard } from "@/components/marketing/ContentImageCard";
import { ContactForm } from "@/components/marketing/ContactForm";
import { MarketingIcon } from "@/components/marketing/MarketingIcon";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { Reveal } from "@/components/marketing/Reveal";
import { marketingImages, siteConfig } from "@/components/marketing/siteData";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Emotionless Traders for support with Chartink alerts, TradingView webhooks, subscriptions, or setup help.",
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageIntro
        eyebrow="Contact"
        title="Need help with setup, signals, or subscriptions?"
        description="Reach out anytime and we will help you get your alert workflow running smoothly."
        icon="message"
      />

      <section className="container section contact-grid">
        <Reveal>
          <div className="card contact-copy">
            <ContentImageCard
              asset={marketingImages.contact}
              eyebrow="Support Desk"
              description="Questions around setup, onboarding, or access should feel just as guided and professional as the platform itself."
              compact
            />
            <h2 className="section-title">Support information</h2>
            <p className="lead">
              Have questions or need help setting up your alerts? Contact us anytime.
            </p>
            <div className="contact-meta">
              <div className="contact-meta-item">
                <span className="icon-chip icon-chip-small">
                  <MarketingIcon name="mail" />
                </span>
                <div>
                  <strong>Support email</strong>
                  <div className="helper">{siteConfig.supportEmail}</div>
                </div>
              </div>
              <div className="contact-meta-item">
                <span className="icon-chip icon-chip-small">
                  <MarketingIcon name="clock" />
                </span>
                <div>
                  <strong>Response time</strong>
                  <div className="helper">{siteConfig.supportResponseTime}</div>
                </div>
              </div>
            </div>
            <div className="card map-placeholder-card">
              <div className="eyebrow">Support Zone</div>
              <div className="map-placeholder-head">
                <span className="icon-chip">
                  <MarketingIcon name="spark" />
                </span>
                <h3>Fast response, clear assistance</h3>
              </div>
              <p>
                Use the form to send setup questions, pricing queries, or support requests directly
                to the admin side.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="card contact-form-card">
            <ContactForm source="contact-page" />
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
