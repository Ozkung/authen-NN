"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  if (status === "loading") {
    return (
      <div className="home-scene">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="home-loading">
          <div className="home-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="home-scene">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <main className="home-main">
        {/* Brand */}
        <div className="home-brand">
          <svg width="44" height="30" viewBox="0 0 44 30" fill="none">
            <circle cx="15" cy="15" r="15" fill="#EF7722" opacity="0.88" />
            <circle cx="29" cy="15" r="15" fill="#0BA6DF" opacity="0.82" />
            <circle cx="22" cy="15" r="7" fill="white" opacity="0.28" />
          </svg>
          <span className="home-brand-name">AuthProject</span>
        </div>

        {session ? (
          /* ── Logged-in dashboard ── */
          <div className="home-dashboard">
            <div className="home-greeting-badge">
              <span className="home-badge-dot" />
              Authenticated
            </div>

            <h1 className="home-title">
              Welcome back,<br />
              <span className="home-title-accent">
                {session.user?.name ?? session.user?.email?.split("@")[0] ?? "User"}
              </span>
            </h1>

            <p className="home-sub">{session.user?.email}</p>

            <div className="home-card-grid">
              <div className="home-stat-card home-stat-orange">
                <div className="home-stat-icon">🔐</div>
                <div className="home-stat-label">Session</div>
                <div className="home-stat-value">Active</div>
              </div>
              <div className="home-stat-card home-stat-blue">
                <div className="home-stat-icon">✅</div>
                <div className="home-stat-label">Email</div>
                <div className="home-stat-value">Verified</div>
              </div>
              <div className="home-stat-card home-stat-mixed">
                <div className="home-stat-icon">🛡️</div>
                <div className="home-stat-label">Access</div>
                <div className="home-stat-value">Granted</div>
              </div>
            </div>

            <button className="home-btn-danger" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        ) : (
          /* ── Landing / not logged in ── */
          <div className="home-landing">
            <div className="home-hero-pill">Authentication Demo</div>

            <h1 className="home-hero-title">
              Secure auth,<br />
              <span className="home-title-gradient">made simple.</span>
            </h1>

            <p className="home-hero-sub">
              A full-stack auth flow built with Next.js, NestJS, and MongoDB.
              <br />Register, verify your email, reset your password — all ready to go.
            </p>

            <div className="home-cta-row">
              <button
                className="home-cta-primary"
                onClick={() => router.push("/login")}
              >
                Sign In
              </button>
              <button
                className="home-cta-secondary"
                onClick={() => router.push("/register")}
              >
                Create Account
              </button>
            </div>

            <div className="home-feature-row">
              {[
                { icon: "📧", label: "Email Verification" },
                { icon: "🔑", label: "Password Reset" },
                { icon: "🔒", label: "JWT Sessions" },
              ].map(({ icon, label }) => (
                <div className="home-feature-chip" key={label}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="home-footer">
          Built with Next.js · NestJS · MongoDB · HeroUI
        </footer>
      </main>

      <style>{`
        .home-scene {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          background: linear-gradient(145deg, #FFF6EE 0%, #F5FBFF 55%, #EBF7FF 100%);
          position: relative;
          overflow: hidden;
          font-family: var(--font-display, "Nunito", sans-serif);
        }

        .home-scene::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(239,119,34,0.09) 1.5px, transparent 1.5px);
          background-size: 30px 30px;
          pointer-events: none;
          z-index: 0;
        }

        .home-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }

        .home-spinner {
          width: 36px; height: 36px;
          border: 3px solid rgba(11,166,223,0.2);
          border-top-color: #0BA6DF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .home-main {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 560px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          animation: home-rise 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }

        @keyframes home-rise {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Brand */
        .home-brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-bottom: 2.5rem;
        }

        .home-brand-name {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1A2233;
          letter-spacing: -0.02em;
        }

        /* ── Dashboard ── */
        .home-dashboard {
          width: 100%;
          background: #fff;
          border-radius: 24px;
          padding: 2.5rem 2.5rem 2rem;
          box-shadow: 0 10px 40px rgba(11,166,223,0.11), 0 2px 8px rgba(239,119,34,0.07);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .home-dashboard::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
        }

        .home-greeting-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          background: rgba(11,166,223,0.08);
          color: #0BA6DF;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          margin-bottom: 1.25rem;
        }

        .home-badge-dot {
          width: 7px; height: 7px;
          background: #0BA6DF;
          border-radius: 50%;
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .home-title {
          font-size: clamp(1.8rem, 5vw, 2.4rem);
          font-weight: 900;
          color: #1A2233;
          letter-spacing: -0.03em;
          line-height: 1.2;
          margin: 0 0 0.5rem;
        }

        .home-title-accent {
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .home-sub {
          font-size: 0.88rem;
          color: #94A3B8;
          margin-bottom: 2rem;
        }

        .home-card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.85rem;
          width: 100%;
          margin-bottom: 2rem;
        }

        .home-stat-card {
          padding: 1rem 0.75rem;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
        }

        .home-stat-orange { background: rgba(239,119,34,0.08); }
        .home-stat-blue   { background: rgba(11,166,223,0.08); }
        .home-stat-mixed  { background: linear-gradient(135deg, rgba(239,119,34,0.06), rgba(11,166,223,0.06)); }

        .home-stat-icon  { font-size: 1.5rem; }
        .home-stat-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; }
        .home-stat-value { font-size: 0.88rem; font-weight: 800; color: #1A2233; }

        .home-btn-danger {
          padding: 0.75rem 2.5rem;
          border: 1.5px solid rgba(239,68,68,0.25);
          border-radius: 12px;
          background: transparent;
          color: #EF4444;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, transform 0.15s;
        }

        .home-btn-danger:hover {
          background: rgba(239,68,68,0.06);
          transform: translateY(-1px);
        }

        /* ── Landing ── */
        .home-landing {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .home-hero-pill {
          display: inline-block;
          background: linear-gradient(90deg, rgba(239,119,34,0.12), rgba(11,166,223,0.12));
          color: #EF7722;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.35rem 1rem;
          border-radius: 999px;
          margin-bottom: 1.5rem;
          border: 1px solid rgba(239,119,34,0.2);
        }

        .home-hero-title {
          font-size: clamp(2.4rem, 8vw, 3.6rem);
          font-weight: 900;
          color: #1A2233;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 0 0 1.25rem;
        }

        .home-title-gradient {
          background: linear-gradient(90deg, #EF7722 0%, #0BA6DF 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .home-hero-sub {
          font-size: 0.95rem;
          font-weight: 400;
          color: #64748B;
          line-height: 1.7;
          max-width: 420px;
          margin-bottom: 2.25rem;
        }

        .home-cta-row {
          display: flex;
          gap: 0.85rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 2.25rem;
        }

        .home-cta-primary {
          padding: 0.82rem 2.25rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          background-size: 200% 100%;
          background-position: 0% 0%;
          color: #fff;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: background-position 0.4s, box-shadow 0.3s, transform 0.15s;
        }

        .home-cta-primary:hover {
          background-position: 100% 0%;
          box-shadow: 0 6px 22px rgba(239,119,34,0.28), 0 2px 10px rgba(11,166,223,0.2);
          transform: translateY(-2px);
        }

        .home-cta-secondary {
          padding: 0.82rem 2.25rem;
          border: 2px solid #E2E8F0;
          border-radius: 12px;
          background: #fff;
          color: #1A2233;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }

        .home-cta-secondary:hover {
          border-color: #0BA6DF;
          box-shadow: 0 0 0 3px rgba(11,166,223,0.1);
          transform: translateY(-2px);
        }

        .home-feature-row {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .home-feature-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: #fff;
          border: 1.5px solid #E2E8F0;
          border-radius: 999px;
          padding: 0.35rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }

        /* Footer */
        .home-footer {
          margin-top: 2.5rem;
          font-size: 0.72rem;
          font-weight: 400;
          color: #CBD5E1;
          letter-spacing: 0.04em;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .home-dashboard { padding: 2rem 1.5rem 1.75rem; }
          .home-card-grid { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
          .home-stat-card { padding: 0.75rem 0.5rem; }
          .home-cta-row { flex-direction: column; align-items: stretch; }
          .home-cta-primary, .home-cta-secondary { text-align: center; }
        }
      `}</style>
    </div>
  );
}
