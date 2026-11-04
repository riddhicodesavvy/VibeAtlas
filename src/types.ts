export interface Track {
  id: string;
  provider: "jamendo" | "fma";
  title: string;
  artist: string;
  album: string;
  genres: string[];
  duration: number;
  image_url: string;
  provider_url: string;
  license_url: string;
  feature_ready: boolean;
  playback_available: boolean;
  distance?: number | null;
  explanation?: string;
}
export interface TrackPage {
  items: Track[];
  total: number;
  offset: number;
  limit: number;
  source: string;
}
export interface Profile {
  release: string;
  dataset: string;
  feature_schema: string;
  label: string;
  description: string;
  cluster_id: number;
  cluster_distance: number;
  related_clusters: { cluster_id: number; name: string; distance: number }[];
  features: {
    name: string;
    label: string;
    value: number;
    percentile: number;
    unit: string;
  }[];
  memberships: number[];
  spread: number;
  selected_count: number;
  method: string;
  disclaimer: string;
}
export interface Collection {
  id: string;
  name: string;
  trackIds: string[];
}
export interface Guest {
  version: 1;
  likes: string[];
  collections: Collection[];
  selection: string[];
  genres: string[];
  profile: Profile | null;
}
export interface Feature {
  name: string;
  label: string;
  unit: string;
}
export interface ModelInfo {
  release: string;
  dataset: string;
  dataset_hash: string;
  feature_schema: string;
  features: Feature[];
  chosen_k: number;
  training: {
    train_count: number;
    validation_count: number;
    test_count: number;
    seed: number;
    split: string;
  };
  provenance: { source: string; url: string; license: string; note: string };
  evaluation: Evaluation;
  cluster_descriptions: Record<
    string,
    { name: string; description: string; size: number; medoid_id: string }
  >;
}
export interface KRow {
  k: number;
  inertia: number;
  silhouette: number | null;
  stability_ari: number;
  cluster_sizes: number[];
}
export interface Evaluation {
  kmeans: KRow[];
  gmm: {
    components: number;
    aic: number;
    bic: number;
    validation_log_likelihood: number;
    converged: boolean;
  }[];
  chosen_k: number;
  test_silhouette: number | null;
  test_gmm_log_likelihood: number;
  hierarchy_cophenetic: number;
  limitations: string;
}
export interface Experiment<T> {
  release: string;
  dataset: string;
  feature_schema: string;
  result: T;
}
export interface PCAData {
  ids: string[];
  coordinates: number[][];
  explained_variance_ratio: number[];
  loadings: number[][];
  feature_names: string[];
}
export interface KData extends KRow {
  ids: string[];
  labels: number[];
  coordinates: number[][];
  centroids: number[][];
}
export interface GMMData {
  ids: string[];
  probabilities: number[][];
  weights: number[];
  components: number;
  converged: boolean;
  covariance_type: string;
  test_log_likelihood: number;
}
export interface EMData {
  lower_bounds: number[];
  iterations: number;
  converged: boolean;
  responsibilities: number[][];
  example_ids: string[];
  note: string;
}
export interface FactorData {
  dimensions: number;
  feature_names: string[];
  loadings: number[][];
  noise_variance: number[];
  test_log_likelihood: number;
  note: string;
}
export interface HierarchyData {
  ids: string[];
  linkage: number[][];
  method: string;
  cophenetic_correlation: number;
}
export interface DimensionData {
  rows: {
    dimensions: number;
    fa_validation_log_likelihood: number;
    pca_validation_log_likelihood: number;
    cumulative_variance: number;
  }[];
  selected_factors: number;
  pca_90_percent: number;
  rule: string;
}
