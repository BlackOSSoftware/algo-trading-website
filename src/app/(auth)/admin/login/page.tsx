"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiPost } from "@/lib/api";
import { setAdminToken } from "@/lib/auth";

export default function AdminLoginPage() {
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
      const data = await apiPost("/api/v1/auth/admin/login", { email, password });
      if (data?.token) {
        setAdminToken(data.token as string);
      }
      router.push("/admin/dashboard");
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
          <div className="brand-mark">AD</div>
          <div>
            <div className="brand-title">Admin Login</div>
            <div className="brand-sub">Secure access for operators</div>
          </div>
        </div>

        {error ? <div className="alert alert-error">{error}</div> : null}

        <form className="form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="label" htmlFor="admin-email">
              Admin Email
            </label>
            <input
              className="input"
              type="email"
              id="admin-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@domain.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="input-group">
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <input
              className="input"
              type="password"
              id="admin-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Enter Admin Console"}
          </button>
        </form>

        <div className="helper">
          User login? <Link href="/login">Go to user login</Link>
        </div>
      </div>
    </div>
  );
}
