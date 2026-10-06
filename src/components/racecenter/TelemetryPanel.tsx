/* ============================================================================
 * TelemetryPanel — live car telemetry charts (speed, throttle, brake, gear,
 * DRS) on a real time axis.
 * ----------------------------------------------------------------------------
 * HONESTY
 *   OpenF1 serves car_data ONLY during live sessions (and the free plan does
 *   not serve the live window at all — see needsSubscription in the hook).
 *   When no telemetry is flowing the panel shows the honest "not available"
 *   state — it NEVER renders fake or placeholder charts.
 *   The per-lap time window is not exposed by the normalized model
 *   (LapEntry has no timestamps), so the lap selector picks the lap whose
 *   stats are shown in the info card while the chart always renders the
 *   continuous real trace for the selected driver.
 * ========================================================================== */

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Info } from "lucide-react";
import { useRaceCenterSession } from "../../api/openf1live";
import { ErrorState, Skeleton } from "../ui";
import { fmtLapTime, useAdv } from "./advStrings";
import "./advanced.css";

interface PanelProps {
  sessionKey: number;
  onSelectDriver?: (driverNumber: number) => void;
}

interface Sample {
  t: number;
  v: number | null;
}

/* ------------------------------------------------------------ chart ----- */

function TelemetryChart({
  title,
  unit,
  color,
  values,
  formatY,
  step,
  yDomain,
  lang,
  emptyLabel,
}: {
  title: string;
  unit: string;
  color: string;
  values: Sample[];
  formatY: (v: number) => string;
  step?: boolean;
  yDomain?: [number, number];
  lang: string;
  emptyLabel: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const H = 148;
  const PADL = 46;
  const PADR = 10;
  const PADT = 8;
  const PADB = 20;

  const geom = useMemo(() => {
    const valid = values.filter((s) => s.v != null);
    if (w < 60 || valid.length === 0) return null;
    const ts = valid.map((s) => s.t);
    const t0 = Math.min(...ts);
    const t1 = Math.max(...ts);
    let vmin = yDomain ? yDomain[0] : Math.min(...valid.map((s) => s.v as number));
    let vmax = yDomain ? yDomain[1] : Math.max(...valid.map((s) => s.v as number));
    if (!(vmax > vmin)) {
      vmin -= 1;
      vmax += 1;
    }
    const iw = w - PADL - PADR;
    const ih = H - PADT - PADB;
    const X = (tt: number) => PADL + ((tt - t0) / Math.max(1, t1 - t0)) * iw;
    const Y = (v: number) => PADT + ih - ((v - vmin) / (vmax - vmin)) * ih;
    // Split into contiguous non-null runs so gaps stay gaps (no fake lines).
    const runs: Sample[][] = [];
    let cur: Sample[] = [];
    for (const s of values) {
      if (s.v == null) {
        if (cur.length) runs.push(cur);
        cur = [];
      } else cur.push(s);
    }
    if (cur.length) runs.push(cur);
    const linePath = (run: Sample[]) => {
      if (step) {
        let d = `M ${X(run[0].t).toFixed(1)} ${Y(run[0].v as number).toFixed(1)}`;
        for (let i = 1; i < run.length; i++) d += ` H ${X(run[i].t).toFixed(1)} V ${Y(run[i].v as number).toFixed(1)}`;
        return d;
      }
      return run.map((s, i) => `${i === 0 ? "M" : "L"} ${X(s.t).toFixed(1)} ${Y(s.v as number).toFixed(1)}`).join(" ");
    };
    const flat = runs.flat();
    const ticks = [0, 1, 2, 3].map((i) => t0 + ((t1 - t0) * i) / 3);
    return { X, Y, runs, flat, linePath, ticks, vmin, vmax, iw, ih };
  }, [values, w, yDomain, step]);

  const fmtT = (ms: number) =>
    new Date(ms).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="rcx-chart">
      <div className="rcx-chart-head">
        <span className="rcx-chart-title">{title}</span>
        <span className="rcx-chart-unit">{unit}</span>
      </div>
      <div className="rcx-chart-box" ref={boxRef}>
        {geom == null ? (
          <div style={{ height: H }} className="rcx-caption">{values.length === 0 ? emptyLabel : "…"}</div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${w} ${H}`}
              style={{ height: H }}
              role="img"
              aria-label={`${title} chart`}
              onMouseMove={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const mx = ((e.clientX - rect.left) / rect.width) * w;
                let best = -1;
                let bd = Infinity;
                geom.flat.forEach((s, i) => {
                  const d = Math.abs(geom.X(s.t) - mx);
                  if (d < bd) { bd = d; best = i; }
                });
                setHover(best);
              }}
              onMouseLeave={() => setHover(null)}
            >
              {[0, 0.5, 1].map((f) => {
                const v = geom.vmin + (geom.vmax - geom.vmin) * f;
                const y = geom.Y(v);
                return (
                  <g key={f}>
                    <line x1={PADL} y1={y} x2={w - PADR} y2={y} stroke="currentColor" opacity={0.12} strokeWidth={1} />
                    <text x={PADL - 6} y={y + 3.5} textAnchor="end" fontSize={10} fill="currentColor" opacity={0.55}>
                      {formatY(v)}
                    </text>
                  </g>
                );
              })}
              {geom.ticks.map((tk) => (
                <text key={tk} x={geom.X(tk)} y={H - 5} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.55}>
                  {fmtT(tk)}
                </text>
              ))}
              {geom.runs.map((run, i) => (
                <path key={i} d={geom.linePath(run)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              ))}
              {hover != null && geom.flat[hover] && (
                <g>
                  <line x1={geom.X(geom.flat[hover].t)} y1={PADT} x2={geom.X(geom.flat[hover].t)} y2={H - PADB} stroke={color} strokeWidth={1} strokeDasharray="3 3" opacity={0.7} />
                  <circle cx={geom.X(geom.flat[hover].t)} cy={geom.Y(geom.flat[hover].v as number)} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
                </g>
              )}
            </svg>
            {hover != null && geom.flat[hover] && (
              <div
                className="rcx-tip"
                style={{
                  left: Math.min(Math.max(geom.X(geom.flat[hover].t), 70), w - 70),
                  top: geom.Y(geom.flat[hover].v as number),
                }}
              >
                {fmtT(geom.flat[hover].t)} · <b>{formatY(geom.flat[hover].v as number)}</b> {unit}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ panel ----- */

export function TelemetryPanel({ sessionKey, onSelectDriver }: PanelProps) {
  const { t, lang } = useAdv();
  const { state, info, drivers, laps, telemetry, telemetryAvailable, error, refresh } =
    useRaceCenterSession(sessionKey, { enableTelemetry: true });

  const [drv, setDrv] = useState<number | null>(null);
  const [lap, setLap] = useState<number | null>(null);

  const driverByNum = useMemo(() => new Map(drivers.map((d) => [d.number, d])), [drivers]);

  // Defaults derived during render (no effects): first driver with real
  // telemetry, else first driver; latest lap of the selected driver.
  const selDrv =
    drv ?? drivers.find((d) => telemetry.some((p) => p.driver === d.number))?.number ?? drivers[0]?.number ?? null;
  const driverLaps = useMemo(() => (selDrv != null ? (laps.get(selDrv) ?? []) : []), [laps, selDrv]);
  const selLap =
    lap != null && driverLaps.some((l) => l.lap === lap)
      ? lap
      : (driverLaps[driverLaps.length - 1]?.lap ?? null);

  const points = useMemo(
    () =>
      selDrv == null
        ? []
        : telemetry
            .filter((p) => p.driver === selDrv)
            .map((p) => ({ t: Date.parse(p.time), p }))
            .filter((s) => Number.isFinite(s.t))
            .map((s) => s.p),
    [telemetry, selDrv],
  );

  const series = useMemo(() => {
    const mk = (get: (p: (typeof points)[number]) => number | null): Sample[] =>
      points.map((p) => ({ t: Date.parse(p.time), v: get(p) }));
    return {
      speed: mk((p) => p.speed),
      throttle: mk((p) => p.throttle),
      brake: mk((p) => p.brake),
      gear: mk((p) => {
        const g = p.gear == null ? NaN : parseInt(p.gear, 10);
        return Number.isFinite(g) ? g : null;
      }),
      drs: mk((p) => (p.drsOpen ? 1 : 0)),
    };
  }, [points]);

  const lapEntry = useMemo(
    () => driverLaps.find((l) => l.lap === selLap) ?? null,
    [driverLaps, selLap],
  );

  const selectDriver = (n: number) => {
    setDrv(n);
    onSelectDriver?.(n);
  };

  const head = (
    <div className="rcx-head">
      <h2 className="rcx-title"><Activity aria-hidden="true" />{t("rcx_tel_title")}</h2>
      {info?.isLive && <span className="badge live"><span className="dot" aria-hidden="true" />LIVE</span>}
    </div>
  );

  if (state === "loading" || state === "idle") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_tel_title")}>
        {head}
        <Skeleton h={180} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_tel_title")}>
        {head}
        <ErrorState onRetry={refresh} message={error ? `${t("rcx_error")}: ${error.message}` : t("rcx_error")} />
      </section>
    );
  }

  // Honest empty state: car_data exists only on live sessions (paid plan).
  if (!telemetryAvailable) {
    return (
      <section className="card rcx-panel" aria-label={t("rcx_tel_title")}>
        {head}
        <div className="rcx-note" role="note">
          <Info aria-hidden="true" />
          <span><b>{t("rcx_tel_no_tel_title")}.</b> {t("rcx_tel_no_tel_body")}</span>
        </div>
      </section>
    );
  }

  const drvEntry = selDrv != null ? driverByNum.get(selDrv) : undefined;
  const teamColour = drvEntry?.teamColour ?? "#e10600";

  return (
    <section className="card rcx-panel" aria-label={t("rcx_tel_title")}>
      {head}

      <div className="rcx-row">
        <label className="rcx-field">
          <span>{t("rcx_tel_driver")}</span>
          <select
            className="rcx-select"
            value={selDrv ?? ""}
            onChange={(e) => selectDriver(Number(e.target.value))}
            aria-label={t("rcx_tel_driver")}
          >
            {drivers.map((d) => (
              <option key={d.number} value={d.number}>
                {d.acronym} — {d.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="rcx-field">
          <span>{t("rcx_tel_lap")}</span>
          <select
            className="rcx-select"
            value={selLap ?? ""}
            onChange={(e) => setLap(Number(e.target.value))}
            aria-label={t("rcx_tel_lap")}
            disabled={driverLaps.length === 0}
          >
            {driverLaps.map((l) => (
              <option key={l.lap} value={l.lap}>
                {t("rcx_tel_lap")} {l.lap} — {fmtLapTime(l.duration, t("rcx_nd"))}
                {l.isPersonalBest ? ` (${t("rcx_tel_pb")})` : ""}
              </option>
            ))}
          </select>
        </label>
        {lapEntry && (
          <div className="rcx-lapcard" aria-label={`${t("rcx_tel_lap")} ${lapEntry.lap}`}>
            <span><b className="num">{fmtLapTime(lapEntry.duration, t("rcx_nd"))}</b></span>
            <span className="rcx-caption">S1 {fmtLapTime(lapEntry.s1, t("rcx_nd"))}</span>
            <span className="rcx-caption">S2 {fmtLapTime(lapEntry.s2, t("rcx_nd"))}</span>
            <span className="rcx-caption">S3 {fmtLapTime(lapEntry.s3, t("rcx_nd"))}</span>
            {lapEntry.isPersonalBest && <span className="badge accent">{t("rcx_tel_pb")}</span>}
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <div className="rcx-note" role="note"><Info aria-hidden="true" />{t("rcx_tel_no_driver_data")}</div>
      ) : (
        <>
          <TelemetryChart title={t("rcx_tel_speed")} unit="km/h" color={teamColour} values={series.speed} formatY={(v) => v.toFixed(0)} lang={lang} emptyLabel={t("rcx_nd")} />
          <TelemetryChart title={t("rcx_tel_throttle")} unit="%" color="#22c55e" values={series.throttle} formatY={(v) => v.toFixed(0)} yDomain={[0, 100]} lang={lang} emptyLabel={t("rcx_nd")} />
          <TelemetryChart title={t("rcx_tel_brake")} unit="%" color="#ef4444" values={series.brake} formatY={(v) => v.toFixed(0)} yDomain={[0, 100]} lang={lang} emptyLabel={t("rcx_nd")} />
          <TelemetryChart title={t("rcx_tel_gear")} unit="" color="#a855f7" values={series.gear} formatY={(v) => v.toFixed(0)} step yDomain={[1, 8]} lang={lang} emptyLabel={t("rcx_nd")} />
          <TelemetryChart
            title={t("rcx_tel_drs")}
            unit=""
            color="#eab308"
            values={series.drs}
            formatY={(v) => (v >= 0.5 ? t("rcx_tel_drs_open") : t("rcx_tel_drs_closed"))}
            step
            yDomain={[0, 1]}
            lang={lang}
            emptyLabel={t("rcx_nd")}
          />
          <p className="rcx-caption">{t("rcx_tel_live_trace")} · {t("rcx_tel_lap_window_note")}</p>
        </>
      )}
    </section>
  );
}
