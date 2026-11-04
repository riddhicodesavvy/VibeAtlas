import hashlib
import json
import numpy as np
from scipy.cluster.hierarchy import is_valid_linkage, fcluster
from sklearn.metrics import adjusted_rand_score
from sklearn.cluster import KMeans
from threadpoolctl import threadpool_limits
from backend.config import DATA, ARTIFACTS
from backend.engine import engine
import pytest


def test_real_dataset_integrity():
    source = json.loads((DATA / "features.json").read_text(encoding="utf-8"))
    assert source["archive_sha1"] == "f0df49ffe5f2a6008d7dc83c6915b31835dfe733"
    assert len(source["tracks"]) == 640 and len(set(source["ids"])) == 640
    assert np.isfinite(np.asarray(source["vectors"])).all()
    assert (
        engine().a["dataset_hash"]
        == hashlib.sha256((DATA / "features.json").read_bytes()).hexdigest()
    )


def test_artist_disjoint_preprocessing():
    e = engine()
    a = e.a
    source = json.loads((DATA / "features.json").read_text(encoding="utf-8"))
    artists = {t["id"]: t["artist_id"] for t in source["tracks"]}
    partitions = [
        set(artists[id] for id in a["training"][p + "_ids"])
        for p in ("train", "validation", "test")
    ]
    assert (
        not partitions[0] & partitions[1]
        and not partitions[0] & partitions[2]
        and not partitions[1] & partitions[2]
    )
    train = [e.index[id] for id in a["training"]["train_ids"]]
    assert np.allclose(e.X[train].mean(axis=0), 0, atol=1e-10)
    assert np.allclose(e.X[train].std(axis=0), 1, atol=1e-10)


def test_kmeans_assignments_and_reproducibility():
    e = engine()
    a = e.a
    train = [e.index[id] for id in a["training"]["train_ids"]]
    for k in (2, 4, 10):
        run = a["kmeans"][str(k)]
        centroids = np.asarray(run["centroids"])
        independent = np.linalg.norm(
            e.X[:, None, :] - centroids[None, :, :], axis=2
        ).argmin(axis=1)
        assert np.array_equal(independent, run["labels"])
        with threadpool_limits(limits=1):
            refit = KMeans(n_clusters=k, n_init=20, random_state=42).fit(e.X[train])
        assert adjusted_rand_score(run["labels"], refit.predict(e.X)) == 1
        assert abs(refit.inertia_ - run["inertia"]) < 1e-8


def test_gmm_probabilities_and_em_trace():
    a = engine().a
    p = np.asarray(a["gmm"]["probabilities"])
    assert p.shape == (640, a["gmm"]["components"])
    assert np.isfinite(p).all() and (p >= 0).all() and (p <= 1).all()
    assert np.allclose(p.sum(axis=1), 1)
    h = np.asarray(a["em"]["lower_bounds"])
    assert (
        a["em"]["converged"]
        and len(h) == a["em"]["iterations"]
        and np.isfinite(h).all()
    )
    assert h[-1] >= h[0]


def test_pca_coordinates_and_factors():
    e = engine()
    p = e.a["pca"]
    variance = np.asarray(p["explained_variance_ratio"])
    independent = (e.X - np.asarray(p["mean"])) @ np.asarray(p["loadings"]).T
    assert np.allclose(independent[:, :2], p["coordinates"])
    assert (variance >= 0).all() and abs(variance.sum() - 1) < 1e-10
    f = e.a["factors"]
    assert np.asarray(f["loadings"]).shape == (17, f["dimensions"])
    assert (np.asarray(f["noise_variance"]) > 0).all()


def test_hierarchy_cuts_and_artifact_checksum():
    a = engine().a
    h = a["hierarchy"]
    z = np.asarray(h["linkage"])
    assert is_valid_linkage(z) and len(z) == len(h["ids"]) - 1
    assert len(set(fcluster(z, z[-1, 2], criterion="distance"))) == 1
    manifest = json.loads((ARTIFACTS / "release.json").read_text())
    assert (
        hashlib.sha256((ARTIFACTS / manifest["artifact_file"]).read_bytes()).hexdigest()
        == manifest["artifact_sha256"]
    )


def test_missing_and_damaged_artifacts_fail_closed(tmp_path, monkeypatch):
    import backend.engine as module
    from fastapi import HTTPException

    monkeypatch.setattr(module, "ARTIFACTS", tmp_path)
    with pytest.raises(HTTPException) as missing:
        module.Engine()
    assert missing.value.status_code == 503
    (tmp_path / "release.json").write_text("{broken", encoding="utf-8")
    with pytest.raises(HTTPException) as broken:
        module.Engine()
    assert broken.value.status_code == 503
    (tmp_path / "release.json").write_text(
        json.dumps({"artifact_file": "absent.json", "artifact_sha256": "0" * 64}),
        encoding="utf-8",
    )
    with pytest.raises(HTTPException) as absent:
        module.Engine()
    assert absent.value.status_code == 503


def test_training_source_versions_are_recorded():
    from backend.config import ROOT

    hashes = engine().a["training"]["source_hashes"]
    for name, digest in hashes.items():
        assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest
