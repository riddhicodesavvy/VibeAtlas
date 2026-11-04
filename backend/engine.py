"""Inference only: numeric exports, no training and no audio acquisition."""

import hashlib
import json
from functools import lru_cache
from pathlib import Path
import numpy as np
from fastapi import HTTPException
from .config import ARTIFACTS, DATA
from .schemas import Profile


@lru_cache(maxsize=1)
def catalogue():
    rows = []
    for name in ("jamendo.json", "fma.json"):
        path = DATA / name
        if path.exists():
            rows.extend(json.loads(path.read_text(encoding="utf-8"))["tracks"])
    return {t["id"]: t for t in rows}


class Engine:
    def __init__(self):
        path = ARTIFACTS / "release.json"
        if not path.exists():
            raise HTTPException(
                503,
                "No trained release. Run python -m ml.train after preparing the licensed dataset.",
            )
        try:
            manifest = json.loads(path.read_text(encoding="utf-8"))
            filename = manifest["artifact_file"]
            if Path(filename).name != filename or not filename.endswith(".json"):
                raise ValueError("Invalid artifact filename")
            raw = (ARTIFACTS / filename).read_bytes()
            if hashlib.sha256(raw).hexdigest() != manifest["artifact_sha256"]:
                raise ValueError("Checksum mismatch")
            self.a = json.loads(raw)
            if any(
                self.a[k] != manifest[k]
                for k in ("release", "dataset_hash", "feature_schema")
            ):
                raise ValueError("Incompatible release manifest")
            self.ids = self.a["ids"]
            self.index = {v: i for i, v in enumerate(self.ids)}
            self.X = np.asarray(self.a["scaled_features"], dtype=float)
            self.raw = np.asarray(self.a["raw_features"], dtype=float)
            self.centroids = np.asarray(
                self.a["kmeans"][str(self.a["chosen_k"])]["centroids"], dtype=float
            )
            expected = (len(self.ids), len(self.a["features"]))
            if (
                self.X.shape != expected
                or self.raw.shape != expected
                or len(self.index) != len(self.ids)
                or expected[0] < 3
                or expected[1] < 5
            ):
                raise ValueError("Inconsistent feature schema")
            if not all(
                np.isfinite(a).all() for a in (self.X, self.raw, self.centroids)
            ):
                raise ValueError("Nonfinite model data")
        except (OSError, KeyError, ValueError, TypeError):
            raise HTTPException(
                503,
                "The trained release is missing, damaged or incompatible. Restore a verified artifact and retry.",
            ) from None

    def validate(self, selection):
        if selection.release and selection.release != self.a["release"]:
            raise HTTPException(
                409,
                "The model changed. Recompute your profile with the current release.",
            )
        missing = [i for i in selection.track_ids if i not in self.index]
        if missing:
            raise HTTPException(
                422,
                {
                    "message": "Choose at least three tracks from the FMA analysis catalogue. Jamendo audio has not been analyzed.",
                    "invalid_track_ids": missing,
                },
            )
        return [self.index[i] for i in selection.track_ids]

    def profile(self, selection):
        indexes = self.validate(selection)
        u = self.X[indexes].mean(axis=0)
        distances = np.linalg.norm(self.centroids - u, axis=1)
        nearest = int(distances.argmin())
        summary = []
        for j, definition in enumerate(self.a["features"][:5]):
            value = float(self.raw[indexes, j].mean())
            summary.append(
                {
                    **definition,
                    "value": value,
                    "percentile": float((self.raw[:, j] <= value).mean() * 100),
                }
            )
        memberships = (
            np.asarray(self.a["gmm"]["probabilities"])[indexes].mean(axis=0).tolist()
        )
        info = self.a["cluster_descriptions"][str(nearest)]
        return Profile(
            release=self.a["release"],
            dataset=self.a["dataset"],
            feature_schema=self.a["feature_schema"],
            label=info["name"],
            description=info["description"],
            cluster_id=nearest,
            cluster_distance=float(distances[nearest]),
            related_clusters=[
                {
                    "cluster_id": int(c),
                    "name": self.a["cluster_descriptions"][str(c)]["name"],
                    "distance": float(distances[c]),
                }
                for c in np.argsort(distances)[1:4]
            ],
            features=summary,
            memberships=memberships,
            spread=float(np.linalg.norm(self.X[indexes] - u, axis=1).mean()),
            selected_count=len(indexes),
            method="Mean standardized descriptor vector; Euclidean distance. Genres filter discovery, not the measured profile.",
            disclaimer="A creative description of selected recordings, not a psychological assessment. FMA features are separate from Jamendo playback.",
        )

    def recommend(self, selection):
        indexes = self.validate(selection)
        u = self.X[indexes].mean(axis=0)
        distances = np.linalg.norm(self.X - u, axis=1)
        rows = []
        tracks = catalogue()
        for i in sorted(
            range(len(self.ids)), key=lambda i: (float(distances[i]), self.ids[i])
        ):
            if i in indexes:
                continue
            track = tracks.get(self.ids[i])
            if not track:
                continue
            if (
                selection.q
                and selection.q.casefold()
                not in (track["title"] + " " + track["artist"]).casefold()
            ):
                continue
            if selection.genre and selection.genre not in track["genres"]:
                continue
            if (
                selection.brightness_min is not None
                and self.raw[i, 1] < selection.brightness_min
            ):
                continue
            if (
                selection.brightness_max is not None
                and self.raw[i, 1] > selection.brightness_max
            ):
                continue
            contributions = (self.X[i] - u) ** 2
            closest = np.argsort(contributions[:5])[:2]
            labels = [self.a["features"][j]["label"].lower() for j in closest]
            rows.append(
                {
                    **track,
                    "distance": float(distances[i]),
                    "explanation": f"Closest measured characteristics: {' and '.join(labels)}. Ranked by Euclidean distance across all {self.X.shape[1]} scaled descriptors; lower is closer.",
                }
            )
            if len(rows) >= selection.limit:
                break
        return rows


@lru_cache(maxsize=1)
def engine():
    return Engine()
