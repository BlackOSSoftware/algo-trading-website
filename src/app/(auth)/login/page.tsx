"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiPost("/api/v1/auth/login", { email, password });
      if (data?.token) {
        setToken(data.token as string);
      }
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link className="back-link" href="/">
          ← Back to home
        </Link>
        <div className="brand">
          <div className="brand-mark">WT</div>
          <div>
            <div className="brand-title">User Login</div>
            <div className="brand-sub">Access your alert workspace</div>
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              className="input"
              type="email"
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@domain.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              className="input"
              type="password"
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="list-item" style={{ justifyContent: "space-between" }}>
            <span>Remember this device</span>
            <input type="checkbox" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login to Dashboard"}
          </button>
        </form>

        <div className="helper">
          New here? <Link href="/register">Create a profile</Link>
        </div>
        <div className="helper">
          Admin access? <Link href="/admin/login">Go to admin login</Link>
        </div>
      </div>
    </div>
  );
}
