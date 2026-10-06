# F1 Hub

Web app production-quality per seguire la Formula 1 con **dati reali, mai inventati**.
Default: dark mode, lingua italiana.

## Avvio rapido

```bash
cd f1-hub
npm install
npm run dev      # sviluppo → http://localhost:5173
npm run build    # typecheck + build di produzione (output in dist/)
npm run preview  # serve la build di produzione
npm run lint     # oxlint
```

Requisiti: Node 18+. Nessuna API key richiesta.

## Architettura

```
src/
├── api/            # layer API separato, nessuna chiamata fetch nelle pagine
│   ├── client.ts   # fetchJSON con cache (memoria + localStorage, TTL configurabile), ApiError, AbortSignal
│   ├── jolpica.ts  # dati storici/statici: stagioni, calendario, classifiche, risultati, piloti, team, circuiti
│   ├── openf1.ts   # client OpenF1 tipizzato: rate limiter 25 req/min, retry, 404=vuoto, normalizzazioni, parser SC/VSC
│   ├── openf1model.ts # modello normalizzato per la UI (funzioni pure): SessionInfo, TimingRow, PitView, StintView…
│   ├── openf1live.ts  # refresh intelligente: interfaccia LiveDataProvider + hook useRaceCenterSession
│   └── news.ts     # aggregazione RSS via rss2json (solo titolo, estratto, fonte, data, link)
├── i18n/dict.ts    # dizionario IT/EN (default IT)
├── store/settings.tsx  # tema, lingua, stagione, unità, preferiti, notifiche (localStorage)
├── data/meta.ts    # metadati statici fattuali: colori team, codici paese/nazionalità (3 lettere), continenti
├── hooks/useApi.ts # hook fetch con stati loading/error/retry
├── components/     # Layout (nav desktop + bottom nav mobile + ricerca globale),
│                   # ui (skeleton, error/empty states, badge, countdown, preferiti),
│                   # charts (SVG puri, nessuna dipendenza)
└── pages/          # 13 pagine (vedi sotto)
```

Design system: `src/index.css` (token CSS: palette dark-first + light mode, scala tipografica Inter,
spacing, tabelle dashboard, timing screen). Icone: `lucide-react` (zero emoji come icone);
nazionalità/paesi come chip con codice a 3 lettere (`.nat`).

Routing: `react-router-dom` con `HashRouter` (funziona anche servita da file/CDN statici senza
rewrite del server). Pagine caricate in lazy per chunk separati.

### Strategia dati / onestà

- **Jolpica F1 API** (`https://api.jolpi.ca/ergast/f1/`): fonte primaria per tutto ciò che è
  storico — calendario, classifiche, risultati gara/qualifiche/sprint, piloti, team, circuiti.
- **OpenF1** (`https://api.openf1.org/v1/`): fonte per il Race Center live (posizioni, gap,
  bandiere, pit, meteo) e per i best lap delle prove libere. Se non c'è una sessione in corso,
  l'app mostra un messaggio esplicito di indisponibilità — **mai dati simulati**.
- **News** (RaceFans, Motorsport.com via rss2json): solo titolo, estratto breve, fonte, data e
  link all'originale. Nessuno scraping aggressivo.
- Cache con TTL differenziati: dati storici a lunga scadenza, live timing a 15–60 s.
- Dove l'API non fornisce un dato (es. lunghezza/curve dei circuiti, record sul giro), l'app
  mostra `n/d` invece di inventarlo. I layout dei circuiti sono placeholder eleganti perché non
  esiste una fonte gratuita e lecita per gli SVG dei tracciati.

## Funzionalità implementate

- **Home**: prossimo GP con countdown live, stato LIVE dinamico, prossima sessione del weekend,
  top-5 piloti/costruttori, ultimo GP con vincitore, ultime news, preferiti.
- **Calendario**: filtri per mese, continente e stato (passati/in programma); card con vincitore
  per i GP disputati.
- **Dettaglio GP** (`/gara/:season/:round`): tab Info circuito + programma weekend, Gara,
  Qualifiche, Sprint (solo se presente), Prove (best lap FP1/FP2/FP3 via OpenF1), Classifiche
  dopo il GP.
