/* Race Center core — session browser: season -> meeting -> session picker
   with live/upcoming/completed states and deep-link selection. OpenF1 has
   data from 2023. Owned by the race-center core agent. */
import { useMemo, useState } from "react";
import { CalendarClock, ChevronDown, History } from "lucide-react";
import { normalizeSessionName, openf1, sessionState, type OFSession } from "../../api/openf1";
import { useApi } from "../../hooks/useApi";
import { useSettings } from "../../store/settings";
import { Badge } from "../ui";
import { SeasonSelect } from "../SeasonSelect";
import { fmtTime } from "./core-shared";
import "./core.css";

interface MeetingGroup {
  key: number;
  name: string;
  location: string;
  countryCode: string;
  year: number;
  firstStart: string;
  sessions: OFSession[];
}

function groupSessions(sessions: OFSession[]): MeetingGroup[] {
  const map = new Map<number, MeetingGroup>();
  for (const s of sessions) {
    let g = map.get(s.meeting_key);
    if (!g) {
      g = {
        key: s.meeting_key,
        name: s.location,
        location: s.circuit_short_name,
        countryCode: s.country_code,
        year: s.year,
        firstStart: s.date_start,
        sessions: [],
      };
      map.set(s.meeting_key, g);
    }
    g.sessions.push(s);
    if (s.date_start < g.firstStart) g.firstStart = s.date_start;
  }
  const groups = [...map.values()];
  for (const g of groups) g.sessions.sort((a, b) => (a.date_start < b.date_start ? -1 : 1));
  groups.sort((a, b) => (a.firstStart > b.firstStart ? -1 : 1));
  return groups;
}

const SESSION_ORDER = ["Practice 1", "Practice 2", "Practice 3", "Sprint Qualifying", "Sprint", "Qualifying", "Race"];

function sessionRank(name: string): number {
  const i = SESSION_ORDER.indexOf(name);
  return i === -1 ? 99 : i;
}

function StateDot({ s }: { s: OFSession }) {
  const st = sessionState(s);
  return <span className={`rc-dot ${st}`} aria-hidden="true" />;
}

export function SessionStateBadge({ s, live }: { s: OFSession; live: boolean }) {
  const { t } = useSettings();
  if (live) return <Badge kind="live">LIVE</Badge>;
  const st = sessionState(s);
  if (st === "completed") return <Badge kind="done">{t("rc_state_replay")}</Badge>;
  if (st === "upcoming" || st === "scheduled") return <Badge kind="warn">{t("rc_state_upcoming")}</Badge>;
  return null;
}

interface Props {
  onSelect: (sessionKey: number) => void;
  liveSession: OFSession | null;
  defaultYear: string;
}

export function SessionBrowser({ onSelect, liveSession, defaultYear }: Props) {
  const { t, lang } = useSettings();
  const [year, setYear] = useState(defaultYear);
  const [openMeetings, setOpenMeetings] = useState<Set<number>>(new Set());

  const { status, data: sessions } = useApi(() => openf1.sessions({ year: parseInt(year, 10) }), [year]);
  const groups = useMemo(() => (sessions ? groupSessions(sessions) : []), [sessions]);
  const yearNum = parseInt(year, 10);
  const tooOld = Number.isFinite(yearNum) && yearNum < 2023;

  // Auto-expand the meeting that holds the live session (or the first one).
  const toggle = (key: number) =>
    setOpenMeetings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const isOpen = (g: MeetingGroup) =>
    openMeetings.has(g.key) || (liveSession != null && g.key === liveSession.meeting_key);

  return (
    <div className="rc-browser">
      {liveSession && (
        <div className="rc-live-card">
          <span className="rc-dot live" aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <p className="ttl">{t("rc_live_now")}</p>
            <p className="sub">
              {normalizeSessionName(liveSession.session_name)} · {liveSession.location} ·{" "}
              {fmtTime(new Date(liveSession.date_start), lang)}
            </p>
          </div>
          <button className="btn" onClick={() => onSelect(liveSession.session_key)}>
            {t("rc_watch_live")}
          </button>
        </div>
      )}

      {!liveSession && (
        <div className="rc-panel">
          <div className="rc-panel-body" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <CalendarClock size={18} aria-hidden="true" style={{ color: "var(--text-3)", flex: "0 0 auto" }} />
            <p className="small muted" style={{ margin: 0 }}>{t("rc_no_live_body")}</p>
          </div>
        </div>
      )}

      <div className="rc-panel">
        <div className="rc-panel-head">
          <h3><History aria-hidden="true" />{t("rc_choose_session")}</h3>
          <span style={{ marginLeft: "auto" }}>
            <SeasonSelect value={year} onChange={setYear} />
          </span>
        </div>
        <div className="rc-panel-body">
          {tooOld && (
            <p className="rc-note" style={{ margin: "0 0 10px" }}>
              <CalendarClock aria-hidden="true" />{t("rc_openf1_note")}
            </p>
          )}
          {status === "loading" && <p className="rc-nd">{t("loading")}</p>}
          {status === "error" && <p className="rc-nd">{t("error_body")}</p>}
          {status === "ok" && !tooOld && groups.length === 0 && <p className="rc-nd">{t("rc_no_sessions")}</p>}
          {status === "ok" && !tooOld && groups.map((g) => {
            const open = isOpen(g);
            return (
              <div className="rc-meeting" key={g.key} style={{ marginBottom: 8 }}>
                <button className={`rc-meeting-head${open ? " open" : ""}`} onClick={() => toggle(g.key)} aria-expanded={open}>
                  <span className="nat">{g.countryCode}</span>
                  <span>{g.name} {t("rc_meeting")}</span>
                  <span className="small muted" style={{ fontWeight: 400 }}>{g.location}</span>
                  <ChevronDown size={16} className="chev" aria-hidden="true" />
                </button>
                {open && [...g.sessions].sort((a, b) => sessionRank(a.session_name) - sessionRank(b.session_name)).map((s) => {
                  const isLive = liveSession?.session_key === s.session_key;
                  return (
                    <button className="rc-session-row" key={s.session_key} onClick={() => onSelect(s.session_key)}>
                      <StateDot s={s} />
                      <span className="nm">{normalizeSessionName(s.session_name)}</span>
                      <span className="dt">{fmtTime(new Date(s.date_start), lang)}</span>
                      <SessionStateBadge s={s} live={isLive} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
