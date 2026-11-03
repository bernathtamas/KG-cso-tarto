// Pipe Runner: the rack runs on its own; jump between three levels to collect pipes, dodge screws, reach the finish.
const W = 960, H = 540;
const GROUND = 470, LEVELS = [GROUND, 370, 270];       // top of floor / platforms
const GRAVITY = 2300, JUMP = 900, P_W = 56, P_H = 66, P_X = 170;
const C = {bg: '#05080d', grid: 'rgba(140,190,255,.07)', wood: '#cfa572', woodDark: '#8d6a3e', pipe: '#d06a2a',
  socket: '#a9441a', gold: '#d6a85b', cream: '#f2e8d5', screw: '#9aa3ad', red: '#e0563f', ink: '#f5f5f5', muted: '#8d8d8d'};

let canvas, ctx, scale = 1, raf = 0, last = 0, active = false;
let s;   // game state
const best = () => { try { return +localStorage.getItem('pipeRunnerBest') || 0; } catch { return 0; } };
const saveBest = t => { try { localStorage.setItem('pipeRunnerBest', String(t)); } catch {} };

function newGame() {
  s = {mode: 'ready', t: 0, x: 0, speed: 280, y: GROUND - P_H, vy: 0, jumps: 0, onGround: true,
    target: 5 + Math.floor(Math.random() * 26), got: 0, platforms: [], pipes: [], screws: [], finish: null,
    nextPipe: 600, lastLevel: 0, nextScrew: 900, hurt: 0, fx: []};
}

const rand = (a, b) => a + Math.random() * (b - a);

// Fill the world ahead of the camera with pipes, the platforms they need, and the odd screw.
function generate() {
  const ahead = s.x + W + 400;
  while (s.nextPipe < ahead && !s.finish) {
    let level;
    do { level = Math.floor(Math.random() * 3); } while (level === s.lastLevel);   // never the same level twice
    s.lastLevel = level;
    const px = s.nextPipe;
    if (level > 0) {
      const len = rand(170, 320);
      s.platforms.push({x: px - rand(50, len - 60), w: len, y: LEVELS[level]});
      if (level === 2 && Math.random() < .6) s.platforms.push({x: px - rand(260, 340), w: rand(140, 200), y: LEVELS[1]});  // a step up
    }
    s.pipes.push({x: px, y: LEVELS[level] - 64, got: false});
    s.nextPipe += rand(260, 420) + s.speed * .15;
  }
  while (s.nextScrew < ahead && !s.finish) {
    const clear = s.pipes.every(p => Math.abs(p.x - s.nextScrew) > 90);
    if (clear) s.screws.push({x: s.nextScrew, hit: false});
    s.nextScrew += rand(520, 900);
  }
  const behind = s.x - 200;
  s.platforms = s.platforms.filter(p => p.x + p.w > behind);
  s.pipes = s.pipes.filter(p => p.x > behind);
  s.screws = s.screws.filter(p => p.x > behind);
}

function jump() {
  if (s.mode === 'ready') { s.mode = 'run'; return; }
  if (s.mode === 'won') { newGame(); s.mode = 'run'; return; }
  if (s.jumps < 2) { s.vy = -JUMP * (s.jumps ? .86 : 1); s.jumps++; s.onGround = false; }
}

function update(dt) {
  if (s.mode !== 'run') return;
  s.t += dt;
  s.speed = Math.min(440, 280 + s.t * 4);
  s.x += s.speed * dt;
  generate();

  // vertical motion with one-way platforms
  const prevBottom = s.y + P_H;
  s.vy += GRAVITY * dt;
  s.y += s.vy * dt;
  const bottom = s.y + P_H, left = s.x + P_X - P_W / 2 + 6, right = s.x + P_X + P_W / 2 - 6;
  s.onGround = false;
  const floors = [{x: -1e9, w: 2e9, y: GROUND}, ...s.platforms];
  for (const f of floors) {
    if (s.vy >= 0 && prevBottom <= f.y + 1 && bottom >= f.y && right > f.x && left < f.x + f.w) {
      s.y = f.y - P_H; s.vy = 0; s.onGround = true; s.jumps = 0;
    }
  }

  const px = s.x + P_X;
  for (const p of s.pipes) {
    if (!p.got && Math.abs(p.x - px) < 40 && s.y < p.y + 60 && s.y + P_H > p.y) {
      p.got = true; s.got++;
      s.fx.push({x: p.x, y: p.y, t: 0, txt: '+1'});
      if (s.got >= s.target && !s.finish) s.finish = {x: s.x + W + 120};
    }
  }
  for (const sc of s.screws) {
    if (!sc.hit && s.hurt <= 0 && Math.abs(sc.x - px) < 30 && s.y + P_H > GROUND - 26) {
      sc.hit = true; s.hurt = 1;
      if (s.got > 0 && !s.finish) s.got--;
      s.fx.push({x: sc.x, y: GROUND - 60, t: 0, txt: 'no screws!', bad: true});
    }
  }
  s.hurt = Math.max(0, s.hurt - dt);
  s.fx.forEach(f => { f.t += dt; });
  s.fx = s.fx.filter(f => f.t < .9);

  if (s.finish && px >= s.finish.x) {
    s.mode = 'won';
    const t = Math.round(s.t * 10) / 10;
    s.newBest = !best() || t < best();
    if (s.newBest) saveBest(t);
  }
}

