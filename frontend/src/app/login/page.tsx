"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import MaxCard from "../components/MaxCard";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identityStore, setIdentityStore] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email,
        password,
        ...(identityStore && { identityStore }),
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
      } else {
        const session = await getSession();
        const slug = (session as any)?.storeSlug;
        const userRole = (session as any)?.role;
        router.push(slug && userRole ? `/${slug}/${userRole}` : "/admin");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MaxCard title="Welcome Back" subtitle="Sign in to continue">
      <form onSubmit={handleSubmit} className="max-form">
        <div className="max-field">
          <label className="max-label">Email Address</label>
          <input
            type="email"
            className="max-input"
            placeholder="Email Address"
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
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="max-field">
          <label className="max-label">
            Identity Store{" "}
            <span
              style={{
                color: "#6A5E7A",
                fontWeight: 300,
                letterSpacing: "0.1em",
              }}
            >
              — optional
            </span>
          </label>
          <input
            type="text"
            className="max-input"
            placeholder="1234567890abcdef"
            value={identityStore}
            onChange={(e) => setIdentityStore(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="max-forgot-row">
          <a href="/forgot-password" className="max-link">
            Forgot password?
          </a>
        </div>

        {error && <p className="max-error">{error}</p>}

        <button type="submit" className="max-btn" disabled={isLoading}>
          {isLoading ? <span className="max-spinner" /> : null}
          {isLoading ? "Signing In…" : "Sign In"}
        </button>
      </form>

      <div className="max-footer">
        <p className="max-footer-text">
          No account?{" "}
          <a href="/register" className="max-link">
            Create one
          </a>
        </p>
      </div>
    </MaxCard>
  );
}
