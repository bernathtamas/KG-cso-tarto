# Product Team – KG csőtároló V1

Lézervágott, rétegelt lemez csőtároló a műhelyünkbe, DN100 / DN150 / DN200 KG csövekhez. A projekt az AI kihívásra készült, Claude Opus 5.5 segítségével.

**Élő oldal:** https://bernathtamas.github.io/KG-cso-tarto/

| | |
|---|---|
| Befoglaló méret | 2265 × 600 × 1350 mm (2300 × 600 mm-es helyre) |
| Kapacitás | 30 cső: 6 × DN200, 8 × DN150, 16 × DN100 |
| Anyag | 6 tábla rétegelt lemez (3 × 10 mm, 3 × 6 mm), 1400 × 1400 mm, 64% kihasználás |
| Felépítés | 2 modul, 14 lemez + 56 ék, ékes átmenő csapok, csavar nélkül, kiakasztható zároléc |
| Videó | 2:14, Remotion + HyperFrames, magyar narráció |

## Az oldal fülei
`#termekek` · `#tervezes` · `#mellekletek` · `#megvalositas` · `#rolunk`

Statikus oldal (HTML + CSS + Three.js CDN-ről), build nélkül.

## Tartalom frissítése
`./sync_assets.sh` átmásolja a `../3D_modell` aktuális kimeneteit: STEP és GLB modell, `osszesito.json` (BOM, kötőelemek, sávkiosztás), Fusion-renderek, szerelési rajz (PDF), DXF táblák. A videó: `assets/video.mp4` (forrás: `../video`).

## Helyi előnézet
```bash
python3 -m http.server 8765
```
Utána nyisd meg: http://localhost:8765
