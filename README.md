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
│   ├── client.ts   # fetchJSON con cache (memoria + localStorage, TTL configurabile) e ApiError
│   ├── jolpica.ts  # dati storici/statici: stagioni, calendario, classifiche, risultati, piloti, team, circuiti
│   ├── openf1.ts   # dati live/timing: sessioni, posizioni, intervalli, meteo, race control, pit, best lap
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
- **Race Center / Live**: torre dei tempi reale (posizioni, gap, intervalli, best lap, pit),
  meteo, timeline race control, badge bandiera; auto-refresh ogni 15 s (disattivabile). Se non
  c'è una sessione live → messaggio onesto di indisponibilità.
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
- **Telemetria avanzata** (mappe, mini-settori, gomme in tempo reale per stint): OpenF1 li
  espone ma la granularità live è disponibile solo durante le sessioni; non implementato per
  restare nel perimetro "funzionante e vero".
- **Confronto testa-a-testa piloti**: nice-to-have, rimandato per priorità (dati veri > extra).
- **PWA/offline completo**: la cache dati esiste, ma niente service worker/manifest.

## API usate

| API | Uso | Key |
|---|---|---|
| Jolpica F1 API (`api.jolpi.ca/ergast/f1/`) | stagioni, calendario, classifiche, risultati, piloti, team, circuiti | no |
| OpenF1 (`api.openf1.org/v1/`) | live timing, best lap prove, meteo, race control | no |
| rss2json (proxy CORS keyless) | feed RSS RaceFans + Motorsport.com | no |

## Note tecniche

- `npm run build` esegue `tsc -b && vite build`: deve passare senza errori.
- Date/orari: l'API fornisce orari in UTC; la formattazione usa il locale del browser
  (l'utente è in Europe/Rome).
- Le stagioni selezionabili partono dal 2014 (era ibrida), filtrate dalla lista reale
  dell'endpoint `/seasons`.
