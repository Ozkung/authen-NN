"use client";

import { useState } from "react";
import MaxCard from "../components/MaxCard";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isAccepted, setIsAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) { setIsError(true); setMessage("Passwords do not match."); return; }
    if (!isAccepted)     { setIsError(true); setMessage("You must accept the terms to continue."); return; }

    setIsLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          gender,
          birthDate: birthDate || undefined,
        }),
      });
      const data = await res.json();
      setIsError(!res.ok);
      setMessage(data.message || data.error || "Something went wrong.");
    } catch {
      setIsError(true);
      setMessage("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MaxCard title="Create Account" subtitle="Join us — it only takes a moment">
      <form onSubmit={handleSubmit} className="max-form">

        <div className="max-field">
          <label className="max-label">Display Name</label>
          <input
            type="text"
            className="max-input"
            placeholder="How should we call you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

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

        <div className="max-field">
          <label className="max-label">Password</label>
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
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            style={showMismatch ? { borderBottomColor: "#E07878" } : undefined}
          />
          {showMismatch && (
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

        <div className="max-form-row">
          <div className="max-field">
            <label className="max-label">Gender</label>
            <select
              className="max-input max-select"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="" disabled>Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="max-field">
            <label className="max-label">Birth Date</label>
            <input
              type="date"
              className="max-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
          </div>
        </div>

        <label className="max-checkbox-row">
          <input
            type="checkbox"
            className="max-checkbox-input"
            checked={isAccepted}
            onChange={(e) => setIsAccepted(e.target.checked)}
          />
          <span className="max-checkbox-text">
            I agree to the terms of service and privacy policy
          </span>
        </label>

        {message && (
          <p className={isError ? "max-error" : "max-success-msg"}>{message}</p>
        )}

        <button
          type="submit"
          className="max-btn"
          disabled={isLoading || showMismatch || !isAccepted}
        >
          {isLoading ? <span className="max-spinner" /> : null}
          {isLoading ? "Creating Account…" : "Create Account"}
        </button>
      </form>

      <div className="max-footer">
        <p className="max-footer-text">
          Already have an account?{" "}
          <a href="/login" className="max-link">Sign in</a>
        </p>
      </div>
    </MaxCard>
  );
}
