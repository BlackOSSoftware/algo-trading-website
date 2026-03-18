"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { apiPost } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { markLoginWelcomePending } from "@/lib/loginWelcome";
import { AuthSidePanel } from "@/components/marketing/AuthSidePanel";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const data = await apiPost("/api/v1/auth/login", { email, password });
      if (data?.token) {
        setToken(data.token as string);
      }
      markLoginWelcomePending();
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.toLowerCase().includes("otp")) {
        setNeedsOtp(true);
        setInfo("OTP sent to your email. Please verify to continue.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const data = await apiPost("/api/v1/auth/verify-otp", {
        email,
        otp,
      });
      if (data?.token) {
        setToken(data.token as string);
      }
      markLoginWelcomePending();
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "OTP verification failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page auth-page-split">
      <div className="auth-split-shell">
        <AuthSidePanel
          title="Stay focused. Access your trading workspace."
          text="Log in to view your signal workflow, subscription status, and alert tools without distraction."
        />
        <div className="auth-card card auth-form-card">
          <Link className="back-link" href="/">
            Back to home
          </Link>
          <div className="brand">
            <BrandLogo />
            <div>
              <div className="brand-title">Login</div>
              <div className="brand-sub">Access your alert workspace</div>
            </div>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}
          {info ? <div className="alert alert-success">{info}</div> : null}

          {!needsOtp ? (
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
                <div className="password-field">
                  <input
                    className="input"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="field-action"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="list-item" style={{ justifyContent: "space-between" }}>
                <span>Remember this device</span>
                <input type="checkbox" />
              </div>
              <button className="btn btn-primary btn-glow" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login to Dashboard"}
              </button>
            </form>
          ) : (
            <form className="form" onSubmit={handleVerify}>
              <div className="input-group">
                <label className="label" htmlFor="otp">
                  Enter OTP
                </label>
                <input
                  className="input"
                  id="otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="6-digit OTP"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <button className="btn btn-primary btn-glow" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          <div className="helper">
            New here? <Link href="/register">Create a profile</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
