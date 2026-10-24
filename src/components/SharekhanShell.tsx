"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSharekhanToken, getSharekhanToken } from "@/lib/auth";
import { fetchSession, type SessionUser } from "@/lib/session";

export default function SharekhanShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter(); const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null); const [ready, setReady] = useState(false);
  const isLogin = pathname === "/sharekhan/login";
  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    let active = true;
    fetchSession(getSharekhanToken(), clearSharekhanToken).then((session) => {
      if (!active) return;
      if (session?.role !== "sharekhan") { clearSharekhanToken(); router.replace("/sharekhan/login"); return; }
      setUser(session); setReady(true);
    });
    return () => { active = false; };
  }, [isLogin, router]);
  if (isLogin) return <>{children}</>;
  if (!ready) return <div className="auth-page"><div className="card">Loading Sharekhan console...</div></div>;
  if (!user) return <div className="auth-page"><div className="card">Redirecting to login...</div></div>;
  return <div className="app-shell">
    <aside className="sidebar"><div className="sidebar-top"><div className="brand"><div className="brand-mark">SK</div><div><div className="brand-title">Sharekhan</div><div className="brand-sub">Private console</div></div></div></div>
      <nav className="sidebar-nav"><Link className={`nav-link${pathname === "/sharekhan" ? " active" : ""}`} href="/sharekhan">Broker connections</Link><Link className={`nav-link${pathname === "/sharekhan/links" ? " active" : ""}`} href="/sharekhan/links">Order links</Link></nav>
      <div className="sidebar-footer"><div className="badge">Sharekhan access</div><div style={{ marginTop: 10, overflowWrap: "anywhere" }}>{user.email}</div><button className="btn btn-ghost" type="button" style={{ marginTop: 16, width: "100%" }} onClick={() => { clearSharekhanToken(); router.replace("/sharekhan/login"); }}>Sign out</button></div>
    </aside><div className="app-main"><header className="topbar"><div><div className="topbar-title">Sharekhan Console</div><div className="topbar-sub">Welcome, {user.name}</div></div></header><main className="content">{children}</main></div>
  </div>;
}
