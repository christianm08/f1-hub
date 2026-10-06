/* Race Center — session browser + live/replay orchestration.
   Data comes exclusively from useRaceCenterSession (OpenF1, honest states:
   needsSubscription is shown as-is, never simulated; missing data -> n/d).
   Owned by the race-center core agent. */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft, CloudSun, CreditCard, Gauge, History, Layers, ListOrdered, Map as MapIcon,
  MoreHorizontal, Radio as RadioIcon, RefreshCw, Scale, Timer, TriangleAlert, User, Wrench,
} from "lucide-react";
import { findLiveSession, type OFSession } from "../api/openf1";
import { useRaceCenterSession } from "../api/openf1live";
import { useSettings } from "../store/settings";
import { Badge, EmptyState, ErrorState, PageHeader, Skeleton, fmtDateTime } from "../components/ui";
import { FlagBanner } from "../components/racecenter/core-FlagBanner";
import { TimingTower } from "../components/racecenter/core-TimingTower";
import { WeatherPanel } from "../components/racecenter/core-Weather";
import { RaceControlPanel } from "../components/racecenter/core-RaceControl";
import { PitTimeline, StrategyView } from "../components/racecenter/core-Pits";
import { LapTiming } from "../components/racecenter/core-Laps";
import { UnifiedTimeline } from "../components/racecenter/core-UnifiedTimeline";
import { DriverPanel } from "../components/racecenter/core-DriverPanel";
import { SessionBrowser } from "../components/racecenter/core-SessionBrowser";
import { useIsMobile } from "../components/racecenter/core-shared";
import "../components/racecenter/core.css";

// Advanced panels (lazy: mounted only when their tab is active, to save API budget)
const CircuitMapPanel = lazy(() => import("../components/racecenter/CircuitMapPanel").then((m) => ({ default: m.CircuitMapPanel })));
const TelemetryPanel = lazy(() => import("../components/racecenter/TelemetryPanel").then((m) => ({ default: m.TelemetryPanel })));
const TeamRadioPanel = lazy(() => import("../components/racecenter/TeamRadioPanel").then((m) => ({ default: m.TeamRadioPanel })));
const ReplayPanel = lazy(() => import("../components/racecenter/ReplayPanel").then((m) => ({ default: m.ReplayPanel })));
const ComparePanel = lazy(() => import("../components/racecenter/ComparePanel").then((m) => ({ default: m.ComparePanel })));

type PanelTab = "events" | "strategy" | "pits" | "laps" | "map" | "telemetry" | "radio" | "replay" | "compare";
type MobileTab = "timing" | "map" | "events" | "tyres" | "replay" | "radio" | "weather" | "driver" | "more";

function AdvFallback() {
  return (
    <div style={{ display: "grid", gap: 10, padding: "8px 0" }} aria-busy="true">
      <Skeleton h={220} />
    </div>
  );
}

function initialKey(params: URLSearchParams): number | null {
  const q = params.get("session");
  const n = q ? parseInt(q, 10) : NaN;
  return Number.isFinite(n) ? n : null;
}

