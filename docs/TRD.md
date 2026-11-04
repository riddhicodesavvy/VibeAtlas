# VibeAtlas — Technical Requirements Document

Version: 1.0  
Status: Proposed Architecture

## 1. Technical Overview

VibeAtlas is a React application supported by Python-based ML processing, a Supabase PostgreSQL database, and a licensed independent-music provider.

The architecture must prioritize:

- Open-source technologies
- Zero-cost academic deployment
- Reproducible ML results
- Secure database access
- Responsive frontend performance
- Separation of ML training and inference

## 2. Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts or Plotly
- Accessible UI component primitives

### Backend

- Python
- FastAPI
- Pydantic
- Supabase client

### Machine Learning

- NumPy
- pandas
- scikit-learn
- SciPy
- librosa
- joblib

### Database

Supabase PostgreSQL.

### Music Provider

Jamendo API for eligible non-commercial use.

### Hosting

- Frontend: Vercel Hobby, subject to its non-commercial requirements and free quotas
- Database: Supabase Free
- ML training: Local Python environment
- Backend inference: Free-hosting feasibility to be verified

Do not assume Vercel can host a resource-intensive, always-on Python ML service for free.

## 3. High-Level Architecture

Music provider API supplies track metadata and authorized audio streams.

An offline catalogue importer validates the available licensing metadata and imports eligible records.

Where audio processing is permitted, a Python feature-extraction pipeline computes numerical audio descriptors.

Features are stored in Supabase.

ML models are trained offline and saved as versioned artifacts.

The frontend requests catalogue information, music profiles, recommendations, and ML experiment results.

Audio remains hosted by the authorized provider.

## 4. Database Design

The database may already contain two tables:

### songs

Existing planned fields:

- id
- jamendo_id
- title
- artist
- album
- genre
- duration
- image_url
- license_url
- created_at

Recommended additional fields:

- provider_url
- availability_status
- last_verified_at
- metadata_source

### audio_features

Fields:

- id
- song_id
- tempo
- rms_energy
- spectral_centroid
- spectral_rolloff
- zero_crossing_rate
- feature_vector
- extraction_version
- created_at

Additional tables:

### model_runs

Records the training configuration.

Fields:

- id
- model_type
- model_version
- dataset_hash
- feature_schema_version
- parameters
- evaluation_metrics
- created_at

### song_clusters

Stores versioned cluster assignments.

Fields:

- song_id
- model_run_id
- cluster_id
- assignment_distance
- membership_probabilities

### song_embeddings

Stores visualization coordinates.

Fields:

- song_id
- model_run_id
- projection_method
- x
- y

### source_attributions

Stores provider and licensing information.

Fields:

- song_id
- source_url
- license_url
- attribution_text
- verified_at

### Important Migration Rule

Inspect the existing Supabase schema before making changes.

Do not drop or recreate existing tables containing data.

Use additive migrations with verification.

## 5. Music Import Pipeline

The importer must:

1. Authenticate with Jamendo using the configured Client ID.
2. Request a limited batch of track metadata.
3. Validate the returned fields.
4. Record provider identification and licensing information.
5. Import eligible tracks into Supabase.
6. Avoid duplicate entries.
7. Track unavailable or removed content.
8. Handle rate limits and failed requests.

Do not scrape copyrighted songs from unauthorized sources.

Do not permanently cache provider audio.

Do not process audio unless the applicable terms and permissions allow the intended analysis.

## 6. Feature Extraction

Use permitted audio or a separately licensed feature dataset.

Possible numerical descriptors:

- Estimated tempo
- RMS energy
- Spectral centroid
- Spectral rolloff
- Zero-crossing rate
- MFCC summary statistics

Feature processing must include:

- Missing-value handling
- Numerical validation
- Appropriate normalization
- Feature scaling
- Version tracking

Spotify-specific attributes such as danceability and valence must not be fabricated.

If used, they require an independently implemented and validated estimator or a licensed source.

## 7. Machine Learning Pipeline

### Algorithm 1: K-Means

Purpose:

Group songs with similar audio characteristics.

Implementation:

- StandardScaler
- KMeans
- Explicit random state
- Multiple initializations
- Versioned cluster assignments

Evaluation:

- Inertia
- Elbow method
- Silhouette score

Frontend:

- Music cluster visualization
- K-Means Playground

### Algorithm 2: Gaussian Mixture Model

Purpose:

Calculate probabilistic membership of songs across model components.

Implementation:

- GaussianMixture
- Defined covariance configuration
- Posterior membership probabilities

Evaluation:

- AIC
- BIC
- Model convergence

Frontend:

- K-Means versus GMM comparison
- Membership probability visualization

### Algorithm 3: Expectation-Maximization

Purpose:

Estimate Gaussian mixture parameters using repeated expectation and maximization steps.

Implementation:

Use the actual GMM fitting process.

Store real optimization/convergence information where supported.

Frontend:

- EM explanation
- Convergence plot
- Model iteration information

Never fabricate intermediate iterations.

### Algorithm 4: PCA

Purpose:

Reduce high-dimensional audio features for visualization.

Implementation:

- Fit PCA using training data
- Store fitted transformation
- Save explained variance
- Generate track coordinates

