import { useRef, useState } from "react";
import CollectionModal from "./CollectionModal";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Heart,
  Play,
  Pause,
  Plus,
  Disc3,
  LoaderCircle,
} from "lucide-react";
import type { Track } from "./types";
import { useGuest, usePlayer } from "./state";
import { safeURL } from "./api";

export function Artwork({
  track,
  className = "",
}: {
  track: Track;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const number =
    Array.from(track.id).reduce((a, c) => a + c.charCodeAt(0), 0) % 6;
  return (
    <div className={"artwork sleeve-" + number + " " + className}>
      {track.image_url && !failed ? (
        <img
          src={safeURL(track.image_url)}
          alt={`${track.album || track.title} artwork`}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="fallback-sleeve"
          aria-label="Decorative sleeve; original artwork unavailable"
        >
          <div className="sleeve-orbit" />
          <span>{track.artist}</span>
          <strong>{track.title}</strong>
          <small>VIBEATLAS / RESEARCH ARCHIVE</small>
        </div>
      )}
    </div>
  );
}
export function State({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: string;
  empty?: string;
  retry?: () => void;
}) {
  if (loading)
    return (
      <div className="state" role="status">
        <LoaderCircle className="spin" />
        <span>Finding the next frequency…</span>
      </div>
    );
  if (error)
    return (
      <div className="state" role="alert">
        <strong>We lost the signal.</strong>
        <p>{error}</p>
        {retry ? (
          <button className="button secondary" onClick={retry}>
            Try again
          </button>
        ) : null}
      </div>
    );
  return (
    <div className="state">
      <Disc3 />
      <p>{empty || "Nothing here yet."}</p>
    </div>
  );
}
export function PageIntro({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title.replaceAll("\\n", "\n")}</h1>
      </div>
      <div className="intro-copy">
        <p>{description}</p>
        {children}
      </div>
    </header>
  );
}
export function SourceNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className="source-notice">
      <span className="status-dot" />{" "}
      {compact
        ? "Real features. Transparent methods."
        : "The listening catalogue is provided by Jamendo. Profiles and ML experiments use published FMA audio descriptors; the two datasets are not linked."}{" "}
      <Link to="/licenses">
        Data & rights <ArrowUpRight size={12} />
      </Link>
    </p>
  );
}
export function SaveButton({ track }: { track: Track }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={trigger}
        className="icon-button"
        aria-label={`Save ${track.title} to collection`}
        onClick={() => setOpen(true)}
      >
        <Plus size={17} />
      </button>
      {open ? (
        <CollectionModal
          track={track}
          onClose={() => {
            setOpen(false);
            trigger.current?.focus();
          }}
        />
      ) : null}
    </>
  );
}
export function TrackCard({ track, queue }: { track: Track; queue?: Track[] }) {
  const { guest, toggleLike } = useGuest(),
    player = usePlayer();
  return (
    <article className="track-card">
      <button
        className="cover-button"
        aria-label={`${track.playback_available ? "Play" : "Open source for"} ${track.title}`}
        onClick={() =>
          track.playback_available
            ? player.play(track, queue)
            : window.open(
                safeURL(track.provider_url),
                "_blank",
                "noopener,noreferrer",
              )
        }
      >
        <Artwork track={track} />
        <span className="cover-play">
          {track.playback_available ? (
            <Play size={20} fill="currentColor" />
          ) : (
            <ArrowUpRight size={20} />
          )}
        </span>
      </button>
      <div className="card-title">
        <h3>{track.title}</h3>
        <button
          className={
            "icon-button " + (guest.likes.includes(track.id) ? "liked" : "")
          }
          aria-label={`${guest.likes.includes(track.id) ? "Unlike" : "Like"} ${track.title}`}
          aria-pressed={guest.likes.includes(track.id)}
          onClick={() => toggleLike(track.id)}
        >
          <Heart
            size={17}
            fill={guest.likes.includes(track.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <p>{track.artist}</p>
      <div className="card-meta">
        <span>{track.genres[0] || "Independent"}</span>
        <a
          href={safeURL(track.provider_url)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${track.title} on ${track.provider}`}
        >
          {track.provider === "jamendo" ? "Jamendo" : "FMA"}{" "}
          <ArrowUpRight size={12} />
        </a>
      </div>
      {track.distance != null ? (
        <small className="distance">
          Feature distance {track.distance.toFixed(2)}
        </small>
      ) : null}
    </article>
  );
}
export function TrackRows({
  tracks,
  selectedId,
  onSelect,
  selectable,
  selected = [],
}: {
  tracks: Track[];
  selectedId?: string;
  onSelect?: (t: Track) => void;
  selectable?: boolean;
  selected?: string[];
}) {
  const { guest, toggleLike } = useGuest(),
    player = usePlayer();
  return (
    <div className="track-table">
      <div className="track-head">
        <span>#</span>
        <span>TRACK / ARTIST</span>
        <span>GENRE</span>
        <span>{selectable ? "SELECT" : "DISTANCE"}</span>
        <span />
      </div>
      {tracks.map((t, i) => (
        <div
          className={"track-row " + (selectedId === t.id ? "active" : "")}
          key={t.id}
        >
          <button
            className="row-play icon-button"
            aria-label={`${t.playback_available ? "Play" : "Open source for"} ${t.title}`}
            onClick={() =>
              t.playback_available
                ? player.play(t, tracks)
                : window.open(
                    safeURL(t.provider_url),
                    "_blank",
                    "noopener,noreferrer",
                  )
            }
          >
            {!t.playback_available ? (
              <ArrowUpRight size={15} />
            ) : player.current?.id === t.id && player.playing ? (
              <Pause size={15} />
            ) : (
              <Play size={15} />
            )}
            <span>{i + 1}</span>
          </button>
          <button
            className="track-identity"
            onClick={() =>
              onSelect
                ? onSelect(t)
                : window.open(
                    safeURL(t.provider_url),
                    "_blank",
                    "noopener,noreferrer",
                  )
            }
            aria-label={`${selectable ? "Select" : "Inspect"} ${t.title}`}
          >
            <Artwork track={t} />
            <span>
              <strong>{t.title}</strong>
              <small>{t.artist}</small>
            </span>
          </button>
          <span className="row-genre">{t.genres[0] || "Independent"}</span>
          {selectable ? (
            <input
              type="checkbox"
              aria-label={`Choose ${t.title}`}
              checked={selected.includes(t.id)}
              onChange={() => onSelect?.(t)}
            />
          ) : (
            <span className="row-distance">
              {t.distance != null ? t.distance.toFixed(2) : "—"}
            </span>
          )}
          <div className="row-actions">
            <button
              className={
                "icon-button " + (guest.likes.includes(t.id) ? "liked" : "")
              }
              aria-label={`${guest.likes.includes(t.id) ? "Unlike" : "Like"} ${t.title}`}
              aria-pressed={guest.likes.includes(t.id)}
              onClick={() => toggleLike(t.id)}
            >
              <Heart
                size={16}
                fill={guest.likes.includes(t.id) ? "currentColor" : "none"}
              />
            </button>
            {!selectable ? <SaveButton track={t} /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
