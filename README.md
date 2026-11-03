# Product Team – KG csőtároló weboldal

Statikus oldal (HTML + CSS + Three.js CDN-ről), build nélkül. GitHub Pages-re a mappa tartalma egy az egyben feltölthető.

## Fülek
`#termekek` · `#tervezes` · `#mellekletek` · `#megvalositas` · `#rolunk`

## Tartalom frissítése
- **Modell, DXF, előnézetek:** `./sync_assets.sh` – átmásolja a `../3D_modell` aktuális kimeneteit.
- Ha a fájl a megadott néven az `assets/` mappába kerül, az oldal magától megjeleníti:

| Fájl | Hol jelenik meg |
|---|---|
| `assets/model/cso_tarto_V1.step` | A 3D-néző ezt tölti be a GLB helyett, és letöltésként is megjelenik |
| `assets/bom.csv` | Mellékletek → BOM (`;` vagy `,` elválasztás, az első sor a fejléc) |
| `assets/robbantott.png` | Mellékletek → robbantott ábra |
| `assets/video.mp4` | Termékek → videó |

## Helyi előnézet
```bash
python3 -m http.server 8765
```
Utána nyisd meg: http://localhost:8765
