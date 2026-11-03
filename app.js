const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const exists = url => fetch(url, {method: 'HEAD', cache: 'no-store'}).then(r => r.ok).catch(() => false);

/* ---------- Tabs (hash routing) ---------- */
const PAGES = ['products', 'log', 'attachments', 'production', 'sponsors', 'game', 'about'];
const SECTION_ALIASES = {model: 'products', video: 'products', stats: 'products', time: 'log'};
let current;

function route() {
  const hash = location.hash.slice(1);
  const page = PAGES.includes(hash) ? hash : SECTION_ALIASES[hash] || 'products';
  const changed = page !== current;
  current = page;
  for (const p of PAGES) $(`#page-${p}`).hidden = p !== page;
  $$('[data-tab]').forEach(a => a.dataset.tab === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  closeMenu();
  if (SECTION_ALIASES[hash]) document.getElementById(hash)?.scrollIntoView();
  else if (changed || PAGES.includes(hash)) window.scrollTo({top: 0});
  revealIn(document.getElementById(`page-${page}`));
  syncGame(page === 'game');
  if (page !== 'products') $('#project-video')?.pause();   // the video lives on Products; don't let it play behind other tabs
}

// The game is only loaded when its tab is opened, and pauses when you leave it.
let game;
async function syncGame(on) {
  if (on && !game) {
    game = await import('./game.js?v=20261103p');
    const frame = $('#game-frame'), btn = $('#game-sound');
    game.mountGame(frame);
    const show = m => { btn.textContent = m ? 'Sound off' : 'Sound on'; btn.setAttribute('aria-pressed', String(!m)); btn.classList.toggle('is-on', !m); };
    show(game.isMuted());
    btn.addEventListener('click', () => show(game.toggleMute()));
    frame.addEventListener('mutechange', e => show(e.detail));
  }
  game?.setActive(on);
}
window.addEventListener('hashchange', route);

/* ---------- Nav ---------- */
const nav = $('#nav'), toggle = $('#nav-toggle'), links = $('#nav-links');
const solid = () => nav.classList.toggle('is-solid', scrollY > 40);
addEventListener('scroll', solid, {passive: true});
solid();
function closeMenu() { links.classList.remove('is-open'); document.body.classList.remove('menu-open'); toggle.setAttribute('aria-expanded', 'false'); }
toggle.addEventListener('click', () => {
  const open = !links.classList.contains('is-open');
  links.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
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
  root.querySelectorAll('.band, .tl-item, .rm, .ob, .stat, .page-hero, .about-hero, .iter, .sponsor').forEach(el => {
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

// Material-use counter: climbs from the first layout to the final one, red → amber → green as it goes.
const usageColor = v => v < 50 ? '#e0563f' : v < 60 ? '#e8a94a' : '#7fd39b';
const usageIo = new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  usageIo.unobserve(e.target);
  const el = e.target, from = +el.dataset.from, to = +el.dataset.usage, t0 = performance.now() + 300;
  const step = t => {
    const k = Math.max(0, Math.min((t - t0) / 2200, 1));
    const v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 2)));
    el.textContent = v;
    el.style.color = usageColor(v);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}, {threshold: .6}));
$$('.stat-usage').forEach(el => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = el.dataset.usage; el.style.color = usageColor(+el.dataset.usage); }
  else { el.style.color = usageColor(+el.dataset.from); usageIo.observe(el); }
});

/* ---------- Data from the generator (osszesito.json) ---------- */
const PIPE_OD = {100: 110, 150: 160, 200: 200};
const PER_LANE = {100: 4, 150: 2, 200: 2};
let summary = null;

async function loadSummary() {
  renderSheets();   // independent of the summary, so the cutting files always show
  try { summary = await fetch('assets/osszesito.json', {cache: 'no-cache'}).then(r => r.json()); } catch { return; }

  const lanes = $('#lanes');
  lanes.innerHTML = '';
  for (const [key, mod] of Object.entries(summary.modulok)) {
    const m = document.createElement('div');
    m.className = 'lane-module';
    m.dataset.label = `MODULE ${key} · ${mod.belso_szelesseg} MM`;
    m.style.setProperty('--w', mod.belso_szelesseg);
    for (const dn of mod.savok) {
      const l = document.createElement('div');
      l.className = 'lane';
      l.style.setProperty('--w', PIPE_OD[dn]);
      l.style.setProperty('--d', PIPE_OD[dn]);
      l.innerHTML = `<b>DN${dn}</b><span>Ø${PIPE_OD[dn]}</span><span>${PER_LANE[dn]} PCS</span>`;
      m.appendChild(l);
    }
    lanes.appendChild(m);
  }

}

