import type { ReactNode } from "react";
import { MarketingIcon } from "./MarketingIcon";
import type { IconName } from "./siteData";

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: IconName;
}) {
  return (
    <section className="container section marketing-page-intro">
      <div className="page-intro-kicker">
        {icon ? (
          <span className="icon-chip icon-chip-small">
            <MarketingIcon name={icon} />
          </span>
        ) : null}
        <div className="eyebrow">{eyebrow}</div>
      </div>
      <h1 className="display marketing-page-title">{title}</h1>
      <p className="lead marketing-page-lead">{description}</p>
      {actions ? <div className="cta-row">{actions}</div> : null}
    </section>
  );
}
