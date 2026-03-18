import { MarketingIcon } from "./MarketingIcon";
import { siteConfig } from "./siteData";

export function AuthSidePanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="auth-visual card">
      <div className="auth-visual-overlay">
        <div className="eyebrow">Emotionless Traders</div>
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="auth-visual-points">
          <span>
            <span className="icon-chip icon-chip-small">
              <MarketingIcon name="speed" />
            </span>
            Fast alert delivery
          </span>
          <span>
            <span className="icon-chip icon-chip-small">
              <MarketingIcon name="chart" />
            </span>
            Chartink + TradingView ready
          </span>
          <span>
            <span className="icon-chip icon-chip-small">
              <MarketingIcon name="shield" />
            </span>
            {siteConfig.shortTagline}
          </span>
        </div>
        <div className="auth-proof-grid">
          <div className="marketing-proof-item auth-proof-item">
            <strong>Focused setup</strong>
            <span>Clean access screens without added imagery or clutter.</span>
          </div>
          <div className="marketing-proof-item auth-proof-item">
            <strong>Professional workflow</strong>
            <span>Everything stays aligned with speed, trust, and execution clarity.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