- **Risultati**: filtri stagione (solo stagioni supportate dall'API, dal 2014) / GP / sessione
  (gara, qualifiche, sprint, prove). Gestione DNF/DNS/DSQ: posizione e stato reali dall'API.
- **Piloti**: lista ordinata per classifica; dettaglio con statistiche stagionali (punti,
  vittorie, podi, pole, ritiri), grafico SVG dell'andamento punti e tabella gara-per-gara.
- **Team**: lista; dettaglio con statistiche, piloti, grafico a barre dei punti per GP e
  tabella gara-per-gara.
- **Circuiti**: schede informative (località, paese, coordinate, vincitore recente); placeholder
  per il layout del tracciato.
- **Classifiche**: piloti + costruttori con selettore stagione (2014–2026, da API).
- **Race Center / Live**: torre dei tempi (posizioni, gap, intervalli, best lap, pit),
  meteo, timeline race control, badge bandiera; refresh intelligente con canali
  differenziati e aggiornamenti differenziali (hook `useRaceCenterSession`).
  Replay completo delle sessioni terminate dal 2023; se non c'è sessione live e
  i dati live non sono disponibili → messaggio onesto (mai dati simulati).
- **News**: aggregatore RSS con filtro per categoria (Ultime, Gare, Mercato, Tecnica, Team,
  Regolamenti).
- **Ricerca globale** (🔍 o Ctrl+K): piloti, team, circuiti, GP, news.
- **Preferiti**: cuore su piloti/team/circuiti, salvati in localStorage, visibili in Home.
- **Impostazioni**: tema, lingua, stagione predefinita, unità, pilota/team preferiti,
  auto-refresh live, preferenze notifiche (solo UI), svuota cache, info fonti dati.
- **UX**: skeleton loader ovunque, empty/error states (mai schermate bianche), responsive
  mobile-first (bottom nav + menu "Altro" su mobile, layout multi-colonna su desktop/ultrawide),
  accessibilità di base (aria-label, ruoli, focus-visible, contrasto).

## Funzionalità NON implementate (e perché)

- **Notifiche push reali**: manca un backend; l'architettura è pronta (preferenze salvate in
  `notifPrefs` in localStorage), l'invio richiede un servizio dedicato.
- **Layout SVG dei circuiti**: nessuna fonte gratuita con licenza chiara per i tracciati;
  usato un placeholder elegante + dati reali disponibili (località, coordinate).
- **Dati circuito estesi** (lunghezza, curve, record sul giro): non forniti dalle API usate;
  mostrato `n/d` invece di dati inventati.
- **Telemetria avanzata** (mappe, mini-settori, gomme in tempo reale per stint): il data
  layer la supporta (`car_data` ~3,2 Hz, `location`, `segments_sector_*` nei laps,
  `overtakes`); la granularità live esiste solo durante le sessioni e sul piano
  gratuito quasi mai — la UI mostra uno stato onesto (`telemetryAvailable`).
- **Confronto testa-a-testa piloti**: nice-to-have, rimandato per priorità (dati veri > extra).
- **PWA/offline completo**: la cache dati esiste, ma niente service worker/manifest.

## API usate

| API | Uso | Key |
|---|---|---|
| Jolpica F1 API (`api.jolpi.ca/ergast/f1/`) | **fonte primaria**: stagioni, calendario, classifiche, risultati, piloti, team, circuiti | no |
| OpenF1 (`api.openf1.org/v1/`) | replay sessioni 2023+, live timing best-effort, best lap prove, meteo, race control, pit, stint, team radio, telemetria (solo live) | no |

### OpenF1 — endpoint utilizzati, rate limits, limiti noti

**Rate limits (verificati dai docs ufficiali).** Piano gratuito: 3 req/s, 30 req/min,
nessun dato live nella finestra [inizio−30min, fine+30min] (riservata al piano a
pagamento). Il client applica un token bucket condiviso da **25 req/min + 3 req/s**
su tutte le chiamate, con dedup delle richieste identiche in-flight, retry con
backoff esponenziale (max 3) e rispetto del `Retry-After` sui 429.
Piano a pagamento ($11.58/mese): 6 req/s, 60 req/min + realtime.

