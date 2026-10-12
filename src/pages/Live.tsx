/* Race Center — session browser + live/replay orchestration.
   Data comes exclusively from useRaceCenterSession (OpenF1, honest states:
   needsSubscription is shown as-is, never simulated; missing data -> n/d).
   Owned by the race-center core agent. */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { findLiveSession, type OFSession } from "../api/openf1";
import { useRaceCenterSession } from "../api/openf1live";
import { useSettings } from "../store/settings";
import type { DictKey } from "../i18n/dict";
import { Badge, PageHeader, fmtDateTime } from "../components/ui";
import { MButton, MEmptyState, MErrorState, MIcon, MSkeleton, MTabs, type MIconName } from "../design";
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

const MOBILE_TABS: { id: MobileTab; key: DictKey; icon: MIconName }[] = [
  { id: "timing", key: "rc_tab_timing", icon: "timer" },
  { id: "map", key: "rc_tab_map", icon: "map" },
  { id: "events", key: "rc_tab_events", icon: "format_list_numbered" },
  { id: "tyres", key: "rc_tab_tyres", icon: "layers" },
  { id: "replay", key: "rc_tab_replay", icon: "history" },
  { id: "radio", key: "rc_tab_radio", icon: "radio" },
  { id: "weather", key: "rc_tab_weather", icon: "thermometer" },
  { id: "driver", key: "rc_tab_driver", icon: "person" },
  { id: "more", key: "rc_tab_more", icon: "more_horiz" },
];

const PANEL_TABS: { id: PanelTab; key: DictKey; icon: MIconName }[] = [
  { id: "events", key: "rc_tab_events", icon: "format_list_numbered" },
  { id: "map", key: "rc_tab_map", icon: "map" },
  { id: "strategy", key: "rc_tab_tyres", icon: "layers" },
  { id: "pits", key: "rc_pit_timeline", icon: "build" },
  { id: "laps", key: "rc_lap_timing", icon: "timer" },
  { id: "telemetry", key: "rc_tab_telemetry", icon: "activity_zone" },
  { id: "radio", key: "rc_tab_radio", icon: "radio" },
  { id: "replay", key: "rc_tab_replay", icon: "history" },
  { id: "compare", key: "rc_tab_compare", icon: "compare_arrows" },
];

function AdvFallback() {
  return (
    <div style={{ display: "grid", gap: 10, padding: "8px 0" }} aria-busy="true">
      <MSkeleton height={220} />
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
              <span className="rc-stale"><MIcon name="warning" size={13} />{t("rc_stale")}</span>
            )}
            <MButton variant="outlined" small icon="refresh" onClick={rc.refresh} aria-label={t("refresh")}>
              {t("refresh")}
            </MButton>
            <MButton variant="outlined" small icon="arrow_back" onClick={backToBrowser}>
              {t("rc_choose_session")}
            </MButton>
          </span>
        }
      />

      <FlagBanner status={rc.trackStatus} />

      {rc.state === "loading" && (
        <div className="rc-tower" aria-busy="true" style={{ marginTop: 14 }}>
          <div className="rc-tower-head"><h3><MIcon name="timer" />{t("live_positions")}</h3></div>
          <div style={{ padding: 16, display: "grid", gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => <MSkeleton key={i} height={30} />)}
          </div>
        </div>
      )}

      {rc.state === "needsSubscription" && (
        <div className="rc-needs">
          <div className="ic"><MIcon name="credit_card" size={26} /></div>
          <h2>{t("rc_needs_sub_title")}</h2>
          <p>{t("rc_needs_sub_body")}</p>
          <MButton variant="filled" onClick={backToBrowser}>{t("rc_browse_replay")}</MButton>
        </div>
      )}

      {rc.state === "error" && (
        <MErrorState onRetry={rc.refresh} />
      )}

      {(rc.state === "ready" || rc.state === "live") && info && (info.state === "upcoming" || info.state === "scheduled") && (
        <MEmptyState
          icon="timer"
          title={t("rc_state_upcoming")}
          body={`${info.normalizedName} · ${fmtDateTime(new Date(info.startUtc), lang)}`}
        />
      )}

      {(rc.state === "ready" || rc.state === "live") && info && (info.state === "completed" || info.state === "live") && (
        mobile ? (
          /* ------------------------- mobile tab layout ------------------------- */
          <div style={{ marginTop: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <MTabs
                tabs={MOBILE_TABS.map((tb) => ({ key: tb.id, label: t(tb.key), icon: tb.icon }))}
                value={mtab}
                onChange={(k) => setMtab(k as MobileTab)}
                variant="secondary"
                ariaLabel={t("nav_live")}
              />
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
              <div style={{ marginBottom: 12 }}>
                <MTabs
                  tabs={PANEL_TABS.map((tb) => ({ key: tb.id, label: t(tb.key), icon: tb.icon }))}
                  value={panel}
                  onChange={(k) => setPanel(k as PanelTab)}
                  variant="secondary"
                  ariaLabel={t("rc_unified_timeline")}
                />
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

      {/* Driver detail: M3 bottom sheet (mobile + desktop), portaled by the design system */}
      {selDriver != null && mtab !== "driver" && (
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
