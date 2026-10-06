# OpenF1 API — Inventario tecnico (Fase 0, ricerca)

Data studio: 2026-10-06. Fonti: https://openf1.org/, https://openf1.org/docs, https://openf1.org/auth.html,
pagina di pagamento Stripe, verifiche `curl` contro `https://api.openf1.org/v1`.
Sessione di riferimento per le verifiche: **Monaco GP 2025** — `meeting_key=1261`,
`FP1=9972, FP2=9973, FP3=9974, Quali=9975, Race=9979`.

## Sintesi

- Base URL: `https://api.openf1.org/v1` — **18 endpoint**, tutti verificati con curl (esistono e restituiscono dati).
- `/v1/session_start` **NON esiste** (404) — non è documentato e non risponde.
- Storico **gratuito e senza API key dal 2023 in poi**; `meetings?year=2022` → **404**.
- **Live richiede abbonamento a pagamento**: $11.58/mese (~€9,90 + 4% conversione). Senza token, i dati sono
  accessibili solo fuori dalla finestra live (da 30 min prima dell'inizio a 30 min dopo la fine della sessione).
- Ritardo dati live dichiarato: ~3 secondi (più veloce della TV).
- Rate limit gratuiti: **3 req/s, 30 req/min** (documentati; nessun header di rate limit esposto nelle risposte).
  Piano a pagamento: 6 req/s, 60 req/min + MQTT/WebSocket (10 connessioni concorrenti).
- Formati: JSON (default), CSV con `csv=true`.
- Filtri: qualsiasi attributo scalare (non array), operatori `= < <= > >=`, parametri ripetuti = OR,
  date in formati flessibili (stile `dateutil`).
- **404 `{"detail":"No results found."}` = insieme vuoto, non errore.** Es: `intervals` su FP1 → 404,
  `starting_grid` con session_key della gara → 404, filtri data senza match → 404. L'app deve trattare il 404 come "vuoto".

## Endpoint (tutti verificati)

| # | Path | Cosa restituisce (campi reali osservati) | Esempio curl verificato | Note |
|---|------|------------------------------------------|-------------------------|------|
| 1 | `/v1/car_data` | Telemetria ~3.7 Hz: `brake` (0/100), `date`, `driver_number`, `drs` (0,1,2,3,8,9,10,12,14 — vedi mapping docs), `meeting_key`, `n_gear` (0–8), `rpm`, `session_key`, `speed` (km/h), `throttle` (%) | `car_data?session_key=9979&driver_number=4&date>2025-05-25T13:00:00&date<2025-05-25T13:00:05` → 200, 16 righe | **Sempre filtrare per finestra temporale**: una gara intera = centinaia di migliaia di righe. ~3.2–3.5 Hz osservati |
| 2 | `/v1/championship_drivers` | (beta) Classifica piloti, solo gare: `driver_number`, `meeting_key`, `points_current`, `points_start` (float), `position_current`, `position_start`, `session_key` | `championship_drivers?session_key=9979&driver_number=4` → 200 (pos 2, 133.0→158.0 pts) | "current" dipende dal momento della chiamata durante la gara |
| 3 | `/v1/championship_teams` | (beta) Classifica team, solo gare: `meeting_key`, `points_current`, `points_start`, `position_current`, `position_start`, `session_key`, `team_name` | `championship_teams?session_key=9979&team_name=McLaren` → 200 (P1, 279→319 pts) | Come sopra |
| 4 | `/v1/drivers` | `broadcast_name`, `driver_number`, `first_name`, `full_name`, `headshot_url`, `last_name`, `meeting_key`, `name_acronym`, `session_key`, `team_colour` (hex), `team_name` | `drivers?session_key=9979&driver_number=4` → 200, 20 piloti | `headshot_url` per i piloti 2025 restituisce un'**immagine fallback** di formula1.com (non la foto reale). `country_code` deprecato (rimosso a fine 2026) |
| 5 | `/v1/intervals` | **Solo gare.** `date`, `driver_number`, `gap_to_leader` (s o `+1 LAP` o null per il leader), `interval` (gap a chi precede), `meeting_key`, `session_key`. Update ~ogni 4 s (dichiarato) | `intervals?session_key=9979&driver_number=4` → 200, 793 righe | `intervals?session_key=9972` (FP1) → **404**. Dati radi, non continui |
| 6 | `/v1/laps` | `date_start`, `driver_number`, `duration_sector_1/2/3`, `i1_speed`, `i2_speed`, `is_pit_out_lap`, `lap_duration`, `lap_number`, `meeting_key`, `segments_sector_1/2/3` (mini-settori: 2048 giallo, 2049 verde, 2051 viola, 2064 pitlane), `session_key`, `st_speed` | `laps?session_key=9979&driver_number=4&lap_number<=3` → 200 | **I segmenti SONO presenti nei giri di gara 2025** (docs dicono il contrario — docs obsoleti). Filtri `<=`/`>=` funzionanti |
| 7 | `/v1/location` | Posizione ~3.7 Hz: `date`, `driver_number`, `meeting_key`, `session_key`, `x`, `y`, `z` (interi) | `location?session_key=9979&driver_number=4&date>...&date<...+2s` → 200, 7 righe | Origine (0,0,0) **arbitraria**, unità non documentata (valori osservati ±7500 per Monaco, non corrispondono a metri del tracciato). Nessuna info laterale (destra/sinistra pista). Filtrare per finestra temporale |
| 8 | `/v1/meetings` | `circuit_image`, `circuit_info_url` (JSON MultiViewer), `circuit_key`, `circuit_short_name`, `circuit_type`, `country_code`, `country_flag`, `country_key`, `country_name`, `date_end`, `date_start`, `gmt_offset`, `is_cancelled`, `location`, `meeting_key`, `meeting_name`, `meeting_official_name`, `year` | `meetings?year=2025` → 200, 25 meeting; `meetings?year=2023` → 24; `meetings?year=2022` → 404 | Aggiornati ogni giorno a mezzanotte UTC. **BUG DATI osservato**: meeting 1308 ha `meeting_name="Bahrain Grand Prix"` ma `location="Kuala Lumpur"` (era il GP Malesia 2026) — non fidarsi ciecamente di `meeting_name` |
| 9 | `/v1/overtakes` | **Solo gare, può essere incompleto.** `date`, `meeting_key`, `overtaken_driver_number`, `overtaking_driver_number`, `position` (posizione dopo il sorpasso), `session_key` | `overtakes?session_key=9979` → 200, 188 sorpassi | Include cambi posizione da pit stop e penalità |
| 10 | `/v1/pit` | `date`, `driver_number`, `lane_duration` (s in pit lane), `lap_number`, `meeting_key`, `pit_duration` (deprecato = lane_duration), `session_key`, `stop_duration` (s fermo) | `pit?session_key=9979` → 200, 40 soste | `stop_duration` disponibile **solo dal GP USA 2024 in poi** |
| 11 | `/v1/position` | `date`, `driver_number`, `meeting_key`, `position`, `session_key` — solo cambi di posizione (molto rado) | `position?session_key=9979&driver_number=4` → 200, **9 righe** per il vincitore | Non è un campionamento continuo: solo eventi di cambio posizione |
| 12 | `/v1/race_control` | `category` (`Flag`, `Other`, `Drs`, `SessionStatus`, `SafetyCar`, ...), `date`, `driver_number`, `flag` (`GREEN`, `YELLOW`, `DOUBLE YELLOW`, `BLUE`, `CHEQUERED`, `CLEAR`, ...), `lap_number`, `meeting_key`, `message`, `qualifying_phase` (1/2/3), `scope` (`Track`, `Driver`, `Sector`), `sector`, `session_key` | `race_control?session_key=9979` → 200, 198 eventi (162 Flag, 30 Other, 2 Drs, 2 SessionStatus, 2 SafetyCar) | La fonte per bandiere/SC/VSC/red flag in live timing |
| 13 | `/v1/sessions` | `circuit_key`, `circuit_short_name`, `country_code`, `country_key`, `country_name`, `date_end`, `date_start`, `gmt_offset`, `is_cancelled`, `location`, `meeting_key`, `session_key`, `session_name`, `session_type`, `year` | `sessions?meeting_key=1261` → 200, 5 sessioni | Aggiornate ogni giorno a mezzanotte UTC |
| 14 | `/v1/session_result` | Classifica finale: `dnf`, `dns`, `dsq`, `driver_number`, `duration` (miglior giro per practice/quali; **array [Q1,Q2,Q3] in qualifica**; tempo totale gara in secondi), `gap_to_leader` (s o `+N LAP(S)`; array in quali), `meeting_key`, `number_of_laps`, **`points`** (non documentato, presente nelle gare), `position`, `session_key` | `session_result?session_key=9979&position<=3` → 200 (Norris 6033.843 s, 25 pts) | Disponibile pochi minuti dopo la pubblicazione ufficiale |
| 15 | `/v1/starting_grid` | `driver_number`, `lap_duration` (giro di quali), `meeting_key`, `position`, `session_key` | `starting_grid?session_key=9975` (quali) → 200 | ⚠️ Va chiamato con la **session_key della QUALIFICA**, non della gara (`session_key=9979` → **404**) |
| 16 | `/v1/stints` | `compound` (`SOFT`/`MEDIUM`/`HARD`), `driver_number`, `lap_end`, `lap_start`, `meeting_key`, `session_key`, `stint_number`, `tyre_age_at_start` (giri) | `stints?session_key=9979&driver_number=4` → 200, 3 stint | |
| 17 | `/v1/team_radio` | `date`, `driver_number`, `meeting_key`, `recording_url` (MP3 su `livetiming.formula1.com`), `session_key` | `team_radio?session_key=9979&driver_number=4` → 200, 7 registrazioni; HEAD sull'MP3 → **200 audio/mpeg** (AmazonS3) | Selezione limitata, non tutte le comunicazioni. ⚠️ Legale: audio ospitato sulla CDN ufficiale F1; OpenF1 dichiara di non possedere i dati F1 — uso in app = zona grigia, progetto pensato per uso personale/educativo non commerciale |
| 18 | `/v1/weather` | Update ~1/min: `air_temperature` (°C), `date`, `humidity` (%), `meeting_key`, `pressure` (mbar), `rainfall` (0/1), `session_key`, `track_temperature` (°C), `wind_direction` (°), `wind_speed` (m/s) | `weather?session_key=9979` → 200, 160 righe | |

## Quirk importanti per F1 Hub

1. **`session_key=latest` / `meeting_key=latest`**: `sessions?session_key=latest` → ultima sessione con dati
   (verificato: gara Malesia 2026, key 11731). `meetings?meeting_key=latest` → meeting con key più alta
   (Bahrain GP 2026, key 1308 — ma vedi bug nome sotto). Per "sessione corrente" in live serve comunque logica lato app su `date_start`/`date_end`.
2. **Distinguere i tipi di sessione**: `session_type` ha solo 3 valori — `Practice`, `Qualifying`, `Race`.
   `session_name` è il discriminante reale: `Practice 1/2/3`, `Sprint Qualifying`, `Sprint`, `Qualifying`, `Race`.
   (Sprint → type `Race`; Sprint Qualifying → type `Qualifying`.)
3. **Session key non cronologiche**: es. Malesia 2026 = 11731, Singapore 2026 = 11388. Non ordinare per key.
4. **`meeting_name` inaffidabile in almeno un caso** (1308: nome "Bahrain GP", location "Kuala Lumpur"); usare `location` + `circuit_*` come fonte primaria.
5. **404 = vuoto**: gestire `{"detail":"No results found."}` come lista vuota, non come errore.
6. **Endpoint ad alta frequenza** (`car_data`, `location`): filtrare sempre per `driver_number` + finestra `date`, altrimenti risposte enormi.
7. **`starting_grid` vuole la sessione di qualifica**, non la gara.
8. **`session_result` contiene `points`** (non documentato) e `duration`/`gap_to_leader` come array in qualifica.
9. **Segmenti mini-settore presenti anche in gara** (docs obsoleti su questo punto).
10. **`position` è event-driven e rado** (9 eventi per il vincitore a Monaco), non un campionamento.
11. **Storico**: solo 2023+. Niente stagioni precedenti — per F1 Hub lo storico pre-2023 resta su Jolpica/f1api.dev.
12. **Live senza abbonamento = impossibile.** Prossima finestra live utile: **Singapore GP (sprint) 9–11 ott 2026** —
    FP1 ven 08:30 UTC, Sprint Quali ven 12:30 UTC, Sprint sab 09:00 UTC, Quali sab 13:00 UTC, Gara dom 12:00 UTC
    (session_key 11378/11379/11383/11384/11388).

## Piani, prezzi, autenticazione

| | Gratuito | A pagamento ("real-time data access, personal use") |
|---|---|---|
| Prezzo | €0 | **$11.58/mese** (~€9,90 + 4% fee conversione), mensile, via Stripe |
| API key | Nessuna | OAuth2: `POST https://api.openf1.org/token` (username+password, token scade dopo **1 ora**), header `Authorization: Bearer` |
| Rate limit REST | 3 req/s, 30 req/min | 6 req/s, 60 req/min |
| Dati live | ❌ (solo storico: fuori da [inizio−30min, fine+30min]) | ✅ REST + **MQTT** (`mqtt.openf1.org:8883` TLS) / **WebSocket** (`wss://mqtt.openf1.org:8084/mqtt`), max 10 connessioni concorrenti |
| Ritardo live | n/a | ~3 s (dichiarato) |

- Topic MQTT/WS = path REST (`v1/sessions`, `v1/laps`, `v1/location`, …), wildcard `#` supportato; i messaggi aggiungono `_id` (crescente) e `_key` (id documento/versione).
- Docs raccomandano MQTT/WS invece del polling REST per il live; credenziali/token **mai nel client** (backend proxy).
- Uso consentito: personale, educativo, ricerca, fan non-commerciale. Per altro: contattare OpenF1. Non è un prodotto ufficiale F1/FIA.
- Nota: issue GitHub (#370) segnalava 502 su `/token` durante gare live (datato ~marzo 2026) — da riverificare se si sottoscrive.

## Note per l'integrazione F1 Hub

- Live timing realistico senza abbonamento **non è fattibile** con OpenF1: valutare se vale $11.58/mese o se restare su "quasi-live" via Jolpica (che però non ha telemetria).
- Con abbonamento, l'architettura corretta è: backend che mantiene il WS MQTT e fa proxy ai client (mai esporre il token nel frontend).
- Storico 2023+ per sessioni/gare recenti; per tutto il resto (1950–2022) restano Jolpica/f1api.dev.
- Team radio: MP3 direttamente riproducibili via URL, ma valutare il profilo legale prima di integrarli nell'app.
- Calendario 2026: 25 GP, new entry Madrid (13 set) e ritorno Kuala Lumpur (4 ott); prossima gara live **Singapore 9–11 ott 2026 (sprint)**.
