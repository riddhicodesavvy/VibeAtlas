import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  Disc3,
  LoaderCircle,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  X,
} from "lucide-react";
import { usePlayer } from "./state";
import { safeURL } from "./api";
import { Artwork } from "./components";

const minutes = (n: number) =>
  `${Math.floor(n / 60)}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
export default function AudioPlayer() {
  const p = usePlayer();
  const [expanded, setExpanded] = useState(false),
    [dismissed, setDismissed] = useState("");
  return (
    <footer
      className={
        "audio-player " +
        (!p.current ? "idle " : "") +
        (expanded ? "expanded" : "")
      }
      aria-label="Music player"
    >
      <div className="playing-track">
        {p.current ? (
          <Artwork track={p.current} />
        ) : (
          <div className="idle-record">
            <Disc3 />
          </div>
        )}
        <div>
          <strong>
            {p.current?.title || "Your next discovery is waiting"}
          </strong>
          <small>
            {p.current?.artist || "Independent music. An open mind."}
          </small>
          {p.current ? (
            <a
              href={safeURL(p.current.provider_url)}
              target="_blank"
              rel="noreferrer"
            >
              {p.current.provider === "jamendo"
                ? "Provided by Jamendo"
                : "FMA research record"}{" "}
              ↗
            </a>
          ) : null}
        </div>
        <button
          className="icon-button expand-player"
          aria-label={expanded ? "Collapse player" : "Expand player"}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
        </button>
      </div>
      <div className="player-center">
        <div className="player-buttons">
          <button
            className="icon-button"
            aria-label="Previous track"
            disabled={!p.current}
            onClick={() => p.next(-1)}
          >
            <SkipBack size={19} />
          </button>
          <button
            className="play-main"
            aria-label={p.playing ? "Pause" : "Play"}
            disabled={!p.current || p.busy}
            onClick={p.toggle}
          >
            {p.busy ? (
              <LoaderCircle size={20} className="spin" />
            ) : p.playing ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Next track"
            disabled={!p.current}
            onClick={() => p.next(1)}
          >
            <SkipForward size={19} />
          </button>
        </div>
        <label className="seek-label">
          <span>{minutes(p.time)}</span>
          <input
            aria-label="Seek"
            type="range"
            min={0}
            max={p.duration || 1}
            value={Math.min(p.time, p.duration || 1)}
            disabled={!p.duration}
            onChange={(e) => p.seek(Number(e.target.value))}
          />
          <span>{minutes(p.duration)}</span>
        </label>
      </div>
      <label className="volume">
        <Volume2 size={18} />
        <input
          aria-label="Volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={p.volume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
        />
      </label>
      {p.error && dismissed !== p.error ? (
        <div className="playback-error" role="alert">
          {p.error}{" "}
          {p.current ? (
            <a
              href={safeURL(p.current.provider_url)}
              target="_blank"
              rel="noreferrer"
            >
              Open source ↗
            </a>
          ) : null}
          <button
            className="icon-button"
            aria-label="Dismiss playback message"
            onClick={() => setDismissed(p.error)}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
    </footer>
  );
}
