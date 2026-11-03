#!/bin/sh
# Copies the current model outputs from ../3D_modell into assets/.
# Run again whenever the generator or the Fusion script produces new files.
set -e
cd "$(dirname "$0")"
SRC=../3D_modell
mkdir -p assets/model assets/elonezet assets/dxf

cp "$SRC"/3D_export/*.glb assets/model/ 2>/dev/null || true
cp "$SRC"/3D_export/*.step "$SRC"/3D_export/*.stp assets/model/ 2>/dev/null || true
cp "$SRC"/elonezet/*.png assets/elonezet/
cp "$SRC"/osszesito.json assets/osszesito.json

rm -f assets/dxf/*.zip
(cd "$SRC" && zip -qr - DXF_tablak) > assets/dxf/dxf_tablak.zip
(cd "$SRC" && zip -qr - DXF_alkatreszek) > assets/dxf/dxf_alkatreszek.zip
cp "$SRC"/DXF_tablak/*.dxf assets/dxf/

# Optional deliverables; drop them into assets/ under these names:
#   assets/bom.csv             – BOM (semicolon or comma separated, first row = header)
#   assets/robbantott.png      – exploded view
#   assets/video.mp4           – project video
#   assets/model/cso_tarto_V1.step – STEP shown in the viewer
ls -R assets | head -60
