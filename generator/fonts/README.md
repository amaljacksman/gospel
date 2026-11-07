# Rendering font

DejaVuSans.ttf is bundled with its license so Post, Story, and Reel text renders consistently without relying on system fonts. `render-card.ts` supplies it directly to resvg and disables system font discovery. Sharp encodes the resulting raster image.

NotoSansMalayalam.ttf is the static Noto Sans Malayalam Regular font from https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSansMalayalam, licensed under the SIL Open Font License 1.1 in NotoSansMalayalam-OFL.txt. HarfBuzz applies Indic shaping before resvg rasterizes its glyph outlines; Malayalam text wraps by measured width rather than character count.