Frontend:

- Music Universe scatter plot
- Explained variance chart

### Algorithm 5: Factor Analysis

Purpose:

Analyze shared variation across audio characteristics.

Implementation:

- FactorAnalysis
- Standardized features
- Factor loadings
- Model diagnostics

Frontend:

- Factor loading visualization
- Explanation of latent variables

Factor interpretations must be supported by the actual fitted model.

### Algorithm 6: Hierarchical Clustering

Purpose:

Explore similarity relationships between tracks.

Implementation:

- SciPy hierarchical clustering
- Documented linkage method
- Bounded representative sample

Frontend:

- Dendrogram
- Adjustable cluster cut height

### Algorithm 7: Distance and Dissimilarity

Purpose:

Find similar tracks and build recommendations.

Possible methods:

- Euclidean distance
- Cosine distance

Use scaled or appropriately normalized features.

Document the exact similarity calculation.

### Algorithm 8: Clustering Evaluation

Compare:

- Inertia
- Silhouette score
- Appropriate GMM selection criteria
- Cluster stability where practical

Results must be produced from real experiments.

## 8. Recommendations

Input:

Selected user tracks.

Process:

1. Load their audio feature vectors.
2. Aggregate the user's preference representation.
3. Transform through the trained preprocessing pipeline.
4. Calculate distances to candidate tracks.
5. Rank suitable candidates.
6. Exclude already selected tracks where appropriate.
7. Return recommendations with feature-based explanations.

Output:

- Track ID
- Title and artist
- Similarity information
- Explanation
- Playback availability

Similarity percentages must be clearly defined. Do not present them as probabilities that a user will like a song.

## 9. Proposed API Endpoints

GET `/api/health`

GET `/api/genres`

GET `/api/tracks`

GET `/api/tracks/{id}`

POST `/api/profile`

POST `/api/recommendations`

GET `/api/ml/models`

GET `/api/ml/kmeans`

GET `/api/ml/gmm`

GET `/api/ml/pca`

GET `/api/ml/hierarchy`

GET `/api/ml/factors`

These endpoints are a proposed contract.

Codex should evaluate whether a lightweight precomputed-results architecture is better suited to free deployment.

## 10. Frontend Architecture

Suggested components:

- AppShell
- Sidebar
- MobileNavigation
- HeroSection
- GenreTile
- TrackCard
- TrackTable
- AudioPlayer
- MusicProfileCard
- FeatureChart
- MusicUniverseChart
- MLExperimentPanel
- LoadingState
- EmptyState
- ErrorState

Suggested routes:

- `/`
- `/onboarding`
- `/my-vibe`
- `/discover`
- `/collections`
- `/ml-lab`

The frontend must closely follow the attached design board.

## 11. Security Requirements

- Never hardcode API secrets.
- Use environment variables.
- Never commit `.env` files.
- Publish `.env.example` with placeholders.
- Keep Supabase secret/service-role credentials server-side.
- Enable Row Level Security for exposed tables.
- Allow public read access only where appropriate.
- Deny unauthorized public writes.
- Validate backend requests.
- Apply pagination and rate limits.
- Restrict CORS appropriately.
- Avoid leaking stack traces or credentials.
- Provide a privacy notice for locally stored preferences.

## 12. Environment Variables

Example placeholders:

```dotenv
JAMENDO_CLIENT_ID=replace_me
SUPABASE_URL=replace_me
SUPABASE_PUBLISHABLE_KEY=replace_me
SUPABASE_SECRET_KEY=server_only_replace_me
```

The secret key should only be configured if required for trusted backend operations.

## 13. Music Licensing Requirements

- Respect Jamendo API terms.
- Check individual Creative Commons licenses.
- Preserve artist attribution.
- Do not rehost or redistribute audio without permission.
- Do not implement offline audio caching.
- Avoid building a direct replica of Jamendo's platform.
- Handle revoked or unavailable tracks.
- Verify that the intended audio analysis is permitted before processing.

## 14. Testing Requirements

### Unit Tests

- Feature validation
- Normalization
- K-Means reproducibility
- GMM probability calculations
- PCA explained variance
- Recommendation ranking
- Missing-value handling

### Integration Tests

- Jamendo API failures
- Supabase access
- Database permissions
- Track ingestion
- Playback availability
- Model result retrieval

### End-to-End Tests

- Landing to onboarding
- Onboarding to My Vibe
- Search and filtering
- Recommendations
- Audio playback
- Likes and collections
- ML Lab controls
- Mobile navigation

## 15. Deployment Constraints

The project must remain within free-tier usage for its academic demonstration.

ML training should run offline.

Do not retrain large models on every user request.

Prefer precomputed model artifacts and efficient inference.

Verify a genuinely free deployment strategy before choosing the final backend host.

## 16. Implementation Phases

Phase 1: Repository and architecture audit

Phase 2: Frontend design system and responsive pages

Phase 3: Music catalogue integration

Phase 4: Audio feature pipeline

Phase 5: ML training and evaluation

Phase 6: Personalization and recommendation integration

Phase 7: ML Lab and Unit 3 mapping

Phase 8: Testing, security audit and deployment

Do not proceed with paid services, destructive database migrations, or deployment without explicit authorization.