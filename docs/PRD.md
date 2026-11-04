# VibeAtlas — Product Requirements Document

Version: 1.0  
Project Type: Machine Learning / Full-Stack Web Application  
Course: 21CSC305P — Machine Learning, Unit 3  
Project Status: Planning

## 1. Product Overview

VibeAtlas is an AI-powered independent music discovery platform that analyzes the characteristics of songs to identify musical patterns, discover user preferences, and recommend similar music.

The application uses unsupervised machine learning algorithms from Unit 3 of the Machine Learning syllabus.

VibeAtlas will have two connected experiences:

1. **Music Discovery:** A visually engaging application where users explore music, build their musical personality, and discover songs.
2. **ML Lab:** An educational environment demonstrating the actual algorithms used by VibeAtlas, their inputs, outputs, and performance.

The application must be responsive, free to use, open source, and suitable for an academic project.

## 2. Design Reference

The attached image, `VibeAtlas music discovery design board(1).png`, is the primary UI/UX reference.

The four illustrated screens are:

- Landing
- Onboarding
- My Vibe
- Discover

Reproduce the overall visual identity, navigation structure, typography, layout, and component styling.

Do not use the image itself as the application interface.

The mockup's songs, percentages, artist names, and personality descriptions are illustrative. Actual application data must come from the music catalogue and ML pipeline.

### Design System

- Background: Midnight navy `#0E1020`
- Primary: Electric lavender `#9B7CFF`
- Secondary: Coral `#FF9278`
- Accent: Mint `#2DD4BF`
- Typography: Inter or Geist
- Style: Premium music discovery platform
- Layout: Sidebar navigation, subtle gradients, rounded cards, responsive content sections

## 3. Target Users

### Music Listeners

People interested in discovering independent music matching their preferences.

### Students

Users who want to understand the data behind music recommendations.

### Faculty Evaluators

Teachers evaluating practical implementations of unsupervised ML algorithms from Unit 3.

## 4. Primary Features

### Feature 1: Landing Page

The homepage must include:

- VibeAtlas logo and branding
- Hero heading: "Find your frequency"
- Short explanation of the application
- "Discover My Vibe" button
- Trending or featured independent tracks
- Navigation sidebar
- Link to the ML Lab

A visitor must be able to explore the catalogue without creating an account.

### Feature 2: Music Onboarding

Users select their musical preferences.

Step 1: Select genres.

Examples:

- Indie
- Alternative
- Electronic
- Lo-fi
- Dream Pop
- Rock
- Folk
- Hip-Hop
- R&B
- Ambient

Only genres available in the actual dataset should be selectable.

Step 2: Select favorite songs.

Users search and select at least three songs. Five to ten selections are recommended for a more representative profile.

Step 3: Review selections.

Step 4: Generate musical profile.

The app validates whether selected tracks have usable audio features before performing ML analysis.

### Feature 3: My Vibe

Analyze the user's selected songs and produce a musical personality profile.

Display:

- Creative musical personality name
- Short explanation of the profile
- Measured audio-feature visualization
- Closest musical cluster
- Related music clusters
- Recommendations
- Button to edit music preferences
- Explanation of how the profile was generated

Personality names are descriptive labels assigned to clusters after analysis. They must not be presented as scientifically validated psychological results.

Do not invent percentages or ML confidence scores.

### Feature 4: Discover

Users discover songs based on their musical preferences.

Required functionality:

- Search songs and artists
- Filter by genre
- Filter by supported audio characteristics
- Browse recommendations
- Play tracks when permitted by the music provider
- Like or unlike songs
- See why a song was recommended
- Open the original provider page

Recommendations must use actual song features and a documented similarity method.

### Feature 5: Music Player

The music player should support:

- Play/pause
- Track information
- Album artwork
- Progress/seek controls when supported
- Volume control
- Next/previous within the current play queue
- Source attribution

Music must stream through an authorized provider integration.

