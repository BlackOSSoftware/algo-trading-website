import type { Metadata } from "next";
import { MarketingIcon } from "@/components/marketing/MarketingIcon";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { Reveal } from "@/components/marketing/Reveal";
import { ReviewsCarousel } from "@/components/marketing/ReviewsCarousel";
import { getInitials, testimonials } from "@/components/marketing/siteData";

export const metadata: Metadata = {
  title: "Reviews",
  description:
    "Read reviews from traders using Emotionless Traders for fast, reliable webhook-based signal delivery.",
};

export default function ReviewsPage() {
  return (
    <MarketingShell>
      <PageIntro
        eyebrow="Reviews"
        title="Trusted by traders who value speed, discipline, and simplicity"
        description="Real feedback from traders who use Emotionless Traders to keep their signal flow clean and consistent."
        icon="star"
      />

      <section className="container section reviews-page-grid">
        <Reveal>
          <ReviewsCarousel />
        </Reveal>
        <div className="testimonial-grid">
          {testimonials.map((item) => (
            <Reveal key={item.name}>
              <article className="card testimonial-card">
                <div className="review-card-top">
                  <span className="review-quote">
                    <MarketingIcon name="quote" />
                  </span>
                  <div className="review-stars" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <span className="review-star" key={`${item.name}-${starIndex}`}>
                        <MarketingIcon name="star" />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="testimonial-head">
                  <div className="testimonial-avatar">{getInitials(item.name)}</div>
                  <div>
                    <strong>{item.name}</strong>
                    <div className="helper">{item.role}</div>
                  </div>
                </div>
                <p>{item.review}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}
