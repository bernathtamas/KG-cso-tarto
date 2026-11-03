# Product Team – KG csőtároló V1

Lézervágott, rétegelt lemez csőtároló a műhelyünkbe, DN100 / DN150 / DN200 KG csövekhez. A projekt az AI kihívásra készült, Claude Opus 5.5 segítségével.

**Élő oldal:** https://bernathtamas.github.io/KG-cso-tarto/

| | |
|---|---|
| Befoglaló méret | 2224 × 600 × 1350 mm (2300 × 600 mm-es helyre) |
| Kapacitás | 30 cső: 6 × DN200, 8 × DN150, 16 × DN100 |
| Anyag | 8 tábla rétegelt lemez (4 × 10 mm, 4 × 6 mm), 1400 × 1400 mm |
| Felépítés | 2 modul, 18 alkatrész, csap-horony kötés, M8 csavarral összefogva |
| Videó | 1:56, Remotion + HyperFrames, magyar narráció |

## Az oldal fülei
`#termekek` · `#tervezes` · `#mellekletek` · `#megvalositas` · `#rolunk`

Statikus oldal (HTML + CSS + Three.js CDN-ről), build nélkül.

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
