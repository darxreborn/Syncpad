# App Icons TODO

The PWA manifest requires proper PNG icons for installation:

- icon-192.png (192x192)
- icon-512.png (512x512)

Currently using icon.svg as a placeholder. Generate proper PNG icons:

```bash
# Using ImageMagick (if available)
convert -background none -size 192x192 icon.svg icon-192.png
convert -background none -size 512x512 icon.svg icon-512.png

# Or use online tools:
# - https://realfavicongenerator.net/
# - https://favicon.io/
```

Design notes:
- Use blue (#2563eb) background
- White "S" letter for SyncPad
- Round corners (24px radius for 192px icon)
- Maskable safe zone (80% content area)
