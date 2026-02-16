import Link from "next/link";
import type { CSSProperties } from "react";

export default function Home() {
  return (
    <div className="page">
      <header className="site-header container">
        <div className="brand">
          <div className="brand-mark">WT</div>
          <div>
            <div className="brand-title">Webhook Trigger Algo</div>
            <div className="brand-sub">Chartink alert hub</div>
          </div>
        </div>
        <nav className="site-nav">
          <Link className="btn btn-ghost" href="/login">
            User Login
          </Link>
          <Link className="btn btn-secondary" href="/register">
            Create Account
          </Link>
          <Link className="btn btn-primary" href="/admin/login">
            Admin Login
          </Link>
        </nav>
      </header>

      <main className="container hero-grid">
        <section className="hero-copy">
          <div className="eyebrow">Realtime Webhook Intake</div>
          <h1 className="display">
            Capture Chartink alerts and push them into your strategy stack in
            seconds.
          </h1>
          <p className="lead">
            A clean control center for live signals, strategy tracking, and
            subscription management. Built to keep you focused on execution.
          </p>
          <div className="cta-row">
            <Link className="btn btn-primary" href="/dashboard">
              Open User Dashboard
            </Link>
            <Link className="btn btn-secondary" href="/admin/dashboard">
              Admin Console
            </Link>
          </div>
          <div className="hero-highlights">
            <div className="mini-card">Webhook status: Live</div>
            <div className="mini-card">Alerts processed: 12,840</div>
            <div className="mini-card">Strategies running: 8</div>
          </div>
        </section>

        <section className="hero-card card">
          <div className="badge">Latest Alert Snapshot</div>
          <div className="alert-card">
            <div className="alert-row">
              <span>BankNifty Momentum</span>
              <strong>Triggered</strong>
            </div>
            <div className="alert-row">
              <span>Nifty Breakout Scan</span>
              <strong>3 Stocks</strong>
            </div>
            <div className="alert-row">
              <span>Strategy Queue</span>
              <strong>Auto Execute</strong>
            </div>
          </div>
          <div className="list" style={{ marginTop: "18px" }}>
            <div className="list-item">
              <span>Webhook URL</span>
              <span className="badge">/api/v1/webhooks/chartink</span>
            </div>
            <div className="list-item">
              <span>Next scan</span>
              <span>1 min</span>
            </div>
          </div>
        </section>
      </main>

      <section className="container section">
        <h2 className="section-title">Everything you need in one view</h2>
        <div className="feature-grid">
          <div className="feature-card card" style={{ "--i": 1 } as CSSProperties}>
            <h3>Alert Vault</h3>
            <p>
              Store every Chartink signal with timestamped payloads and
              searchable metadata.
            </p>
          </div>
          <div className="feature-card card" style={{ "--i": 2 } as CSSProperties}>
            <h3>Strategy Control</h3>
            <p>
              Toggle strategies, manage risk presets, and keep execution clean
              and auditable.
            </p>
          </div>
          <div className="feature-card card" style={{ "--i": 3 } as CSSProperties}>
            <h3>Subscription Flow</h3>
            <p>
              Simple tiering, billing status, and renewal reminders for every
              user.
            </p>
          </div>
        </div>
      </section>

      <footer className="footer">
        Built for fast-moving traders. Use the dashboards to monitor alerts and
        execution in real time.
      </footer>
    </div>
  );
}
