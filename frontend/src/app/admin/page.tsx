"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { API } from "@/lib/api";

type StoreEntry = {
  store: { _id: string; slug: string; name: string; createdAt: string };
  role: string;
};

const ROLE_COLOR: Record<string, string> = {
  owner: "#EF7722",
  admin: "#0BA6DF",
  staff: "#64748B",
};

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [stores, setStores] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [formError, setFormError] = useState("");

  const accessToken = (session as any)?.accessToken;

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API}/stores/mine`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => { setStores(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [accessToken]);

  const autoSlug = (n: string) =>
    n.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const handleNameChange = (v: string) => {
    setName(v);
    setSlug(autoSlug(v));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      const res = await fetch(`${API}/stores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? "Failed to create store"); return; }
      setStores((prev) => [...prev, { store: data, role: "owner" }]);
      setName(""); setSlug(""); setShowForm(false);
    } catch {
      setFormError("Server error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="admin-scene">
      <div className="orb orb-1" /><div className="orb orb-2" />

      <div className="admin-wrap">
        {/* Top bar */}
        <header className="admin-header">
          <div className="admin-brand">
            <svg width="36" height="24" viewBox="0 0 36 24" fill="none">
              <circle cx="12" cy="12" r="12" fill="#EF7722" opacity="0.88" />
              <circle cx="24" cy="12" r="12" fill="#0BA6DF" opacity="0.82" />
              <circle cx="18" cy="12" r="6" fill="white" opacity="0.28" />
            </svg>
            <span className="admin-brand-name">Admin Hub</span>
          </div>
          <div className="admin-user">
            <span className="admin-email">{session?.user?.email}</span>
            <button
              className="admin-logout"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page title */}
        <div className="admin-title-row">
          <div>
            <h1 className="admin-title">Your Stores</h1>
            <p className="admin-sub">Select a store to enter, or create a new one.</p>
          </div>
          <button className="admin-new-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "✕ Cancel" : "+ New Store"}
          </button>
        </div>

        {/* Create store form */}
        {showForm && (
          <form className="admin-form" onSubmit={handleCreate}>
            <div className="admin-form-row">
              <div className="admin-field">
                <label className="admin-label">Store Name</label>
                <input
                  className="admin-input"
                  placeholder="My Awesome Store"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Slug (URL)</label>
                <input
                  className="admin-input"
                  placeholder="my-awesome-store"
                  value={slug}
                  onChange={(e) => setSlug(autoSlug(e.target.value))}
                  required
                />
              </div>
            </div>
            {formError && <p className="admin-form-error">{formError}</p>}
            <button className="admin-create-btn" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create Store"}
            </button>
          </form>
        )}

        {/* Store list */}
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
          </div>
        ) : stores.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🏪</div>
            <p className="admin-empty-title">No stores yet</p>
            <p className="admin-empty-sub">Create your first store to get started.</p>
          </div>
        ) : (
          <div className="admin-grid">
            {stores.map(({ store, role }) => (
              <button
                key={store._id}
                className="admin-store-card"
                onClick={() => router.push(`/${store.slug}/${role}`)}
              >
                <div className="admin-store-top">
                  <span
                    className="admin-role-badge"
                    style={{ background: ROLE_COLOR[role] ?? "#64748B" }}
                  >
                    {role}
                  </span>
                  <span className="admin-store-arrow">→</span>
                </div>
                <div className="admin-store-name">{store.name}</div>
                <div className="admin-store-slug">/{store.slug}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .admin-scene {
          min-height: 100vh;
          background: linear-gradient(145deg, #FFF6EE 0%, #F5FBFF 55%, #EBF7FF 100%);
          font-family: var(--font-display, "Nunito", sans-serif);
          position: relative;
          overflow: hidden;
        }
        .admin-scene::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(239,119,34,0.09) 1.5px, transparent 1.5px);
          background-size: 30px 30px;
          pointer-events: none;
        }
        .admin-wrap {
          position: relative;
          z-index: 1;
          max-width: 860px;
          margin: 0 auto;
          padding: 0 1.5rem 4rem;
        }
        /* Header */
        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 0;
          border-bottom: 1.5px solid #F1F5F9;
          margin-bottom: 2.5rem;
        }
        .admin-brand { display: flex; align-items: center; gap: 0.6rem; }
        .admin-brand-name { font-size: 1rem; font-weight: 800; color: #1A2233; letter-spacing: -0.02em; }
        .admin-user { display: flex; align-items: center; gap: 1rem; }
        .admin-email { font-size: 0.78rem; color: #94A3B8; font-weight: 400; }
        .admin-logout {
          font-size: 0.75rem; font-weight: 700; color: #EF4444;
          background: transparent; border: 1.5px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 0.3rem 0.8rem; cursor: pointer;
          transition: background 0.2s;
        }
        .admin-logout:hover { background: rgba(239,68,68,0.06); }
        /* Title row */
        .admin-title-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 1rem; margin-bottom: 1.75rem; flex-wrap: wrap;
        }
        .admin-title { font-size: 1.75rem; font-weight: 900; color: #1A2233; margin: 0; letter-spacing: -0.02em; }
        .admin-sub { font-size: 0.85rem; color: #94A3B8; margin: 0.25rem 0 0; }
        .admin-new-btn {
          padding: 0.6rem 1.25rem;
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          border: none; border-radius: 10px; color: #fff;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.82rem; font-weight: 800; cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s;
          white-space: nowrap;
        }
        .admin-new-btn:hover { box-shadow: 0 4px 16px rgba(239,119,34,0.25); transform: translateY(-1px); }
        /* Create form */
        .admin-form {
          background: #fff; border-radius: 16px;
          padding: 1.5rem; margin-bottom: 2rem;
          box-shadow: 0 4px 20px rgba(11,166,223,0.09);
          display: flex; flex-direction: column; gap: 1rem;
        }
        .admin-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .admin-field { display: flex; flex-direction: column; gap: 0.35rem; }
        .admin-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #0BA6DF; }
        .admin-input {
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;
          color: #1A2233; font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.88rem; padding: 0.55rem 0.8rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .admin-input:focus { border-color: #0BA6DF; box-shadow: 0 0 0 3px rgba(11,166,223,0.12); }
        .admin-form-error { font-size: 0.78rem; color: #EF4444; font-weight: 600; }
        .admin-create-btn {
          align-self: flex-end;
          padding: 0.6rem 1.5rem;
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          border: none; border-radius: 10px; color: #fff;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.82rem; font-weight: 800; cursor: pointer;
          transition: opacity 0.2s;
        }
        .admin-create-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        /* Loading */
        .admin-loading { display: flex; justify-content: center; padding: 4rem 0; }
        .admin-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(11,166,223,0.15);
          border-top-color: #0BA6DF;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* Empty */
        .admin-empty { text-align: center; padding: 5rem 0; }
        .admin-empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .admin-empty-title { font-size: 1.1rem; font-weight: 800; color: #1A2233; margin: 0 0 0.35rem; }
        .admin-empty-sub { font-size: 0.85rem; color: #94A3B8; }
        /* Store grid */
        .admin-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1rem;
        }
        .admin-store-card {
          background: #fff; border-radius: 16px; padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(11,166,223,0.07);
          border: 1.5px solid #F1F5F9; text-align: left; cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s;
          display: flex; flex-direction: column; gap: 0.5rem;
        }
        .admin-store-card:hover {
          box-shadow: 0 6px 24px rgba(11,166,223,0.13);
          border-color: #0BA6DF;
          transform: translateY(-2px);
        }
        .admin-store-top { display: flex; align-items: center; justify-content: space-between; }
        .admin-role-badge {
          font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #fff; padding: 0.2rem 0.6rem; border-radius: 999px;
        }
        .admin-store-arrow { font-size: 1rem; color: #CBD5E1; }
        .admin-store-name { font-size: 1rem; font-weight: 800; color: #1A2233; }
        .admin-store-slug { font-size: 0.75rem; color: #94A3B8; font-weight: 400; }
        /* Responsive */
        @media (max-width: 600px) {
          .admin-form-row { grid-template-columns: 1fr; }
          .admin-title-row { flex-direction: column; }
          .admin-create-btn { align-self: stretch; text-align: center; }
        }
      `}</style>
    </div>
  );
}
