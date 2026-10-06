/* Local it/en strings for the Race Center advanced panels.
 * Kept separate from src/i18n/dict.ts on purpose — the parent orchestrator
 * will merge these into the global dictionary during Live.tsx integration.
 */
import { useSettings } from "../../store/settings";

const STR = {
  it: {
    rcx_loading: "Caricamento dati…",
    rcx_error: "Errore nel caricamento",
    rcx_retry: "Riprova",
    rcx_nd: "n/d",
    rcx_pos: "Pos",

    rcx_map_title: "Mappa circuito",
    rcx_map_no_location:
      "Posizioni vetture non disponibili per questa sessione — tracciato statico.",
    rcx_map_fit_failed:
      "Allineamento al tracciato non riuscito — tracciato statico.",
    rcx_map_degenerate:
      "Dati di posizione non significativi (vetture ferme o dati insufficienti) — tracciato statico.",
    rcx_map_poor_quality:
      "Allineamento posizioni–tracciato non affidabile per questo circuito — tracciato statico.",
    rcx_map_toggle_positions: "Posizioni",
    rcx_map_drs_open: "DRS aperto",
    rcx_map_click_hint: "Tocca una vettura per selezionarla",
    rcx_map_play: "Riproduci",
    rcx_map_pause: "Pausa",
    rcx_map_interp_note:
      "Posizioni reali OpenF1. Tra un campione e l'altro viene applicata una interpolazione lineare (smoothing dei dati reali, non simulazione).",
    rcx_map_window_note:
      "Finestra di 12 minuti a fine sessione (i dati di posizione storici sono disponibili in finestre limitate).",

    rcx_tel_title: "Telemetria",
    rcx_tel_driver: "Pilota",
    rcx_tel_lap: "Giro",
    rcx_tel_no_tel_title: "Telemetria non disponibile",
    rcx_tel_no_tel_body:
      "Telemetria disponibile solo durante le sessioni live (piano OpenF1 a pagamento).",
    rcx_tel_speed: "Velocità",
    rcx_tel_throttle: "Acceleratore",
    rcx_tel_brake: "Freno",
    rcx_tel_gear: "Marcia",
    rcx_tel_drs: "DRS",
    rcx_tel_drs_open: "aperto",
    rcx_tel_drs_closed: "chiuso",
    rcx_tel_live_trace: "Traccia live continua",
    rcx_tel_lap_window_note:
      "La finestra temporale del singolo giro non è esposta dal modello dati: mostrata la traccia continua, con i dati del giro selezionato nel riquadro.",
    rcx_tel_no_driver_data: "Nessun dato per questo pilota",
    rcx_tel_best: "migliore",
    rcx_tel_pb: "PB",

    rcx_radio_title: "Team radio",
    rcx_radio_empty: "Nessuna radio disponibile per questa sessione.",

    rcx_replay_title: "Replay",
    rcx_replay_play: "Riproduci",
    rcx_replay_pause: "Pausa",
    rcx_replay_speed: "Velocità",
    rcx_replay_prev_event: "Evento precedente",
    rcx_replay_next_event: "Evento successivo",
    rcx_replay_final: "Finale",
    rcx_replay_partial: "Parziale",
    rcx_replay_partial_note:
      "Classifica finale mostrata come ultimo stato noto: lo stato intermedio a questo istante non è ricostruibile dai dati disponibili.",
    rcx_replay_events: "Eventi",
    rcx_replay_pits: "Pit stop",
    rcx_replay_overtakes: "Sorpassi",
    rcx_replay_no_events: "Nessun evento fino a questo istante.",
    rcx_replay_only_completed:
      "Il replay è disponibile solo per le sessioni terminate.",
    rcx_replay_tower: "Classifica",
    rcx_replay_no_map: "Mappa non disponibile per questa sessione.",

    rcx_cmp_title: "Confronto piloti",
    rcx_cmp_driver_a: "Pilota A",
    rcx_cmp_driver_b: "Pilota B",
    rcx_cmp_best_lap: "Miglior giro",
    rcx_cmp_s1: "Settore 1",
    rcx_cmp_s2: "Settore 2",
    rcx_cmp_s3: "Settore 3",
    rcx_cmp_pits: "Pit stop",
    rcx_cmp_stints: "Stint",
    rcx_cmp_lap_times: "Tempi sul giro",
    rcx_cmp_gap: "Gap cumulato (A − B)",
    rcx_cmp_gap_note:
      "Differenza cumulata dei tempi per numero di giro (approssimata: i giri sono allineati per numero, non per istante).",
    rcx_cmp_no_laps: "Dati sui giri non disponibili per questo confronto.",
    rcx_cmp_delta: "distacco",
    rcx_cmp_laps_range: "giri",
    rcx_cmp_age: "età",
  },
  en: {
    rcx_loading: "Loading data…",
    rcx_error: "Loading error",
    rcx_retry: "Retry",
    rcx_nd: "n/a",
    rcx_pos: "Pos",

    rcx_map_title: "Track map",
    rcx_map_no_location:
      "Car positions are not available for this session — static track outline.",
    rcx_map_fit_failed:
      "Track alignment failed — static track outline.",
    rcx_map_degenerate:
      "Position data not meaningful (cars stationary or insufficient data) — static track outline.",
    rcx_map_poor_quality:
      "Car-to-track alignment unreliable for this circuit — static track outline.",
    rcx_map_toggle_positions: "Positions",
    rcx_map_drs_open: "DRS open",
    rcx_map_click_hint: "Tap a car to select it",
    rcx_map_play: "Play",
    rcx_map_pause: "Pause",
    rcx_map_interp_note:
      "Real OpenF1 positions. Linear interpolation is applied between samples (smoothing of real data, not simulation).",
    rcx_map_window_note:
      "12-minute window near session end (historic position data is only available in limited windows).",

    rcx_tel_title: "Telemetry",
    rcx_tel_driver: "Driver",
    rcx_tel_lap: "Lap",
    rcx_tel_no_tel_title: "Telemetry unavailable",
    rcx_tel_no_tel_body:
      "Telemetry is only available during live sessions (paid OpenF1 plan).",
    rcx_tel_speed: "Speed",
    rcx_tel_throttle: "Throttle",
    rcx_tel_brake: "Brake",
    rcx_tel_gear: "Gear",
    rcx_tel_drs: "DRS",
    rcx_tel_drs_open: "open",
    rcx_tel_drs_closed: "closed",
    rcx_tel_live_trace: "Continuous live trace",
    rcx_tel_lap_window_note:
      "The per-lap time window is not exposed by the data model: showing the continuous trace, with the selected lap's data in the card.",
    rcx_tel_no_driver_data: "No data for this driver",
    rcx_tel_best: "best",
    rcx_tel_pb: "PB",

    rcx_radio_title: "Team radio",
    rcx_radio_empty: "No team radio available for this session.",

    rcx_replay_title: "Replay",
    rcx_replay_play: "Play",
    rcx_replay_pause: "Pause",
    rcx_replay_speed: "Speed",
    rcx_replay_prev_event: "Previous event",
    rcx_replay_next_event: "Next event",
    rcx_replay_final: "Final",
    rcx_replay_partial: "Partial",
    rcx_replay_partial_note:
      "Showing the final classification as the last known state: the intermediate state at this point cannot be reconstructed from the available data.",
    rcx_replay_events: "Events",
    rcx_replay_pits: "Pit stops",
    rcx_replay_overtakes: "Overtakes",
    rcx_replay_no_events: "No events up to this point.",
    rcx_replay_only_completed:
      "Replay is only available for completed sessions.",
    rcx_replay_tower: "Standings",
    rcx_replay_no_map: "Map not available for this session.",

    rcx_cmp_title: "Driver comparison",
    rcx_cmp_driver_a: "Driver A",
    rcx_cmp_driver_b: "Driver B",
    rcx_cmp_best_lap: "Best lap",
    rcx_cmp_s1: "Sector 1",
    rcx_cmp_s2: "Sector 2",
    rcx_cmp_s3: "Sector 3",
    rcx_cmp_pits: "Pit stops",
    rcx_cmp_stints: "Stints",
    rcx_cmp_lap_times: "Lap times",
    rcx_cmp_gap: "Cumulative gap (A − B)",
    rcx_cmp_gap_note:
      "Cumulative lap-time difference by lap number (approximate: laps are aligned by number, not by instant).",
    rcx_cmp_no_laps: "Lap data not available for this comparison.",
    rcx_cmp_delta: "delta",
    rcx_cmp_laps_range: "laps",
    rcx_cmp_age: "age",
  },
} as const;

export type AdvKey = keyof (typeof STR)["it"];

/** Local string lookup for the advanced race-center panels. */
export function useAdv(): { t: (k: AdvKey) => string; lang: "it" | "en" } {
  const { lang } = useSettings();
  const t = (k: AdvKey): string => (STR[lang][k] ?? STR.it[k] ?? k) as string;
  return { t, lang };
}

/** "83.456" -> "1:23.456"; null -> n/d (honest, never estimated). */
export function fmtLapTime(s: number | null, nd: string): string {
  if (s == null || !Number.isFinite(s) || s <= 0) return nd;
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(3).padStart(6, "0")}`;
}
