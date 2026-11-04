import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Guest, Track } from "./types";
import { api } from "./api";

import { readGuest } from "./storage";
interface GuestState {
  guest: Guest;
  setGuest: React.Dispatch<React.SetStateAction<Guest>>;
  storageError: boolean;
  toggleLike: (id: string) => void;
}
const GuestContext = createContext<GuestState | null>(null);
export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<Guest>(readGuest),
    [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("vibeatlas.guest.v1", JSON.stringify(guest));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [guest]);
  return (
    <GuestContext.Provider
      value={{
        guest,
        setGuest,
        storageError,
        toggleLike: (id) =>
          setGuest((g) => ({
            ...g,
            likes: g.likes.includes(id)
              ? g.likes.filter((v) => v !== id)
              : [...g.likes, id],
          })),
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}
export function useGuest() {
  const c = useContext(GuestContext);
  if (!c) throw new Error("Missing GuestProvider");
  return c;
}
interface PlayerState {
  current: Track | null;
  playing: boolean;
  busy: boolean;
  error: string;
  time: number;
  duration: number;
  volume: number;
  play: (t: Track, q?: Track[]) => void;
  toggle: () => void;
  next: (direction: number) => void;
  seek: (n: number) => void;
  setVolume: (n: number) => void;
}
const PlayerContext = createContext<PlayerState | null>(null);
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null),
    generation = useRef(0),
    queue = useRef<Track[]>([]);
  const [current, setCurrent] = useState<Track | null>(null),
    [playing, setPlaying] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [volume, setVolumeState] = useState(0.7);
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.volume = 0.7;
    audio.current = a;
    const tick = () => setTime(a.currentTime),
      meta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0),
      p = () => setPlaying(true),
      pause = () => setPlaying(false),
      fail = () => {
        setError(
          "This stream could not be played. Open the provider page or choose another track.",
        );
        setBusy(false);
        setPlaying(false);
      };
    a.addEventListener("timeupdate", tick);
    a.addEventListener("durationchange", meta);
    a.addEventListener("playing", p);
    a.addEventListener("pause", pause);
    a.addEventListener("error", fail);
    return () => {
      generation.current++;
      a.pause();
      a.removeAttribute("src");
      a.load();
      audio.current = null;
    };
  }, []);
  async function play(t: Track, q?: Track[]) {
    const a = audio.current;
    if (!a) return;
    const token = ++generation.current;
    a.pause();
    a.removeAttribute("src");
    a.load();
    setCurrent(t);
    setTime(0);
    setDuration(0);
    setError("");
    setBusy(true);
    if (q) queue.current = q.filter((t) => t.playback_available);
    if (!t.playback_available) {
      setError(
        "This research record has no verified in-app stream. Use its original source link.",
      );
      setBusy(false);
      return;
    }
    try {
      const result = await api<{ url: string }>(
        "/tracks/" + encodeURIComponent(t.id) + "/playback",
      );
      if (token !== generation.current) return;
      a.src = result.url;
      await a.play();
    } catch (e) {
      if (token === generation.current)
        setError(e instanceof Error ? e.message : "Playback unavailable.");
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  function next(direction: number) {
    const q = queue.current;
    if (!q.length) return;
    const at = q.findIndex((t) => t.id === current?.id);
    void play(q[(at + direction + q.length) % q.length]);
  }
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const ended = () => next(1);
    a.addEventListener("ended", ended);
    return () => a.removeEventListener("ended", ended);
  }, [current]);
  function toggle() {
    const a = audio.current;
    if (!a || !current) return;
    if (playing) a.pause();
    else if (a.src)
      void a
        .play()
        .catch(() =>
          setError(
            "Your browser denied playback. Press play again or open the source.",
          ),
        );
    else void play(current);
  }
  return (
    <PlayerContext.Provider
      value={{
        current,
        playing,
        busy,
        error,
        time,
        duration,
        volume,
        play: (t, q) => void play(t, q),
        toggle,
        next,
        seek: (n) => {
          if (audio.current && Number.isFinite(audio.current.duration))
            audio.current.currentTime = n;
        },
        setVolume: (n) => {
          if (audio.current) audio.current.volume = n;
          setVolumeState(n);
        },
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}
export function usePlayer() {
  const c = useContext(PlayerContext);
  if (!c) throw new Error("Missing PlayerProvider");
  return c;
}
