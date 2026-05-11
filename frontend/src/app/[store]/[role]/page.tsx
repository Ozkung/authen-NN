"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { API } from "@/lib/api";

type Member = {
  user: { _id: string; email: string; displayName?: string };
  role: string;
};

const ROLE_COLOR: Record<string, string> = {
  owner: "#EF7722",
  admin: "#0BA6DF",
  staff: "#64748B",
};

const ROLE_PERMS: Record<string, string[]> = {
  owner: ["Manage members", "Edit store settings", "View reports", "Process orders", "View inventory"],
  admin: ["Manage members", "View reports", "Process orders", "View inventory"],
  staff: ["Process orders", "View inventory"],
};

export default function WorkspacePage() {
  const { store: storeId, role } = useParams<{ store: string; role: string }>();
  const { data: session } = useSession();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("staff");
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [adding, setAdding] = useState(false);

  const accessToken = (session as any)?.accessToken;
  const canManageMembers = role === "owner" || role === "admin";

  useEffect(() => {
    if (!accessToken || !canManageMembers) return;
    setLoadingMembers(true);
    fetch(`${API}/stores/${storeId}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => { setMembers(Array.isArray(data) ? data : []); setLoadingMembers(false); })
      .catch(() => setLoadingMembers(false));
  }, [accessToken, storeId, canManageMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(""); setAddSuccess(""); setAdding(true);
    try {
      const res = await fetch(`${API}/stores/${storeId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: addEmail, role: addRole }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.message ?? "Failed to add member"); return; }
      setAddSuccess(`${addEmail} added as ${addRole}.`);
      setAddEmail(""); setAddRole("staff");
      setMembers((prev) => [...prev, data]);
    } catch {
      setAddError("Server error. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="ws-scene">
      <div className="orb orb-1" /><div className="orb orb-2" />

      <div className="ws-wrap">
        {/* Header */}
        <header className="ws-header">
          <div className="ws-brand">
            <button className="ws-back" onClick={() => router.push("/admin")}>← Hub</button>
            <div className="ws-divider" />
            <svg width="28" height="20" viewBox="0 0 36 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#EF7722" opacity="0.88" />
              <circle cx="24" cy="12" r="12" fill="#0BA6DF" opacity="0.82" />
              <circle cx="18" cy="12" r="6" fill="white" opacity="0.28" />
            </svg>
            <span className="ws-store-name">/{storeId}</span>
          </div>
          <div className="ws-header-right">
            <span className="ws-email">{session?.user?.email}</span>
            <span
              className="ws-role-badge"
              style={{ background: ROLE_COLOR[role] ?? "#64748B" }}
            >
              {role}
            </span>
            <button className="ws-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </div>
        </header>

        {/* Hero */}
        <div className="ws-hero">
          <div className="ws-hero-text">
            <h1 className="ws-title">
              Welcome to{" "}
              <span className="ws-title-store">
                {storeId.replace(/-/g, " ")}
              </span>
            </h1>
            <p className="ws-sub">You are signed in as <strong>{role}</strong>.</p>
          </div>
          <div className="ws-hero-badge" style={{ borderColor: ROLE_COLOR[role] ?? "#64748B" }}>
            <span className="ws-hero-role" style={{ color: ROLE_COLOR[role] ?? "#64748B" }}>
              {role}
            </span>
            <span className="ws-hero-role-label">your role</span>
          </div>
        </div>

        {/* Permissions */}
        <section className="ws-section">
          <h2 className="ws-section-title">Your Permissions</h2>
          <div className="ws-perms">
            {(ROLE_PERMS[role] ?? []).map((perm) => (
              <div key={perm} className="ws-perm-chip">
                <span className="ws-perm-dot" style={{ background: ROLE_COLOR[role] ?? "#64748B" }} />
                {perm}
              </div>
            ))}
          </div>
        </section>

        {/* Members panel — owner/admin only */}
        {canManageMembers && (
          <section className="ws-section">
            <h2 className="ws-section-title">Team Members</h2>

            {/* Add member form */}
            <form className="ws-add-form" onSubmit={handleAddMember}>
              <div className="ws-add-row">
                <input
                  className="ws-input"
                  type="email"
                  placeholder="member@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  required
                />
                <select
                  className="ws-select"
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                >
                  {role === "owner" && <option value="admin">Admin</option>}
                  <option value="staff">Staff</option>
                </select>
                <button className="ws-add-btn" type="submit" disabled={adding}>
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
              {addError && <p className="ws-msg ws-msg-error">{addError}</p>}
              {addSuccess && <p className="ws-msg ws-msg-ok">{addSuccess}</p>}
            </form>

            {/* Member list */}
            {loadingMembers ? (
              <div className="ws-loading"><div className="ws-spinner" /></div>
            ) : members.length === 0 ? (
              <p className="ws-empty-members">No members yet.</p>
            ) : (
              <div className="ws-member-list">
                {members.map((m) => (
                  <div key={m.user._id} className="ws-member-row">
                    <div className="ws-member-info">
                      <span className="ws-member-name">{m.user.displayName ?? m.user.email}</span>
                      {m.user.displayName && <span className="ws-member-email">{m.user.email}</span>}
                    </div>
                    <span
                      className="ws-member-badge"
                      style={{ background: ROLE_COLOR[m.role] ?? "#64748B" }}
                    >
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <style>{`
        .ws-scene {
          min-height: 100vh;
          background: linear-gradient(145deg, #FFF6EE 0%, #F5FBFF 55%, #EBF7FF 100%);
          font-family: var(--font-display, "Nunito", sans-serif);
          position: relative;
          overflow: hidden;
        }
        .ws-scene::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(239,119,34,0.09) 1.5px, transparent 1.5px);
          background-size: 30px 30px;
          pointer-events: none;
        }
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          opacity: 0.18;
        }
        .orb-1 { width: 420px; height: 420px; background: #EF7722; top: -120px; right: -80px; }
        .orb-2 { width: 340px; height: 340px; background: #0BA6DF; bottom: -100px; left: -60px; }
        .ws-wrap {
          position: relative;
          z-index: 1;
          max-width: 860px;
          margin: 0 auto;
          padding: 0 1.5rem 4rem;
        }
        /* Header */
        .ws-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 0;
          border-bottom: 1.5px solid #F1F5F9;
          margin-bottom: 2.5rem;
        }
        .ws-brand { display: flex; align-items: center; gap: 0.75rem; }
        .ws-back {
          font-size: 0.78rem; font-weight: 700; color: #94A3B8;
          background: transparent; border: none; cursor: pointer;
          padding: 0.25rem 0; transition: color 0.2s;
        }
        .ws-back:hover { color: #EF7722; }
        .ws-divider { width: 1px; height: 18px; background: #E2E8F0; }
        .ws-store-name {
          font-size: 0.95rem; font-weight: 800; color: #1A2233;
          letter-spacing: -0.02em;
        }
        .ws-header-right { display: flex; align-items: center; gap: 0.75rem; }
        .ws-email { font-size: 0.78rem; color: #94A3B8; font-weight: 400; }
        .ws-role-badge {
          font-size: 0.6rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #fff; padding: 0.18rem 0.55rem; border-radius: 999px;
        }
        .ws-logout {
          font-size: 0.75rem; font-weight: 700; color: #EF4444;
          background: transparent; border: 1.5px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 0.3rem 0.8rem; cursor: pointer;
          transition: background 0.2s;
        }
        .ws-logout:hover { background: rgba(239,68,68,0.06); }
        /* Hero */
        .ws-hero {
          display: flex; align-items: center; justify-content: space-between;
          gap: 2rem; margin-bottom: 2.5rem; flex-wrap: wrap;
        }
        .ws-title {
          font-size: 2rem; font-weight: 900; color: #1A2233;
          margin: 0 0 0.4rem; letter-spacing: -0.025em; line-height: 1.15;
        }
        .ws-title-store {
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          text-transform: capitalize;
        }
        .ws-sub { font-size: 0.88rem; color: #64748B; margin: 0; }
        .ws-hero-badge {
          display: flex; flex-direction: column; align-items: center;
          padding: 1rem 1.75rem; border: 2.5px solid;
          border-radius: 20px; background: #fff;
          box-shadow: 0 4px 20px rgba(11,166,223,0.09);
          flex-shrink: 0;
        }
        .ws-hero-role {
          font-size: 1.6rem; font-weight: 900; text-transform: uppercase;
          letter-spacing: 0.04em; line-height: 1;
        }
        .ws-hero-role-label {
          font-size: 0.62rem; font-weight: 600; color: #94A3B8;
          text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.35rem;
        }
        /* Section */
        .ws-section {
          background: #fff; border-radius: 20px; padding: 1.75rem;
          box-shadow: 0 4px 20px rgba(11,166,223,0.07);
          border: 1.5px solid #F1F5F9;
          margin-bottom: 1.5rem;
        }
        .ws-section-title {
          font-size: 0.65rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #0BA6DF; margin: 0 0 1rem;
        }
        /* Permissions */
        .ws-perms { display: flex; flex-wrap: wrap; gap: 0.6rem; }
        .ws-perm-chip {
          display: flex; align-items: center; gap: 0.45rem;
          background: #F8FAFC; border: 1.5px solid #E2E8F0;
          border-radius: 999px; padding: 0.3rem 0.75rem;
          font-size: 0.8rem; font-weight: 600; color: #334155;
        }
        .ws-perm-dot {
          width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
        }
        /* Add member */
        .ws-add-form { margin-bottom: 1.25rem; }
        .ws-add-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
        .ws-input {
          flex: 1; min-width: 200px;
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;
          color: #1A2233; font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.88rem; padding: 0.55rem 0.8rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ws-input:focus { border-color: #0BA6DF; box-shadow: 0 0 0 3px rgba(11,166,223,0.12); }
        .ws-select {
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;
          color: #1A2233; font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.88rem; padding: 0.55rem 0.8rem; outline: none;
          cursor: pointer; transition: border-color 0.2s;
        }
        .ws-select:focus { border-color: #0BA6DF; }
        .ws-add-btn {
          padding: 0.55rem 1.25rem;
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          border: none; border-radius: 10px; color: #fff;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.82rem; font-weight: 800; cursor: pointer;
          transition: opacity 0.2s; white-space: nowrap;
        }
        .ws-add-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .ws-msg { font-size: 0.78rem; font-weight: 600; margin: 0.6rem 0 0; }
        .ws-msg-error { color: #EF4444; }
        .ws-msg-ok { color: #10B981; }
        /* Member list */
        .ws-loading { display: flex; justify-content: center; padding: 2rem 0; }
        .ws-spinner {
          width: 28px; height: 28px;
          border: 3px solid rgba(11,166,223,0.15);
          border-top-color: #0BA6DF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .ws-empty-members { font-size: 0.85rem; color: #94A3B8; margin: 0; }
        .ws-member-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .ws-member-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.65rem 0.85rem;
          background: #F8FAFC; border-radius: 10px;
          border: 1.5px solid #F1F5F9;
        }
        .ws-member-info { display: flex; flex-direction: column; gap: 0.1rem; }
        .ws-member-name { font-size: 0.85rem; font-weight: 700; color: #1A2233; }
        .ws-member-email { font-size: 0.72rem; color: #94A3B8; }
        .ws-member-badge {
          font-size: 0.58rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #fff; padding: 0.18rem 0.55rem; border-radius: 999px;
        }
        /* Responsive */
        @media (max-width: 600px) {
          .ws-hero { flex-direction: column; align-items: flex-start; }
          .ws-add-row { flex-direction: column; }
          .ws-add-btn { width: 100%; }
          .ws-header { flex-wrap: wrap; gap: 0.75rem; }
        }
      `}</style>
    </div>
  );
}
