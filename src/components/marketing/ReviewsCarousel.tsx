"use client";

import { useEffect, useState } from "react";
import { MarketingIcon } from "./MarketingIcon";
import { getInitials, testimonials } from "./siteData";

export function ReviewsCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % testimonials.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  const item = testimonials[index];

  return (
    <div className="card review-carousel">
      <div className="badge">Trader Spotlight</div>
      <div className="review-carousel-body">
        <div className="review-carousel-avatar">{getInitials(item.name)}</div>
        <div>
          <strong>{item.name}</strong>
          <div className="helper">{item.role}</div>
        </div>
      </div>
      <div className="review-carousel-meta">
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
      <p className="review-carousel-text">{item.review}</p>
      <div className="review-carousel-dots" aria-label="Review slide picker">
        {testimonials.map((entry, dotIndex) => (
          <button
            key={entry.name}
            type="button"
            className={dotIndex === index ? "active" : ""}
            onClick={() => setIndex(dotIndex)}
            aria-label={`Show review ${dotIndex + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
