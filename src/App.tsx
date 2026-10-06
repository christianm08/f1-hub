/* F1 Hub — app shell with routing and providers.
   Layout renders an <Outlet/>, so pages mount as nested routes. */
import { lazy, Suspense } from "react";
import { HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { SettingsProvider } from "./store/settings";
import { Layout } from "./components/Layout";
import { Skeleton } from "./components/ui";

const Home = lazy(() => import("./pages/Home"));
const Calendar = lazy(() => import("./pages/Calendar"));
const RaceDetail = lazy(() => import("./pages/RaceDetail"));
const Results = lazy(() => import("./pages/Results"));
const Drivers = lazy(() => import("./pages/Drivers"));
const DriverDetail = lazy(() => import("./pages/DriverDetail"));
const Teams = lazy(() => import("./pages/Teams"));
const TeamDetail = lazy(() => import("./pages/TeamDetail"));
const Circuits = lazy(() => import("./pages/Circuits"));
const Standings = lazy(() => import("./pages/Standings"));
const Live = lazy(() => import("./pages/Live"));
const News = lazy(() => import("./pages/News"));
const Settings = lazy(() => import("./pages/Settings"));

function PageFallback() {
  return (
    <div aria-busy="true" aria-label="loading">
      <Skeleton />
      <Skeleton />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/calendario" element={<Calendar />} />
              <Route path="/gara/:season/:round" element={<RaceDetail />} />
              <Route path="/risultati" element={<Results />} />
              <Route path="/piloti" element={<Drivers />} />
              <Route path="/piloti/:driverId" element={<DriverDetail />} />
              <Route path="/team" element={<Teams />} />
              <Route path="/team/:constructorId" element={<TeamDetail />} />
              <Route path="/circuiti" element={<Circuits />} />
              <Route path="/classifiche" element={<Standings />} />
              <Route path="/live" element={<Live />} />
              <Route path="/news" element={<News />} />
              <Route path="/impostazioni" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </SettingsProvider>
  );
}
