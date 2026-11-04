import type { Guest, Profile } from "./types";

export const emptyGuest: Guest = {
  version: 1,
  likes: [],
  collections: [],
  selection: [],
  genres: [],
  profile: null,
};
const freshGuest = (): Guest => ({
  ...emptyGuest,
  likes: [],
  collections: [],
  selection: [],
  genres: [],
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown, max = 1000): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value.filter(
            (s): s is string => typeof s === "string" && s.length <= 200,
          ),
        ),
      ).slice(0, max)
    : [];
const finite = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value);
function validProfile(value: unknown): value is Profile {
  if (!isRecord(value)) return false;
  if (
    ![
      "release",
      "dataset",
      "feature_schema",
      "label",
      "description",
      "method",
      "disclaimer",
    ].every((k) => typeof value[k] === "string")
  )
    return false;
  if (
    !["cluster_id", "cluster_distance", "spread", "selected_count"].every((k) =>
      finite(value[k]),
    )
  )
    return false;
  if (
    !Array.isArray(value.features) ||
    !value.features.length ||
    !value.features.every(
      (f) =>
        isRecord(f) &&
        typeof f.name === "string" &&
        typeof f.label === "string" &&
        typeof f.unit === "string" &&
        finite(f.value) &&
        finite(f.percentile) &&
        Number(f.percentile) >= 0 &&
        Number(f.percentile) <= 100,
    )
  )
    return false;
  if (
    !Array.isArray(value.related_clusters) ||
    !value.related_clusters.every(
      (c) =>
        isRecord(c) &&
        finite(c.cluster_id) &&
        finite(c.distance) &&
        typeof c.name === "string",
    )
  )
    return false;
  return (
    Array.isArray(value.memberships) &&
    value.memberships.length > 0 &&
    value.memberships.every(
      (v) => finite(v) && Number(v) >= 0 && Number(v) <= 1,
    )
  );
}

export function parseGuest(serialized: string | null): Guest {
  try {
    const raw: unknown = JSON.parse(serialized || "null");
    if (!isRecord(raw) || raw.version !== 1) return freshGuest();
    const collections = Array.isArray(raw.collections)
      ? raw.collections
          .filter(isRecord)
          .filter((c) => typeof c.id === "string" && typeof c.name === "string")
          .slice(0, 100)
          .map((c) => ({
            id: String(c.id).slice(0, 100),
            name: String(c.name).slice(0, 80),
            trackIds: strings(c.trackIds),
          }))
      : [];
    return {
      version: 1,
      likes: strings(raw.likes),
      selection: strings(raw.selection, 30),
      genres: strings(raw.genres, 20),
      collections,
      profile: validProfile(raw.profile) ? raw.profile : null,
    };
  } catch {
    return freshGuest();
  }
}

export function readGuest(): Guest {
  try {
    return parseGuest(localStorage.getItem("vibeatlas.guest.v1"));
  } catch {
    return freshGuest();
  }
}
