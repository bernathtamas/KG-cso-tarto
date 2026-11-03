// Pipe Runner: an endless runner. The rack runs on its own; jump between three levels to collect pipes.
// Score = pipes collected. Screws stand on the floor and on the platforms – touch one and the round is over.
const W = 960, H = 540;
const GROUND = 470, LEVELS = [GROUND, 370, 270];       // top of floor / platforms
const GRAVITY = 2300, JUMP = 900, P_W = 56, P_H = 66, P_X = 170;
const C = {bg: '#05080d', grid: 'rgba(140,190,255,.07)', wood: '#cfa572', woodDark: '#8d6a3e', pipe: '#d06a2a',
  socket: '#a9441a', gold: '#d6a85b', screw: '#9aa3ad', red: '#e0563f', ink: '#f5f5f5', muted: '#8d8d8d'};

let canvas, ctx, scale = 1, raf = 0, last = 0, active = false;
let s;   // game state
const KEY = 'pipeRunnerBestScore';
const best = () => { try { return +localStorage.getItem(KEY) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(KEY, String(n)); } catch {} };

// Speed tier by pipes collected (plus a distance push in update()): 0–10 slow, 10–15 a little faster, 20–25 fast, 25–35 very fast,
// beyond 35 it keeps accelerating, harder and harder.
const TIERS = [[0, 260], [10, 290], [15, 350], [20, 420], [25, 480], [35, 600]];
function targetSpeed(n) {
  if (n >= 35) return 600 + Math.pow(n - 35, 1.35) * 14;
  for (let i = 1; i < TIERS.length; i++) {
    const [a, va] = TIERS[i - 1], [b, vb] = TIERS[i];
    if (n <= b) return va + (vb - va) * (n - a) / (b - a);
  }
  return 600;
}

function newGame() {
  s = {mode: 'ready', t: 0, x: 0, speed: targetSpeed(0), y: GROUND - P_H, vy: 0, jumps: 0,
    got: 0, platforms: [], pipes: [], screws: [], nextPipe: 600, lastLevel: 0, nextScrew: 1100, fx: [], newBest: false};
}

const rand = (a, b) => a + Math.random() * (b - a);
const near = (list, x, d) => list.some(o => Math.abs(o.x - x) < d);

// Fill the world ahead with pipes, the platforms they need, and screws on every level.
function generate() {
  const ahead = s.x + W + 500;
  const room = s.speed * .55;                     // free run-up before and after a screw, grows with speed
  while (s.nextPipe < ahead) {
    let level;
    do { level = Math.floor(Math.random() * 3); } while (level === s.lastLevel);   // never the same level twice
    s.lastLevel = level;
    const px = s.nextPipe;
    if (level > 0) {
      const len = rand(220, 360) + s.speed * .2;
      s.platforms.push({x: px - rand(70, len - 80), w: len, y: LEVELS[level]});
      if (level === 2 && Math.random() < .6) s.platforms.push({x: px - rand(280, 360), w: rand(150, 210), y: LEVELS[1]});  // a step up
    }
    s.pipes.push({x: px, y: LEVELS[level] - 64, got: false});
    s.nextPipe += rand(260, 420) + s.speed * .35;
  }
  while (s.nextScrew < ahead) {
    const x = s.nextScrew;
    // On a platform when one is here and long enough, otherwise on the floor; never next to a pipe.
    const plat = s.platforms.find(p => x > p.x + 60 && x < p.x + p.w - 60);
    const y = plat && Math.random() < .55 ? plat.y : GROUND;
    if (!near(s.pipes, x, 110)) s.screws.push({x, y});
    s.nextScrew += rand(room + 260, room + 620);
  }
  const behind = s.x - 200;
  s.platforms = s.platforms.filter(p => p.x + p.w > behind);
  s.pipes = s.pipes.filter(p => p.x > behind);
  s.screws = s.screws.filter(p => p.x > behind);
}

