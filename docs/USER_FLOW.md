# VibeAtlas — Complete User Flow

Version: 1.0

## 1. User Experience Overview

VibeAtlas must feel like a premium music discovery application.

The primary user journey is:

Home → Onboarding → My Vibe → Discover → Listen → Save Music

An independent ML Lab journey allows visitors to inspect the underlying algorithms.

The attached design board defines the visual direction.

## 2. Screen 1: Landing

Route: `/`

### What the user sees

- VibeAtlas branding
- Hero heading: "Find your frequency"
- Atmospheric visual artwork
- Discover My Vibe CTA
- Featured independent music
- Sidebar navigation

### User actions

- Start onboarding
- Explore music directly
- Open ML Lab

### System behavior

Load available catalogue information.

Do not display fake trending songs or unsupported popularity metrics.

### Next screen

Clicking Discover My Vibe opens Onboarding.

## 3. Screen 2: Onboarding

Route: `/onboarding`

### Step 1: Genres

User selects preferred genres.

The interface shows image-based genre cards and a selection count.

### Step 2: Tracks

User selects at least three favorite songs.

The interface provides:

- Search
- Song artwork
- Artist
- Selection controls
- Playback where available

### Step 3: Review

Show selected genres and songs.

Explain that musical characteristics will be used to identify patterns.

### Step 4: Analyze

The system:

1. Retrieves numerical audio features.
2. Validates the feature vectors.
3. Applies the trained preprocessing pipeline.
4. Calculates a taste representation.
5. Finds relevant clusters.
6. Generates a descriptive profile.

### Next screen

My Vibe.

## 4. Screen 3: My Vibe

Route: `/my-vibe`

### What the user sees

- Musical personality name
- Personality description
- Audio feature chart
- Most relevant music cluster
- Related clusters
- Recommended music cards

### User actions

- Explore recommendations
- Edit preferences
- Inspect ML explanation
- Open Music Universe

### System behavior

Use actual trained model results.

Personality names are editorial descriptions of feature patterns.

Do not invent psychological traits or unsupported percentages.

### Next screen

Discover or ML Lab.

## 5. Screen 4: Discover

Route: `/discover`

### What the user sees

- Heading: "Discover Music for Your Vibe"
- Search bar
- Genre filters
- Available audio-feature filters
- Recommendation list
- Song detail panel
- Player controls

### User actions

- Search
- Apply filters
- Select a song
- Play or pause
- Like a track
- Save to a collection
- Read recommendation explanation

### System behavior

Rank candidate tracks using actual feature similarity.

Display a clear explanation of matching characteristics.

Stream only through authorized provider mechanisms.

### Next screen

User may remain in Discover, visit Collections, or inspect the ML Lab.

## 6. Screen 5: Music Player

### User action

Press Play.

### System behavior

1. Identify the selected provider track.
2. Retrieve its authorized playback reference.
3. Load the audio.
4. Update the player interface.
5. Handle pause, seek and volume where supported.

### Error flow

If the track is unavailable:

- Stop loading
- Display an explanatory message
- Provide an original-provider link where possible
- Allow another track to be selected

Do not simulate successful playback.

## 7. Screen 6: Collections

Route: `/collections`

### What the user sees

- Liked songs
- Saved collections
- Empty-state instructions for new users

### User actions

- Save songs
- Remove songs
- Create a collection
- Revisit saved music

### System behavior

Store guest selections locally.

Explain that guest data is device-specific.

## 8. Screen 7: Music Universe

Accessible through My Vibe or ML Lab.

### What the user sees

A PCA scatter plot of songs.

Points represent tracks.

Colors represent model clusters.

### User actions

- Hover over songs
- Select a song
- Filter clusters
- Inspect feature information
- Open related music

### System behavior

Use real PCA projections and cluster assignments.

Show actual data and model versions.

## 9. Screen 8: ML Lab

Route: `/ml-lab`

### ML Lab Home

Show every Unit 3 topic and its application.

Each topic provides:

- Concept
- Explanation
- Algorithm
- Inputs
- Outputs
- App feature using it
- Evaluation
- Unit 3 PPT reference

### Experiment A: K-Means Playground

User changes K.

The application updates:

- Song cluster assignments
- Cluster centroids
- Inertia
- Silhouette score

Use genuine model outputs.

### Experiment B: GMM vs K-Means

User selects a song.

Show:

- K-Means hard assignment
- GMM membership probabilities
- Explanation of soft clustering

### Experiment C: EM

Show:

- Expectation step
- Maximization step
- Real convergence information
- Model parameters

### Experiment D: PCA

Show:

- Two-dimensional song representation
- Explained variance
- Scree plot
- Selected number of principal components

### Experiment E: Hierarchical Clustering

Show:

- Dendrogram
- Linkage method
- Adjustable cut height
- Resulting clusters

### Experiment F: Factor Analysis

Show:

- Factor loadings
- Latent dimensions
- Explanation of shared variation

Only assign semantic factor names if supported by the data.

### Experiment G: Evaluation

Show:

- Inertia
- Silhouette score
- Appropriate model comparison criteria
- Interpretation of the results

## 10. Returning User Flow

If guest preferences exist locally:

Home → Resume My Vibe → View saved profile → Discover

If the saved profile uses an outdated model:

Explain that the model changed and offer recomputation.

## 11. Guest Without Profile

Home → Discover → Search → Listen → Like

Show nonpersonalized catalogue recommendations.

Offer a button to create a musical profile.

Never present generic songs as personalized recommendations.

## 12. Error States

The application must handle:

- No internet connection
- Jamendo API unavailable
- Empty search results
- Missing audio features
- Music playback denied
- Supabase unavailable
- Model artifact missing
- Invalid onboarding selection
- Browser storage unavailable

Every error must provide a helpful message and an appropriate next action.

## 13. Mobile Experience

On mobile:

- Use a compact navigation system.
- Keep song cards readable.
- Use a mini-player.
- Stack profile sections vertically.
- Keep onboarding controls touch-friendly.
- Allow charts to resize or scroll.
- Maintain all core features from desktop.

## 14. Acceptance Walkthrough

A tester should be able to:

1. Open the homepage.
2. Start onboarding.
3. Choose genres.
4. Select songs.
5. Generate a musical profile.
6. Understand the resulting feature visualization.
7. Browse recommended songs.
8. Play an available track.
9. Like and save a track.
10. Open the ML Lab.
11. Change K in the clustering experiment.
12. Inspect real evaluation results.
13. See exactly where Unit 3 algorithms are implemented.
14. Repeat the journey on mobile.

## 15. Final User Experience Requirement

The application must combine the polished aesthetic of the selected VibeAtlas design board with real, explainable machine-learning functionality.

Every important interaction should work.

Every displayed ML result should be traceable to actual computations.