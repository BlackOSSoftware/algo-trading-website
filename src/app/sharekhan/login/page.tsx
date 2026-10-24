"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import { setSharekhanToken } from "@/lib/auth";

export default function SharekhanLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await apiPost("/api/v1/auth/sharekhan/login", { email, password }) as { token?: string };
      if (!result.token) throw new Error("Login failed");
      setSharekhanToken(result.token);
      router.replace("/sharekhan");
    } catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><div className="auth-card card">
    <Link className="back-link" href="/">← Back to home</Link>
    <div className="brand"><div className="brand-mark">SK</div><div><div className="brand-title">Sharekhan Console</div><div className="brand-sub">Private operator sign in</div></div></div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}
    <form className="form" onSubmit={submit}>
      <div className="input-group"><label className="label" htmlFor="sharekhan-email">Email</label><input className="input" id="sharekhan-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="input-group"><label className="label" htmlFor="sharekhan-password">Password</label><input className="input" id="sharekhan-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in to Sharekhan"}</button>
    </form>
    <div className="helper">This login is separate from user and admin accounts.</div>
  </div></div>;
}
