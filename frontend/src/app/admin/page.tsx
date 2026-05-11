"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { API } from "@/lib/api";

type StoreEntry = {
  store: {
    _id: string;
    slug: string;
    name: string;
    logo?: string;
    businessType?: string;
    operatingHours?: number;
    openTime?: string;
    closeTime?: string;
    googleMapLink?: string;
    createdAt: string;
  };
  role: string;
};

const ROLE_COLOR: Record<string, string> = {
  owner: "#EF7722",
  admin: "#0BA6DF",
  staff: "#64748B",
};

const BUSINESS_TYPES = [
  { value: "restaurant", label: "ร้านอาหาร (Restaurant)" },
  { value: "cafe", label: "คาเฟ่ / ร้านกาแฟ (Café)" },
  { value: "bakery", label: "เบเกอรี่ (Bakery)" },
  { value: "bar", label: "บาร์ / ผับ (Bar / Pub)" },
  { value: "fastfood", label: "ฟาสต์ฟู้ด (Fast Food)" },
  { value: "retail", label: "ร้านค้าปลีก (Retail Store)" },
  { value: "grocery", label: "ร้านของชำ / ซุปเปอร์มาร์เก็ต (Grocery)" },
  { value: "fashion", label: "เสื้อผ้า / แฟชั่น (Fashion)" },
  { value: "electronics", label: "ร้านอิเล็กทรอนิกส์ (Electronics)" },
  { value: "bookstore", label: "ร้านหนังสือ (Bookstore)" },
  { value: "gift", label: "ของขวัญ / ของที่ระลึก (Gift / Souvenir)" },
  { value: "florist", label: "ร้านดอกไม้ (Florist)" },
  { value: "beauty", label: "ร้านเสริมสวย / ทำผม (Beauty Salon)" },
  { value: "spa", label: "สปา / นวดแผนไทย (Spa / Massage)" },
  { value: "fitness", label: "ฟิตเนส / โยคะ (Fitness / Yoga)" },
  { value: "clinic", label: "คลินิก / บริการสุขภาพ (Clinic)" },
  { value: "pharmacy", label: "ร้านยา (Pharmacy)" },
  { value: "hotel", label: "โรงแรม / รีสอร์ท (Hotel / Resort)" },
  { value: "hostel", label: "โฮสเทล / เกสต์เฮ้าส์ (Hostel / Guesthouse)" },
  { value: "laundry", label: "ร้านซักรีด (Laundry)" },
  { value: "repair", label: "ร้านซ่อม (Repair Shop)" },
  { value: "photography", label: "ช่างภาพ / สตูดิโอ (Photography)" },
  { value: "education", label: "การศึกษา / ติวเตอร์ (Education)" },
  { value: "automotive", label: "ยานยนต์ (Automotive)" },
  { value: "construction", label: "ก่อสร้าง / รับเหมา (Construction)" },
  { value: "it", label: "IT / ซอฟต์แวร์ (IT / Software)" },
  { value: "realestate", label: "อสังหาริมทรัพย์ (Real Estate)" },
  { value: "delivery", label: "บริการจัดส่ง (Delivery)" },
  { value: "travel", label: "ท่องเที่ยว / ทัวร์ (Travel / Tour)" },
  { value: "other", label: "อื่นๆ (Other)" },
];

function storeInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

