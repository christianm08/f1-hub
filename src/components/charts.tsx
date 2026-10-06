/* Tiny SVG charts — no dependencies. */

export function Sparkline({
  values,
  width = 220,
  height = 56,
  stroke = "#e10600",
  fill = true,
  ariaLabel,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: boolean;
  ariaLabel?: string;
}) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} role="img" aria-label={ariaLabel ?? "chart"}>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={stroke} strokeWidth={2} strokeDasharray="4 4" />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const px = (i: number) => (i / (values.length - 1)) * (width - 8) + 4;
  const py = (v: number) => height - 6 - ((v - min) / span) * (height - 14);
  const pts = values.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const area = `4,${height - 2} ${pts} ${width - 4},${height - 2}`;
  const gid = `g${Math.abs(values.reduce((a, b) => a + b, 0) * 997).toFixed(0)}`;
  return (
    <svg width={width} height={height} role="img" aria-label={ariaLabel ?? "chart"} style={{ maxWidth: "100%" }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gid})`} />
        </>
      )}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(values.length - 1)} cy={py(values[values.length - 1])} r={4} fill={stroke} />
    </svg>
  );
}

/** Bar comparison (e.g. points per team). */
export function BarList({ items, max }: { items: { label: string; value: number; color?: string }[]; max?: number }) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((i) => (
        <div key={i.label}>
          <div className="spread small" style={{ marginBottom: 4 }}>
            <span className="muted">{i.label}</span>
            <b className="num">{i.value}</b>
          </div>
          <div className="progress" role="img" aria-label={`${i.label}: ${i.value}`}>
            <i style={{ width: `${(i.value / m) * 100}%`, background: i.color ?? "var(--accent)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
