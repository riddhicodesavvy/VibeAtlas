"""Prepare a bounded real FMA feature corpus; never downloads audio.

Source: Defferrard et al. FMA (ISMIR 2017), metadata CC BY 4.0.
Download the official metadata ZIP, then run python -m ml.prepare_fma.
"""

import csv
import hashlib
import io
import json
import random
import zipfile
from collections import defaultdict
from backend.config import DATA

ARCHIVE_SHA1 = "f0df49ffe5f2a6008d7dc83c6915b31835dfe733"
FEATURES = [
    ("rmse", "mean", "01", "RMS level", "amplitude"),
    ("spectral_centroid", "mean", "01", "Spectral brightness", "Hz"),
    ("spectral_rolloff", "mean", "01", "Spectral rolloff", "Hz"),
    ("spectral_bandwidth", "mean", "01", "Spectral bandwidth", "Hz"),
    ("zcr", "mean", "01", "Zero-crossing rate", "ratio"),
] + [
    ("mfcc", stat, f"{i:02}", f"MFCC {i} {stat}", "coefficient")
    for stat in ("mean", "std")
    for i in range(1, 7)
]


def rows(z, name):
    return csv.reader(
        io.TextIOWrapper(z.open("fma_metadata/" + name), encoding="utf-8", newline="")
    )


def prepare(per_genre=80):
    path = DATA / "raw/fma_metadata.zip"
    with path.open("rb") as f:
        digest = hashlib.file_digest(f, "sha1").hexdigest()
    if digest != ARCHIVE_SHA1:
        raise ValueError("Official FMA archive checksum mismatch.")
    with zipfile.ZipFile(path) as z:
        reader = rows(z, "tracks.csv")
        a = next(reader)
        b = next(reader)
        next(reader)
        columns = list(zip(a, b))
        candidates = defaultdict(list)

        def col(row, group, key):
            return row[columns.index((group, key))]

        for row in reader:
            if col(row, "set", "subset") != "small":
                continue
            genre = col(row, "track", "genre_top")
            if not genre:
                continue
            candidates[genre].append(
                {
                    "id": "fma:" + row[0],
                    "provider": "fma",
                    "title": col(row, "track", "title"),
                    "artist": col(row, "artist", "name"),
                    "artist_id": col(row, "artist", "id"),
                    "album": col(row, "album", "title"),
                    "genres": [genre],
                    "duration": float(col(row, "track", "duration") or 0),
                    "image_url": "",
                    "provider_url": "https://freemusicarchive.org/",
                    "license_url": "",
                    "audio_license": col(row, "track", "license"),
                    "feature_ready": True,
                    "playback_available": False,
                }
            )
        chosen = {}
        rng = random.Random(42)
        for genre in sorted(candidates):
            pool = candidates[genre]
            rng.shuffle(pool)
            counts = defaultdict(int)
            total = 0
            for t in pool:
                if counts[t["artist_id"]] >= 4:
                    continue
                chosen[t["id"]] = t
                counts[t["artist_id"]] += 1
                total += 1
                if total >= per_genre:
                    break
        reader = rows(z, "features.csv")
        head = [next(reader) for _ in range(3)]
        next(reader)
        cols = list(zip(*head))
        wanted = [cols.index(f[:3]) for f in FEATURES]
        vectors = {}
        for row in reader:
            key = "fma:" + row[0]
            if key in chosen:
                values = [float(row[j]) for j in wanted]
                if all(abs(v) < 1e12 for v in values):
                    vectors[key] = values
        # Original source links are metadata; no stream URL is invented.
        reader = rows(z, "raw_tracks.csv")
        header = next(reader)
        url_i = header.index("track_url")
        id_i = header.index("track_id")
        for row in reader:
            key = "fma:" + row[id_i]
            if key in chosen:
                source = row[url_i].replace("http://", "https://", 1)
                if source.startswith("https://freemusicarchive.org/"):
                    chosen[key]["provider_url"] = source
        tracks = [chosen[k] for k in sorted(vectors)]
        features = [
            {"name": f"{f[0]}_{f[1]}_{f[2]}", "label": f[3], "unit": f[4]}
            for f in FEATURES
        ]
        document = {
            "source": "FMA: A Dataset for Music Analysis (Defferrard et al., ISMIR 2017)",
            "source_url": "https://github.com/mdeff/fma",
            "license": "CC BY 4.0 (metadata and precomputed descriptors; audio licenses differ)",
            "archive_sha1": digest,
            "seed": 42,
            "tracks": tracks,
            "features": features,
            "ids": [t["id"] for t in tracks],
            "vectors": [vectors[t["id"]] for t in tracks],
        }
        DATA.mkdir(exist_ok=True)
        (DATA / "fma.json").write_text(
            json.dumps(
                {
                    "source": document["source"],
                    "license": document["license"],
                    "tracks": tracks,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
        (DATA / "features.json").write_text(
            json.dumps(document, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        print(
            f"Prepared {len(tracks)} real FMA records, {len(features)} descriptors. No audio accessed."
        )


if __name__ == "__main__":
    prepare()
