import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Heart,
  Plus,
  Trash2,
  Play,
  Disc3,
  AudioLines,
  ExternalLink,
} from "lucide-react";
import { api, safeURL, useRemote } from "./api";
import type { ModelInfo, Profile, Track, TrackPage } from "./types";
import { useGuest, usePlayer } from "./state";
import {
  Artwork,
  PageIntro,
  SaveButton,
  SourceNotice,
  State,
  TrackCard,
  TrackRows,
} from "./components";

function SectionTitle({
  title,
  to,
  label = "Explore all",
}: {
  title: string;
  to: string;
  label?: string;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <Link to={to}>
        {label}
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function Home() {
  const tracks = useRemote<TrackPage>("/tracks?provider=jamendo&limit=6");
  const { guest } = useGuest();
  return (
    <div className="home-page">
      <section className="hero">
        <div
          className="hero-photo"
          role="img"
          aria-label="Mc Mirella performing on stage, photographed by Yuri Oliveira"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="eyebrow">
            <span className="status-dot" /> LESS ALGORITHM. MORE DISCOVERY.
          </span>
          <h1>
            FIND YOUR
            <br />
            <span>FREQUENCY.</span>
          </h1>
          <p>
            For the songs you haven’t met.
            <br />
            And the part of you they’ll find.
          </p>
          <Link
            className="button"
            to={guest.profile ? "/my-vibe" : "/onboarding"}
          >
            {guest.profile ? "Resume My Vibe" : "Discover My Vibe"}
            <ArrowRight size={20} />
          </Link>
          <Link className="hero-secondary" to="/discover">
            Or get a little lost in the music <ArrowUpRight size={15} />
          </Link>
        </div>
        <span className="hero-vertical">
          TURN DOWN THE NOISE. TURN UP THE UNKNOWN.
        </span>
        <div className="hero-edition">
          <span>THE VIBEATLAS EDITION</span>
          <strong>VOL. 001</strong>
        </div>
        <a
          className="photo-credit"
          href="https://commons.wikimedia.org/wiki/File:Mc_Mirella_(51893938577).png"
          target="_blank"
          rel="noreferrer"
        >
          Photo: Yuri Oliveira · CC BY 2.0 · color treatment
        </a>
      </section>
      <div className="ticker" aria-label="Independent by nature">
        <span>INDEPENDENT BY NATURE</span>
        <span>✳</span>
        <span>CURIOUS BY DESIGN</span>
        <span>✳</span>
        <span>NO MAINSTREAM REQUIRED</span>
        <span>✳</span>
        <span>FIND SOMETHING THAT FINDS YOU</span>
      </div>
      <section className="content-section">
        <SectionTitle title="Independent picks" to="/discover" />
        <div className="section-caption">
          <span>FRESH PERSPECTIVES / OPEN EARS</span>
          <p>A small window into a much bigger world.</p>
        </div>
        {tracks.loading || tracks.error ? (
          <State
            loading={tracks.loading}
            error={tracks.error}
            retry={tracks.retry}
          />
        ) : tracks.data?.items.length ? (
          <div className="track-grid">
            {tracks.data.items.map((t) => (
              <TrackCard key={t.id} track={t} queue={tracks.data!.items} />
            ))}
          </div>
        ) : (
          <State empty="The listening catalogue is not available yet. Try again after the metadata import." />
        )}
      </section>
      <section className="manifesto">
        <span className="eyebrow">YOUR TASTE ISN’T A CHECKBOX.</span>
        <h2>
          A little science.
          <br />
          <em>A lot of feeling.</em>
        </h2>
        <div>
          <p>
            Real audio characteristics. Unsupervised learning. A musical
            portrait drawn from the records you choose.
          </p>
          <Link className="text-link" to="/onboarding">
            Meet your musical self <ArrowRight size={18} />
          </Link>
          <SourceNotice />
        </div>
        <span className="manifesto-star">✳</span>
      </section>
      <section className="content-section two-features">
        <Link className="editorial-tile" to="/universe">
          <OrbitArt />
          <span className="eyebrow">A DIFFERENT WAY TO LISTEN</span>
          <h2>
            Your next discovery.
            <br />
            Somewhere out there.
          </h2>
          <p>
            Explore the Music Universe <ArrowUpRight size={18} />
          </p>
        </Link>
        <Link className="editorial-tile lab-tile" to="/ml-lab">
          <AudioLines size={90} strokeWidth={0.8} />
          <span className="eyebrow">UNIT 3, IN ACTION</span>
          <h2>
            Look under
            <br />
            the record sleeve.
          </h2>
          <p>
            Inside the ML Lab <ArrowUpRight size={18} />
          </p>
        </Link>
      </section>
    </div>
  );
}
function OrbitArt() {
  return (
    <div className="orbit-art" aria-hidden="true">
      <i />
      <i />
      <i />
      <span>✦</span>
    </div>
  );
}

export function Onboarding() {
  const { guest, setGuest } = useGuest(),
    navigate = useNavigate();
  const [step, setStep] = useState(0),
    [genres, setGenres] = useState(guest.genres),
    [selection, setSelection] = useState<string[]>(guest.selection),
    [q, setQ] = useState(""),
    [genre, setGenre] = useState(""),
    [offset, setOffset] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const available = useRemote<{ name: string; count: number }[]>(
    "/genres?provider=fma",
  );
  const tracks = useRemote<TrackPage>(
    "/tracks?provider=fma&feature_ready=true&limit=16&offset=" +
      offset +
      "&q=" +
      encodeURIComponent(q) +
      "&genre=" +
      encodeURIComponent(genre),
  );
  const [chosen, setChosen] = useState<Track[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      selection.map((id) =>
        api<Track>("/tracks/" + encodeURIComponent(id)).catch(() => null),
      ),
    ).then((rows) => {
      if (!cancelled) setChosen(rows.filter((t): t is Track => !!t));
    });
    return () => {
      cancelled = true;
    };
  }, [selection.join("|")]);
  function toggle(id: string) {
    setError("");
    setSelection((s) =>
      s.includes(id)
        ? s.filter((t) => t !== id)
        : s.length < 30
          ? [...s, id]
          : s,
    );
  }
  async function analyze() {
    setBusy(true);
    setError("");
    try {
      const profile = await api<Profile>("/profile", {
        track_ids: selection,
        genres,
      });
      setGuest((g) => ({ ...g, selection, genres, profile }));
      navigate("/my-vibe");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not analyze selections.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page onboarding">
      <div className="steps">
        {["Your genres", "Your records", "Your profile"].map((label, i) => (
          <button
            key={label}
            disabled={busy || i > step}
            onClick={() => setStep(i)}
            aria-current={step === i ? "step" : undefined}
          >
            <span>
              {i < step ? <Check size={15} /> : String(i + 1).padStart(2, "0")}
            </span>
            {label}
          </button>
        ))}
      </div>
      <PageIntro
        eyebrow="LET’S START WITH WHAT MOVES YOU"
        title={
          step === 0
            ? "WHAT SOUNDS\nLIKE YOU?"
            : step === 1
              ? "PICK YOUR\nKIND OF RECORD."
              : "LET’S FIND\nYOUR FREQUENCY."
        }
        description={
          step === 0
            ? "Pick the corners of music you call home. There’s room for more than one."
            : step === 1
              ? "Choose at least 3 records with published audio descriptors. Five to ten make a richer starting point."
              : "A few favorite records. A fresh perspective. We’ll measure the common threads, then find more to explore."
        }
      />
      <SourceNotice />
      {step === 0 ? (
        <>
          {available.loading || available.error ? (
            <State
              loading={available.loading}
              error={available.error}
              retry={available.retry}
            />
          ) : (
            <div className="genre-grid">
              {available.data?.map((g, i) => (
                <button
                  key={g.name}
                  className={
                    "genre-tile genre-art-" +
                    i +
                    (genres.includes(g.name) ? " selected" : "")
                  }
                  aria-pressed={genres.includes(g.name)}
                  onClick={() =>
                    setGenres((s) =>
                      s.includes(g.name)
                        ? s.filter((v) => v !== g.name)
                        : [...s, g.name],
                    )
                  }
                >
                  <span className="genre-selection">
                    {genres.includes(g.name) ? <Check size={16} /> : null}
                  </span>
                  <span className="genre-number">0{i + 1} / FMA ARCHIVE</span>
                  <span className="genre-art" aria-hidden="true">
                    {["✳", "◉", "≋", "✦", "◍", "〰", "✶", "◐"][i % 8]}
                  </span>
                  <strong>{g.name}</strong>
                  <small>{g.count} feature-ready records</small>
                </button>
              ))}
            </div>
          )}
        </>
      ) : step === 1 ? (
        <div className="onboarding-records">
          <div>
            <div className="filter-bar">
              <label className="search-field">
                <Search size={17} />
                <input
                  aria-label="Search research tracks"
                  placeholder="Search records or artists…"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOffset(0);
                  }}
                />
              </label>
              <select
                aria-label="Research genre"
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All genres</option>
                {(genres.length
                  ? genres
                  : available.data?.map((g) => g.name) || []
                ).map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
            {tracks.loading || tracks.error ? (
              <State
                loading={tracks.loading}
                error={tracks.error}
                retry={tracks.retry}
              />
            ) : tracks.data?.items.length ? (
              <>
                <TrackRows
                  tracks={tracks.data.items}
                  selectable
                  selected={selection}
                  onSelect={(t) => toggle(t.id)}
                />
                <Pagination
                  total={tracks.data.total}
                  offset={offset}
                  limit={16}
                  setOffset={setOffset}
                />
              </>
            ) : (
              <State empty="No records found. Try another artist or genre." />
            )}
          </div>
          <aside className="selection-panel">
            <span className="eyebrow">YOUR STARTING POINT</span>
            <h2>
              The records
              <br />
              that get you.
            </h2>
            <span className="selection-count">
              {selection.length} <small>/ at least 3 selected</small>
            </span>
            {chosen.length ? (
              chosen.map((t) => (
                <div className="selected-record" key={t.id}>
                  <Artwork track={t} />
                  <span>
                    <strong>{t.title}</strong>
                    <small>{t.artist}</small>
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${t.title} from selection`}
                    onClick={() => toggle(t.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">
                Select records from the list. You can revise your choices any
                time.
              </p>
            )}
            <small>
              FMA analysis records. In-app streaming is available separately in
              Discover’s Jamendo catalogue.
            </small>
          </aside>
        </div>
      ) : (
        <div className="review">
          <div>
            <h2>Your first pressing.</h2>
            <p className="serif">
              {genres.join(" / ") || "An open mind, across all genres."}
            </p>
            <div className="review-records">
              {chosen.map((t) => (
                <article key={t.id}>
                  <Artwork track={t} />
                  <h3>{t.title}</h3>
                  <p>{t.artist}</p>
                </article>
              ))}
            </div>
          </div>
          <div className="method-card">
            <span className="eyebrow">WHAT HAPPENS NEXT</span>
            <ol>
              <li>Load {selection.length} published audio-feature vectors.</li>
              <li>Apply the saved training-set preprocessing.</li>
              <li>Compare your average vector with real clusters.</li>
              <li>Rank nearby records by measured distance.</li>
            </ol>
            <p>
              No personality test. No invented confidence scores. Just another
              way into the music.
            </p>
          </div>
        </div>
      )}
      {error ? (
        <p className="error-inline" role="alert">
          {error}
        </p>
      ) : null}
      <div className="onboarding-bottom">
        <span>
          {step === 0
            ? `${genres.length} genres selected`
            : step === 1
              ? `${selection.length} records selected`
              : "Your selections stay on this browser."}
        </span>
        <div>
          {step > 0 ? (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              <ChevronLeft size={16} />
              Back
            </button>
          ) : null}
          {step < 2 ? (
            <button
              className="button"
              disabled={step === 0 ? !genres.length : selection.length < 3}
              onClick={() => {
                if (step === 0) setGenre(genres[0] || "");
                setStep(step + 1);
                window.scrollTo(0, 0);
              }}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              className="button"
              disabled={busy || selection.length < 3}
              onClick={() => void analyze()}
            >
              {busy ? "Measuring your frequency…" : "Generate My Vibe"}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyVibe() {
  const { guest, setGuest } = useGuest();
  const info = useRemote<ModelInfo>("/ml/models");
  const p = guest.profile;
  const [recommendations, setRecommendations] = useState<Track[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [recommendationRevision, setRecommendationRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError("");
    setRecommendations([]);
    if (p)
      api<Track[]>("/recommendations", {
        track_ids: guest.selection,
        release: p.release,
        limit: 6,
      })
        .then((r) => {
          if (!cancelled) setRecommendations(r);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [p?.release, guest.selection.join("|"), recommendationRevision]);
  async function recompute() {
    setBusy(true);
    setError("");
    try {
      const profile = await api<Profile>("/profile", {
        track_ids: guest.selection,
        genres: guest.genres,
      });
      setGuest((g) => ({ ...g, profile }));
      setRecommendationRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recomputation failed.");
    } finally {
      setBusy(false);
    }
  }
  if (!p)
    return (
      <div className="page">
        <PageIntro
          eyebrow="EVERY TASTE HAS A STORY"
          title="WHAT’S\nYOUR VIBE?"
          description="A portrait made from the music you choose. Start with a few records and see what connects them."
        />
        <Link className="button" to="/onboarding">
          Find My Vibe
          <ArrowRight size={18} />
        </Link>
      </div>
    );
  const stale = info.data && p.release !== info.data.release;
  return (
    <div className="page">
      <div className="page-kicker">
        <span>MY VIBE / YOUR PERSONAL PRESSING</span>
        <Link to="/onboarding">
          Edit preferences
          <ArrowUpRight size={15} />
        </Link>
      </div>
      {stale ? (
        <div className="notice">
          The model changed. Your saved profile uses an older release.{" "}
          <button onClick={() => void recompute()} disabled={busy}>
            Recompute profile
          </button>
        </div>
      ) : null}
      <section className="profile-feature">
        <div className="record-composition">
          <div className="vinyl">
            <span />
          </div>
          <div className="profile-sleeve">
            <span>
              VibeAtlas
              <br />
              <em>Record Series</em>
            </span>
            <span className="sleeve-edition">
              NO. {String(p.cluster_id + 1).padStart(3, "0")}
            </span>
            <div className="sleeve-landscape">
              <i />
              <i />
              <i />
            </div>
            <strong>{p.label}</strong>
            <small>THE FREQUENCIES YOU COME BACK TO.</small>
          </div>
          <span className="sleeve-caption">
            A MUSICAL PORTRAIT / {p.selected_count} RECORDS
          </span>
        </div>
        <div className="profile-copy">
          <span className="eyebrow">YOUR MUSICAL PERSONALITY</span>
          <h1>{p.label}</h1>
          <p className="serif">{p.description}</p>
          <div className="profile-chart">
            <span className="eyebrow">YOUR MEASURED AUDIO PROFILE</span>
            {p.features.map((f) => (
              <div className="feature-bar" key={f.name}>
                <label>
                  {f.label}
                  <span>
                    {f.value.toLocaleString(undefined, {
                      maximumFractionDigits: 3,
                    })}{" "}
                    {f.unit}
                  </span>
                </label>
                <div>
                  <span style={{ width: f.percentile + "%" }} />
                </div>
              </div>
            ))}
            <small>
              Bars show catalogue percentiles, not confidence or psychological
              scores.
            </small>
          </div>
        </div>
      </section>
      <div className="profile-footnotes">
        <span>
          CLUSTER {p.cluster_id + 1} / {p.cluster_distance.toFixed(2)} DISTANCE
        </span>
        <span>SELECTION SPREAD {p.spread.toFixed(2)}</span>
        <Link to="/ml-lab/distances">
          How did we find this?
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <SectionTitle title="Records in your orbit" to="/discover?mode=matches" />
      {error ? (
        <State
          error={error}
          retry={() => setRecommendationRevision((v) => v + 1)}
        />
      ) : recommendations.length ? (
        <div className="track-grid">
          {recommendations.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </div>
      ) : (
        <State loading />
      )}
      <section className="related-clusters">
        <div>
          <span className="eyebrow">NEARBY FREQUENCIES</span>
          <h2>
            There’s more than
            <br />
            one side to you.
          </h2>
          <Link className="text-link" to="/universe">
            Explore the Music Universe
            <ArrowRight size={16} />
          </Link>
        </div>
        {p.related_clusters.map((c) => (
          <Link
            className="cluster-card"
            key={c.cluster_id}
            to={"/universe?cluster=" + c.cluster_id}
          >
            <span>CLUSTER {c.cluster_id + 1}</span>
            <Disc3 size={42} strokeWidth={1} />
            <h3>{c.name}</h3>
            <small>Centroid distance {c.distance.toFixed(2)}</small>
          </Link>
        ))}
      </section>
      <details className="method-details">
        <summary>About this profile and model</summary>
        <p>{p.method}</p>
        <p>{p.disclaimer}</p>
        <code>
          {p.release} / {p.feature_schema}
        </code>
      </details>
    </div>
  );
}

function Pagination({
  total,
  offset,
  limit,
  setOffset,
}: {
  total: number;
  offset: number;
  limit: number;
  setOffset: (n: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total ? offset + 1 : 0}–{Math.min(offset + limit, total)} of {total}{" "}
        records
      </span>
      <div>
        <button
          className="icon-button"
          aria-label="Previous page"
          disabled={!offset}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="Next page"
          disabled={offset + limit >= total}
          onClick={() => setOffset(offset + limit)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
export function Discover() {
  const { guest } = useGuest(),
    player = usePlayer();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "matches" ? "matches" : "listen",
    q = params.get("q") || "",
    genre = params.get("genre") || "";
  const [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<Track | null>(null),
    [matches, setMatches] = useState<Track[]>([]),
    [matchError, setMatchError] = useState(""),
    [matchLoading, setMatchLoading] = useState(false);
  const [matchRevision, setMatchRevision] = useState(0);
  const provider = mode === "matches" ? "fma" : "jamendo";
  const band = params.get("brightness") || "";
  const measured =
    band === "low"
      ? { brightness_max: 1000 }
      : band === "mid"
        ? { brightness_min: 1000, brightness_max: 3000 }
        : band === "high"
          ? { brightness_min: 3000 }
          : {};
  const genres = useRemote<{ name: string; count: number }[]>(
    "/genres?provider=" + provider,
  );
  const catalogue = useRemote<TrackPage>(
    "/tracks?provider=" +
      provider +
      "&q=" +
      encodeURIComponent(q) +
      "&genre=" +
      encodeURIComponent(genre) +
      "&limit=24&offset=" +
      offset +
      (band === "low"
        ? "&brightness_max=1000"
        : band === "mid"
          ? "&brightness_min=1000&brightness_max=3000"
          : band === "high"
            ? "&brightness_min=3000"
            : ""),
  );
  const [brightness, setBrightness] = useState(false);
  function update(key: string, value: string) {
    setOffset(0);
    setSelected(null);
    setParams((p) => {
      if (value) p.set(key, value);
      else p.delete(key);
      if (key === "mode") {
        p.delete("genre");
        p.delete("q");
        p.delete("brightness");
      }
      return p;
    });
  }
  useEffect(() => {
    let cancelled = false;
    if (mode !== "matches" || !guest.profile) {
      setMatchLoading(false);
      return;
    }
    setMatchLoading(true);
    setMatchError("");
    setMatches([]);
    api<Track[]>("/recommendations", {
      track_ids: guest.selection,
      release: guest.profile.release,
      q,
      genre: genre || undefined,
      ...measured,
      limit: 100,
    })
      .then((r) => {
        if (!cancelled) setMatches(r);
      })
      .catch((e) => {
        if (!cancelled) setMatchError(e.message);
      })
      .finally(() => {
        if (!cancelled) setMatchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    mode,
    genre,
    band,
    q,
    matchRevision,
    guest.profile?.release,
    guest.selection.join("|"),
  ]);
  const rows =
    mode === "matches" && guest.profile
      ? matches.filter(
          (t) =>
            !q ||
            (t.title + " " + t.artist).toLowerCase().includes(q.toLowerCase()),
        )
      : catalogue.data?.items || [];
  const visible = brightness ? rows.filter((t) => t.feature_ready) : rows;
  const active =
    selected && visible.some((t) => t.id === selected.id)
      ? selected
      : visible[0];
  const loading =
    mode === "matches" && guest.profile ? matchLoading : catalogue.loading;
  const error =
    mode === "matches" && guest.profile ? matchError : catalogue.error;
  function inspectTrack(track: Track) {
    setSelected(track);
    if (window.matchMedia("(max-width:960px)").matches)
      requestAnimationFrame(() => {
        const detail = document.getElementById("track-details");
        detail?.scrollIntoView({ block: "start", behavior: "auto" });
        detail?.focus({ preventScroll: true });
      });
  }
  return (
    <div className="page discover">
      <PageIntro
        eyebrow="A WORLD BEYOND YOUR USUAL ROTATION"
        title="DISCOVER MUSIC\nFOR YOUR VIBE."
        description={
          mode === "matches"
            ? guest.profile
              ? "Real audio-feature matches from the FMA research archive. Lower distance means a closer measured match."
              : "Browse the FMA research archive. Create a profile to find measured audio-feature matches."
            : "Independent artists. Unexpected favorites. Follow your ears into the Jamendo listening catalogue."
        }
      />
      <div className="discovery-tabs" role="group" aria-label="Discovery mode">
        <button
          className={mode === "listen" ? "active" : ""}
          onClick={() => update("mode", "listen")}
        >
          <AudioLines size={16} />
          Listen & explore
        </button>
        <button
          className={mode === "matches" ? "active" : ""}
          onClick={() => update("mode", "matches")}
        >
          <Disc3 size={16} />
          Feature matches
        </button>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search music"
            placeholder="Search artists, tracks, a new obsession…"
            value={q}
            onChange={(e) => update("q", e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by genre"
          value={genre}
          onChange={(e) => update("genre", e.target.value)}
        >
          <option value="">Every genre</option>
          {genres.data?.map((g) => (
            <option key={g.name} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
        {mode === "matches" ? (
          <select
            aria-label="Spectral brightness"
            value={band}
            onChange={(e) => update("brightness", e.target.value)}
          >
            <option value="">Any brightness</option>
            <option value="low">Below 1,000 Hz</option>
            <option value="mid">1,000–3,000 Hz</option>
            <option value="high">Above 3,000 Hz</option>
          </select>
        ) : null}
        <button
          className={
            "button secondary compact " + (brightness ? "selected" : "")
          }
          onClick={() => setBrightness((v) => !v)}
          aria-pressed={brightness}
        >
          <SlidersHorizontal size={15} />
          Feature-ready only
        </button>
      </div>
      {mode === "matches" && !guest.profile ? (
        <div className="notice">
          These are unpersonalized research records.{" "}
          <Link to="/onboarding">Create your profile</Link> to get measured
          matches.
        </div>
      ) : null}
      {mode === "listen" && brightness ? (
        <p className="notice">
          Jamendo tracks do not yet have cleared analysis rights. Turn off
          “Feature-ready only” to browse listening records.
        </p>
      ) : null}
      <div className="discovery-layout">
        <section id="discovery-results" tabIndex={-1}>
          {loading || error ? (
            <State
              loading={loading}
              error={error}
              retry={
                mode === "matches" && guest.profile
                  ? () => setMatchRevision((v) => v + 1)
                  : catalogue.retry
              }
            />
          ) : visible.length ? (
            <>
              <TrackRows
                tracks={visible}
                selectedId={active?.id}
                onSelect={inspectTrack}
              />
              {mode === "listen" || !guest.profile ? (
                <Pagination
                  total={catalogue.data?.total || 0}
                  offset={offset}
                  limit={24}
                  setOffset={setOffset}
                />
              ) : (
                <p className="muted results-note">
                  {visible.length} matches · Euclidean distance · selected
                  records excluded
                </p>
              )}
            </>
          ) : (
            <State empty="No records on this frequency. Try another search, genre, or filter." />
          )}
        </section>
        {active ? (
          <aside
            className="track-detail"
            id="track-details"
            tabIndex={-1}
            aria-label="Selected record details"
          >
            <Artwork track={active} />
            <span className="eyebrow">
              {mode === "matches" ? "IN YOUR ORBIT" : "ON THE TURNTABLE"}
            </span>
            <h2>{active.title}</h2>
            <p>{active.artist}</p>
            <div className="detail-controls">
              {active.playback_available ? (
                <button
                  className="play-main"
                  aria-label={`Play selected ${active.title}`}
                  onClick={() => player.play(active, visible)}
                >
                  <Play size={19} fill="currentColor" />
                </button>
              ) : (
                <a
                  className="play-main"
                  aria-label={`Open source for selected ${active.title}`}
                  href={safeURL(active.provider_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArrowUpRight size={19} />
                </a>
              )}
              <SaveButton track={active} />
            </div>
            <hr />
            <h3>
              {active.explanation
                ? "Why this record?"
                : "From the independent catalogue"}
            </h3>
            <p className="detail-explanation">
              {active.explanation ||
                "A genuine Jamendo catalogue record. Explore the artist, read the license and press play to request a current provider stream."}
            </p>
            <span className="tag">{active.genres[0] || "Independent"}</span>
            {active.provider === "fma" ? (
              <p className="muted">
                Research features available. In-app playback is not verified for
                this record.
              </p>
            ) : null}
            <a
              className="text-link"
              href={safeURL(active.provider_url)}
              target="_blank"
              rel="noreferrer"
            >
              Open original source
              <ArrowUpRight size={15} />
            </a>
            {active.license_url ? (
              <a
                className="license-link"
                href={safeURL(active.license_url)}
                target="_blank"
                rel="noreferrer"
              >
                Track license <ExternalLink size={12} />
              </a>
            ) : (
              <small>
                Feature metadata: CC BY 4.0. See source for recording rights.
              </small>
            )}
          </aside>
        ) : null}
      </div>
      <SourceNotice />
    </div>
  );
}

export function Collections({ liked = false }: { liked?: boolean }) {
  const { guest, setGuest } = useGuest();
  const { id } = useParams();
  const [name, setName] = useState(""),
    [rows, setRows] = useState<Track[]>([]),
    [loading, setLoading] = useState(true),
    [missing, setMissing] = useState(0);
  const collection = guest.collections.find((c) => c.id === id),
    ids = liked ? guest.likes : collection?.trackIds || [];
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    Promise.all(
      ids.map((id) =>
        api<Track>("/tracks/" + encodeURIComponent(id)).catch(() => null),
      ),
    ).then((r) => {
      if (!cancel) {
        setRows(r.filter((t): t is Track => !!t));
        setMissing(r.filter((t) => !t).length);
        setLoading(false);
      }
    });
    return () => {
      cancel = true;
    };
  }, [ids.join("|")]);
  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setGuest((g) => ({
      ...g,
      collections: [
        ...g.collections,
        { id: crypto.randomUUID(), name: name.trim(), trackIds: [] },
      ],
    }));
    setName("");
  }
  return (
    <div className="page">
      <PageIntro
        eyebrow="KEEP THE GOOD ONES CLOSE"
        title={
          liked
            ? "LIKED\n& LOVED."
            : collection
              ? collection.name
              : "YOUR PERSONAL\nRECORD STORE."
        }
        description="The records you want to come back to. Collections are saved on this browser only, without an account or cloud synchronization."
      />
      {liked || collection ? (
        <>
          <Link className="text-link" to="/collections">
            <ChevronLeft size={16} />
            All collections
          </Link>
          {loading ? (
            <State loading />
          ) : rows.length ? (
            <TrackRows tracks={rows} />
          ) : (
            <State empty="No records yet. Explore Discover and save something that stays with you." />
          )}
          {collection && rows.length ? (
            <div className="collection-edit">
              <h3>Edit this collection</h3>
              {rows.map((t) => (
                <div key={t.id}>
                  <span>{t.title}</span>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${t.title} from collection`}
                    onClick={() =>
                      setGuest((g) => ({
                        ...g,
                        collections: g.collections.map((c) =>
                          c.id === id
                            ? {
                                ...c,
                                trackIds: c.trackIds.filter(
                                  (tid) => tid !== t.id,
                                ),
                              }
                            : c,
                        ),
                      }))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          {missing ? (
            <div className="notice">
              {missing} saved records are currently unavailable. Their saved IDs
              have been preserved.
            </div>
          ) : null}
        </>
      ) : (
        <>
          <form className="new-collection" onSubmit={create}>
            <label htmlFor="new-collection">
              A name for your next collection
            </label>
            <div>
              <input
                id="new-collection"
                placeholder="Late nights, long roads…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
              />
              <button type="submit" className="button">
                <Plus size={17} />
                Create collection
              </button>
            </div>
          </form>
          <div className="collections-grid">
            <Link to="/liked" className="collection-cover liked-cover">
              <Heart size={52} />
              <span>
                <strong>Liked tracks</strong>
                <small>{guest.likes.length} records</small>
              </span>
              <ArrowUpRight />
            </Link>
            {guest.collections.map((c, i) => (
              <article className="collection-wrapper" key={c.id}>
                <Link
                  to={"/collections/" + c.id}
                  className={"collection-cover collection-art-" + (i % 4)}
                >
                  <Disc3 size={52} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>{c.trackIds.length} records</small>
                  </span>
                  <ArrowUpRight />
                </Link>
                <button
                  className="icon-button"
                  aria-label={`Delete collection ${c.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete “${c.name}” from this browser?`))
                      setGuest((g) => ({
                        ...g,
                        collections: g.collections.filter((v) => v.id !== c.id),
                      }));
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      <div className="collection-footer">
        <Link className="button secondary" to="/discover">
          Find more music
          <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  );
}

export function Legal() {
  const { pathname } = useLocation();
  const { setGuest } = useGuest();
  const privacy = pathname === "/privacy";
  return (
    <div className="page prose">
      <span className="eyebrow">VIBEATLAS / IN THE OPEN</span>
      <h1>
        {privacy
          ? "YOUR DATA.\nYOUR DEVICE."
          : pathname === "/licenses"
            ? "CREDIT WHERE\nIT’S DUE."
            : "GOOD MUSIC.\nOPEN SCIENCE."}
      </h1>
      {privacy ? (
        <>
          <h2>A guest experience</h2>
          <p>
            Likes, collection names, selected track IDs and your profile are
            stored in this browser’s local storage. They do not synchronize
            between devices. Anyone using this browser profile may access them.
          </p>
          <h2>What leaves your browser</h2>
          <p>
            Profile requests send selected track IDs to the backend for
            calculation. This application does not create guest accounts or
            persist guest profiles in the database. Standard infrastructure logs
            may include IP addresses and request paths; preference bodies should
            not be logged.
          </p>
          <p>
            Playing music contacts Jamendo’s servers. Artwork may also load from
            the provider. Their privacy policies apply to those requests. No
            advertising or analytics tracker is included.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              if (
                window.confirm(
                  "Clear all VibeAtlas preferences, likes and collections from this browser?",
                )
              )
                setGuest({
                  version: 1,
                  likes: [],
                  collections: [],
                  selection: [],
                  genres: [],
                  profile: null,
                });
            }}
          >
            Clear my saved data
            <Trash2 size={16} />
          </button>
        </>
      ) : (
        <>
          <p className="serif lead">
            An independent music experience, with its methods out in the open.
          </p>
          <h2>Jamendo listening catalogue</h2>
          <p>
            Music is provided by Jamendo and credited to the named artists.
            Every record links to its original page and returned license.
            Streams are requested from the provider; VibeAtlas does not rehost
            audio, offer downloads or cache music offline. Provider availability
            can change.
          </p>
          <a
            className="text-link"
            href="https://devportal.jamendo.com/api_terms_of_use"
            target="_blank"
            rel="noreferrer"
          >
            Jamendo API terms
            <ArrowUpRight size={15} />
          </a>
          <h2>FMA research features</h2>
          <p>
            Defferrard, Benzi, Vandergheynst & Bresson, FMA: A Dataset for Music
            Analysis, ISMIR 2017. Published metadata and precomputed descriptors
            are used under CC BY 4.0. VibeAtlas selects a bounded subset,
            transforms descriptors and fits models. Recording licenses differ.
            No FMA audio was downloaded or analyzed here.
          </p>
          <a
            className="text-link"
            href="https://github.com/mdeff/fma"
            target="_blank"
            rel="noreferrer"
          >
            Dataset & attribution
            <ArrowUpRight size={15} />
          </a>
          <p>
            FMA profiles and Jamendo listening remain separate. A recommendation
            from FMA features does not claim a match to a Jamendo recording.
          </p>
          <h2>Visual credits</h2>
          <p>
            Stage photograph: Yuri Oliveira, “Mc Mirella,” via Wikimedia
            Commons, CC BY 2.0. Cropped and color-treated for the editorial
            header. It is decorative editorial imagery; no endorsement or
            catalogue membership is implied.
          </p>
          <a
            className="text-link"
            href="https://commons.wikimedia.org/wiki/File:Mc_Mirella_(51893938577).png"
            target="_blank"
            rel="noreferrer"
          >
            Photograph and license
            <ArrowUpRight size={15} />
          </a>
          <p>
            Fallback sleeves and profile artwork are original CSS compositions.
            They are not original album covers. Barlow Condensed, DM Sans and
            Libre Baskerville are bundled with their open font licenses.
          </p>
          <a
            className="text-link"
            href="/notices/THIRD_PARTY_NOTICES.txt"
            target="_blank"
            rel="noreferrer"
          >
            Software and font license notices
            <ArrowUpRight size={15} />
          </a>
          <h2>Unit 3 in action</h2>
          <p>
            Built for SRM IST course 21CSC305P. K-Means, Gaussian mixtures and
            EM, PCA, Factor Analysis, hierarchy and distance-based discovery
            execute in the offline Python pipeline. The ML Lab displays its
            actual outputs. Unit 3 slides were not supplied; exact slide
            references are pending.
          </p>
          <p>
            Musical personality names are creative descriptions, not validated
            psychology. The application code is MIT licensed; third-party
            content retains its own terms.
          </p>
          <Link className="button" to="/ml-lab">
            Explore the ML Lab
            <ArrowRight size={17} />
          </Link>
        </>
      )}
    </div>
  );
}
export function NotFound() {
  return (
    <div className="page">
      <span className="eyebrow">404 / OFF THE RECORD</span>
      <h1>{"LOST THE\nFREQUENCY?"}</h1>
      <p>This page isn’t in our collection.</p>
      <Link className="button" to="/">
        Back to Home
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
