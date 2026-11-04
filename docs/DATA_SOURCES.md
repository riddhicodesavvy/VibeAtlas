# Data and licensing

Application code is MIT. That license does not cover recordings, catalogue metadata, artwork or fonts.

## FMA research features
Defferrard, Benzi, Vandergheynst and Bresson, *FMA: A Dataset for Music Analysis*, ISMIR 2017. Official source: https://github.com/mdeff/fma. Metadata and published precomputed descriptors are used under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . The official metadata archive SHA1 is `f0df49ffe5f2a6008d7dc83c6915b31835dfe733`.

VibeAtlas selects a bounded subset of the FMA-small records, limits repeated artists, selects 17 measured descriptors, transforms/scales them, and fits unsupervised models. These are modifications to the published feature dataset. No FMA audio is downloaded, processed, rehosted or played by this application. Original track licenses differ from the metadata license. Original source links can be stale; availability is not implied. Decorative fallback sleeves are application artwork, not claimed original album covers.

## Jamendo listening catalogue
Metadata and provider-hosted streams are accessed through the official Jamendo API for this non-commercial academic application. Each track displays its artist, original provider page and returned Creative Commons license. https://devportal.jamendo.com/api_terms_of_use and https://licensing.jamendo.com/en/legal/termsofuse apply. Metadata import is bounded and repeatable; refresh before a public demonstration. Audio is neither downloaded by the importer nor cached offline. A stream is revalidated when playback starts.

Jamendo analysis permission remains unresolved. Jamendo tracks have no fabricated audio descriptors or similarity scores. Their metadata/playback catalogue stays separate from FMA-based ML profiles and recommendations. Do not imply that selecting a Jamendo track produces a measured profile.

## Visual assets
The supplied UI board is a design reference, not a redistributable application image. The application uses original CSS/SVG artwork and actual provider-returned album images. Fonts bundled via Fontsource retain their included open font license notices. Artist photographs will not be copied from the reference without confirmed rights.

The landing photograph is Yuri Oliveira's [Mc Mirella stage photograph](https://commons.wikimedia.org/wiki/File:Mc_Mirella_(51893938577).png), used under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) with color treatment and an optimized WebP derivative. Attribution and source links appear on the landing and credits pages. Its use implies no artist endorsement. The original source image remains in `public/`.

## Academic references
The Unit 3 slide deck and rubric have not been supplied. Topic references are named explicitly; exact slide numbers are unavailable and are never invented.
