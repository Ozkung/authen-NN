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
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g className="max-brand-outer">
              <polygon
                points="15,2 28,15 15,28 2,15"
                stroke="#F08D39"
                strokeWidth="1.2"
                fill="rgba(240,141,57,0.06)"
              />
            </g>
            <polygon
              points="15,8 22,15 15,22 8,15"
              stroke="#F08D39"
              strokeWidth="0.6"
              fill="rgba(240,141,57,0.04)"
              opacity="0.7"
            />
            <circle cx="15" cy="15" r="2.2" fill="#F08D39" opacity="0.8" />
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