function jump() {
  if (s.mode === 'ready') { s.mode = 'run'; return; }
  if (s.mode === 'over') { if (s.t > .6) { newGame(); s.mode = 'run'; } return; }
  if (s.jumps < 2) { s.vy = -JUMP * (s.jumps ? .86 : 1); s.jumps++; }
}

function update(dt) {
  if (s.mode === 'over') { s.t += dt; return; }
  if (s.mode !== 'run') return;
  s.t += dt;
  // Pipes set the tier; distance adds a steady push on top, so the run always speeds up
  // (about +60 after half a minute, +150 after a minute and a half, at most +320).
  const drive = Math.min(320, s.x * .006);
  s.speed += (targetSpeed(s.got) + drive - s.speed) * Math.min(1, dt * 1.5);
  s.x += s.speed * dt;
  generate();

  // vertical motion with one-way platforms
  const prevBottom = s.y + P_H;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  const bottom = s.y + P_H, left = s.x + P_X - P_W / 2 + 6, right = s.x + P_X + P_W / 2 - 6;
  for (const f of [{x: -1e9, w: 2e9, y: GROUND}, ...s.platforms]) {
    if (s.vy >= 0 && prevBottom <= f.y + 1 && bottom >= f.y && right > f.x && left < f.x + f.w) {
      s.y = f.y - P_H; s.vy = 0; s.jumps = 0;
    }
  }

  const px = s.x + P_X;
  for (const p of s.pipes) {
    if (!p.got && Math.abs(p.x - px) < 40 && s.y < p.y + 60 && s.y + P_H > p.y) {
      p.got = true; s.got++;
      s.fx.push({x: p.x, y: p.y, t: 0, txt: '+1'});
    }
  }
  for (const sc of s.screws) {
    // a screw is 26 px tall on its floor; the rack touches it when they overlap horizontally and vertically
    if (Math.abs(sc.x - px) < 28 && s.y + P_H > sc.y - 24 && s.y < sc.y) {
      s.mode = 'over'; s.t = 0;
      s.fx.push({x: sc.x, y: sc.y - 60, t: 0, txt: 'no screws!', bad: true});
      if (s.got > best()) { saveBest(s.got); s.newBest = true; }
    }
  }
  s.fx.forEach(f => { f.t += dt; });
  s.fx = s.fx.filter(f => f.t < .9);
}

/* ---------- drawing ---------- */
function rack(x, y, n) {
  for (let i = 0; i < Math.min(4, n); i++) {          // pipes sticking out of the top
    const px = x + 9 + i * 11;
    ctx.fillStyle = C.pipe; ctx.fillRect(px, y - 14, 8, 50);
    ctx.fillStyle = C.socket; ctx.fillRect(px - 1, y - 18, 10, 6);
  }
  ctx.fillStyle = C.wood;
  ctx.fillRect(x, y + 4, 6, P_H - 4); ctx.fillRect(x + P_W - 6, y + 4, 6, P_H - 4);   // side walls
  ctx.fillRect(x, y + P_H - 7, P_W, 7);                                               // base
  ctx.fillRect(x, y + 20, P_W, 4); ctx.fillRect(x, y + 40, P_W, 4);                   // combs
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(x + 3, y + 54, 3, 6); ctx.fillRect(x + P_W - 6, y + 54, 3, 6);         // wedges
  ctx.fillStyle = '#2a2018';
  ctx.beginPath(); ctx.arc(x + 12, y + P_H + 2, 5, 0, 7); ctx.arc(x + P_W - 12, y + P_H + 2, 5, 0, 7); ctx.fill();
}

