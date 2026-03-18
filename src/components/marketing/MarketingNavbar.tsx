"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { MarketingIcon } from "./MarketingIcon";
import { marketingNavItems, siteConfig } from "./siteData";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href;
}

export function MarketingNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <header className="site-header container marketing-header">
      <Link className="brand" href="/" onClick={close}>
        <BrandLogo priority />
        <div>
          <div className="brand-title">{siteConfig.name}</div>
          <div className="brand-sub">{siteConfig.shortTagline}</div>
        </div>
      </Link>

      <button
        className="icon-btn marketing-toggle"
        type="button"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MarketingIcon name={open ? "close" : "menu"} />
      </button>

      <Link className="btn btn-primary marketing-mobile-cta btn-glow" href="/register" onClick={close}>
        <MarketingIcon name="userPlus" />
        Sign Up
      </Link>

      <nav className={`site-nav marketing-nav${open ? " open" : ""}`}>
        <div className="marketing-nav-links">
          {marketingNavItems.map((item) => (
            <Link
              key={item.href}
              className={`marketing-nav-link${isActive(pathname, item.href) ? " active" : ""}`}
              href={item.href}
              onClick={close}
            >
              <span className="marketing-nav-link-icon">
                <MarketingIcon name={item.icon} />
              </span>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="marketing-nav-actions">
          <Link className="btn btn-ghost" href="/login" onClick={close}>
            <MarketingIcon name="login" />
            Login
          </Link>
          <Link className="btn btn-primary btn-glow" href="/register" onClick={close}>
            <MarketingIcon name="userPlus" />
            Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
}
