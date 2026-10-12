# M3 Expressive Redesign — Master Plan

Obiettivo: redesign completo dell'F1 Hub con Material 3 Expressive. Prodotto premium, coerente, moderno. Mantenere TUTTE le funzionalità esistenti.

## Stack (verificato 2026-10-12)
React 19 + TypeScript + Vite, react-router-dom (hash router `#/pagina?season=2010`), CSS custom in `src/index.css` (924 righe, token `--*` con `[data-theme]`), nessuna UI framework, `lucide-react` (da sostituire con Material Symbols), `flag-icons`.
Pagine (13): Home, Live (Race Center), Calendar, Standings, Results, Drivers, DriverDetail, Teams, TeamDetail, Circuits, RaceDetail, News, Settings.
Componenti: Layout, ui.tsx (Skeleton, ErrorState, EmptyState, Badge, PageHeader, Countdown, FavButton, Toast), SeasonSelect, ResponsiveTable, DriverPhoto, TeamLogo, CarImage, TrackMap, FlagIcon, charts, racecenter/* (core + advanced CSS separati).

## Architettura target
- `src/design/tokens.css` — token M3 Expressive come CSS custom properties, light + dark sotto `[data-theme]` (mantenere il selettore esistente!).
- `src/design/components.tsx` — libreria componenti M3 condivisi (UNICA fonte di verità visiva).
- `src/design/icons.tsx` — componente `MIcon` con Material Symbols SVG (pacchetto npm `@material-symbols/svg-400`, icone inline via `?raw` per funzionare anche offline; niente webfont).
- `src/index.css` — dopo la migrazione: importa tokens.css, conserva solo base/reset + classi legacy strettamente necessarie.
- I CSS di racecenter (core.css, advanced.css) vanno migrati ai token.

## Inventario componenti (devono esistere e bastare per tutte le pagine)
MButton (filled/tonal/outlined/text), MIconButton (+toggle/selected), MCard (elevated/filled/outlined), MChip (assist/filter/input/suggestion), MNavRail (desktop), MNavBar (mobile bottom), MTopAppBar (small/center-aligned), MTabs, MSegmentedButton, MSearchBar, MTextField, MSelect, MMenu, MDialog, MBottomSheet, MLinearProgress, MCircularProgress, MSnackbar, MList/MListItem, MDivider, MTooltip, MSkeleton, MEmptyState, MErrorState, MBadge, MFavButton, CountdownCells (mantenere hook useCountdown).

## Token minimi (nomenclatura `--md-sys-*`)
- **Color**: scheme light + dark completi da seed racing red `#E10600`: primary/on-primary/primary-container/on-primary-container, secondary/tertiary/error (+containers), surface-dim/surface/surface-bright, surface-container-lowest/low/container/high/highest, on-surface(+variant), outline(+variant), scrim, shadow; surface tint per elevation. Generare le palette tonali con `material-color-utilities` se possibile, altrimenti handcrafted con contrasto verificato (WCAG AA per il testo).
- **Typescale**: display-large/medium/small, headline-large/medium/small, title-large/medium/small, body-large/medium/small, label-large/medium/small (font Roboto Flex da Google Fonts con fallback Inter/sistema).
- **Shape**: corner-none/xs(4)/sm(8)/md(12)/lg(16)/xl(28)/full + shape "espressive" per hero/card grandi.
- **Elevation**: livelli 0–5 con tonal surface + shadow M3.
- **State layers**: hover 8%, focus 10%, pressed 12%, selected (container), disabled (38% on-surface / 12% container).
- **Spacing**: griglia 4dp (`--md-sys-spacing-*`).
- **Motion**: emphasized easing `cubic-bezier(0.2,0,0,1)` (e varianti decelerate/accelerate), durate 150/200/250/300/400/500ms; transizioni pagina/pannelli/filtri; SEMPRE `prefers-reduced-motion: reduce` → animazioni off.

## REGOLE CRITICHE (non negoziabili)
1. **ZERO emoji come icone** — sweep totale di src, sostituire con MIcon.
2. `position: fixed` dentro antenati con transform si rompe: Dialog, BottomSheet, Snackbar, Menu, Tooltip VANNO portalati con `createPortal(..., document.body)`.
3. **Non toccare**: `src/api/*`, `src/hooks/*`, `src/store/*`, `src/data/*`, chiavi esistenti in `src/i18n/dict.ts` (si possono AGGIUNGERE chiavi, mai rinominare/rimuovere), foto/loghi/tracciati/bandiere.
4. **Route invariate**, semantica selettore stagione invariata (`useSeasonParam`, `?season=` nell'URL).
5. Bandiere: restano `<img>` circolari (FlagIcon esistente).
6. MAI inventare dati. Race Center: leggibilità e rapidità > estetica; red flag/SC/VSC immediatamente riconoscibili.
7. Target touch ≥48dp, focus-visible sempre, ruoli ARIA corretti, contrasto AA.
8. MAI overflow orizzontale involontario: test = `document.documentElement.scrollWidth > innerWidth`.
9. Mobile: layout RIDISGNATI, non compressi. Breakpoint: ≤600 mobile (bottom nav), 601–1023 tablet, ≥1024 desktop (nav rail), ≥1920 ultrawide (max-width contenuto + griglie larghe).

## Fasi
1. **Design system** (questo task): token + componenti + icone + migrazione index.css/ui.tsx. Aggiornare QUESTO doc con il contratto API finale dei componenti.
2. **Pagine** (dopo): Layout/navigazione + 13 pagine sui nuovi componenti.
3. **Race Center** (dopo, parallelo alle pagine): Live.tsx + racecenter/* sui token.
4. **Verifica**: build 0 errori, test headless 360/390/768/1440/2560px light+dark, overflow, stati interattivi, regressioni; commit + push main; verifica deploy Vercel.

## Note test headless
Chromium nel VM NON ha internet diretto: servire `dist/` con `python3 -m http.server` e intercettare le API con Playwright `page.route()` (pattern in `~/workspace/tools/overflow-check/`). NON passare proxy a `chromium.launch`.

## Contratto API componenti (finale)

Fase 1 completata il 2026-10-12 (commit locale "M3 Expressive: design system (token, componenti, icone Material Symbols)").
Gli agenti pagine e race-center codificano contro questo contratto. Import unico:

```tsx
import { MButton, MIcon, MCard, useToast } from "../design"; // path relativo al file
```

### File creati
- `src/design/tokens.css` — token `--md-sys-*` (colori light+dark sotto `[data-theme]`, typescale, shape, elevation, state layer, spacing, motion).
- `src/design/icons.tsx` (+`icons.css`) — `<MIcon name="home" />`, 104 icone Material Symbols SVG inline via `?raw`.
- `src/design/components.tsx` (+`components.css`) — libreria componenti (classi `m3-*`).
- `src/design/index.ts` — barrel: `export * from "./icons"; export * from "./components";` (+ import tokens.css).
- Migrati: `src/index.css` (importa tokens.css; vecchi token/classi marcati LEGACY, pagine intatte), `src/components/ui.tsx` (adapter API-compatibili), `index.html` (font Roboto Flex).

### MIcon — `src/design/icons.tsx`
```tsx
<MIcon name="home" />                                        // base 24px, outline
<MIcon name="favorite" filled size={20} label="Preferito" /> // filled + label accessibile
<MIcon name="search" weight={600} />                         // peso ottico (500-700 emulato con stroke)
```
- `name: MIconName` (union di 104 nomi snake_case; v. `MICON_NAMES`). Senza `label` l'icona è `aria-hidden`.
- Vietato: emoji come icone, import diretti da `lucide-react` (sweep a carico agente pagine).
- Nota build: la mappa statica include SOLO le 104 icone mappate (verificato: icone non mappate assenti dal bundle). Non aggiungere icone inutilizzate.

### Componenti — `src/design/components.tsx` (props principali)
- `MButton({variant: "filled"|"tonal"|"outlined"|"text", icon?, trailingIcon?, small?, disabled?, href?, onClick?, children})` — 48dp, state layer, `::after`.
- `MIconButton({icon, label*, variant: "standard"|"filled"|"tonal"|"outlined", selected?, filledIcon?, disabled?, onClick?})` — 48×48, toggle con `aria-pressed`.
- `MCard({variant: "elevated"|"filled"|"outlined", expressive?, onClick?, href?, ariaLabel?, children})` — clickabile con tastiera (Enter/Spazio).
- `MChip({variant: "assist"|"filter"|"input"|"suggestion", selected?, leadingIcon?, onRemove?, removeLabel?, disabled?, onClick?, children})` — filter → `aria-pressed`; input → bottone remove separato.
- `MNavRail({items, value?, onChange?, onSelect?, ariaLabel?})` / `MNavBar(...)` — `items: {key, icon, activeIcon?, label, badge?, disabled?}[]`. NavBar visibile solo ≤600px, Rail nascosta ≤600px.
- `MTopAppBar({variant: "small"|"center-aligned", title, leading?, actions?})` — sticky 64dp.
- `MTabs({tabs: {key,label,icon?,disabled?}[], value, onChange, variant: "primary"|"secondary", ariaLabel?})` — `role=tablist`, frecce ←/→.
- `MSegmentedButton({options: {value,label,icon?,disabled?}[], value: string|string[], onChange, multi?, ariaLabel?})` — single=`radiogroup`, multi=`aria-pressed`.
- `MSearchBar({value, onChange, onSubmit?, placeholder?, label?, leadingIcon?, onLeadingClick?, trailing?})` — `role=search`.
- `MTextField({label*, value, onChange, type?, error?, helperText?, leadingIcon?, trailingIcon?, onTrailingClick?, disabled?, required?, multiline?, rows?})` — outlined, label flottante, `role=alert` sull'errore.
- `MSelect({label*, value, options: {value,label,icon?,supportingText?}[], onChange, disabled?, leadingIcon?})` — trigger + MMenu portaled.
- `MMenu({open, onClose, anchorRef*, children})` + `MMenuItem({label*, supportingText?, icon?, trailing?, selected?, disabled?, onSelect?})` — PORTALED su body, posizionato sotto l'anchor (flip automatico), scrim+Escape.
- `MDialog({open, onClose, headline*, icon?, children?, actions?, dismissible=true})` — PORTALED, scrim 32%, Escape, focus trap + restore.
- `MBottomSheet({open, onClose, title?, children*, showClose=true})` — PORTALED, handle con drag-down-to-dismiss, Escape.
- `MLinearProgress({value? /*0-100, omit=indeterminato*/, label?})` / `MCircularProgress({value?, size=48, label?})` — `role=progressbar`.
- `MSnackbar({open, message*, actionLabel?, onAction?, onClose, durationMs=4000, icon?})` — PORTALED bottom, `role=status`.
- `MList({children, ariaLabel?})` / `MListItem({headline*, supportingText?, leading?, trailing?, onClick?, href?, selected?, disabled?})` — 56/72dp.
- `MDivider({inset?})`, `MTooltip({label*, children, delayMs=400})` — PORTALED.
- `MSkeleton({height=20, width="100%", radius?})` — shimmer, `aria-hidden`.
- `MEmptyState({icon="search_off", title*, body?, action?})`, `MErrorState({title?, message?, onRetry?, retryLabel?})` — default in italiano, `role=alert`.
- `MBadge({label?, dot?, max=99, standalone?})` — con children fluttua su di essi.
- `MFavButton({active, onToggle, addLabel?, removeLabel?})` — cuore toggle.
- `CountdownCells({target: Date, variant?: "default"|"hero", ariaLabel?, daysLabel?, hoursLabel?, minutesLabel?, secondsLabel?})` + `useCountdown(target)` (stesso hook di prima).
- `ToastProvider({children})` / `useToast(): {push(msg)}` — API identica alla legacy, toast portaled stile M3.

### Token CSS più usati (da `src/design/tokens.css`)
- Colori: `--md-sys-color-primary`, `-on-primary`, `-primary-container`, `-on-primary-container`, `-secondary(-container)`, `-tertiary(-container)`, `-error(-container)`, `-surface`, `-surface-dim/bright`, `-surface-container-lowest/low/container/high/highest`, `-on-surface`, `-on-surface-variant`, `-outline`, `-outline-variant`, `-inverse-surface`, `-inverse-on-surface`, `-inverse-primary`, `-scrim`, `-shadow`.
- Tipo: `--md-sys-typescale-{display,headline,title,body,label}-{large,medium,small}-{size,height,tracking,weight}` + `--md-sys-typescale-font` (Roboto Flex, fallback Inter/sistema) e `--md-sys-typescale-mono`.
- Shape: `--md-sys-shape-corner-{none,extra-small(4),small(8),medium(12),large(16),extra-large(28),full}` + `--md-sys-shape-expressive-{card,hero,sheet}`.
- Elevation: `--md-sys-elevation-level{0..5}` (shadow; il surface tint è implicito via `surface-container-*`).
- State: `--md-sys-state-{hover,focus,pressed,dragged}-opacity` (8/10/12/16%), `--md-sys-state-disabled-{container,content}-opacity` (12/38%).
- Spacing: `--md-sys-spacing-{0..8,10,12,16}` (griglia 4dp).
- Motion: `--md-sys-motion-easing-emphasized[-decelerate|-accelerate]`, `-standard[-decelerate|-accelerate]`, `--md-sys-motion-duration-{short1..4,medium1..4,long1..2}` (50→500ms); `prefers-reduced-motion` disabilita animazioni/transizioni nei componenti.

### Note per gli agenti pagine/race-center
1. Overlay (MDialog, MBottomSheet, MSnackbar, MMenu, MTooltip) già portalati su `document.body`: MAI wrappare in container con `transform`/animazioni CSS.
2. Touch target ≥48dp garantito dai componenti (chip 40dp visivi + hit-area estesa a 48).
3. `useSettings()` resta in `src/store/settings.tsx` per i18n/tema/preferiti — i componenti design sono locale-agnostic (default italiani dove serve).
4. Non toccare: `src/api/*`, `src/hooks/*`, `src/store/*`, `src/data/*`; in `src/i18n/dict.ts` solo AGGIUNTE di chiavi.
5. `lucide-react` resta dipendenza finché l'agente pagine completa lo sweep (mappa lucide→MIcon disponibile nel report dell'agente design).
6. Race Center: red flag/SC/VSC restano su semantica colore immediata (`--md-sys-color-error`, tertiary per SC/VSC); leggibilità > estetica.