function screw(x, y) {
  ctx.fillStyle = C.screw;
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x, y - 20); ctx.lineTo(x + 5, y); ctx.fill();
  ctx.fillRect(x - 11, y - 26, 22, 7);
  ctx.fillStyle = '#4b5158'; ctx.fillRect(x - 6, y - 24, 12, 2);
}

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  const off = (s.x * .3) % 40;
  for (let x = -off; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.fillStyle = '#14100b'; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = C.woodDark; ctx.fillRect(0, GROUND, W, 3);
  const cx = s.x;
  for (const p of s.platforms) {
    const x = p.x - cx;
    ctx.fillStyle = C.wood; ctx.fillRect(x, p.y, p.w, 12);
    ctx.fillStyle = C.woodDark; ctx.fillRect(x, p.y + 12, p.w, 4);
    for (let tx = x + 18; tx < x + p.w - 10; tx += 40) ctx.fillRect(tx, p.y - 4, 10, 4);   // tenons
  }
  for (const p of s.pipes) {
    if (p.got) continue;
    const x = p.x - cx, bob = Math.sin((s.x / 120 + p.x) * 1.3) * 3;
    ctx.fillStyle = C.pipe; ctx.fillRect(x - 9, p.y + 12 + bob, 18, 46);
    ctx.fillStyle = C.socket; ctx.fillRect(x - 12, p.y + 4 + bob, 24, 12);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 6, p.y + 16 + bob, 3, 38);
  }
  for (const sc of s.screws) screw(sc.x - cx, sc.y);
  rack(P_X - P_W / 2, s.y, s.got);
  for (const f of s.fx) {
    ctx.globalAlpha = 1 - f.t / .9;
    ctx.fillStyle = f.bad ? C.red : C.gold;
    ctx.font = '600 22px "Barlow Condensed", sans-serif';
    ctx.fillText(f.txt, f.x - cx - 14, f.y - f.t * 50);
    ctx.globalAlpha = 1;
  }
  // HUD
  ctx.fillStyle = C.ink; ctx.font = '500 34px "Barlow Condensed", sans-serif';
  ctx.fillText(`SCORE ${s.got}`, 24, 46);
  ctx.fillStyle = C.muted; ctx.font = '400 15px "JetBrains Mono", monospace';
  ctx.fillText(`BEST ${Math.max(best(), s.got)}`, 26, 72);

  if (s.mode !== 'run') {
    ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = s.mode === 'over' ? C.red : C.gold; ctx.font = '400 16px "JetBrains Mono", monospace';
    ctx.fillText(s.mode === 'over' ? (s.newBest ? 'NO SCREWS! · NEW BEST' : 'NO SCREWS!') : 'PIPE RUNNER', W / 2, 200);
    ctx.fillStyle = C.ink; ctx.font = '600 64px "Barlow Condensed", sans-serif';
    ctx.fillText(s.mode === 'over' ? `SCORE ${s.got}` : 'COLLECT THE PIPES', W / 2, 270);
    ctx.fillStyle = '#cfcfcf'; ctx.font = '400 20px Barlow, sans-serif';
    ctx.fillText(s.mode === 'over' ? `Best ${best()} · space or tap to play again`
      : 'Space or tap to jump · jump again in the air · one screw and it’s over', W / 2, 320);
    ctx.textAlign = 'left';
  }
}

function loop(t) {
  const dt = Math.min(.033, (t - last) / 1000 || 0);
  last = t;
  update(dt);
  draw();
  raf = active ? requestAnimationFrame(loop) : 0;
}

function resize() {
  const w = canvas.parentElement.clientWidth;
  const dpr = Math.min(devicePixelRatio, 2);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${w * H / W}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(w * H / W * dpr);
  scale = canvas.width / W;
}

export function mountGame(el) {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Pipe Runner game: press space or tap to jump');
  canvas.tabIndex = 0;
  el.appendChild(canvas);
  ctx = canvas.getContext('2d');
  new ResizeObserver(resize).observe(el);
  resize();
  newGame();
  addEventListener('keydown', e => {
    if (!active || !['Space', 'ArrowUp', 'KeyW'].includes(e.code)) return;
    e.preventDefault();   // keep space from scrolling the page
    if (!e.repeat) jump();
  });
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.focus(); jump(); });
}

export function setActive(on) {
  active = on;
  if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  if (!on && s?.mode === 'run') s.mode = 'ready';   // leaving the tab pauses on the start card
}
