from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, JsonValue, model_validator


class Track(BaseModel):
    id: str
    provider: Literal["jamendo", "fma"]
    title: str
    artist: str
    album: str = ""
    genres: list[str] = []
    duration: float = 0
    image_url: str = ""
    provider_url: str
    license_url: str = ""
    feature_ready: bool = False
    playback_available: bool = False
    distance: float | None = None
    explanation: str | None = None


class Selection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    track_ids: list[str] = Field(min_length=3, max_length=30)
    genres: list[str] = Field(default_factory=list, max_length=20)
    release: str | None = None

    @model_validator(mode="after")
    def distinct(self):
        if len(set(self.track_ids)) != len(self.track_ids):
            raise ValueError("Choose distinct tracks.")
        return self


class RecommendationRequest(Selection):
    limit: int = Field(default=24, ge=1, le=100)
    q: str = Field(default="", max_length=120)
    genre: str | None = Field(default=None, max_length=80)
    brightness_min: float | None = Field(
        default=None, ge=0, le=24000, allow_inf_nan=False
    )
    brightness_max: float | None = Field(
        default=None, ge=0, le=24000, allow_inf_nan=False
    )

    @model_validator(mode="after")
    def valid_brightness_range(self):
        if (
            self.brightness_min is not None
            and self.brightness_max is not None
            and self.brightness_min > self.brightness_max
        ):
            raise ValueError("Minimum brightness cannot exceed maximum brightness.")
        return self


class FeatureSummary(BaseModel):
    name: str
    label: str
    value: float
    percentile: float
    unit: str


class Profile(BaseModel):
    release: str
    dataset: str
    feature_schema: str
    label: str
    description: str
    cluster_id: int
    cluster_distance: float
    related_clusters: list[dict]
    features: list[FeatureSummary]
    memberships: list[float]
    spread: float
    selected_count: int
    method: str
    disclaimer: str


class TrackPage(BaseModel):
    items: list[Track]
    total: int
    offset: int
    limit: int
    source: str


class Playback(BaseModel):
    track_id: str
    url: str
    provider_url: str
    attribution: str
    license_url: str


class Health(BaseModel):
    status: str
    version: str
    release: str | None
    catalogue_count: int
    feature_count: int
    supabase_configured: bool


class GenreCount(BaseModel):
    name: str
    count: int


class Readiness(BaseModel):
    ready: bool
    release: str


class CatalogueStatus(BaseModel):
    source: str
    database: str
    audio_analysis: str


class KMeansMetrics(BaseModel):
    k: int
    inertia: float
    silhouette: float | None
    stability_ari: float
    cluster_sizes: list[int]


class KMeansResult(KMeansMetrics):
    ids: list[str]
    coordinates: list[list[float]]
    labels: list[int]
    centroids: list[list[float]]


class GMMCandidate(BaseModel):
    components: int
    aic: float
    bic: float
    validation_log_likelihood: float
    converged: bool


class GMMResult(BaseModel):
    components: int
    covariance_type: str
    probabilities: list[list[float]]
    ids: list[str]
    weights: list[float]
    means: list[list[float]]
    covariances: list[list[float]]
    candidates: list[GMMCandidate]
    converged: bool
    test_log_likelihood: float


class EMResult(BaseModel):
    lower_bounds: list[float]
    iterations: int
    converged: bool
    responsibilities: list[list[float]]
    example_ids: list[str]
    weights: list[float]
    means: list[list[float]]
    note: str


class PCAResult(BaseModel):
    ids: list[str]
    coordinates: list[list[float]]
    explained_variance_ratio: list[float]
    loadings: list[list[float]]
    mean: list[float]
    feature_names: list[str]


class HierarchyResult(BaseModel):
    ids: list[str]
    linkage: list[list[float]]
    method: str
    cophenetic_correlation: float
    sample_seed: int


class FactorResult(BaseModel):
    dimensions: int
    loadings: list[list[float]]
    feature_names: list[str]
    noise_variance: list[float]
    log_likelihood: list[float]
    test_log_likelihood: float
    note: str


class DimensionRow(BaseModel):
    dimensions: int
    fa_validation_log_likelihood: float
    pca_validation_log_likelihood: float
    cumulative_variance: float


class DimensionResult(BaseModel):
    rows: list[DimensionRow]
    selected_factors: int
    pca_90_percent: int
    rule: str


class DistanceResult(BaseModel):
    ids: list[str]
    vectors: list[list[float]]
    metric: str


class EvaluationResult(BaseModel):
    kmeans: list[KMeansMetrics]
    gmm: list[GMMCandidate]
    chosen_k: int
    test_silhouette: float | None
    test_gmm_log_likelihood: float
    hierarchy_cophenetic: float
    limitations: str


class ExperimentResponse(BaseModel):
    release: str
    dataset: str
    feature_schema: str
    result: (
        KMeansResult
        | GMMResult
        | EMResult
        | PCAResult
        | HierarchyResult
        | FactorResult
        | DimensionResult
        | DistanceResult
        | EvaluationResult
    )


class ModelInformation(BaseModel):
    release: str
    dataset: str
    dataset_hash: str
    feature_schema: str
    features: list[dict[str, str]]
    chosen_k: int
    training: dict[str, JsonValue]
    provenance: dict[str, JsonValue]
    evaluation: EvaluationResult
    cluster_descriptions: dict[str, dict[str, JsonValue]]
