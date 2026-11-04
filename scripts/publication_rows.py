"""Build database rows from actual catalogue and trained artifacts; performs no I/O writes."""

import json
from datetime import datetime, timezone
import numpy as np
from backend.config import DATA, ARTIFACTS


def build_rows():
    listening = json.loads((DATA / "jamendo.json").read_text(encoding="utf-8"))
    research = json.loads((DATA / "features.json").read_text(encoding="utf-8"))
    manifest = json.loads((ARTIFACTS / "release.json").read_text(encoding="utf-8"))
    model = json.loads(
        (ARTIFACTS / manifest["artifact_file"]).read_text(encoding="utf-8")
    )
    tracks = listening["tracks"] + research["tracks"]
    now = datetime.now(timezone.utc).isoformat()
    songs = [
        {
            "id": t["id"],
            "provider": t["provider"],
            "provider_track_id": t["id"].split(":", 1)[1],
            "title": t["title"],
            "artist": t["artist"],
            "album": t["album"],
            "genres": t["genres"],
            "duration": t["duration"],
            "image_url": t["image_url"],
            "provider_url": t["provider_url"],
            "license_url": t["license_url"],
            "availability_status": "available",
            "playback_available": t["playback_available"],
            "analysis_permission": "precomputed_features_CC_BY_4"
            if t["provider"] == "fma"
            else "unverified",
            "metadata_source": "FMA metadata CC BY 4.0"
            if t["provider"] == "fma"
            else "Jamendo API v3",
            "last_verified_at": now,
        }
        for t in tracks
    ]
    attributions = [
        {
            "song_id": t["id"],
            "source_url": t["provider_url"],
            "license_url": t["license_url"]
            or "https://creativecommons.org/licenses/by/4.0/",
            "attribution_text": f"{t['title']} — {t['artist']}. "
            + (
                "Music provided by Jamendo. Recording rights follow the linked license."
                if t["provider"] == "jamendo"
                else "FMA metadata/features: Defferrard et al., ISMIR 2017, CC BY 4.0. Selected and transformed by VibeAtlas. This metadata license does not grant recording playback rights."
            ),
            "verified_at": now,
        }
        for t in tracks
    ]
    features = [
        {
            "song_id": id,
            "feature_schema_version": model["feature_schema"],
            "extraction_version": "fma-published-descriptors-v1",
            "feature_vector": vector,
            "provenance": {
                "source": "https://github.com/mdeff/fma",
                "license": "CC BY 4.0",
                "archive_sha1": research["archive_sha1"],
                "audio_accessed": False,
            },
            "quality_status": "valid",
        }
        for id, vector in zip(research["ids"], research["vectors"])
    ]
    runs = []
    clusters = []
    X = np.asarray(model["scaled_features"])
    release = model["release"]

    def run(id, kind, parameters, metrics):
        runs.append(
            {
                "id": id,
                "model_type": kind,
                "model_version": release,
                "dataset_hash": model["dataset_hash"],
                "feature_schema_version": model["feature_schema"],
                "parameters": parameters,
                "evaluation_metrics": metrics,
                "manifest_checksum": manifest["artifact_sha256"],
            }
        )

    for k, value in model["kmeans"].items():
        id = f"{release}:kmeans:{k}"
        run(
            id,
            "kmeans",
            {"k": int(k), "seed": 42, "n_init": 20},
            {name: value[name] for name in ("inertia", "silhouette", "stability_ari")},
        )
        centers = np.asarray(value["centroids"])
        clusters.extend(
            {
                "song_id": song,
                "model_run_id": id,
                "cluster_id": label,
                "assignment_distance": float(np.linalg.norm(X[i] - centers[label])),
                "membership_probabilities": None,
            }
            for i, (song, label) in enumerate(zip(model["ids"], value["labels"]))
        )
    id = release + ":gmm"
    g = model["gmm"]
    run(
        id,
        "gmm",
        {
            "components": g["components"],
            "covariance_type": g["covariance_type"],
            "seed": 42,
        },
        {"test_log_likelihood": g["test_log_likelihood"], "converged": g["converged"]},
    )
    clusters.extend(
        {
            "song_id": song,
            "model_run_id": id,
            "cluster_id": int(np.argmax(p)),
            "assignment_distance": None,
            "membership_probabilities": p,
        }
        for song, p in zip(model["ids"], g["probabilities"])
    )
    id = release + ":pca"
    run(
        id,
        "pca",
        {"components": 17},
        {"explained_variance_ratio": model["pca"]["explained_variance_ratio"]},
    )
    embeddings = [
        {
            "song_id": song,
            "model_run_id": id,
            "projection_method": "pca",
            "x": point[0],
            "y": point[1],
        }
        for song, point in zip(model["ids"], model["pca"]["coordinates"])
    ]
    run(
        release + ":factors",
        "factor_analysis",
        {"components": model["factors"]["dimensions"], "seed": 42},
        {"test_log_likelihood": model["factors"]["test_log_likelihood"]},
    )
    run(
        release + ":hierarchy",
        "ward_hierarchy",
        {"sample_size": len(model["hierarchy"]["ids"]), "seed": 42},
        {"cophenetic_correlation": model["hierarchy"]["cophenetic_correlation"]},
    )
    return {
        "songs": songs,
        "source_attributions": attributions,
        "audio_features": features,
        "model_runs": runs,
        "song_clusters": clusters,
        "song_embeddings": embeddings,
    }
