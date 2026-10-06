/* ============================================================================
 * ComparePanel — head-to-head comparison of two drivers, real data only.
 *   - best lap, best S1/S2/S3, pit count, stint list (side by side);
 *   - lap-time progression as two overlaid series in team colours;
 *   - cumulative gap evolution (A − B) aligned by LAP NUMBER — approximate,
 *     because laps are not aligned by instant; the note says so explicitly.
 * Missing data is always "n/d", never estimated.
 * ========================================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import { GitCompareArrows, Info } from "lucide-react";
import { useRaceCenterSession } from "../../api/openf1live";
import type { LapEntry } from "../../api/openf1model";
import { ErrorState, Skeleton } from "../ui";
import { fmtLapTime, useAdv } from "./advStrings";
import "./advanced.css";

interface PanelProps {
  sessionKey: number;
  onSelectDriver?: (driverNumber: number) => void;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#e10600",
  MEDIUM: "#eab308",
  HARD: "#e5e7eb",
  INTERMEDIATE: "#22c55e",
  WET: "#3b82f6",
};

interface Pt {
  x: number;
  y: number;
}

/** Minimal overlaid line chart (1–2 series, shared domain), no dependencies. */
function DuoChart({
  series,
  formatY,
  zeroLine,
  height = 150,
  ariaLabel,
}: {
  series: Array<{ color: string; label: string; points: Pt[] }>;
  formatY: (v: number) => string;
  zeroLine?: boolean;
  height?: number;
  ariaLabel: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const PADL = 52;
  const PADR = 10;
  const PADT = 8;
  const PADB = 18;

  const geom = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (w < 60 || all.length < 2) return null;
    const xs = all.map((p) => p.x);
    const ys = all.map((p) => p.y);
    let vmin = Math.min(...ys);
    let vmax = Math.max(...ys);
    if (zeroLine) {
      vmin = Math.min(vmin, 0);
      vmax = Math.max(vmax, 0);
    }
    if (!(vmax > vmin)) {
      vmax += 1;
      vmin -= 1;
    }
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const iw = w - PADL - PADR;
    const ih = height - PADT - PADB;
    const X = (x: number) => PADL + ((x - x0) / Math.max(1, x1 - x0)) * iw;
    const Y = (v: number) => PADT + ih - ((v - vmin) / (vmax - vmin)) * ih;
    return { X, Y, vmin, vmax, x0, x1 };
  }, [series, w, zeroLine, height]);

  return (
    <div className="rcx-chart-box" ref={boxRef}>
      {geom == null ? (
        <div style={{ height }} className="rcx-caption">…</div>
      ) : (
        <svg viewBox={`0 0 ${w} ${height}`} style={{ height }} role="img" aria-label={ariaLabel}>
          {[0, 0.5, 1].map((f) => {
            const v = geom.vmin + (geom.vmax - geom.vmin) * f;
            const y = geom.Y(v);
            return (
              <g key={f}>
                <line x1={PADL} y1={y} x2={w - PADR} y2={y} stroke="currentColor" opacity={0.12} />
                <text x={PADL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.55}>
                  {formatY(v)}
                </text>
              </g>
            );
          })}
          {zeroLine && (
            <line x1={PADL} y1={geom.Y(0)} x2={w - PADR} y2={geom.Y(0)} stroke="currentColor" opacity={0.4} strokeDasharray="4 3" />
          )}
          {[geom.x0, (geom.x0 + geom.x1) / 2, geom.x1].map((x) => (
            <text key={x} x={geom.X(x)} y={height - 4} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}>
              {Math.round(x)}
            </text>
          ))}
          {series.map((s) => (
            <polyline
              key={s.label}
              points={s.points.map((p) => `${geom.X(p.x).toFixed(1)},${geom.Y(p.y).toFixed(1)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}
    </div>
  );
}

function minOf(list: LapEntry[], pick: (l: LapEntry) => number | null): number | null {
  let m: number | null = null;
  for (const l of list) {
    if (l.isPitOut) continue;
    const v = pick(l);
    if (v != null && Number.isFinite(v) && (m == null || v < m)) m = v;
  }
  return m;
}

export function ComparePanel({ sessionKey, onSelectDriver }: PanelProps) {
  const { t } = useAdv();
  const { state, drivers, laps, pits, stints, sessionResult, error, refresh } =
    useRaceCenterSession(sessionKey, {});

  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);

  const ordered = useMemo(() => {
    const pos = new Map(sessionResult.map((r) => [r.driverNumber, r.position ?? 999]));
    return [...drivers].sort((x, y) => (pos.get(x.number) ?? 999) - (pos.get(y.number) ?? 999) || x.number - y.number);
  }, [drivers, sessionResult]);

  // Defaults: top two of the classification (derived during render, no effect).
  const selA = a ?? ordered[0]?.number ?? null;
  const selB = b ?? ordered.find((d) => d.number !== selA)?.number ?? null;

  const driverByNum = useMemo(() => new Map(drivers.map((d) => [d.number, d])), [drivers]);

  const stats = useMemo(() => {
    const build = (num: number | null) => {
      if (num == null) return null;
      const list = laps.get(num) ?? [];
      const timed = list.filter((l) => l.duration != null && !l.isPitOut);
      return {
        num,
        best: minOf(list, (l) => l.duration),
        s1: minOf(list, (l) => l.s1),
        s2: minOf(list, (l) => l.s2),
        s3: minOf(list, (l) => l.s3),
        pitCount: pits.filter((p) => p.driver === num).length,
        stintList: stints.find((s) => s.driver === num)?.stints ?? [],
        timed,
      };
    };
    return { a: build(selA), b: build(selB) };
  }, [laps, pits, stints, selA, selB]);

  const progression = useMemo(() => {
    if (!stats.a || !stats.b) return null;
    const toPts = (timed: LapEntry[]): Pt[] =>
      timed
        .filter((l) => l.duration != null)
        .map((l) => ({ x: l.lap, y: l.duration as number }));
    const pa = toPts(stats.a.timed);
    const pb = toPts(stats.b.timed);
    if (pa.length < 2 || pb.length < 2) return null;
    return [
      { color: driverByNum.get(selA!)?.teamColour ?? "#e10600", label: driverByNum.get(selA!)?.acronym ?? "A", points: pa },
      { color: driverByNum.get(selB!)?.teamColour ?? "#38bdf8", label: driverByNum.get(selB!)?.acronym ?? "B", points: pb },
    ];
  }, [stats, driverByNum, selA, selB]);

  const gapEvo = useMemo(() => {
    if (!stats.a || !stats.b) return null;
    const ma = new Map(stats.a.timed.filter((l) => l.duration != null).map((l) => [l.lap, l.duration as number]));
    const mb = new Map(stats.b.timed.filter((l) => l.duration != null).map((l) => [l.lap, l.duration as number]));
    const common = [...ma.keys()].filter((k) => mb.has(k)).sort((x, y) => x - y);
    if (common.length < 2) return null;
    let cum = 0;
    const points = common.map((lap) => {
      cum += (ma.get(lap) as number) - (mb.get(lap) as number);
      return { x: lap, y: cum };
    });
    return [{ color: "#e10600", label: "A−B", points }];
  }, [stats]);

  const pick = (which: "a" | "b", n: number) => {
    if (which === "a") setA(n);
    else setB(n);
    onSelectDriver?.(n);
  };

  const head = (
    <div className="rcx-head">
      <h2 className="rcx-title"><GitCompareArrows aria-hidden="true" />{t("rcx_cmp_title")}</h2>
    </div>
  );

  if (state === "loading" || state === "idle") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_cmp_title")}>
        {head}
        <Skeleton h={160} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_cmp_title")}>
        {head}
        <ErrorState onRetry={refresh} message={error ? `${t("rcx_error")}: ${error.message}` : t("rcx_error")} />
      </section>
    );
  }

  const nd = t("rcx_nd");
  const da = selA != null ? driverByNum.get(selA) : undefined;
  const db = selB != null ? driverByNum.get(selB) : undefined;
  const bestDelta = stats.a?.best != null && stats.b?.best != null ? Math.abs(stats.a.best - stats.b.best) : null;

  const statCard = (
    d: { acronym: string; fullName: string; teamColour: string } | undefined,
    s: NonNullable<typeof stats.a>,
  ) => (
    <div className="rcx-cmp-card">
      <div className="rcx-cmp-driver">
        <span className="rcx-cmp-swatch" style={{ background: d?.teamColour ?? "#8892a3" }} aria-hidden="true" />
        <b>{d?.acronym ?? `#${s.num}`} · {d?.fullName ?? ""}</b>
      </div>
      <div className="rcx-kv">
        <span className="k">{t("rcx_cmp_best_lap")}</span>
        <span className="v">{fmtLapTime(s.best, nd)}</span>
      </div>
      <div className="rcx-kv">
        <span className="k">{t("rcx_cmp_pits")}</span>
        <span className="v">{s.pitCount}</span>
      </div>
      <div style={{ marginTop: 8 }}>
        <div className="rcx-caption" style={{ marginBottom: 4 }}>{t("rcx_cmp_stints")}</div>
        {s.stintList.length === 0 && <span className="rcx-caption">{nd}</span>}
        {s.stintList.map((st) => (
          <div className="rcx-stint" key={st.stintNumber}>
            <span
              className="rcx-compound"
              style={{ background: COMPOUND_COLORS[st.compound] ?? "#8892a3", color: st.compound === "HARD" ? "#0b0e13" : "#fff" }}
            >
              {st.compound.slice(0, 1)}
            </span>
            <span className="rcx-stint-meta">
              {t("rcx_cmp_laps_range")} {st.lapStart}–{st.lapEnd ?? "…"} · {t("rcx_cmp_age")} {st.age}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section className="card rcx-panel" aria-label={t("rcx_cmp_title")}>
      {head}

      <div className="rcx-row">
        <label className="rcx-field">
          <span>{t("rcx_cmp_driver_a")}</span>
          <select className="rcx-select" value={selA ?? ""} onChange={(e) => pick("a", Number(e.target.value))} aria-label={t("rcx_cmp_driver_a")}>
            {ordered.filter((d) => d.number !== selB).map((d) => (
              <option key={d.number} value={d.number}>{d.acronym} — {d.fullName}</option>
            ))}
          </select>
        </label>
        <label className="rcx-field">
          <span>{t("rcx_cmp_driver_b")}</span>
          <select className="rcx-select" value={selB ?? ""} onChange={(e) => pick("b", Number(e.target.value))} aria-label={t("rcx_cmp_driver_b")}>
            {ordered.filter((d) => d.number !== selA).map((d) => (
              <option key={d.number} value={d.number}>{d.acronym} — {d.fullName}</option>
            ))}
          </select>
        </label>
      </div>

      {stats.a && stats.b ? (
        <>
          <div className="rcx-cmp-cols">
            {statCard(da, stats.a)}
            {statCard(db, stats.b)}
          </div>

          <div className="rcx-chart">
            <div className="rcx-chart-head">
              <span className="rcx-chart-title">{t("rcx_cmp_best_lap")} — {t("rcx_cmp_delta")}</span>
              <span className="rcx-chart-unit">{bestDelta != null ? `+${bestDelta.toFixed(3)}s` : nd}</span>
            </div>
            <div className="rcx-kv"><span className="k">{t("rcx_cmp_s1")}</span><span className="v">{fmtLapTime(stats.a.s1, nd)} · {fmtLapTime(stats.b.s1, nd)}</span></div>
            <div className="rcx-kv"><span className="k">{t("rcx_cmp_s2")}</span><span className="v">{fmtLapTime(stats.a.s2, nd)} · {fmtLapTime(stats.b.s2, nd)}</span></div>
            <div className="rcx-kv"><span className="k">{t("rcx_cmp_s3")}</span><span className="v">{fmtLapTime(stats.a.s3, nd)} · {fmtLapTime(stats.b.s3, nd)}</span></div>
          </div>

          <div className="rcx-chart">
            <div className="rcx-chart-head">
              <span className="rcx-chart-title">{t("rcx_cmp_lap_times")}</span>
            </div>
            <div className="rcx-overlay-legend" style={{ marginBottom: 4 }}>
              {progression?.map((s) => (
                <span key={s.label}><i style={{ background: s.color }} />{s.label}</span>
              ))}
            </div>
            {progression ? (
              <DuoChart series={progression} formatY={(v) => v.toFixed(1)} ariaLabel={t("rcx_cmp_lap_times")} />
            ) : (
              <div className="rcx-note" role="note"><Info aria-hidden="true" />{t("rcx_cmp_no_laps")}</div>
            )}
          </div>

          <div className="rcx-chart">
            <div className="rcx-chart-head">
              <span className="rcx-chart-title">{t("rcx_cmp_gap")}</span>
              <span className="rcx-chart-unit">s</span>
            </div>
            {gapEvo ? (
              <DuoChart series={gapEvo} formatY={(v) => (v > 0 ? "+" : "") + v.toFixed(1)} zeroLine ariaLabel={t("rcx_cmp_gap")} />
            ) : (
              <div className="rcx-note" role="note"><Info aria-hidden="true" />{t("rcx_cmp_no_laps")}</div>
            )}
            <p className="rcx-caption" style={{ marginTop: 6 }}>{t("rcx_cmp_gap_note")}</p>
          </div>
        </>
      ) : (
        <div className="rcx-note" role="note"><Info aria-hidden="true" />{t("rcx_cmp_no_laps")}</div>
      )}
    </section>
  );
}
