import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { MarketingIcon } from "./MarketingIcon";
import { marketingNavItems, marketingSocials, siteConfig } from "./siteData";

const companyLinks = [
  { label: "Terms & Conditions", href: "/terms-and-conditions", icon: "fileText" as const },
  { label: "Privacy Policy", href: "/privacy-policy", icon: "shield" as const },
];

export function MarketingFooter() {
  return (
    <footer className="footer marketing-footer">
      <div className="container marketing-footer-grid">
        <div>
          <div className="brand">
            <BrandLogo />
            <div>
              <div className="brand-title">{siteConfig.name}</div>
              <div className="brand-sub">Trade with discipline, not impulse.</div>
            </div>
          </div>
          <p className="marketing-footer-copy">
            Real-time trading signals powered by Chartink and TradingView webhooks for focused,
            disciplined execution.
          </p>
        </div>

        <div>
          <div className="marketing-footer-title">Navigation</div>
          <div className="marketing-link-list">
            {marketingNavItems.map((item) => (
              <Link key={item.href} className="marketing-link" href={item.href}>
                <span className="marketing-link-icon">
                  <MarketingIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="marketing-footer-title">Company</div>
          <div className="marketing-link-list">
            {companyLinks.map((item) => (
              <Link key={item.href} className="marketing-link" href={item.href}>
                <span className="marketing-link-icon">
                  <MarketingIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            ))}
            <a className="marketing-link" href={`mailto:${siteConfig.supportEmail}`}>
              <span className="marketing-link-icon">
                <MarketingIcon name="mail" />
              </span>
              {siteConfig.supportEmail}
            </a>
            <div className="marketing-link marketing-link-muted">
              <span className="marketing-link-icon">
                <MarketingIcon name="clock" />
              </span>
              {siteConfig.supportResponseTime}
            </div>
          </div>
        </div>

        <div>
          <div className="marketing-footer-title">Follow</div>
          <div className="marketing-socials">
            {marketingSocials.map((item) => (
              <a key={item.label} aria-label={item.label} href={item.href}>
                <MarketingIcon name={item.icon} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="container marketing-footer-bottom">&copy; {siteConfig.copyright}</div>
    </footer>
  );
}
