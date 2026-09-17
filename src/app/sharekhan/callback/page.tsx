"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";
import { getToken } from "@/lib/auth";

const SHAREKHAN_LOGIN_DRAFT_KEY = "wt_sharekhan_login_draft";

function pickRequestToken(params: URLSearchParams) {
  const keys = [
    "request_token",
    "requestToken",
    "reqToken",
    "token",
    "code",
    "requesttoken",
  ];

  // Prefer raw query so '+' is never turned into a space.
  if (typeof window !== "undefined") {
    const raw = window.location.search.replace(/^\?/, "");
    for (const part of raw.split("&")) {
      if (!part) continue;
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      const rawKey = part.slice(0, eq);
      const rawVal = part.slice(eq + 1);
      let key = rawKey;
      try {
        key = decodeURIComponent(rawKey);
      } catch {
        // keep raw key
      }
      key = key.toLowerCase();
      if (!keys.includes(key)) continue;
      if (!rawVal) continue;
      try {
        return decodeURIComponent(rawVal.replace(/\+/g, "%2B")).trim();
      } catch {
        return rawVal.replace(/ /g, "+").trim();
      }
    }
  }

  for (const key of keys) {
    const value = params.get(key);
    if (value && value.trim()) {
      return value.trim().replace(/ /g, "+");
    }
  }
  return "";
}

function readLocalDraft() {
  try {
    const raw = sessionStorage.getItem(SHAREKHAN_LOGIN_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function SharekhanCallbackInner() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("Connecting your Sharekhan account...");
  const [returnTo, setReturnTo] = useState("/strategy");

  useEffect(() => {
    const incoming = pickRequestToken(searchParams);

    async function run() {
      if (!incoming) {
        setStatus("error");
        setMessage("Sharekhan did not return a request token. Please try login again from Strategy.");
        return;
      }

      const auth = getToken();
      if (!auth) {
        setStatus("error");
        setMessage("Please sign in to Emotionless Traders first, then try Sharekhan login again.");
        return;
      }

      const draft = readLocalDraft();

      try {
        const data = (await apiPost(
          "/api/v1/sharekhan/complete-login",
          {
            requestToken: incoming,
            state: searchParams.get("state") || "12345",
            apiKey: draft?.apiKey || undefined,
            secureKey: draft?.secureKey || undefined,
            customerId: draft?.customerId || undefined,
            mode: draft?.mode || undefined,
            formDraft: draft?.formDraft || undefined,
            returnTo: draft?.returnTo || "/strategy",
          },
          auth
        )) as {
          accessToken?: string;
          returnTo?: string;
        };

        if (!String(data.accessToken || "").trim()) {
          throw new Error("Access token was empty");
        }

        const nextReturn = String(data.returnTo || "/strategy").trim() || "/strategy";
        setReturnTo(nextReturn);
        setStatus("done");
        setMessage("Sharekhan connected. Restoring your strategy form...");
        window.setTimeout(() => {
          window.location.href = `${nextReturn}?sharekhan=connected`;
        }, 900);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Failed to complete Sharekhan login";
        setStatus("error");
        setMessage(errMsg);
        // Still bounce back so Strategy can restore the saved form draft.
        window.setTimeout(() => {
          window.location.href = `/strategy?sharekhan=error&sk_msg=${encodeURIComponent(errMsg)}`;
        }, 1600);
      }
    }

    run();
  }, [searchParams]);

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="card" style={{ padding: 24 }}>
          <h1 style={{ marginBottom: 8 }}>Sharekhan login</h1>
          <p className="helper" style={{ marginBottom: 16 }}>
            Finishing connection and restoring your strategy form.
          </p>

          <div
            className={status === "error" ? "alert alert-error" : status === "done" ? "alert alert-success" : "helper"}
            style={{ marginBottom: 16 }}
          >
            {status === "working" ? "Connecting your Sharekhan account..." : message}
          </div>

          {status === "error" ? (
            <div className="cta-row" style={{ gap: 8 }}>
              <a className="btn btn-primary" href="/strategy?sharekhan=error">
                Back to Strategy
              </a>
            </div>
          ) : (
            <div className="helper">You will be redirected automatically.</div>
          )}

          {status === "done" ? (
            <div className="cta-row" style={{ marginTop: 16 }}>
              <a className="btn btn-secondary" href={`${returnTo}?sharekhan=connected`}>
                Continue now
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function SharekhanCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="page">
          <div className="container">Connecting Sharekhan...</div>
        </main>
      }
    >
      <SharekhanCallbackInner />
    </Suspense>
  );
}
