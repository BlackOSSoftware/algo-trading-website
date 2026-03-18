import type { CSSProperties } from "react";
import Link from "next/link";
import { AnimatedCounter } from "./marketing/AnimatedCounter";
import { ContentImageCard } from "./marketing/ContentImageCard";
import { ContactForm } from "./marketing/ContactForm";
import { MarketingIcon } from "./marketing/MarketingIcon";
import { MarketingShell } from "./marketing/MarketingShell";
import { Reveal } from "./marketing/Reveal";
import {
  builtForCards,
  homeStats,
  howItWorksSteps,
  marketingImages,
  platformFeatures,
  pricingPlans,
  siteConfig,
  whyChooseUsCards,
} from "./marketing/siteData";

export default function PublicHome() {
  return (
    <MarketingShell>
      <section className="container hero-grid marketing-hero" id="home">
        <Reveal>
          <section className="hero-copy marketing-copy">
            <div className="eyebrow">Real-Time Trading Signals</div>
            <h1 className="display">Trade Without Emotions. Execute With Precision.</h1>
            <p className="lead">
              Receive real-time trading signals powered by Chartink alerts and TradingView
              webhook integration. Fast, reliable, and built for focused traders.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary btn-glow" href="/register">
                <MarketingIcon name="userPlus" />
                Get Started
              </Link>
              <Link className="btn btn-secondary" href="/pricing">
                <MarketingIcon name="wallet" />
                View Plans
              </Link>
            </div>
            <div className="hero-highlights">
              {homeStats.map((item) => (
                <div className="mini-card" key={item.label}>
                  <strong>
                    <AnimatedCounter value={item.value} suffix={item.suffix} />
                  </strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="hero-card card marketing-proof-card">
            <div className="hero-media">
              <img
                className="hero-media-image"
                src={marketingImages.hero.src}
                alt={marketingImages.hero.alt}
              />
            </div>
            <div>
              <span className="badge">Signal Workflow Preview</span>
            </div>
            <div>
              <h2 className="section-title">Fast delivery without extra visuals</h2>
              <p className="helper">
                A cleaner preview card keeps the opening section sharp, familiar, and easy to scan.
              </p>
            </div>
            <div className="alert-card">
              <div className="alert-row">
                <span className="alert-row-main">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="chart" />
                  </span>
                  <span>Chartink breakout alert</span>
                </span>
                <span className="badge">Processed</span>
              </div>
              <div className="alert-row">
                <span className="alert-row-main">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="tradingview" />
                  </span>
                  <span>TradingView strategy signal</span>
                </span>
                <span className="badge">Delivered fast</span>
              </div>
              <div className="alert-row">
                <span className="alert-row-main">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="execute" />
                  </span>
                  <span>Execution-ready update</span>
                </span>
                <span className="badge">Structured flow</span>
              </div>
            </div>
            <div className="marketing-proof-list">
              <div className="marketing-proof-item">
                <strong className="proof-summary-title">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="connect" />
                  </span>
                  <span>Chartink + TradingView ready</span>
                </strong>
                <span>One simple workflow for both major alert sources.</span>
              </div>
              <div className="marketing-proof-item">
                <strong className="proof-summary-title">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="shield" />
                  </span>
                  <span>Built for serious traders</span>
                </strong>
                <span>Speed, clarity, and consistency stay at the center.</span>
              </div>
            </div>
            <div className="content-image-credit hero-media-credit">
              <span>Photo by {marketingImages.hero.photographer}</span>
              <a href={marketingImages.hero.sourceHref} target="_blank" rel="noreferrer">
                View source
              </a>
            </div>
          </section>
        </Reveal>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div className="eyebrow">Feature Highlights</div>
          <h2 className="section-title marketing-section-title">
            Everything you need to keep alert delivery clean, fast, and reliable
          </h2>
        </div>
        <div className="feature-grid">
          {platformFeatures.slice(0, 4).map((feature, index) => (
            <Reveal key={feature.title}>
              <article className="feature-card card" style={{ "--i": index + 1 } as CSSProperties}>
                <div className="section-icon">
                  <MarketingIcon name={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div className="eyebrow">Built For Serious Traders</div>
          <h2 className="section-title marketing-section-title">
            A premium, trust-focused experience without unnecessary complexity
          </h2>
        </div>
        <div className="feature-grid">
          {builtForCards.map((card, index) => (
            <Reveal key={card.title}>
              <article className="feature-card card" style={{ "--i": index + 1 } as CSSProperties}>
                <div className="section-icon">
                  <MarketingIcon name={card.icon} />
                </div>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container section media-split">
        <Reveal>
          <ContentImageCard
            asset={marketingImages.workflow}
            eyebrow="Live Workspace"
            description="A focused desk setup mirrors the kind of clean execution flow the platform is designed to support."
          />
        </Reveal>
        <Reveal>
          <div className="card media-split-copy">
            <div className="eyebrow">Structured Environment</div>
            <h2 className="section-title marketing-section-title">
              Keep your trading workspace aligned with a single, readable signal flow
            </h2>
            <p className="lead">
              When alerts, plan access, and execution cues stay organized, it becomes easier to
              act with discipline instead of reacting to noise.
            </p>
            <div className="marketing-proof-list">
              <div className="marketing-proof-item">
                <strong className="proof-summary-title">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="tracking" />
                  </span>
                  <span>Clear visual hierarchy</span>
                </strong>
                <span>Important updates remain easy to scan during active sessions.</span>
              </div>
              <div className="marketing-proof-item">
                <strong className="proof-summary-title">
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name="speed" />
                  </span>
                  <span>Fast operational flow</span>
                </strong>
                <span>Reduced friction helps traders stay closer to their actual plan.</span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div className="eyebrow">How It Works</div>
          <h2 className="section-title marketing-section-title">
            A simple step-by-step flow for disciplined signal execution
          </h2>
        </div>
        <div className="feature-grid">
          {howItWorksSteps.map((step, index) => (
            <Reveal key={step.title}>
              <article className="feature-card card process-card">
                <div className="process-index">0{index + 1}</div>
                <div className="section-icon">
                  <MarketingIcon name={step.icon} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="cta-row section-cta">
          <Link className="btn btn-secondary" href="/how-it-works">
            <MarketingIcon name="route" />
            Explore Full Process
          </Link>
        </div>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div className="eyebrow">Features</div>
          <h2 className="section-title marketing-section-title">
            Core tools that support fast signal delivery and cleaner trading workflows
          </h2>
        </div>
        <div className="marketing-feature-grid">
          {platformFeatures.map((feature) => (
            <Reveal key={feature.title}>
              <article className="card marketing-feature-card">
                <div className="section-icon">
                  <MarketingIcon name={feature.icon} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container section why-showcase">
        <div className="why-layout">
          <Reveal>
            <div className="why-intro">
              <div className="eyebrow">Why Choose Us</div>
              <h2 className="section-title marketing-section-title">
                Designed to keep your signal flow structured, trustworthy, and fast
              </h2>
              <p className="lead">
                Emotionless Traders helps reduce reaction-based trading by giving you a cleaner
                operational experience built around clarity and speed.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="card why-panel">
              <div className="badge">Platform Snapshot</div>
              <h3>Structured for clarity, speed, and trading discipline</h3>
              <p className="helper">
                Every part of the platform is designed to keep important signals visible and
                unnecessary distractions out of the way.
              </p>
              <div className="why-panel-list">
                <div className="marketing-proof-item">
                  <strong className="proof-summary-title">
                    <span className="icon-chip icon-chip-small">
                      <MarketingIcon name="connect" />
                    </span>
                    <span>Multi-source alerts</span>
                  </strong>
                  <span>Use Chartink and TradingView with one clear workflow.</span>
                </div>
                <div className="marketing-proof-item">
                  <strong className="proof-summary-title">
                    <span className="icon-chip icon-chip-small">
                      <MarketingIcon name="plans" />
                    </span>
                    <span>Simple plan control</span>
                  </strong>
                  <span>Subscriptions and strategy limits stay easy to manage.</span>
                </div>
                <div className="marketing-proof-item">
                  <strong className="proof-summary-title">
                    <span className="icon-chip icon-chip-small">
                      <MarketingIcon name="discipline" />
                    </span>
                    <span>Focused user experience</span>
                  </strong>
                  <span>Signal handling stays front and center across the platform.</span>
                </div>
              </div>
              <div className="why-panel-tags">
                <span className="badge">Clarity First</span>
                <span className="badge">Trust Focused</span>
                <span className="badge">Built for Traders</span>
              </div>
            </div>
          </Reveal>
        </div>
        <div className="why-card-grid">
          {whyChooseUsCards.map((item, index) => (
            <Reveal key={item.title}>
              <article className="why-card">
                <div className="why-card-head">
                  <span className="why-step">0{index + 1}</span>
                  <span className="icon-chip icon-chip-small">
                    <MarketingIcon name={item.icon} />
                  </span>
                </div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container section">
        <div className="section-heading">
          <div className="eyebrow">Pricing</div>
          <h2 className="section-title marketing-section-title">
            Flexible plans built for traders at different levels of activity
          </h2>
        </div>
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
                  <h3>{plan.name}</h3>
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

      <section className="container section">
        <Reveal>
          <div className="card cta-banner">
            <div>
              <div className="eyebrow">Ready To Start</div>
              <h2 className="section-title marketing-section-title">
                Join {siteConfig.name} and build a cleaner, faster alert workflow.
              </h2>
            </div>
            <div className="cta-row">
              <Link className="btn btn-primary btn-glow" href="/register">
                <MarketingIcon name="userPlus" />
                Get Started
              </Link>
              <Link className="btn btn-secondary" href="/contact">
                <MarketingIcon name="message" />
                Talk to Support
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="container section" id="contact">
        <div className="contact-grid">
          <Reveal>
            <div className="card contact-copy">
              <div className="eyebrow">Contact</div>
              <h2 className="section-title marketing-section-title">
                Have questions or need help setting up your alerts? Contact us anytime.
              </h2>
              <p className="lead">
                We are here to help you get started with cleaner alert delivery and a simpler
                trading workflow.
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
            </div>
          </Reveal>
          <Reveal>
            <div className="card contact-form-card">
              <ContactForm source="home-page" />
            </div>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
}
