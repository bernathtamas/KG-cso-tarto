const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const exists = url => fetch(url, {method: 'HEAD', cache: 'no-store'}).then(r => r.ok).catch(() => false);

/* ---------- Tabs (hash routing) ---------- */
const PAGES = ['termekek', 'tervezes', 'mellekletek', 'megvalositas', 'rolunk'];
const SECTION_ALIASES = {modell: 'termekek', video: 'termekek', stats: 'termekek'};
let current;

function route() {
  const hash = location.hash.slice(1);
  const page = PAGES.includes(hash) ? hash : SECTION_ALIASES[hash] || 'termekek';
  const changed = page !== current;
  current = page;
  for (const p of PAGES) $(`#page-${p}`).hidden = p !== page;
  $$('[data-tab]').forEach(a => a.dataset.tab === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  closeMenu();
  if (SECTION_ALIASES[hash]) document.getElementById(hash)?.scrollIntoView();
  else if (changed || PAGES.includes(hash)) window.scrollTo({top: 0});
  revealIn(document.getElementById(`page-${page}`));
}
window.addEventListener('hashchange', route);

/* ---------- Nav ---------- */
const nav = $('#nav'), toggle = $('#nav-toggle'), links = $('#nav-links');
const solid = () => nav.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, {passive: true});
solid();
function closeMenu() { links.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => {
  const open = !links.classList.contains('is-open');
  links.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
});
$$('[data-scroll]').forEach(a => a.addEventListener('click', e => {
  const target = document.querySelector(a.getAttribute('href'));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({behavior: 'smooth'});
}));

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), {rootMargin: '0px 0px -8% 0px'});
function revealIn(root) {
  root.querySelectorAll('.band, .tl-item, .rm, .ob, .stat, .page-hero, .about-hero').forEach(el => {
    if (el.classList.contains('is-in')) return;
    el.classList.add('reveal');
    io.observe(el);
  });
}

/* ---------- Stat counters ---------- */
const countIo = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  countIo.unobserve(e.target);
  const el = e.target, end = +el.dataset.count, t0 = performance.now();
  const step = t => {
    const k = Math.min((t - t0) / 1400, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}));
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $$('[data-count]').forEach(el => countIo.observe(el));

/* ---------- Data from the generator (osszesito.json) ---------- */
const PIPE_OD = {100: 110, 150: 160, 200: 200};
const PER_LANE = {100: 4, 150: 2, 200: 2};
let summary = null;

async function loadSummary() {
  try { summary = await fetch('assets/osszesito.json').then(r => r.json()); } catch { return; }

  const lanes = $('#lanes');
  lanes.innerHTML = '';
  for (const [key, mod] of Object.entries(summary.modulok)) {
    const m = document.createElement('div');
    m.className = 'lane-module';
    m.dataset.label = `${key} MODUL · ${mod.belso_szelesseg} MM`;
    m.style.setProperty('--w', mod.belso_szelesseg);
    for (const dn of mod.savok) {
      const l = document.createElement('div');
      l.className = 'lane';
      l.style.setProperty('--w', PIPE_OD[dn]);
      l.style.setProperty('--d', PIPE_OD[dn]);
      l.innerHTML = `<b>DN${dn}</b><span>Ø${PIPE_OD[dn]}</span><span>${PER_LANE[dn]} DB</span>`;
      m.appendChild(l);
    }
    lanes.appendChild(m);
  }

  const grid = $('#sheet-grid');
  grid.innerHTML = summary.tablak.map(t => {
    const id = String(t.n).padStart(2, '0'), file = `tabla_${id}_${t.vastagsag | 0}mm`;
    return `<a class="sheet" href="assets/dxf/${file}.dxf" download>
      <div class="sheet-img"><img src="assets/elonezet/${file}.png" alt="${id}. tábla vágási terve" loading="lazy"></div>
      <div class="sheet-meta"><div><span class="mono">TÁBLA ${id} · ${t.vastagsag | 0} MM</span><br><b>${t.alkatreszek.length} alkatrész</b></div><span class="mono">DXF ↓</span></div>
    </a>`;
  }).join('');
}