async function renderSheets() {
  const grid = $('#sheet-grid');
  // The manifest lists the sheet files; fall back to the known six sheets if it can't be fetched.
  const FALLBACK = ['tabla_01_10mm', 'tabla_02_10mm', 'tabla_03_10mm', 'tabla_04_6mm', 'tabla_05_6mm', 'tabla_06_6mm', 'tartalek_ekek_4db_6mm'];
  let sheets = FALLBACK;
  try {
    const list = await fetch('assets/tablak.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null);
    if (Array.isArray(list) && list.length) sheets = list;
  } catch {}
  grid.innerHTML = sheets.map(file => {
    const m = file.match(/^tabla_(\d+)_(\d+)mm$/);
    const title = m ? `SHEET ${m[1]} · ${m[2]} MM` : 'SPARE WEDGES · OPTIONAL';
    const img = m ? `<img src="assets/elonezet/${file}.png" alt="${title} cutting layout" loading="lazy">` : '<span class="sheet-spare mono">OPTIONAL<br>4 spare wedges<br>from any 6 mm offcut</span>';
    return `<a class="sheet" href="assets/dxf/${file}.dxf" download>
      <div class="sheet-img">${img}</div>
      <div class="sheet-meta"><div><span class="mono">${title}</span><br><b>${m ? '1400 × 1400' : 'Any 6 mm offcut'}</b></div><span class="mono">DXF ↓</span></div>
    </a>`;
  }).join('');
}

/* ---------- BOM from the generator summary (same data as dokumentacio/BOM_cso_tarto_V1.csv) ---------- */
function renderTable(table, rows) {
  const esc = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'})[c]);
  const isNum = s => /^[~\d.,\s]+(kg)?$/.test(s);
  table.innerHTML = `<thead><tr>${rows[0].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td${isNum(String(c)) ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
}
// The generator writes Hungarian part names; the site shows them in English.
const PART_EN = {
  'Oldalfal': 'Side wall', 'Külső oldalfal': 'Outer side wall (engraved)', 'Padló / csőfészek': 'Base / pipe seat',
  'Vezetőfésű (alsó)': 'Guide comb (lower)', 'Vezetőfésű (felső)': 'Guide comb (upper)', 'Zároléc': 'Front rail', 'Hátfal': 'Back panel', 'Ék': 'Wedge',
};
const NOTE_EN = {
  'ékes hornyok, zároléc L-horony': 'wedge slots, rail L-slot', 'ékes csapok, csőfészkek': 'wedged tenons, pipe seats', 'ékes csapok': 'wedged tenons',
  'oldalfalba akasztva, kiemelhető': 'hooks into side walls, lifts out', 'ékes csapok, szegezve a padlóhoz': 'wedged tenons', 'ebből 4 tartalék': 'incl. 4 spares',
};
const en = s => String(s).replace('rétegelt lemez', 'plywood');
function loadBom() {
  const table = $('#bom-table');
  if (!summary?.bom) return;
  const rows = [['Item', 'ID', 'Part', 'Qty', 'Material', 'Size (mm)', 'Note']];
  for (const b of summary.bom) rows.push([String(b.tetel).padStart(2, '0'), b.azonosito, PART_EN[b.megnevezes] || b.megnevezes, String(b.db), en(b.anyag), b.meret_mm, NOTE_EN[b.megjegyzes] ?? b.megjegyzes]);
  renderTable(table, rows);
}

/* ---------- Optional media: exploded view, video, STEP ---------- */
async function loadMedia() {
  const img = $('#exploded-img');
  img.addEventListener('load', () => { img.hidden = false; $('#exploded-wait').hidden = true; });
  if (img.complete && img.naturalWidth) img.dispatchEvent(new Event('load'));

  const video = $('#project-video');
  video.addEventListener('loadedmetadata', () => { video.hidden = false; $('#video-waiting').hidden = true; });

}

/* ---------- 3D viewer ---------- */
const STEP_URL = 'assets/model/cso_tarto_V1.step';
let viewer;
// The engraved STEP is 15 MB, so the light GLB loads first and the STEP is one click away.
async function startViewer() {
  try {
    viewer = await import('./viewer.js');
    await viewer.loadGlb('assets/model/cso_tarto_V1_csovekkel.glb', 'PIPE_RACK / ASSEMBLY');
  } catch (err) {
    console.error(err);
    $('#model-status').textContent = 'THE 3D VIEWER COULD NOT LOAD.';
  }
}
$('#load-step').addEventListener('click', async e => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    viewer = viewer || await import('./viewer.js');
    $('#model-status').textContent = 'DOWNLOADING STEP (15 MB)…';
    const buf = await fetch(STEP_URL).then(r => r.arrayBuffer());
    await viewer.loadStep(buf, 'PIPE_RACK.STEP · ENGRAVED');
    pipesBtn.setAttribute('aria-pressed', 'true');
    pipesBtn.classList.add('is-on');
  } catch (err) {
    console.error(err);
    $('#model-status').textContent = 'THE STEP FILE COULD NOT BE OPENED.';
  } finally { btn.disabled = false; }
});
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

// Lift-the-rail demo and explode slider (GLB and STEP both carry module/part names).
const liftBtn = $('#lift-demo'), explodeIn = $('#explode');
liftBtn.addEventListener('click', async () => {
  if (!viewer) return;
  explodeIn.value = 0;
  viewer.setExplode(0);
  liftBtn.disabled = true;
  liftBtn.classList.add('is-on');
  await viewer.liftDemo();
  liftBtn.disabled = false;
  liftBtn.classList.remove('is-on');
});
explodeIn.addEventListener('input', () => viewer?.setExplode(explodeIn.value / 100));

const input = $('#step-input');
$('#open-step').addEventListener('click', () => input.click());
input.addEventListener('change', async () => {
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const status = $('#model-status');
  if (file.size > 40 * 1024 * 1024) { status.textContent = 'FILE TOO LARGE (MAX. 40 MB).'; return; }
  try {
    viewer = viewer || await import('./viewer.js');
    if (/\.glb$/i.test(file.name)) await viewer.loadGlb(URL.createObjectURL(file), file.name.toUpperCase());
    else if (/\.(step|stp)$/i.test(file.name)) await viewer.loadStep(await file.arrayBuffer(), file.name.toUpperCase());
    else status.textContent = 'PLEASE CHOOSE A STEP, STP OR GLB FILE.';
    pipesBtn.setAttribute('aria-pressed', 'true');
    pipesBtn.classList.add('is-on');
  } catch (err) {
    console.error(err);
    status.textContent = 'THE MODEL COULD NOT BE OPENED.';
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

/* ---------- Easter egg: five quick clicks on a logo and Túró Rudi rains down ---------- */
const RUDI = `<svg viewBox="0 0 160 52" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rw" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#7a2a1a"/><stop offset=".45" stop-color="#4a160d"/><stop offset="1" stop-color="#2b0b06"/></linearGradient></defs>
  <path d="M8 6h144l-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4H8l4-4-4-4 4-4-4-4 4-4-4-4 4-4-4-4 4-4z" fill="#f4f1ec"/>
  <rect x="26" y="5" width="108" height="42" rx="10" fill="url(#rw)"/>
  <path d="M36 35c20-24 50 12 90-18" fill="none" stroke="#d6a85b" stroke-width="1.4" opacity=".8"/>
  <text x="80" y="22" font-family="Georgia,serif" font-size="8" letter-spacing="2" fill="#f4f1ec" text-anchor="middle">CSERPES</text>
  <text x="80" y="38" font-family="Georgia,serif" font-style="italic" font-size="17" fill="#d6a85b" text-anchor="middle">Rudi</text></svg>`;
let eggClicks = [];
function rudiRain() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const layer = document.createElement('div');
  layer.className = 'rudi-rain';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 18; i++) {
    const r = document.createElement('div');
    r.className = 'rudi';
    r.innerHTML = RUDI;
    r.style.left = `${Math.random() * 92}vw`;
    r.style.animationDelay = `${Math.random() * 1.6}s`;
    r.style.animationDuration = `${2.4 + Math.random() * 1.6}s`;
    r.style.setProperty('--spin', `${(Math.random() < .5 ? -1 : 1) * (180 + Math.random() * 540)}deg`);
    r.style.setProperty('--w', `${90 + Math.random() * 70}px`);
    layer.appendChild(r);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 5200);
}
for (const el of [$('.brand-mark'), $('#hero-logo'), $('.about-logo')]) {
  el?.addEventListener('click', e => {
    const now = performance.now();
    eggClicks = eggClicks.filter(t => now - t < 3000).concat(now);
    if (eggClicks.length >= 5) { eggClicks = []; rudiRain(); }
  });
}