function addHours(time: string, hours: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = (h + hours) % 24;
  return `${String(total).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [stores, setStores] = useState<StoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [operatingHours, setOperatingHours] = useState<number>(24);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("");
  const [googleMapLink, setGoogleMapLink] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const accessToken = (session as any)?.accessToken;

  useEffect(() => {
    if (!accessToken) return;
    fetch(`${API}/stores/mine`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setStores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [accessToken]);

  const handleNameChange = (v: string) => setName(v);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleHoursChange = (v: number) => {
    setOperatingHours(v);
    if (v < 24) setCloseTime(addHours(openTime, v));
  };

  const handleOpenTimeChange = (v: string) => {
    setOpenTime(v);
    if (operatingHours < 24) setCloseTime(addHours(v, operatingHours));
  };

  const resetForm = () => {
    setName(""); setBusinessType(""); setOperatingHours(24);
    setOpenTime("08:00"); setCloseTime(""); setGoogleMapLink("");
    setLogoFile(null); setLogoPreview(null); setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      if (businessType) formData.append("businessType", businessType);
      formData.append("operatingHours", String(operatingHours));
      if (operatingHours < 24) {
        formData.append("openTime", openTime);
        formData.append("closeTime", closeTime);
      }
      if (googleMapLink) formData.append("googleMapLink", googleMapLink);
      if (logoFile) formData.append("logo", logoFile);

      const res = await fetch(`${API}/stores`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message ?? "Failed to create store"); return; }
      setStores((prev) => [...prev, { store: data, role: "owner" }]);
      resetForm();
      setShowForm(false);
    } catch {
      setFormError("Server error. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const hoursOptions = Array.from({ length: 23 }, (_, i) => i + 2);

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
            <button className="admin-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
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
          <button
            className="admin-new-btn"
            onClick={() => { setShowForm((v) => !v); if (showForm) resetForm(); }}
          >
            {showForm ? "✕ Cancel" : "+ New Store"}
          </button>
        </div>

        {/* ── Create store form ── */}
        {showForm && (
          <form className="admin-form" onSubmit={handleCreate}>

            {/* Logo + Name row */}
            <div className="cf-logo-name-row">
              {/* Logo upload */}
              <div className="cf-logo-area">
                <button
                  type="button"
                  className="cf-logo-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload logo"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="logo preview" className="cf-logo-img" />
                  ) : (
                    <span className="cf-logo-initials">
                      {name ? storeInitials(name) : <span className="cf-logo-icon">📷</span>}
                    </span>
                  )}
                  <span className="cf-logo-overlay">Upload</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoChange}
                />
                <p className="cf-logo-hint">Logo (optional)</p>
              </div>

              {/* Name + Slug */}
              <div className="cf-name-group">
                <div className="cf-field">
                  <label className="cf-label">ชื่อธุรกิจ *</label>
                  <input
                    className="cf-input"
                    placeholder="My Awesome Store"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Business type */}
            <div className="cf-field">
              <label className="cf-label">ประเภทธุรกิจ</label>
              <select
                className="cf-select"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <option value="">— เลือกประเภทธุรกิจ —</option>
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </select>
            </div>

            {/* Operating hours */}
            <div className="cf-hours-row">
              <div className="cf-field cf-field-hours">
                <label className="cf-label">เวลาทำการ</label>
                <select
                  className="cf-select"
                  value={operatingHours}
                  onChange={(e) => handleHoursChange(Number(e.target.value))}
                >
                  <option value={24}>24 ชั่วโมง</option>
                  {hoursOptions.reverse().map((h) => (
                    <option key={h} value={h}>{h} ชั่วโมง</option>
                  ))}
                </select>
              </div>

              {operatingHours < 24 && (
                <>
                  <div className="cf-field">
                    <label className="cf-label">เวลาเปิด</label>
                    <input
                      type="time"
                      className="cf-input"
                      value={openTime}
                      onChange={(e) => handleOpenTimeChange(e.target.value)}
                    />
                  </div>
                  <div className="cf-field">
                    <label className="cf-label">เวลาปิด</label>
                    <input
                      type="time"
                      className="cf-input"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Google Map */}
            <div className="cf-field">
              <label className="cf-label">Google Map Link</label>
              <input
                type="url"
                className="cf-input"
                placeholder="https://maps.google.com/?q=..."
                value={googleMapLink}
                onChange={(e) => setGoogleMapLink(e.target.value)}
              />
            </div>

            {formError && <p className="cf-error">{formError}</p>}

            <button className="cf-submit-btn" type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create Store"}
            </button>
          </form>
        )}

        {/* Store list */}
        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /></div>
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
                onClick={() => router.push(`/${store._id}/${role}`)}
              >
                <div className="admin-store-top">
                  {/* Logo or initials */}
                  <div className="asc-logo">
                    {store.logo ? (
                      <img src={`${API}${store.logo}`} alt={store.name} className="asc-logo-img" />
                    ) : (
                      <span className="asc-logo-initials">{storeInitials(store.name)}</span>
                    )}
                  </div>
                  <span
                    className="admin-role-badge"
                    style={{ background: ROLE_COLOR[role] ?? "#64748B" }}
                  >
                    {role}
                  </span>
                </div>
                <div className="admin-store-name">{store.name}</div>
                <div className="admin-store-slug">/{store.slug}</div>
                {store.businessType && (
                  <div className="asc-type">
                    {BUSINESS_TYPES.find((b) => b.value === store.businessType)?.label.split(" (")[0] ?? store.businessType}
                  </div>
                )}
                {store.operatingHours != null && (
                  <div className="asc-hours">
                    {store.operatingHours === 24
                      ? "🕐 24 ชั่วโมง"
                      : `🕐 ${store.openTime} – ${store.closeTime} (${store.operatingHours}h)`}
                  </div>
                )}
                {store.googleMapLink && (
                  <a
                    href={store.googleMapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="asc-map-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📍 ดูแผนที่
                  </a>
                )}
                <div className="admin-store-arrow">→</div>
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
        .orb {
          position: absolute; border-radius: 50%; filter: blur(80px);
          pointer-events: none; opacity: 0.18;
        }
        .orb-1 { width: 420px; height: 420px; background: #EF7722; top: -120px; right: -80px; }
        .orb-2 { width: 340px; height: 340px; background: #0BA6DF; bottom: -100px; left: -60px; }
        .admin-wrap {
          position: relative; z-index: 1;
          max-width: 900px; margin: 0 auto; padding: 0 1.5rem 4rem;
        }
        /* Header */
        .admin-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 0; border-bottom: 1.5px solid #F1F5F9; margin-bottom: 2.5rem;
        }
        .admin-brand { display: flex; align-items: center; gap: 0.6rem; }
        .admin-brand-name { font-size: 1rem; font-weight: 800; color: #1A2233; letter-spacing: -0.02em; }
        .admin-user { display: flex; align-items: center; gap: 1rem; }
        .admin-email { font-size: 0.78rem; color: #94A3B8; }
        .admin-logout {
          font-size: 0.75rem; font-weight: 700; color: #EF4444;
          background: transparent; border: 1.5px solid rgba(239,68,68,0.2);
          border-radius: 8px; padding: 0.3rem 0.8rem; cursor: pointer; transition: background 0.2s;
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
          transition: box-shadow 0.2s, transform 0.15s; white-space: nowrap;
        }
        .admin-new-btn:hover { box-shadow: 0 4px 16px rgba(239,119,34,0.25); transform: translateY(-1px); }

        /* ── Create Form ── */
        .admin-form {
          background: #fff; border-radius: 20px;
          padding: 1.75rem; margin-bottom: 2rem;
          box-shadow: 0 4px 24px rgba(11,166,223,0.09);
          display: flex; flex-direction: column; gap: 1.1rem;
        }
        /* Logo + Name row */
        .cf-logo-name-row { display: flex; gap: 1.25rem; align-items: flex-start; }
        .cf-logo-area { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; flex-shrink: 0; }
        .cf-logo-btn {
          width: 80px; height: 80px; border-radius: 18px;
          border: 2px dashed #CBD5E1; background: #F8FAFC;
          cursor: pointer; position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cf-logo-btn:hover { border-color: #0BA6DF; box-shadow: 0 0 0 3px rgba(11,166,223,0.1); }
        .cf-logo-img { width: 100%; height: 100%; object-fit: cover; }
        .cf-logo-initials {
          font-size: 1.4rem; font-weight: 900; color: #94A3B8;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, rgba(239,119,34,0.12), rgba(11,166,223,0.12));
          width: 100%; height: 100%;
        }
        .cf-logo-icon { font-size: 1.4rem; }
        .cf-logo-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.45); color: #fff;
          font-size: 0.65rem; font-weight: 800; letter-spacing: 0.06em;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: opacity 0.2s;
        }
        .cf-logo-btn:hover .cf-logo-overlay { opacity: 1; }
        .cf-logo-hint { font-size: 0.62rem; color: #94A3B8; font-weight: 600; text-align: center; }
        .cf-name-group { flex: 1; display: flex; flex-direction: column; gap: 0.75rem; }
        /* Fields */
        .cf-field { display: flex; flex-direction: column; gap: 0.3rem; }
        .cf-label {
          font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.09em; color: #0BA6DF;
        }
        .cf-input {
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;
          color: #1A2233; font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.88rem; padding: 0.55rem 0.8rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; width: 100%; box-sizing: border-box;
        }
        .cf-input:focus { border-color: #0BA6DF; box-shadow: 0 0 0 3px rgba(11,166,223,0.12); }
        .cf-slug-wrap { display: flex; align-items: center; }
        .cf-slug-prefix {
          background: #F1F5F9; border: 1.5px solid #E2E8F0; border-right: none;
          border-radius: 10px 0 0 10px; padding: 0.55rem 0.6rem;
          font-size: 0.88rem; font-weight: 700; color: #94A3B8;
        }
        .cf-input-slug { border-radius: 0 10px 10px 0; }
        .cf-select {
          background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px;
          color: #1A2233; font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.88rem; padding: 0.55rem 0.8rem; outline: none;
          cursor: pointer; transition: border-color 0.2s; width: 100%;
        }
        .cf-select:focus { border-color: #0BA6DF; }
        /* Hours row */
        .cf-hours-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; }
        .cf-field-hours { min-width: 160px; }
        .cf-error { font-size: 0.78rem; color: #EF4444; font-weight: 600; }
        .cf-submit-btn {
          align-self: flex-end;
          padding: 0.65rem 1.75rem;
          background: linear-gradient(90deg, #EF7722, #0BA6DF);
          border: none; border-radius: 10px; color: #fff;
          font-family: var(--font-display, "Nunito", sans-serif);
          font-size: 0.85rem; font-weight: 800; cursor: pointer; transition: opacity 0.2s;
        }
        .cf-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Loading */
        .admin-loading { display: flex; justify-content: center; padding: 4rem 0; }
        .admin-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(11,166,223,0.15); border-top-color: #0BA6DF;
          border-radius: 50%; animation: spin 0.8s linear infinite;
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
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }
        .admin-store-card {
          background: #fff; border-radius: 18px; padding: 1.25rem 1.4rem;
          box-shadow: 0 2px 8px rgba(11,166,223,0.07);
          border: 1.5px solid #F1F5F9; text-align: left; cursor: pointer;
          transition: box-shadow 0.2s, transform 0.15s, border-color 0.2s;
          display: flex; flex-direction: column; gap: 0.3rem;
        }
        .admin-store-card:hover {
          box-shadow: 0 6px 24px rgba(11,166,223,0.13);
          border-color: #0BA6DF; transform: translateY(-2px);
        }
        .admin-store-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; }
        /* Logo in card */
        .asc-logo {
          width: 40px; height: 40px; border-radius: 10px; overflow: hidden;
          flex-shrink: 0; background: linear-gradient(135deg, rgba(239,119,34,0.12), rgba(11,166,223,0.12));
          display: flex; align-items: center; justify-content: center;
        }
        .asc-logo-img { width: 100%; height: 100%; object-fit: cover; }
        .asc-logo-initials { font-size: 0.85rem; font-weight: 900; color: #64748B; }
        .admin-role-badge {
          font-size: 0.62rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #fff; padding: 0.2rem 0.6rem; border-radius: 999px;
        }
        .admin-store-name { font-size: 1rem; font-weight: 800; color: #1A2233; }
        .admin-store-slug { font-size: 0.72rem; color: #94A3B8; font-weight: 400; }
        .asc-type { font-size: 0.72rem; color: #64748B; font-weight: 600; margin-top: 0.1rem; }
        .asc-hours { font-size: 0.7rem; color: #94A3B8; }
        .asc-map-link {
          font-size: 0.7rem; color: #0BA6DF; font-weight: 700; text-decoration: none;
          margin-top: 0.1rem; display: inline-block;
        }
        .asc-map-link:hover { text-decoration: underline; }
        .admin-store-arrow { font-size: 1rem; color: #CBD5E1; margin-top: 0.25rem; align-self: flex-end; }
        /* Responsive */
        @media (max-width: 600px) {
          .cf-logo-name-row { flex-direction: column; }
          .cf-hours-row { flex-direction: column; }
          .admin-title-row { flex-direction: column; }
          .cf-submit-btn { align-self: stretch; text-align: center; }
        }
      `}</style>
    </div>
  );
}
