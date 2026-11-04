# VibeAtlas

**Find your frequency.** VibeAtlas is an independent music discovery experience built around a simple idea: music recommendations should help you explore, and show you why a track fits.

VibeAtlas pairs a curated independent music catalogue with a transparent audio-feature recommendation engine. Build a personal listening profile, explore measured similarities, save tracks into collections, and open the ML Lab to inspect the models behind the recommendations.

The interface takes cues from independent record shops and music magazines: deep midnight colors, warm coral details, expressive typography, performance photography, and a compact player that follows you through the app.

## What you can do

- Explore independent releases from Jamendo, with artist, album, artwork, source, and license information.
- Play provider-authorized streams in the app, with queue, seeking, volume, and playback controls where the stream supports them.
- Build a musical profile from real, published audio descriptors and receive ranked matches with feature-based explanations.
- Save favorites and create collections in your browser without creating an account.
- Explore the Music Universe and inspect interactive experiments in the ML Lab.

### A note on the two music sources

Jamendo provides the listening catalogue. VibeAtlas uses the separately licensed FMA feature dataset for measured profiles and recommendations. Jamendo audio analysis permission and a lawful match between these two catalogues have not been established, so recommendations are not presented as playable Jamendo tracks. The app makes this distinction visible throughout the experience.

## Screens

| Discover | Your Vibe |
| --- | --- |
| Search and explore independent music, filters, match explanations, and playback. | A measured profile and ranked tracks based on selected recordings. |

| Music Universe | ML Lab |
| --- | --- |
| Explore recordings in a two-dimensional PCA projection. | Interact with the real models, inputs, and evaluation results. |

## Machine learning

The recommendation pipeline trains on 640 real FMA-small metadata records with 17 published audio descriptors. The project downloads and processes no audio. Features include RMS, spectral centroid, rolloff, bandwidth, zero-crossing rate, and MFCC summaries.

Training is reproducible and kept separate from inference. Artist-disjoint partitions, train-fitted transformations, fixed seeds, checksummed artifacts, and held-out evaluation are recorded with each model release. The current release selected K=2 for K-Means; its held-out silhouette is approximately 0.187, which indicates modest cluster separation. This is a structure measure, not recommendation accuracy or listener satisfaction.

The ML Lab demonstrates:

- K-Means clustering, centroids, inertia, silhouette, and seed stability
- Gaussian mixture soft assignments and the actual Expectation-Maximization convergence trace
- PCA projections, explained variance, and component loadings
- Factor Analysis and held-out latent-dimension comparisons
- Ward hierarchical clustering with an adjustable dendrogram cut
- Euclidean and cosine distance comparisons
- Clustering and model-selection evaluation

See the [model and data map](docs/UNIT3.md) for implementation details and interpretation limits.

## Run locally

Requirements: Node.js 22+, npm, Python 3.11+, and Git.

```powershell
git clone https://github.com/riddhicodesavvy/VibeAtlas.git
cd VibeAtlas
npm ci
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.lock.txt
Copy-Item .env.example .env.local
```

Set `JAMENDO_CLIENT_ID` in `.env.local` to enable live catalogue refresh and playback. Supabase URL and publishable-key settings enable the remote catalogue. The included checked-in catalogue and model artifacts let the app run locally without training or a database. Keep keys out of frontend `VITE_` variables and never commit `.env.local`.

Start the API and frontend in separate terminals from the repository folder:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

```powershell
npm run dev
```

Open <http://127.0.0.1:5173/>. The API reference is at <http://127.0.0.1:8000/docs>.

Build the production frontend with `npm run build`. FastAPI can serve the built app and API together at <http://127.0.0.1:8000/>.

## Data and model reproduction

The checked-in catalogue subset and inference artifacts run without downloading the original archive. To rebuild the FMA subset, download **only the official metadata archive**; do not download the FMA audio archives:

```powershell
New-Item -ItemType Directory -Force data/raw
curl.exe --fail --location https://os.unil.cloud.switch.ch/fma/fma_metadata.zip --output data/raw/fma_metadata.zip
.\.venv\Scripts\python.exe -m ml.prepare_fma
.\.venv\Scripts\python.exe -m ml.train
```

Preparation verifies the published archive checksum, selects a genre-balanced subset, caps repeated artists, and retains source IDs. Training uses artist-disjoint train, validation, and test partitions. The manifest in `artifacts/release.json` identifies the active immutable model artifact and its SHA256 checksum. Previous artifacts remain available for rollback.

Refresh the small Jamendo catalogue snapshot with:

```powershell
.\.venv\Scripts\python.exe -m scripts.import_jamendo --limit 120
```

The importer retrieves metadata, rechecks availability, avoids duplicates, respects request bounds, and downloads no audio. Playback streams directly from the provider; VibeAtlas does not cache audio offline.

## Supabase

The backend uses a publishable key and read-only access for the public catalogue. Row Level Security is enabled on all six application tables. Songs and attribution records are readable; feature and model records remain private. Public database writes are disabled. The application can fall back to its checked-in real metadata snapshot if Supabase is unavailable.

The database migration and publication history, inspected baseline, live counts, grants, and verification results are documented in [Supabase verification](docs/supabase-verification.json) and [deployment notes](docs/DEPLOYMENT.md). Do not rerun the initial migration against a populated project. Future schema changes must be additive and reviewed against the live schema.

## Verification

```powershell
npm run typecheck
npm test
npm run build
.\.venv\Scripts\python.exe -m pytest -q
npm run test:e2e
```

The Playwright suite uses real backend responses and checks desktop and mobile journeys, collections, search, and model controls. Install its browser once with `npx playwright install chromium`. Security and dependency checks are described in [implementation status](IMPLEMENTATION_STATUS.md). Live runtime checks and their limits are recorded in [runtime verification](docs/runtime-verification.json).

## Privacy, licensing, and security

Guest preferences, likes, and collections stay in the current browser. Clear them from the Privacy page. There is no account requirement or cloud synchronization for guest data.

The source code is MIT licensed. Dataset metadata, audio, album art, photography, and fonts retain their own licenses. See [data sources and credits](docs/DATA_SOURCES.md) and the in-app Credits page. Personality names are editorial labels, not psychological assessments.

The app validates inputs, restricts playback URLs to Jamendo hosts, applies explicit CORS and request limits, and keeps service credentials on the backend. Review `.env.example` and `.gitignore` before configuring a deployment.

## Deployment

The project includes a production build and Dockerfile. A public deployment has not been configured. See [deployment notes](docs/DEPLOYMENT.md) for hosting, free-tier, database, and operational constraints. Check current provider terms, quotas, and service availability before publishing.
