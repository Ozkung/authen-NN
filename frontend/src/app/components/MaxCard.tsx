export default function MaxCard({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-scene">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="max-card">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />

        <div className="max-brand">
          <svg width="48" height="32" viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="16" fill="#EF7722" opacity="0.88" />
            <circle cx="32" cy="16" r="16" fill="#0BA6DF" opacity="0.82" />
            <circle cx="24" cy="16" r="8" fill="white" opacity="0.28" />
          </svg>
        </div>

        <div className="max-header">
          <h1 className="max-title">{title}</h1>
          {subtitle && <p className="max-subtitle">{subtitle}</p>}
        </div>

        <div className="max-divider">
          <span className="divider-line" />
          <span className="divider-diamond">◆</span>
          <span className="divider-line" />
        </div>

        {children}
      </div>
    </div>
  );
}