**Budget stimato (profilo live standard, sotto il cap 25/min):** position 8s (7,5) +
intervals 12s (5) + race_control 20s (3) + pit/stint 30s (2+2) + weather/session_result/
team_radio/overtakes 120s (0,5×4) + laps 60s (1) ≈ **22,5 req/min**. Con mappa:
location 12s (5), cadence torre ridotte → ≈19/min. Con telemetria: car_data 3s (20) +
position 20s (3) + race_control 60s (1) = 24/min (altri canali in pausa). Il replay
di sessioni completate fa un full-load + max 2 rivalidazioni, poi si ferma.

**Endpoint usati:** `sessions`, `meetings`, `drivers`, `position`, `intervals`,
`laps`, `stints`, `pit`, `weather`, `race_control`, `team_radio`, `location`,
`session_result`, `starting_grid`, `car_data`, `overtakes` (dettagli e parametri
nel commento header di `src/api/openf1.ts`).

**Limiti noti (verificati con curl):**
- Storico solo **dal 2023** (`meetings?year=2022` → 404); prima del 2023 solo Jolpica.
- `404 {"detail":"No results found."}` = insieme vuoto, mai errore (es. intervals su
  una FP1, `starting_grid` con la session_key della gara).
- `interval_key=latest` funziona solo sull'ultima sessione in assoluto; sulle
  sessioni completate il client ripiega su fetch completo + max `date` per pilota.
- `session_name` non è stabile ("Practice 1" nel 2023, "FP1" nel 2026): sempre
  normalizzato con `normalizeSessionName()`.
- `session_result`: niente `fastest_lap`/`number_of_pit_stops`; in qualifica
  `duration` e `gap_to_leader` sono array [Q1,Q2,Q3] (normalizzati all'ultimo
  non-null); `gap_to_leader` può essere il numero 0.
- `starting_grid` richiede la session_key della **qualifica** (helper dedicato).
- `car_data` (~3,2 Hz, DRS aperto se ≥10) solo live + breve buffer: sulle
  storiche restituisce []. `telemetryAvailable` è onesto al riguardo.
- `location` campionata ~3,7s, unità NON metri e origine arbitraria: il fit è
  puramente relativo al bbox (`normalizeLocations()`). L'endpoint rifiuta
  query multi-driver non limitate ("too much data"): il replay carica la
  posizione per pilota in finestra [fine−32min, fine−8min] (`locationWindowMin`).
- **Quirk critico operatori data (verificato 2026-10-06):** i docs scrivono
  `date>=...`, ma il server spezza la query sul primo `=`: la chiave deve
  essere `date>` singolo (`date%3E=...`), NON `date>=` (`date%3E%3D=...`)
  che restituisce sempre "No results found.". Nel codice usare sempre
  `"date>"` / `"date<"`.
- `position` è event-driven e rado; `intervals` ~793 righe/pilota/gara: i poll
  live usano finestre `date>=` per scaricare solo il delta.
- SC/VSC/RedFlag sono derivati dai messaggi di race control (non esiste un campo
  booleano): `deriveTrackStatus()`.
- Team radio: MP3 sulla CDN ufficiale F1 (`livetiming.formula1.com`); uso
  personale/educativo, attribuzione obbligatoria "Audio: Formula 1 / OpenF1".
- **Live onesto:** senza abbonamento, se durante una sessione live le chiamate
  restano vuote/404, l'hook entra in stato `needsSubscription` ("I dati live
  OpenF1 richiedono l'abbonamento ($11.58/mese)") — mai dati simulati. Il replay
  delle sessioni completate è la modalità principale e funziona per tutto
  (torre, mappa, race control, pit, stint, meteo, radio).
| f1api.dev (`f1api.dev/api/`) | **fonte secondaria (arricchimento)**: sigle piloti, date di nascita, numeri di gara, metadati team (sede, prima stagione, titoli) | no |
| rss2json (proxy CORS keyless) | feed RSS RaceFans + Motorsport.com | no |

## Fonti dati e licenze

- **Jolpica F1 API** — fonte primaria per calendario, classifiche, risultati e
  anagrafiche. Dati storici stile Ergast, gratuiti senza API key.
