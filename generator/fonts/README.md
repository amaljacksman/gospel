# Rendering font

DejaVuSans.ttf is bundled with its license so Post, Story, and Reel text renders consistently without relying on system fonts. `render-card.ts` supplies it directly to resvg and disables system font discovery. Sharp encodes the resulting raster image.
