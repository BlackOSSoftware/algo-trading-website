import type { MarketingImageAsset } from "./siteData";

export function ContentImageCard({
  asset,
  eyebrow,
  description,
  compact = false,
}: {
  asset: MarketingImageAsset;
  eyebrow?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <article className={`card content-image-card${compact ? " compact" : ""}`}>
      <div className="content-image-frame">
        <img className="content-image-media" src={asset.src} alt={asset.alt} loading="lazy" />
      </div>
      <div className="content-image-copy">
        {eyebrow ? <div className="eyebrow content-image-eyebrow">{eyebrow}</div> : null}
        <h3>{asset.title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="content-image-credit">
        <span>Photo by {asset.photographer}</span>
        <a href={asset.sourceHref} target="_blank" rel="noreferrer">
          View source
        </a>
      </div>
    </article>
  );
}
