"""Offline training and immutable numeric artifact publication."""

import hashlib
import json
import os
import platform
import warnings
from pathlib import Path
import numpy as np
import sklearn
import scipy
from scipy.cluster.hierarchy import linkage, cophenet
from scipy.spatial.distance import pdist
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA, FactorAnalysis
from sklearn.metrics import silhouette_score, adjusted_rand_score
from sklearn.mixture import GaussianMixture
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import StandardScaler
from threadpoolctl import threadpool_limits
from backend.config import DATA, ARTIFACTS

SEED = 42


def transformed(raw):
    x = np.array(raw, dtype=float, copy=True)
    # Positive spectral quantities span orders of magnitude. MFCC means retain sign.
    x[:, :5] = np.log1p(np.maximum(x[:, :5], 0))
    return x


def fit_release():
    source_bytes = (DATA / "features.json").read_bytes()
    data = json.loads(source_bytes)
    raw = np.asarray(data["vectors"], dtype=float)
    if not np.isfinite(raw).all() or len(raw) < 30:
        raise ValueError("Insufficient valid real observations.")
    groups = [t["artist_id"] for t in data["tracks"]]
    train, hold = next(
        GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=SEED).split(
            raw, groups=groups
        )
    )
    hold_train, hold_test = next(
        GroupShuffleSplit(n_splits=1, test_size=0.5, random_state=SEED).split(
            raw[hold], groups=np.asarray(groups)[hold]
        )
    )
    validation, test = hold[hold_train], hold[hold_test]
    scaler = StandardScaler().fit(transformed(raw)[train])
    X = scaler.transform(transformed(raw))
    dataset_hash = hashlib.sha256(source_bytes).hexdigest()
    feature_schema = "fma-librosa-17-log-scaled-v1"
    training = {
        "seed": SEED,
        "python": platform.python_version(),
        "numpy": np.__version__,
        "scikit_learn": sklearn.__version__,
        "scipy": scipy.__version__,
        "train_count": len(train),
        "validation_count": len(validation),
        "test_count": len(test),
        "split": "Artist-disjoint deterministic train/validation/test. Preprocessing fitted only on train. Production models remain fitted on train; all rows transformed for browsing.",
        "train_ids": [data["ids"][i] for i in train],
        "validation_ids": [data["ids"][i] for i in validation],
        "test_ids": [data["ids"][i] for i in test],
    }
    project = Path(__file__).resolve().parents[1]
    training["source_hashes"] = {
        name: hashlib.sha256((project / name).read_bytes()).hexdigest()
        for name in ("ml/train.py", "ml/prepare_fma.py", "requirements.lock.txt")
    }
    training["parameters"] = {
        "kmeans": {"k_grid": list(range(2, 11)), "n_init": 20, "random_state": SEED},
        "gmm": {
            "component_grid": list(range(2, 7)),
            "covariance_type": "diag",
            "n_init": 3,
            "reg_covar": 1e-4,
            "max_iter": 300,
            "random_state": SEED,
        },
        "factors": {
            "dimension_grid": list(range(1, 9)),
            "max_iter": 1000,
            "random_state": SEED,
        },
        "pca": {"solver": "full", "visualization_components": 2},
        "hierarchy": {
            "linkage": "ward",
            "metric": "euclidean",
            "max_sample": 120,
            "seed": SEED,
        },
    }
    kmeans = {}
    evaluations = []
    for k in range(2, 11):
        model = KMeans(n_clusters=k, n_init=20, random_state=SEED).fit(X[train])
        labels = model.predict(X)
        vl = labels[validation]
        sil = (
            float(silhouette_score(X[validation], vl))
            if 1 < len(set(vl)) < len(vl)
            else None
        )
        second = KMeans(n_clusters=k, n_init=20, random_state=SEED + 1).fit(X[train])
        stability = float(
            adjusted_rand_score(labels[validation], second.predict(X[validation]))
        )
        row = {
            "k": k,
            "inertia": float(model.inertia_),
            "silhouette": sil,
            "stability_ari": stability,
            "cluster_sizes": np.bincount(labels, minlength=k).tolist(),
        }
        kmeans[str(k)] = {
            **row,
            "labels": labels.tolist(),
            "centroids": model.cluster_centers_.tolist(),
        }
        evaluations.append(row)
    chosen = max(
        evaluations,
        key=lambda e: e["silhouette"] if e["silhouette"] is not None else -2,
    )["k"]
    gmm_candidates = []
    gmms = []
    for k in range(2, 7):
        gm = GaussianMixture(
            n_components=k,
            covariance_type="diag",
            n_init=3,
            reg_covar=1e-4,
            max_iter=300,
            random_state=SEED,
        ).fit(X[train])
        gmm_candidates.append(
            {
                "components": k,
                "aic": float(gm.aic(X[train])),
                "bic": float(gm.bic(X[train])),
                "validation_log_likelihood": float(gm.score(X[validation])),
                "converged": bool(gm.converged_),
            }
        )
        gmms.append(gm)
    valid = [i for i, g in enumerate(gmms) if g.converged_]
    if not valid:
        raise ValueError("No GMM converged; do not publish invalid models.")
    best = max(valid, key=lambda i: gmm_candidates[i]["validation_log_likelihood"])
    gm = gmms[best]
    pca = PCA(svd_solver="full").fit(X[train])
    coords = pca.transform(X)[:, :2]
    dimension_rows = []
    factors = []
    for d in range(1, 9):
        fa = FactorAnalysis(n_components=d, random_state=SEED, max_iter=1000).fit(
            X[train]
        )
        factors.append(fa)
        ppca = PCA(n_components=d, svd_solver="full").fit(X[train])
        dimension_rows.append(
            {
                "dimensions": d,
                "fa_validation_log_likelihood": float(fa.score(X[validation])),
                "pca_validation_log_likelihood": float(ppca.score(X[validation])),
                "cumulative_variance": float(pca.explained_variance_ratio_[:d].sum()),
            }
        )
    factor_index = int(
        np.argmax([d["fa_validation_log_likelihood"] for d in dimension_rows])
    )
    fa = factors[factor_index]
    rng = np.random.default_rng(SEED)
    sample = np.sort(rng.choice(len(X), min(120, len(X)), replace=False))
    Z = linkage(X[sample], method="ward", metric="euclidean")
    coph = float(cophenet(Z, pdist(X[sample]))[0])
    descriptions = {}
    centroids = np.asarray(kmeans[str(chosen)]["centroids"])
    labels = np.asarray(kmeans[str(chosen)]["labels"])
    names = [
        "Velvet Frequencies",
        "Bright Horizons",
        "Static Bloom",
        "Wide Spectrum",
        "Quiet Currents",
        "Violet Reverie",
        "After Hours",
        "Open Frequencies",
        "Soft Focus",
        "Electric Paper",
    ]
    for c in range(chosen):
        row = centroids[c]
        high = int(np.argmax(row[:5]))
        low = int(np.argmin(row[:5]))
        medoid = int(np.argmin(np.linalg.norm(X - row, axis=1)))
        descriptions[str(c)] = {
            "name": names[c],
            "description": f"This group has relatively higher {data['features'][high]['label'].lower()} and lower {data['features'][low]['label'].lower()} in this feature corpus. Its name is an editorial interpretation of measured recordings.",
            "size": int((labels == c).sum()),
            "medoid_id": data["ids"][medoid],
        }
    selected_labels = labels[test]
    test_sil = (
        float(silhouette_score(X[test], selected_labels))
        if 1 < len(set(selected_labels)) < len(test)
        else None
    )
    configuration_hash = hashlib.sha256(
        json.dumps(
            {
                "dataset": dataset_hash,
                "schema": feature_schema,
                "training": training,
                "chosen_k": chosen,
            },
            sort_keys=True,
        ).encode()
    ).hexdigest()[:12]
    release = "fma-v1-" + configuration_hash
    history = getattr(gm, "lower_bounds_", None)
    if history is None:
        raise ValueError(
            "Pinned scikit-learn must expose actual EM lower_bounds_ diagnostics."
        )
    result = {
        "release": release,
        "dataset": "FMA small / bounded artist-capped subset",
        "dataset_hash": dataset_hash,
        "feature_schema": feature_schema,
        "ids": data["ids"],
        "features": data["features"],
        "raw_features": raw.tolist(),
        "scaled_features": X.tolist(),
        "preprocessing": {
            "transform": "log1p first five nonnegative descriptors; StandardScaler fitted on train",
            "mean": scaler.mean_.tolist(),
            "scale": scaler.scale_.tolist(),
        },
        "training": training,
        "chosen_k": chosen,
        "cluster_descriptions": descriptions,
        "provenance": {
            "source": data["source"],
            "url": data["source_url"],
            "license": data["license"],
            "archive_sha1": data["archive_sha1"],
            "audio_accessed": False,
            "note": "FMA feature records are not linked to Jamendo playback. No synthetic observations.",
        },
        "kmeans": kmeans,
        "gmm": {
            "components": gm.n_components,
            "covariance_type": "diag",
            "probabilities": gm.predict_proba(X).tolist(),
            "ids": data["ids"],
            "weights": gm.weights_.tolist(),
            "means": gm.means_.tolist(),
            "covariances": gm.covariances_.tolist(),
            "candidates": gmm_candidates,
            "converged": bool(gm.converged_),
            "test_log_likelihood": float(gm.score(X[test])),
        },
        "em": {
            "lower_bounds": np.asarray(history).tolist(),
            "iterations": int(gm.n_iter_),
            "converged": bool(gm.converged_),
            "responsibilities": gm.predict_proba(X[train[:8]]).tolist(),
            "example_ids": [data["ids"][i] for i in train[:8]],
            "weights": gm.weights_.tolist(),
            "means": gm.means_.tolist(),
            "note": "Curve is the best GMM fit actual EM iteration lower bounds. Responsibilities shown at final fitted parameters, not invented intermediate iterations.",
        },
        "pca": {
            "ids": data["ids"],
            "coordinates": coords.tolist(),
            "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
            "loadings": pca.components_.tolist(),
            "mean": pca.mean_.tolist(),
            "feature_names": [f["label"] for f in data["features"]],
        },
        "hierarchy": {
            "ids": [data["ids"][i] for i in sample],
            "linkage": Z.tolist(),
            "method": "Ward / Euclidean on scaled 17-dimensional descriptors",
            "cophenetic_correlation": coph,
            "sample_seed": SEED,
        },
        "factors": {
            "dimensions": fa.n_components,
            "loadings": fa.components_.T.tolist(),
            "feature_names": [f["label"] for f in data["features"]],
            "noise_variance": fa.noise_variance_.tolist(),
            "log_likelihood": fa.loglike_,
            "test_log_likelihood": float(fa.score(X[test])),
            "note": "Unrotated factors; signs and semantic interpretations are not unique.",
        },
        "dimensions": {
            "rows": dimension_rows,
            "selected_factors": fa.n_components,
            "pca_90_percent": int(
                np.searchsorted(np.cumsum(pca.explained_variance_ratio_), 0.9) + 1
            ),
            "rule": "Factor count selected by artist-held-out validation likelihood; PCA variance threshold is descriptive, not an accuracy score.",
        },
        "evaluation": {
            "kmeans": evaluations,
            "gmm": gmm_candidates,
            "chosen_k": chosen,
            "test_silhouette": test_sil,
            "test_gmm_log_likelihood": float(gm.score(X[test])),
            "hierarchy_cophenetic": coph,
            "limitations": "Internal clustering quality is not listener satisfaction. Source genre tags are not ground-truth acoustic clusters. Two PCA axes discard variance. No psychological validation.",
        },
    }
    ARTIFACTS.mkdir(exist_ok=True)
    filename = release + ".json"
    serialized = json.dumps(
        result, ensure_ascii=False, separators=(",", ":"), allow_nan=False
    ).encode()
    target = ARTIFACTS / filename
    if target.exists() and target.read_bytes() != serialized:
        raise ValueError("Immutable artifact collision: investigate reproducibility.")
    target.write_bytes(serialized)
    manifest = {
        "release": release,
        "artifact_file": filename,
        "artifact_sha256": hashlib.sha256(serialized).hexdigest(),
        "dataset_hash": dataset_hash,
        "feature_schema": feature_schema,
    }
    temporary = ARTIFACTS / "release.pending.json"
    temporary.write_text(json.dumps(manifest, indent=2))
    os.replace(temporary, ARTIFACTS / "release.json")
    print(
        json.dumps(
            {
                "release": release,
                "tracks": len(X),
                "features": X.shape[1],
                "chosen_k": chosen,
                "test_silhouette": test_sil,
                "artifact_bytes": len(serialized),
                "gmm_converged": bool(gm.converged_),
            }
        )
    )
    return result


if __name__ == "__main__":
    with threadpool_limits(limits=1):
        fit_release()