- **OpenF1** — live timing e dati di sessione. Dati storici gratuiti senza key;
  lo streaming realtime puro richiede un piano a pagamento (l'app usa gli
  endpoint REST gratuiti e dichiara onestamente quando il live non è disponibile).
- **f1api.dev** — fonte secondaria usata SOLO per arricchire le schede piloti/team
  (sigla, data di nascita, numero, sede team, prima stagione, titoli vinti).
  Gratuita senza key. In caso di conflitto con Jolpica, vince Jolpica (fonte
  primaria designata); le scelte sono documentate in `src/api/model.ts`.
- **Tracciati dei circuiti** — geometrie vettoriali da
  [bacinger/f1-circuits](https://github.com/bacinger/f1-circuits),
  **MIT License, Copyright (c) 2019-2025 Tomislav Bacinger**, convertite in
  SVG e integrate in `src/data/tracks.ts` (file generato, vedi
  `tools/gen-tracks.js`). Il repository è non ufficiale e non affiliato alle
  società della Formula 1; i marchi F1® appartengono a Formula One Licensing B.V.
- **News** — titoli ed estratti via RSS (RaceFans, Motorsport.com) con link
  all'articolo originale; nessun articolo riprodotto integralmente.
- **Foto dei piloti** — ritratti dagli articoli Wikipedia dei piloti (ospitati
  su Wikimedia Commons con licenze libere). Risoluzione in tre livelli
  (`src/api/photos.ts`): (1) **mappa curata** in `src/data/assets.ts`
  (`DRIVER_PHOTOS`: 37 ritratti verificati visivamente — riconoscibili,
  stile ritratto coerente (primi piani/mezzibusti), senza watermark, chiave
  stabile = Jolpica driverId; ogni file con licenza libera verificata
  singolarmente via API di Wikimedia Commons: CC BY 2.0 / CC BY-SA 2.0 /
  CC BY-SA 4.0 / pubblico dominio);
  (2) miniatura dell'articolo Wikipedia via REST API (`/api/rest_v1/page/summary/`,
  deterministica: stesso articolo → stessa immagine infobox);
  (3) placeholder professionale (versione "archivio" seppia per i piloti
  pre-2000 senza foto). Mai foto di altri piloti, mai immagini casuali dal web.
  Presentazione uniforme: stesso aspect ratio 1:1, `object-fit: cover` con
  focal point per pilota, backdrop in tinta team. Cache locale 90 giorni.
  Attribuzione: "Immagini: Wikimedia Commons / Wikipedia" (anche nel footer).
- **Loghi dei team** — SOLO loghi con licenza libera verificata su Wikimedia
  Commons (17 team su 22 mappati, prevalentemente `PD-textlogo`: liberi da
  copyright in quanto semplici wordmark, ma restano marchi registrati — uso
  nominativo/descrittivo in un'app informativa). Mappatura curata in
  `src/data/assets.ts` (validata con `tools/gen-assets.js`, 43 URL verificati
  con HTTP 200). I loghi senza versione libera (es. Ferrari, Aston Martin)
  usano un placeholder professionale, mai un logo protetto.
- **Foto delle monoposto** — fotografie con licenza libera (CC-BY / CC-BY-SA /
  pubblico dominio) da Wikimedia Commons, mappate per stagione esatta in
  `src/data/assets.ts` (26 foto: intera griglia 2025 e 2026, più MCL38/RB20/
  SF-24/W15 del 2024, RB16B 2021, W11 2020, F2004 2004). Mai mostrata un'auto
  dell'anno sbagliato: senza corrispondenza esatta si usa il fallback.

Nessun dato è inventato: quando una fonte non risponde, l'app mostra dati in
cache o un messaggio onesto di indisponibilità.

## Note tecniche

- `npm run build` esegue `tsc -b && vite build`: deve passare senza errori.
- Date/orari: l'API fornisce orari in UTC; la formattazione usa il locale del browser
  (l'utente è in Europe/Rome).
- Le stagioni selezionabili partono dal 2014 (era ibrida), filtrate dalla lista reale
  dell'endpoint `/seasons`.
