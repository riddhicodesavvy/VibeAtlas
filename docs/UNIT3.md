# Unit 3 implementation map

The application demonstrates course 21CSC305P Unit 3 through actual music descriptors and fitted models. Exact PPT slide numbers are pending the course deck. No slide numbers, psychological validation or supervised accuracy are invented.

| Topic | Implementation | Real output in the application | Evaluation and limits |
| --- | --- | --- | --- |
| K-Means | `ml/train.py`, `KMeans.fit`; `backend/engine.py` | K=2–10 assignments, centroids, cluster sizes; nearest taste centroid; `/ml-lab/kmeans` | Train inertia, validation silhouette and seed stability. Test silhouette is separate. |
| Gaussian mixtures | `GaussianMixture.fit` with diagonal covariance and regularization | Song posterior component probabilities; `/ml-lab/gmm` | AIC/BIC on train; validation likelihood selects model; final test likelihood is held out. Membership is not enjoyment probability. |
| Expectation–Maximization | Actual fitting procedure of that GMM | Recorded `lower_bounds_`, convergence and actual final responsibilities; `/ml-lab/em` | Curve is the best fitted initialization's genuine trace. Final responsibilities are explicitly not historical intermediate snapshots. |
| PCA | Train-fitted `PCA`, saved mean/components | All selected records projected to 2D, scree data and loadings; `/universe`, `/ml-lab/pca` | PC1/PC2 variance is disclosed. 2D visual closeness does not equal full-dimensional nearest-neighbor distance. |
| Latent-dimension selection | Artist-held-out probabilistic PCA/FA comparison | Tested dimension grid, likelihood curves and PCA variance threshold; `/ml-lab/dimensions` | Same observations and original descriptor representation across dimensions. A variance threshold is not accuracy. |
| Factor Analysis | Train-fitted `FactorAnalysis` | Loadings, feature-specific noise, selected count and diagnostics; `/ml-lab/factors` | Factor count selected on validation likelihood; test likelihood reported separately. Factors retain neutral numbered names. |
| Hierarchical clustering | SciPy `linkage(method='ward')` on 120 actual, seed-selected records | Real dendrogram, cut height and assignments; `/ml-lab/hierarchy` | Euclidean scaled features; cophenetic correlation. The bounded tree represents its sample, not every catalogue record. |
| Distance/dissimilarity | NumPy Euclidean distance; separate L2-normalized cosine comparison | Recommendation ranks and independently inspectable pairwise distances; `/ml-lab/distances` | All selected tracks must belong to one compatible feature release; exclude selections and apply supported filters. No synthetic match percentages. |
| Clustering evaluation | scikit-learn/SciPy metrics from fitted runs | Inertia/elbow, silhouette, ARI stability, GMM criteria and held-out scores; `/ml-lab/evaluation` | Internal structure is not listener satisfaction. Genre tags are not ground-truth acoustic clusters. |

## Inputs and reproducibility

The bounded FMA-small subset includes 640 records across eight actual genres. Artist caps limit dominance. Seventeen published librosa descriptors comprise RMS, centroid, rolloff, bandwidth, zero-crossing rate and MFCC 1–6 means/standard deviations. No audio is downloaded or processed by this project. See `docs/DATA_SOURCES.md` for attribution and licenses.

Positive core descriptors are log-transformed; preprocessing is fitted on train only. Evaluation partitions are artist-disjoint. Seeds, package versions, source file hashes, feature order, parameters and partitions are saved with the immutable numeric artifact. The release manifest records SHA256 and is switched only after training and serialization succeed.

The inference API uses numeric exports and NumPy; it neither retrains nor imports scikit-learn in a request. `tests/test_ml.py` independently verifies projection equations, probability sums, K-Means refits, source/artifact integrity and linkage validity. `tests/test_backend.py` independently verifies ranking against raw exported vectors.