export default function Live() {
  const { t, lang } = useSettings();
  const [params, setParams] = useSearchParams();
  const [sessionKey, setSessionKey] = useState<number | null>(() => initialKey(params));
  const [liveFound, setLiveFound] = useState<OFSession | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [selDriver, setSelDriver] = useState<number | null>(null);
  const [panel, setPanel] = useState<PanelTab>("events");
  const [mtab, setMtab] = useState<MobileTab>("timing");
  const mobile = useIsMobile(1099);

  // Keep the session in sync with the ?session= deep link: in-app hash
  // navigation (e.g. "Apri nel Race Center" from a GP page) must switch
  // sessions without a full remount.
  const paramKey = initialKey(params);
  useEffect(() => {
    if (paramKey !== sessionKey) {
      setSelDriver(null);
      setSessionKey(paramKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  // Live detection: auto-enter the live session unless a deep link picked one.
  useEffect(() => {
    let cancelled = false;
    findLiveSession()
      .then(({ live }) => {
        if (cancelled) return;
        setLiveFound(live);
        if (live && initialKey(params) == null) {
          setSessionKey(live.session_key);
          setParams({ session: String(live.session_key) }, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDetecting(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (key: number) => {
    setSelDriver(null);
    setSessionKey(key);
    setParams({ session: String(key) }, { replace: true });
  };
  const backToBrowser = () => {
    setSelDriver(null);
    setSessionKey(null);
    setParams({}, { replace: true });
  };

  const rc = useRaceCenterSession(sessionKey);
  const info = rc.info;
  const isLive = rc.state === "live";

  const totalLaps = useMemo(() => {
    let m = 0;
    for (const list of rc.laps.values()) for (const l of list) if (l.lap > m) m = l.lap;
    return m || null;
  }, [rc.laps]);

  /* ------------------------------ browser ------------------------------ */
  if (sessionKey == null) {
    return (
      <div>
        <PageHeader title={t("nav_live")} sub={detecting ? t("loading") : undefined} />
        <SessionBrowser
          onSelect={select}
          liveSession={liveFound}
          defaultYear={String(new Date().getFullYear())}
        />
      </div>
    );
  }

  /* ------------------------------ session ------------------------------ */
  const title = info ? `${info.normalizedName}` : t("nav_live");
  const sub = info
    ? `${info.meetingName} · ${info.circuitName} · ${fmtDateTime(new Date(info.startUtc), lang)}`
    : undefined;

  return (
    <div className="rc-wrap">
      <PageHeader
        title={title}
        sub={sub}
        right={
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {rc.state === "live" && <Badge kind="live">LIVE</Badge>}
            {rc.state === "ready" && info?.state === "completed" && <Badge kind="done">{t("rc_state_replay")}</Badge>}
            {rc.state === "ready" && (info?.state === "upcoming" || info?.state === "scheduled") && (
              <Badge kind="warn">{t("rc_state_upcoming")}</Badge>
            )}
            {rc.stale && (
              <span className="rc-stale"><TriangleAlert aria-hidden="true" />{t("rc_stale")}</span>
            )}
            <button className="btn ghost small" onClick={rc.refresh} aria-label={t("refresh")}>
              <RefreshCw size={14} aria-hidden="true" />{t("refresh")}
            </button>
            <button className="btn ghost small" onClick={backToBrowser}>
              <ArrowLeft size={14} aria-hidden="true" />{t("rc_choose_session")}
            </button>
          </span>
        }
      />

      <FlagBanner status={rc.trackStatus} />

      {rc.state === "loading" && (
        <div className="rc-tower" aria-busy="true" style={{ marginTop: 14 }}>
          <div className="rc-tower-head"><h3><Timer aria-hidden="true" />{t("live_positions")}</h3></div>
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} h={30} />)}
          </div>
        </div>
      )}

      {rc.state === "needsSubscription" && (
        <div className="rc-needs">
          <div className="ic"><CreditCard aria-hidden="true" /></div>
          <h2>{t("rc_needs_sub_title")}</h2>
          <p>{t("rc_needs_sub_body")}</p>
          <button className="btn primary" onClick={backToBrowser}>{t("rc_browse_replay")}</button>
        </div>
      )}

      {rc.state === "error" && (
        <ErrorState onRetry={rc.refresh} />
      )}

      {(rc.state === "ready" || rc.state === "live") && info && (info.state === "upcoming" || info.state === "scheduled") && (
        <EmptyState
          icon={<Timer aria-hidden="true" />}
          title={t("rc_state_upcoming")}
          body={`${info.normalizedName} · ${fmtDateTime(new Date(info.startUtc), lang)}`}
        />
      )}

      {(rc.state === "ready" || rc.state === "live") && info && (info.state === "completed" || info.state === "live") && (
        mobile ? (
          /* ------------------------- mobile tab layout ------------------------- */
          <div style={{ marginTop: 12 }}>
            <div className="rc-tabs" role="tablist" aria-label={t("nav_live")}>
              {(
                [
                  { id: "timing", key: "rc_tab_timing", icon: <Timer aria-hidden="true" /> },
                  { id: "map", key: "rc_tab_map", icon: <MapIcon aria-hidden="true" /> },
                  { id: "events", key: "rc_tab_events", icon: <ListOrdered aria-hidden="true" /> },
                  { id: "tyres", key: "rc_tab_tyres", icon: <Layers aria-hidden="true" /> },
                  { id: "replay", key: "rc_tab_replay", icon: <History aria-hidden="true" /> },
                  { id: "radio", key: "rc_tab_radio", icon: <RadioIcon aria-hidden="true" /> },
                  { id: "weather", key: "rc_tab_weather", icon: <CloudSun aria-hidden="true" /> },
                  { id: "driver", key: "rc_tab_driver", icon: <User aria-hidden="true" /> },
                  { id: "more", key: "rc_tab_more", icon: <MoreHorizontal aria-hidden="true" /> },
                ] as { id: MobileTab; key: "rc_tab_timing" | "rc_tab_map" | "rc_tab_events" | "rc_tab_tyres" | "rc_tab_replay" | "rc_tab_radio" | "rc_tab_weather" | "rc_tab_driver" | "rc_tab_more"; icon: ReactNode }[]
              ).map((tb) => (
                <button key={tb.id} role="tab" aria-selected={mtab === tb.id}
                  className={`rc-tab${mtab === tb.id ? " on" : ""}`} onClick={() => setMtab(tb.id)}>
                  {tb.icon}{t(tb.key)}
                </button>
              ))}
            </div>

            {mtab === "timing" && (
              <TimingTower timing={rc.timing} drivers={rc.drivers} selected={selDriver} onSelect={setSelDriver} />
            )}
            {mtab === "map" && (
              <Suspense fallback={<AdvFallback />}>
                <CircuitMapPanel sessionKey={sessionKey} onSelectDriver={setSelDriver} />
              </Suspense>
            )}
            {mtab === "events" && (
              <div style={{ display: "grid", gap: 14 }}>
                <UnifiedTimeline raceControl={rc.raceControl} pits={rc.pits} overtakes={rc.overtakes} laps={rc.laps} drivers={rc.drivers} />
                <RaceControlPanel events={rc.raceControl} drivers={rc.drivers} live={isLive} />
              </div>
            )}
            {mtab === "tyres" && (
              <div style={{ display: "grid", gap: 14 }}>
                <StrategyView stints={rc.stints} timing={rc.timing} drivers={rc.drivers} totalLaps={totalLaps} />
                <PitTimeline pits={rc.pits} drivers={rc.drivers} />
              </div>
            )}
            {mtab === "replay" && (
              <Suspense fallback={<AdvFallback />}>
                <ReplayPanel sessionKey={sessionKey} onSelectDriver={setSelDriver} />
              </Suspense>
            )}
            {mtab === "radio" && (
              <Suspense fallback={<AdvFallback />}>
                <TeamRadioPanel sessionKey={sessionKey} />
              </Suspense>
            )}
            {mtab === "weather" && (
              <WeatherPanel latest={rc.weather.latest} series={rc.weather.series} hasWeather={rc.dataQuality.hasWeather} />
            )}
            {mtab === "driver" && (
              <DriverPanel inline number={selDriver} onClose={() => setSelDriver(null)}
                timing={rc.timing} drivers={rc.drivers} laps={rc.laps} stints={rc.stints} pits={rc.pits} />
            )}
            {mtab === "more" && (
              <div style={{ display: "grid", gap: 14 }}>
                <Suspense fallback={<AdvFallback />}>
                  <TelemetryPanel sessionKey={sessionKey} />
                </Suspense>
                <Suspense fallback={<AdvFallback />}>
                  <ComparePanel sessionKey={sessionKey} />
                </Suspense>
              </div>
            )}
          </div>
        ) : (
          /* ------------------------- desktop grid layout ------------------------- */
          <div className="rc-shell" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
              <TimingTower timing={rc.timing} drivers={rc.drivers} selected={selDriver} onSelect={setSelDriver} />
              <div className="rc-tabs" role="tablist" aria-label={t("rc_unified_timeline")}>
                {(
                  [
                    { id: "events", key: "rc_tab_events", icon: <ListOrdered aria-hidden="true" /> },
                    { id: "map", key: "rc_tab_map", icon: <MapIcon aria-hidden="true" /> },
                    { id: "strategy", key: "rc_tab_tyres", icon: <Layers aria-hidden="true" /> },
                    { id: "pits", key: "rc_pit_timeline", icon: <Wrench aria-hidden="true" /> },
                    { id: "laps", key: "rc_lap_timing", icon: <Timer aria-hidden="true" /> },
                    { id: "telemetry", key: "rc_tab_telemetry", icon: <Gauge aria-hidden="true" /> },
                    { id: "radio", key: "rc_tab_radio", icon: <RadioIcon aria-hidden="true" /> },
                    { id: "replay", key: "rc_tab_replay", icon: <History aria-hidden="true" /> },
                    { id: "compare", key: "rc_tab_compare", icon: <Scale aria-hidden="true" /> },
                  ] as { id: PanelTab; key: "rc_tab_events" | "rc_tab_map" | "rc_tab_tyres" | "rc_pit_timeline" | "rc_lap_timing" | "rc_tab_telemetry" | "rc_tab_radio" | "rc_tab_replay" | "rc_tab_compare"; icon: ReactNode }[]
                ).map((tb) => (
                  <button key={tb.id} role="tab" aria-selected={panel === tb.id}
                    className={`rc-tab${panel === tb.id ? " on" : ""}`} onClick={() => setPanel(tb.id)}>
                    {tb.icon}{t(tb.key)}
                  </button>
                ))}
              </div>
              {panel === "events" && (
                <UnifiedTimeline raceControl={rc.raceControl} pits={rc.pits} overtakes={rc.overtakes} laps={rc.laps} drivers={rc.drivers} />
              )}
              {panel === "strategy" && (
                <StrategyView stints={rc.stints} timing={rc.timing} drivers={rc.drivers} totalLaps={totalLaps} />
              )}
              {panel === "pits" && (
                <PitTimeline pits={rc.pits} drivers={rc.drivers} />
              )}
              {panel === "laps" && (
                <LapTiming laps={rc.laps} timing={rc.timing} drivers={rc.drivers} selected={selDriver} onSelect={setSelDriver} />
              )}
              {panel === "map" && (
                <Suspense fallback={<AdvFallback />}>
                  <CircuitMapPanel sessionKey={sessionKey} onSelectDriver={setSelDriver} />
                </Suspense>
              )}
              {panel === "telemetry" && (
                <Suspense fallback={<AdvFallback />}>
                  <TelemetryPanel sessionKey={sessionKey} />
                </Suspense>
              )}
              {panel === "radio" && (
                <Suspense fallback={<AdvFallback />}>
                  <TeamRadioPanel sessionKey={sessionKey} />
                </Suspense>
              )}
              {panel === "replay" && (
                <Suspense fallback={<AdvFallback />}>
                  <ReplayPanel sessionKey={sessionKey} onSelectDriver={setSelDriver} />
                </Suspense>
              )}
              {panel === "compare" && (
                <Suspense fallback={<AdvFallback />}>
                  <ComparePanel sessionKey={sessionKey} />
                </Suspense>
              )}
            </div>
            <div className="rc-side">
              <WeatherPanel latest={rc.weather.latest} series={rc.weather.series} hasWeather={rc.dataQuality.hasWeather} />
              <RaceControlPanel events={rc.raceControl} drivers={rc.drivers} live={isLive} />
            </div>
          </div>
        )
      )}

      {/* Driver detail: side panel (desktop) / bottom sheet (mobile) */}
      {!mobile && (
        <DriverPanel number={selDriver} onClose={() => setSelDriver(null)}
          timing={rc.timing} drivers={rc.drivers} laps={rc.laps} stints={rc.stints} pits={rc.pits} />
      )}
      {mobile && selDriver != null && mtab !== "driver" && (
        <DriverPanel number={selDriver} onClose={() => setSelDriver(null)}
          timing={rc.timing} drivers={rc.drivers} laps={rc.laps} stints={rc.stints} pits={rc.pits} />
      )}

      {rc.lastUpdated != null && (rc.state === "ready" || rc.state === "live") && (
        <p className="small muted" style={{ marginTop: 12 }}>
          {t("last_updated")}: {new Date(rc.lastUpdated).toLocaleTimeString(lang === "it" ? "it-IT" : "en-GB")}
        </p>
      )}
    </div>
  );
}