Do not implement unauthorized downloading, rehosting, DRM bypass, or offline audio caching.

When a track cannot be played, show a clear message and a link to its original source.

### Feature 6: Collections

Users can:

- Like songs
- View liked songs
- Create collections
- Remove songs from collections

For V1, guest collections may use browser-local storage.

Clearly inform users that local collections do not automatically synchronize between devices.

### Feature 7: Music Universe

An interactive visualization of songs represented in a two-dimensional feature space using PCA.

Features:

- Scatter plot
- Cluster colors
- Song hover information
- Song selection
- Cluster filtering
- Selected-track information
- Explanation of principal components

The plotted coordinates must be generated from actual feature data.

### Feature 8: ML Lab

This is the central academic feature.

It must demonstrate:

1. K-Means clustering
2. Gaussian Mixture Models
3. Expectation-Maximization
4. Principal Component Analysis
5. Choosing latent dimensions
6. Factor Analysis
7. Hierarchical clustering
8. Distance and dissimilarity
9. Clustering evaluation

Each experiment should provide:

- Concept explanation
- Where it is used in VibeAtlas
- Input data
- Algorithm
- Actual output
- Visualization
- Evaluation
- Relevant Unit 3 slide reference

The ML Lab must distinguish implemented algorithms from planned functionality.

## 5. Application Navigation

Primary navigation:

- Home
- Discover
- My Vibe
- Collections
- ML Lab

Secondary navigation, when implemented:

- Liked
- History
- Settings

Do not display nonfunctional controls.

## 6. Functional Requirements

FR-01: Users can access the application without mandatory registration.

FR-02: Users can search and explore the music catalogue.

FR-03: Users can select genres and favorite tracks.

FR-04: The backend can generate a profile using actual ML features.

FR-05: Recommendations are based on documented feature similarity.

FR-06: The audio player handles permitted playback and unavailable tracks.

FR-07: Likes and collections persist locally during the guest experience.

FR-08: The ML Lab demonstrates implemented Unit 3 algorithms.

FR-09: All numerical claims originate from real calculations.

FR-10: Users can access the application on desktop and mobile.

FR-11: The application provides loading, empty, error, and retry states.

FR-12: Users can view music licensing and attribution information.

## 7. Non-Functional Requirements

- Responsive design
- Accessible keyboard navigation
- Readable contrast
- Secure API access
- No exposed backend secrets
- No paid APIs required for V1
- Reproducible ML training
- Graceful failure handling
- Fast browsing through pagination and precomputed model results

## 8. Out of Scope for V1

- Spotify account synchronization
- Commercial music licensing
- Paid subscriptions
- AI-generated songs
- Social networking
- Offline audio downloads
- Large-scale streaming infrastructure
- Mandatory user accounts

## 9. Success Criteria

The project is successful when:

1. A new visitor can complete onboarding without an account.
2. The user receives a profile based on actual song characteristics.
3. The discovery page provides meaningful feature-based recommendations.
4. Music playback works where authorized.
5. The interface closely follows the supplied design reference.
6. All implemented ML algorithms have reproducible outputs.
7. Faculty can inspect the Unit 3 concept-to-feature mapping.
8. No secrets or unauthorized database write access are exposed.
9. The project can be demonstrated within free usage limits.

## 10. Development Priorities

P0 — Essential:

- Responsive frontend
- Music catalogue
- Onboarding
- Feature-based profile
- K-Means clustering
- Recommendations
- Authorized playback
- Unit 3 mapping

P1 — Academic completeness:

- GMM
- EM
- PCA
- Hierarchical clustering
- Factor Analysis
- Evaluation dashboard
- ML Lab experiments

P2 — Enhancements:

- Shareable music personality cards
- Advanced playlists
- Optional authenticated accounts

## 11. Final Product Principle

VibeAtlas should function as a real music discovery application while making its machine-learning decisions transparent and educational.