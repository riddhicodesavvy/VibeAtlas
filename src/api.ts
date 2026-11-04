import { useEffect, useState } from "react";
const BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "") + "/api/v1";
export async function api<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(BASE + path, {
    signal,
    cache: "no-store",
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let message = "The service is unavailable. Please retry.";
    try {
      const error = await r.json();
      message =
        typeof error.detail === "string"
          ? error.detail
          : typeof error.detail?.message === "string"
            ? error.detail.message
            : r.status === 422
              ? "Check your selections and try again."
              : message;
    } catch {
      /* Keep a safe error. */
    }
    throw new Error(message);
  }
  return r.json();
}
export function useRemote<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setError("");
    setLoading(true);
    setData(null);
    if (!path) {
      setLoading(false);
      return;
    }
    api<T>(path, undefined, abort.signal)
      .then(setData)
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(e instanceof Error ? e.message : "Unable to load data.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [path, revision]);
  return { data, error, loading, retry: () => setRevision((v) => v + 1) };
}
export const safeURL = (value: string) => {
  try {
    const u = new URL(value);
    if (u.protocol === "http:" && u.hostname === "creativecommons.org")
      u.protocol = "https:";
    return u.protocol === "https:" && !u.username && !u.password ? u.href : "#";
  } catch {
    return "#";
  }
};
