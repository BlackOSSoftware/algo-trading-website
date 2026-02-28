"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminToken, getAdminToken } from "@/lib/auth";
import { fetchSession, type SessionUser } from "@/lib/session";

export default function AdminShell({
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
      const session = await fetchSession(getAdminToken(), clearAdminToken);
      if (!active) return;

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      if (session.role !== "admin") {
        router.replace("/dashboard");
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
    clearAdminToken();
    router.replace("/admin/login");
  };

  if (!ready) {
    return (
      <div className="auth-page">
        <div className="card">Loading admin console...</div>
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
            <div className="brand-mark">AD</div>
            <div>
              <div className="brand-title">Admin Console</div>
              <div className="brand-sub">System oversight</div>
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
          <Link
            className={`nav-link${pathname === "/admin/dashboard" ? " active" : ""}`}
            href="/admin/dashboard"
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M3 12l9-9 9 9" />
                <path d="M5 10v10h14V10" />
              </svg>
            </span>
            Dashboard
          </Link>
          <Link
            className={`nav-link${pathname === "/admin/users" ? " active" : ""}`}
            href="/admin/users"
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <circle cx="9" cy="8" r="4" />
                <path d="M2 20c2-4 6-6 8-6" />
                <circle cx="17" cy="10" r="3" />
                <path d="M14 20c1-2 3-4 6-4" />
              </svg>
            </span>
            Users
          </Link>
          <Link
            className={`nav-link${pathname === "/admin/telegram" ? " active" : ""}`}
            href="/admin/telegram"
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M3 11l18-7-7 18-3-7-8-4z" />
              </svg>
            </span>
            Telegram
          </Link>
          <Link
            className={`nav-link${pathname === "/admin/signals" ? " active" : ""}`}
            href="/admin/signals"
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M4 19h16" />
                <path d="M6 15l4-4 3 3 5-6" />
              </svg>
            </span>
            Signals
          </Link>
          <Link
            className={`nav-link${pathname === "/admin/trade" ? " active" : ""}`}
            href="/admin/trade"
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <path d="M7 7h10v10H7z" />
                <path d="M7 12h10" />
                <path d="M12 7v10" />
              </svg>
            </span>
            Manual Trade
          </Link>
          <Link
            className={`nav-link${pathname === "/admin/plans" ? " active" : ""}`}
            href="/admin/plans"
          >
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M7 9h10" />
              </svg>
            </span>
            Plans
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="badge">Admin mode</div>
          <div style={{ marginTop: "10px" }}>
            Monitoring webhooks and user activity.
          </div>
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
              <div className="topbar-title">System Dashboard</div>
              <div className="topbar-sub">Welcome, {user?.name}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="status-pill">All systems green</div>
            <button className="btn btn-ghost" type="button">
              View logs
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