/* ---------- drawing ---------- */
function rack(x, y, fill, hurt) {
  ctx.save();
  if (hurt && Math.floor(hurt * 12) % 2) ctx.globalAlpha = .45;
  const n = Math.min(4, Math.ceil(fill * 4));
  for (let i = 0; i < 4; i++) {           // pipes sticking out of the top
    if (i >= n) continue;
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
  ctx.restore();
}

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // blueprint grid with parallax
  ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
  const off = (s.x * .3) % 40;
  for (let x = -off; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  // ground
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
    const x = p.x - cx, bob = Math.sin((s.t + p.x) * 4) * 3;
    ctx.fillStyle = C.pipe; ctx.fillRect(x - 9, p.y + 12 + bob, 18, 46);
    ctx.fillStyle = C.socket; ctx.fillRect(x - 12, p.y + 4 + bob, 24, 12);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x - 6, p.y + 16 + bob, 3, 38);
  }
  for (const sc of s.screws) {
    const x = sc.x - cx;
    ctx.fillStyle = C.screw;
    ctx.beginPath(); ctx.moveTo(x - 5, GROUND); ctx.lineTo(x, GROUND - 26); ctx.lineTo(x + 5, GROUND); ctx.fill();
    ctx.fillRect(x - 11, GROUND - 32, 22, 7);
    ctx.fillStyle = '#4b5158'; ctx.fillRect(x - 6, GROUND - 30, 12, 2);
  }
  if (s.finish) {
    const x = s.finish.x - cx;
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? C.gold : '#000';
      ctx.fillRect(x + j * 12, GROUND - 200 + i * 20, 12, 20);
    }
    ctx.fillStyle = C.gold; ctx.font = '600 18px "Barlow Condensed", sans-serif';
    ctx.fillText('FINISH', x - 8, GROUND - 210);
  }
  rack(P_X - P_W / 2, s.y, s.got / s.target, s.hurt);
  for (const f of s.fx) {
    ctx.globalAlpha = 1 - f.t / .9;
    ctx.fillStyle = f.bad ? C.red : C.gold;
    ctx.font = '600 22px "Barlow Condensed", sans-serif';
    ctx.fillText(f.txt, f.x - cx - 14, f.y - f.t * 50);
    ctx.globalAlpha = 1;
  }
  // HUD
  ctx.fillStyle = C.ink; ctx.font = '500 30px "Barlow Condensed", sans-serif';
  ctx.fillText(`PIPES ${s.got} / ${s.target}`, 24, 44);
  ctx.fillStyle = C.muted; ctx.font = '400 15px "JetBrains Mono", monospace';
  ctx.fillText(`TIME ${s.t.toFixed(1)} s${best() ? `   BEST ${best().toFixed(1)} s` : ''}`, 26, 70);
  ctx.fillStyle = C.gold; ctx.fillRect(24, 82, 220 * Math.min(1, s.got / s.target), 4);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(24 + 220 * Math.min(1, s.got / s.target), 82, 220 * (1 - Math.min(1, s.got / s.target)), 4);

  if (s.mode !== 'run') {
    ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = C.gold; ctx.font = '400 16px "JetBrains Mono", monospace';
    ctx.fillText(s.mode === 'won' ? (s.newBest ? 'NEW BEST TIME' : 'RACK FULL') : 'PIPE RUNNER', W / 2, 200);
    ctx.fillStyle = C.ink; ctx.font = '600 64px "Barlow Condensed", sans-serif';
    ctx.fillText(s.mode === 'won' ? `${s.target} PIPES IN ${s.t.toFixed(1)} S` : `COLLECT ${s.target} PIPES`, W / 2, 270);
    ctx.fillStyle = '#cfcfcf'; ctx.font = '400 20px Barlow, sans-serif';
    ctx.fillText(s.mode === 'won' ? 'Space or tap for a new game' : 'Space or tap to jump · jump again in the air · avoid the screws', W / 2, 320);
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
