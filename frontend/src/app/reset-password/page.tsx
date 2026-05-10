"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MaxCard from "../components/MaxCard";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  if (!token) {
    return (
      <MaxCard title="Invalid Link" subtitle="This reset link is missing a token">
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <p className="max-status-sub">
            The link you followed is incomplete or has expired.<br />
            Please request a new one.
          </p>
          <a href="/forgot-password" className="max-link">Request new link</a>
        </div>
      </MaxCard>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:3001/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      const ok = data.message?.includes("successfully");
      setIsError(!ok);
      setMessage(data.message || data.error || "Something went wrong.");
      if (ok) setTimeout(() => router.push("/login"), 2500);
    } catch {
      setIsError(true);
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MaxCard title="New Password" subtitle="Choose a strong password">
      <form onSubmit={handleSubmit} className="max-form">
        <div className="max-field">
          <label className="max-label">New Password</label>
          <input
            type="password"
            className="max-input"
            placeholder="••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="max-field">
          <label className="max-label">Confirm Password</label>
          <input
            type="password"
            className="max-input"
            placeholder="••••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            style={mismatch ? { borderBottomColor: "#E07878" } : undefined}
          />
          {mismatch && (
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: "0.62rem",
              letterSpacing: "0.06em",
              color: "#E07878",
            }}>
              Passwords do not match
            </span>
          )}
        </div>

        {message && (
          <p className={isError ? "max-error" : "max-success-msg"}>{message}</p>
        )}

        <button
          type="submit"
          className="max-btn"
          disabled={isLoading || mismatch}
        >
          {isLoading ? <span className="max-spinner" /> : null}
          {isLoading ? "Resetting…" : "Set New Password"}
        </button>
      </form>

      <div className="max-footer">
        <p className="max-footer-text">
          <a href="/login" className="max-link">Back to login</a>
        </p>
      </div>
    </MaxCard>
  );
}

export default function ResetPassword() {
  return (
    <Suspense
      fallback={
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#080412",
          color: "#C9A84C",
          fontFamily: "var(--font-ui)",
          fontSize: "0.65rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
        }}>
          Loading…
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
