"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken } from "@/lib/auth";
import { fetchSession, type SessionUser } from "@/lib/session";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M3 12l9-9 9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M12 22s4-4 7-7a9 9 0 10-14 0c3 3 7 7 7 7z" />
        <circle cx="12" cy="11" r="3" />
      </svg>
    ),
  },
  {
    href: "/strategy",
    label: "Strategy",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M3 12h6l3-7 3 14 3-7h3" />
      </svg>
    ),
  },
  {
    href: "/trade",
    label: "Trade",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <path d="M7 7h10v10H7z" />
        <path d="M7 12h10" />
        <path d="M12 7v10" />
      </svg>
    ),
  },
  {
    href: "/subscription",
    label: "Subscription",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h10" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c2-4 6-6 8-6s6 2 8 6" />
      </svg>
    ),
  },
];

export default function UserShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const session = await fetchSession();
      if (!active) return;

      if (!session) {
        router.replace("/login");
        return;
      }

      if (session.role !== "user") {
        router.replace("/admin/dashboard");
        return;
      }

      setUser(session);
      setReady(true);
    };

    run();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="card">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay${navOpen ? " open" : ""}`}
        onClick={() => setNavOpen(false)}
      />
      <aside className={`sidebar${navOpen ? " open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">WT</div>
            <div>
              <div className="brand-title">User Portal</div>
              <div className="brand-sub">Alerts and strategies</div>
            </div>
          </div>
          <button
            className="icon-btn sidebar-close"
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Close navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M6 6l12 12" />
              <path d="M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={`nav-link${pathname === item.href ? " active" : ""}`}
              href={item.href}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleLogout}
            style={{ marginTop: "16px", width: "100%" }}
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn nav-toggle"
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="topbar-title">Welcome back, {user?.name}</div>
              <div className="topbar-sub">
                Track alerts and keep strategies in sync
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="status-pill">Live Feed</div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
