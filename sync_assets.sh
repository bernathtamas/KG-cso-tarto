#!/bin/sh
# Copies the current model outputs (V1.1) from ../../Cso_tarto_V1.1/3D_modell into assets/.
# Run again whenever the generator or the Fusion script produces new files.
set -e
cd "$(dirname "$0")"
SRC=../../Cso_tarto_V1.1/3D_modell
mkdir -p assets/model assets/elonezet assets/dxf assets/kepek assets/dok

# 3D: web GLBs and the Fusion STEP export (the viewer prefers the STEP).
cp "$SRC"/3D_export/cso_tarto_V1_1_csovekkel.glb assets/model/cso_tarto_V1_csovekkel.glb
cp "$SRC"/3D_export/cso_tarto_V1_1_allvany.glb assets/model/cso_tarto_V1_allvany.glb
cp "$SRC"/3D_export/cso_tarto_V1_1_osszeallitas.step assets/model/cso_tarto_V1.step

# Summary (BOM, fasteners, sheet usage) drives the lanes, BOM table and stats.
cp "$SRC"/osszesito.json assets/osszesito.json
python3 -I make_bom_en.py   # English, all-wood BOM from osszesito.json
cp "$SRC"/dokumentacio/Cso_tarto_V1_1_szerelesi_rajz.pdf assets/dok/Cso_tarto_V1_szerelesi_rajz.pdf

# Fusion renders and drawings, downsized for the web.
for f in "$SRC"/dokumentacio/fusion_kepek/*.png "$SRC"/dokumentacio/rajz_*.png; do
  sips -s format jpeg -s formatOptions 82 -Z 2000 "$f" --out "assets/kepek/$(basename "${f%.png}").jpg" >/dev/null
done
cp assets/kepek/robbantott_teljes.jpg assets/robbantott.jpg

# Cutting sheets: DXF + preview, plus a manifest the page reads.
rm -f assets/dxf/* assets/elonezet/*
cp "$SRC"/DXF_tablak/*.dxf assets/dxf/
(cd "$SRC" && zip -qr - DXF_tablak) > assets/dxf/dxf_tablak.zip
(cd "$SRC" && zip -qr - DXF_alkatreszek) > assets/dxf/dxf_alkatreszek.zip
for d in "$SRC"/DXF_tablak/tabla_*.dxf; do
  n=$(basename "${d%.dxf}")
  [ -f "$SRC/elonezet/$n.png" ] && cp "$SRC/elonezet/$n.png" assets/elonezet/
done
cp "$SRC"/elonezet/osszeallitas*.png assets/elonezet/
ls "$SRC"/DXF_tablak | sed -n 's/\.dxf$//p' | python3 -I -c "import json,sys; print(json.dumps([l.strip() for l in sys.stdin if l.strip()]))" > assets/tablak.json

# Optional: assets/video.mp4 (+ video-poster.jpg) – project video.
du -sh assets/*
