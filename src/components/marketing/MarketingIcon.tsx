import type { IconName } from "./siteData";

export function MarketingIcon({ name }: { name: IconName }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13V10.5" />
      </svg>
    );
  }

  if (name === "route") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M8 6h4a4 4 0 0 1 4 4v4" />
        <path d="M16 14v2" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M4 8h14" />
        <path d="M16 13h4" />
        <path d="M16 13h.01" />
      </svg>
    );
  }

  if (name === "message") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 18.5 4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6Z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  if (name === "login") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H4" />
      </svg>
    );
  }

  if (name === "userPlus") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 19a6 6 0 0 1 11 0" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </svg>
    );
  }

  if (name === "quote") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M9 11H5.5A2.5 2.5 0 0 1 8 8.5V8" />
        <path d="M19 11h-3.5A2.5 2.5 0 0 1 18 8.5V8" />
        <path d="M5 11h4v5H5z" />
        <path d="M15 11h4v5h-4z" />
      </svg>
    );
  }

  if (name === "star") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="m12 4 2.2 4.6 5 .7-3.6 3.6.9 5.1L12 15.6 7.5 18l.9-5.1-3.6-3.6 5-.7L12 4Z" />
      </svg>
    );
  }

  if (name === "fileText") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 3h6l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </svg>
    );
  }

  if (name === "signal") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 14h3l2.2-6 3.2 11 2.4-7H20" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 18V6" />
        <path d="M9 18V10" />
        <path d="M14 18V8" />
        <path d="M19 18V4" />
      </svg>
    );
  }

  if (name === "tradingview") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4.5 15.5a3.5 3.5 0 1 1 0-7h2" />
        <path d="M11 18h4.5a3.5 3.5 0 1 0 0-7h-1" />
        <path d="M9 18V8" />
      </svg>
    );
  }

  if (name === "speed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 16a7 7 0 1 1 14 0" />
        <path d="M12 12l4-3" />
        <path d="M8 19h8" />
      </svg>
    );
  }

  if (name === "tracking") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 9v3l2 2" />
      </svg>
    );
  }

  if (name === "plans") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
      </svg>
    );
  }

  if (name === "connect") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M8 7h-1a3 3 0 0 0 0 6h1" />
        <path d="M16 7h1a3 3 0 1 1 0 6h-1" />
        <path d="M9 12h6" />
      </svg>
    );
  }

  if (name === "receive") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 4v11" />
        <path d="M8 11l4 4 4-4" />
        <path d="M5 19h14" />
      </svg>
    );
  }

  if (name === "execute") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 12h10" />
        <path d="m11 6 6 6-6 6" />
      </svg>
    );
  }

  if (name === "discipline") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (name === "flow") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7h7a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h11" />
      </svg>
    );
  }

  if (name === "active") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 18h16" />
        <path d="M7 18v-5" />
        <path d="M12 18V8" />
        <path d="M17 18V5" />
      </svg>
    );
  }

  if (name === "reliable" || name === "shield") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
        <path d="m9.5 12 1.8 1.8L15 10" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" aria-hidden="true">
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "mail") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M4 7h16v10H4z" />
        <path d="m5 8 7 6 7-6" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (name === "x") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="m5 5 14 14" />
        <path d="M19 5 5 19" />
      </svg>
    );
  }

  if (name === "instagram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M17.2 6.8h.01" />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M6.5 9.5v8" />
        <path d="M6.5 6.5h.01" />
        <path d="M11 17.5v-5a2.5 2.5 0 0 1 5 0v5" />
        <path d="M11 11h0" />
      </svg>
    );
  }

  if (name === "telegram") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="m20 5-3 14-5-4-3 2 1-4 10-8-12 7-4-1 16-6Z" />
      </svg>
    );
  }

  if (name === "spark") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
