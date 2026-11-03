#!/usr/bin/env python3
"""English BOM CSV for the website, built from the generator summary (assets/osszesito.json).

The rack is all wood: the generator's fastener list (nails, glue, wall brackets) is not carried over.
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PART = {'Oldalfal': 'Side wall', 'Külső oldalfal': 'Outer side wall (engraved)', 'Padló / csőfészek': 'Base / pipe seat',
        'Vezetőfésű (alsó)': 'Guide comb (lower)', 'Vezetőfésű (felső)': 'Guide comb (upper)', 'Zároléc': 'Front rail',
        'Hátfal': 'Back panel', 'Ék': 'Wedge'}
NOTE = {'ékes hornyok, zároléc L-horony': 'wedge slots, rail L-slot', 'ékes csapok, csőfészkek': 'wedged tenons, pipe seats',
        'ékes csapok': 'wedged tenons', 'oldalfalba akasztva, kiemelhető': 'hooks into side walls, lifts out',
        'ékes csapok, szegezve a padlóhoz': 'wedged tenons', 'ebből 4 tartalék': 'incl. 4 spares'}

s = json.load(open(os.path.join(HERE, 'assets', 'osszesito.json'), encoding='utf-8'))
with open(os.path.join(HERE, 'assets', 'dok', 'pipe_rack_BOM.csv'), 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.writer(f, delimiter=';')
    w.writerow(['Item', 'ID', 'Part', 'Qty', 'Material', 'Size (mm)', 'Note'])
    for b in s['bom']:
        w.writerow([b['tetel'], b['azonosito'], PART.get(b['megnevezes'], b['megnevezes']), b['db'],
                    b['anyag'].replace('rétegelt lemez', 'plywood'), b['meret_mm'], NOTE.get(b['megjegyzes'], b['megjegyzes'])])
    w.writerow([])
    w.writerow(['', '', 'Hardware', 'none', '', '', 'all-wood: wedged through-tenons, no screws, nails, glue or brackets'])
    w.writerow([])
    for l in s['lemezek']:
        t = int(l['vastagsag'])
        w.writerow(['', '', f'Plywood sheet 1400 × 1400 × {t}', l['db'], f'plywood {t} mm', '1400 × 1400', 'for laser cutting'])
