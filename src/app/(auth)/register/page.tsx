"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { apiPost } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AuthSidePanel } from "@/components/marketing/AuthSidePanel";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const phoneValue = phone.trim();
      const data = await apiPost("/api/v1/auth/register", {
        name,
        email,
        ...(phoneValue ? { phone: phoneValue } : {}),
        password,
      });
      if ((data as { requiresVerification?: boolean }).requiresVerification) {
        setStep("verify");
        setInfo("OTP sent to your email. Please verify to continue.");
        return;
      }
      if ((data as { token?: string }).token) {
        setToken((data as { token: string }).token);
        router.push("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
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
      if ((data as { token?: string }).token) {
        setToken((data as { token: string }).token);
        router.push("/dashboard");
      }
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
          title="Build a faster, cleaner signal workflow."
          text="Create your Emotionless Traders account and start receiving focused trading signals with a professional setup."
        />
        <div className="auth-card card auth-form-card">
          <Link className="back-link" href="/">
            Back to home
          </Link>
          <div className="brand">
            <BrandLogo />
            <div>
              <div className="brand-title">Sign Up</div>
              <div className="brand-sub">Start tracking alerts today</div>
            </div>
          </div>

          {error ? <div className="alert alert-error">{error}</div> : null}
          {info ? <div className="alert alert-success">{info}</div> : null}

          {step === "register" ? (
            <form className="form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="label" htmlFor="name">
                  Full name
                </label>
                <input
                  className="input"
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
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
                <label className="label" htmlFor="phone">
                  Mobile number (optional)
                </label>
                <input
                  className="input"
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 90000 00000"
                  autoComplete="tel"
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
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    minLength={6}
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
              <button className="btn btn-primary btn-glow" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
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
            Already have an account? <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