/* ---------- BOM: assets/bom.csv if present, else preliminary list from the generator ---------- */
function parseCsv(text) {
  const rows = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  const sep = (rows[0].match(/;/g) || []).length >= (rows[0].match(/,/g) || []).length ? ';' : ',';
  return rows.map(r => r.split(sep).map(c => c.trim().replace(/^"|"$/g, '')));
}
function renderTable(table, rows) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c]);
  const isNum = s => /^[~\d.,\s×x]+$/.test(s);
  table.innerHTML = `<thead><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td${isNum(c) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
async function loadBom() {
  const table = $('#bom-table'), note = $('#bom-source');
  try {
    const r = await fetch('assets/bom.csv', {cache: 'no-store'});
    if (r.ok) {
      renderTable(table, parseCsv(await r.text()));
      note.innerHTML = '<a class="mono" href="assets/bom.csv" download>BOM letöltése (CSV) ↓</a>';
      return;
    }
  } catch {}
  if (!summary) { note.textContent = 'A BOM hamarosan elkészül.'; return; }
  const sheetOf = name => summary.tablak.find(t => t.alkatreszek.includes(name))?.n;
  const rows = [['Tétel', 'Alkatrész', 'Anyag', 'Vastagság (mm)', 'Méret (mm)', 'Tábla', 'Db']];
  summary.alkatreszek.forEach((p, i) => rows.push([
    String(i + 1).padStart(2, '0'), p.nev, 'Rétegelt lemez', String(p.vastagsag | 0), `${p.meret[0]} × ${p.meret[1]}`, String(sheetOf(p.nev) ?? '–'), '1',
  ]));
  renderTable(table, rows);
  note.textContent = 'Előzetes alkatrészlista a generátor összesítőjéből. A végleges BOM hamarosan ide kerül.';
}

/* ---------- Optional media: exploded view, video, STEP ---------- */
async function loadMedia() {
  const img = $('#exploded-img');
  img.addEventListener('load', () => { img.hidden = false; $('#exploded-wait').hidden = true; });
  if (img.complete && img.naturalWidth) img.dispatchEvent(new Event('load'));

  const video = $('#project-video');
  video.addEventListener('loadedmetadata', () => { video.hidden = false; $('#video-waiting').hidden = true; });

  if (await exists(STEP_URL)) $('#step-file').hidden = false;
}

/* ---------- 3D viewer ---------- */
const STEP_URL = 'assets/model/cso_tarto_V1.step';
let viewer;
async function startViewer() {
  try {
    viewer = await import('./viewer.js');
    if (await exists(STEP_URL)) {
      const buf = await fetch(STEP_URL).then(r => r.arrayBuffer());
      await viewer.loadStep(buf, 'CSO_TARTO_V1.STEP');
    } else {
      await viewer.loadGlb('assets/model/cso_tarto_V1_csovekkel.glb', 'CSO_TARTO_V1 / ÖSSZEÁLLÍTÁS');
    }
  } catch (err) {
    console.error(err);
    $('#model-status').textContent = 'A 3D NÉZŐ NEM TÖLTHETŐ BE.';
  }
}
const viewerEl = $('#viewer');
new IntersectionObserver(([e], obs) => {
  if (e.isIntersecting) { obs.disconnect(); startViewer(); }
}, {rootMargin: '400px'}).observe(viewerEl);

const pipesBtn = $('#toggle-pipes'), spinBtn = $('#toggle-spin');
spinBtn.classList.add('is-on');
pipesBtn.addEventListener('click', () => {
  const on = pipesBtn.getAttribute('aria-pressed') !== 'true';
  pipesBtn.setAttribute('aria-pressed', String(on));
  pipesBtn.classList.toggle('is-on', on);
  viewer?.setPipes(on);
});
spinBtn.addEventListener('click', () => {
  const on = spinBtn.getAttribute('aria-pressed') !== 'true';
  spinBtn.setAttribute('aria-pressed', String(on));
  spinBtn.classList.toggle('is-on', on);
  viewer?.setSpin(on);
});
$('#reset-view').addEventListener('click', () => viewer?.resetView());

const input = $('#step-input');
$('#open-step').addEventListener('click', () => input.click());
input.addEventListener('change', async () => {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const status = $('#model-status');
  if (file.size > 40 * 1024 * 1024) { status.textContent = 'A FÁJL TÚL NAGY (MAX. 40 MB).'; return; }
  try {
    viewer = viewer || await import('./viewer.js');
    if (/\.glb$/i.test(file.name)) await viewer.loadGlb(URL.createObjectURL(file), file.name.toUpperCase());
    else if (/\.(step|stp)$/i.test(file.name)) await viewer.loadStep(await file.arrayBuffer(), file.name.toUpperCase());
    else status.textContent = 'STEP, STP VAGY GLB FÁJLT VÁLASSZ.';
    pipesBtn.setAttribute('aria-pressed', 'true');
    pipesBtn.classList.add('is-on');
  } catch (err) {
    console.error(err);
    status.textContent = 'A MODELL NEM NYITHATÓ MEG.';
  }
});

/* ---------- Hero logo ---------- */
function canWebGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
if (canWebGL()) import('./logo3d.js').then(m => m.mountLogo($('#hero-logo'))).catch(err => console.error(err));

/* ---------- Boot ---------- */
route();
loadSummary().then(loadBom);
loadMedia();
