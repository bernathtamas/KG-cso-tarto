# Product Team – Pipe Rack

A laser-cut, all-wood rack for our workshop, holding DN100, DN150 and DN200 KG pipes. Built for an internal AI Challenge with Claude Opus 5.5.

**Live site:** https://bernathtamas.github.io/KG-cso-tarto/

<img src="assets/qr.svg" alt="QR code to the live site" width="180">

| | |
|---|---|
| Overall size | 2265 × 600 × 1350 mm (fits a 2300 × 600 mm wall) |
| Capacity | 30 pipes: 6 × DN200, 8 × DN150, 16 × DN100 |
| Material | 6 plywood sheets (3 × 10 mm, 3 × 6 mm), 1400 × 1400 mm, 73% material use |
| Construction | 2 modules, 14 plates + 56 wedges, wedged through-tenons, lift-out front rail |
| Hardware | none – no screws, nails, glue or brackets |
| Video | 1:24, English, rendered with Remotion + HyperFrames, neural voice-over; music: “Inspired” by Kevin MacLeod (incompetech.com), CC BY 4.0 |

## Site tabs
`#products` · `#log` · `#attachments` · `#production` · `#sponsors` · `#about`

A static site (HTML + CSS + Three.js from a CDN), no build step.

## Updating content
- `./sync_assets.sh` copies the current model outputs (3D model, renders, assembly drawing, DXF sheets) from the model folder and builds the English BOM with `make_bom_en.py`.
- The video lives in `assets/video.mp4` (source project: `../video`).

## Local preview
```bash
python3 -m http.server 8765
```
Then open http://localhost:8765
