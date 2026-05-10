"use client";

import { useState } from "react";
import MaxCard from "../components/MaxCard";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:3001/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setIsError(!res.ok);
      setMessage(data.message || "Something went wrong.");
    } catch {
      setIsError(true);
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MaxCard
      title="Reset Password"
      subtitle="We'll send you a recovery link"
    >
      <form onSubmit={handleSubmit} className="max-form">
        <div className="max-field">
          <label className="max-label">Email Address</label>
          <input
            type="email"
            className="max-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        {message && (
          <p className={isError ? "max-error" : "max-success-msg"}>{message}</p>
        )}

        <button type="submit" className="max-btn" disabled={isLoading}>
          {isLoading ? <span className="max-spinner" /> : null}
          {isLoading ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <div className="max-footer">
        <p className="max-footer-text">
          Remembered it?{" "}
          <a href="/login" className="max-link">Back to login</a>
        </p>
      </div>
    </MaxCard>
  );
}
