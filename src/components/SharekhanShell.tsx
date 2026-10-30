"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSharekhanToken, getSharekhanToken } from "@/lib/auth";
import { fetchSession, type SessionUser } from "@/lib/session";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const value = parts.map((part) => part[0]?.toUpperCase() || "").join("");
  return value || "SK";
}

export default function SharekhanShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const isLogin = pathname === "/sharekhan/login";

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    let active = true;
    fetchSession(getSharekhanToken(), clearSharekhanToken).then((session) => {
      if (!active) return;
      if (session?.role !== "sharekhan") {
        clearSharekhanToken();
        router.replace("/sharekhan/login");
        return;
      }
      setUser(session);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready || !user) {
    return (
      <div className="sk-app">
        <div className="sk-boot">{ready ? "Redirecting to login..." : "Loading Sharekhan console..."}</div>
      </div>
    );
  }

  return (
    <div className="sk-app">
      <div className="sk-main">
        <div className="sk-account">
          <div className="sk-brand">
            <span className="sk-logo">SK</span>
            <span>Sharekhan</span>
          </div>
          <div className="sk-account-right">
            <div className="sk-user">
              <span className="sk-avatar">{initials(user.name || user.email)}</span>
              <div>
                <strong>{user.name || "Operator"}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <button
              className="sk-signout"
              type="button"
              onClick={() => {
                clearSharekhanToken();
                router.replace("/sharekhan/login");
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M10 7V5H5v14h5v-2" />
                <path d="M10 12h9" />
                <path d="M16 9l3 3-3 3" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
