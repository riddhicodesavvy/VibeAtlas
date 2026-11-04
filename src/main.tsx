import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import {
  AudioLines,
  House,
  Search,
  ChartNoAxesColumnIncreasing,
  Library,
  FlaskConical,
  Orbit,
  Heart,
  ArrowUpRight,
} from "lucide-react";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/libre-baskerville/latin-400.css";
import "@fontsource/libre-baskerville/latin-400-italic.css";
import { GuestProvider, PlayerProvider, useGuest } from "./state";
import { State } from "./components";
import AudioPlayer from "./AudioPlayer";
import OfflineNotice from "./OfflineNotice";
import {
  Home,
  Onboarding,
  MyVibe,
  Discover,
  Collections,
  Legal,
  NotFound,
} from "./pages";
import "./styles.css";
const Lab = lazy(() => import("./lab"));
const links = [
  { to: "/", label: "Home", icon: House },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/my-vibe", label: "My Vibe", icon: ChartNoAxesColumnIncreasing },
  { to: "/collections", label: "Collections", icon: Library },
  { to: "/universe", label: "Music Universe", icon: Orbit },
  { to: "/ml-lab", label: "ML Lab", icon: FlaskConical },
];
function Shell() {
  const { guest, storageError } = useGuest();
  const location = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("page-content")?.focus();
    document.title =
      "VibeAtlas — " +
      (links.find((l) => l.to === location.pathname)?.label ||
        "Find your frequency");
  }, [location.pathname]);
  return (
    <>
      <OfflineNotice />
      <a className="skip-link" href="#page-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="VibeAtlas home">
          <AudioLines />
          <span>
            VibeAtlas<span className="brand-dot">.</span>
          </span>
        </Link>
        <span className="nav-label">YOUR WORLD OF SOUND</span>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={18} />
              {label}
              {to === "/ml-lab" ? <span className="unit-badge">U3</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <NavLink className="secondary-nav" to="/liked">
          <Heart size={17} />
          Liked tracks<span>{guest.likes.length}</span>
        </NavLink>
        <div className="sidebar-note">
          <span className="small-record">
            <AudioLines />
          </span>
          <p>
            Good music.
            <br />
            <em>No gatekeepers.</em>
          </p>
          <small>Built for the curious.</small>
        </div>
        <div className="guest-profile">
          <span className="guest-avatar">V</span>
          <div>
            <strong>Guest listener</strong>
            <small>{guest.profile?.label || "Find your frequency"}</small>
          </div>
          <span className="status-dot" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>INDEPENDENT MUSIC DISCOVERY</span>
          <div>
            <span className="status-dot" /> OPEN SOURCE. OPEN EARS.
            <Link to="/about" aria-label="About VibeAtlas">
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
        {storageError ? (
          <div className="notice" role="alert">
            Browser storage is unavailable. Your selections work for this visit
            but cannot be saved.
          </div>
        ) : null}
        <main id="page-content" tabIndex={-1}>
          <Suspense fallback={<State loading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/my-vibe" element={<MyVibe />} />
              <Route path="/discover" element={<Discover />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/collections/:id" element={<Collections />} />
              <Route path="/liked" element={<Collections liked />} />
              <Route path="/universe" element={<Lab universe />} />
              <Route path="/ml-lab" element={<Lab />} />
              <Route path="/ml-lab/:experiment" element={<Lab />} />
              <Route path="/about" element={<Legal />} />
              <Route path="/licenses" element={<Legal />} />
              <Route path="/privacy" element={<Legal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <div className="site-footer">
          <span>VIBEATLAS / AN INDEPENDENT STATE OF MIND</span>
          <div>
            <Link to="/licenses">Credits & licenses</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
        </div>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links
          .filter((l) => l.to !== "/universe")
          .map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
      </nav>
      <AudioPlayer />
    </>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="state">
        <h1>Let’s find the signal again.</h1>
        <p>
          The page could not be displayed. Your browser data has not been sent
          anywhere.
        </p>
        <button className="button" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <GuestProvider>
          <PlayerProvider>
            <Shell />
          </PlayerProvider>
        </GuestProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
