(() => {
'use strict';
/* World units are metres; gravity 9.81 u/s^2 == 32.2 ft/s^2. HUD shows ft and mph. */
const G = 9.81, MPH = 0.44704, FT = 3.28084, DT = 1 / 120, TAU = Math.PI * 2;
const R1 = 22, WALL = 14, R2 = 9, CURL = 22 * Math.PI / 180, RUN = 100;
const LAND = 39 / FT, TILT = 28 * Math.PI / 180;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

/* ---------- ramp path (sampled by arc length) ---------- */
const P = [];
const add = (x, y, a, r) => P.push({ x, y, a, r, s: 0 });
for (let x = -RUN; x < 0; x += 2) add(x, 0, 0, 1e9);
for (let i = 0; i <= 90; i++) { const t = i / 90 * Math.PI / 2; add(R1 * Math.sin(t), R1 - R1 * Math.cos(t), t, R1); }
for (let y = R1 + .5; y < R1 + WALL; y += .5) add(R1, y, Math.PI / 2, 1e9);
const ccx = R1 - R2, ccy = R1 + WALL;
for (let i = 0; i <= 24; i++) { const f = i / 24 * CURL; add(ccx + R2 * Math.cos(f), ccy + R2 * Math.sin(f), Math.PI / 2 + f, R2); }
for (let i = 1; i < P.length; i++) P[i].s = P[i - 1].s + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
const LEN = P[P.length - 1].s;
function sample(s) {
  s = clamp(s, 0, LEN); let lo = 0, hi = P.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m].s <= s) lo = m; else hi = m; }
  const a = P[lo], b = P[hi], t = (s - a.s) / ((b.s - a.s) || 1);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, a: a.a + (b.a - a.a) * t, r: a.r };
}

/* ---------- three.js scene ---------- */
let ren;
try { ren = new THREE.WebGLRenderer({ canvas: $('game-canvas'), antialias: true, powerPreference: 'high-performance' }); }
catch (e) { document.body.innerHTML = '<p style="padding:2rem;font-family:sans-serif;color:#fff">Roadster Loop needs WebGL. Please use an up-to-date browser with hardware acceleration enabled.</p>'; throw e; }
ren.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
scene.fog = new THREE.Fog(0x050814, 140, 560);
const cam = new THREE.PerspectiveCamera(50, 1, .1, 2000);
function resize() { ren.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

scene.add(new THREE.AmbientLight(0x4a5f9a, .7));
{ const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#1a2550'); gr.addColorStop(.5, '#0b1226'); gr.addColorStop(1, '#04060d'); x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
  [['#2ee6ff', 40, 30], ['#ff4fa3', 150, 22], ['#fff2c0', 260, 36], ['#2ee6ff', 350, 18], ['#ffffff', 430, 40]].forEach(a => { x.fillStyle = a[0]; x.fillRect(a[1], 40, a[2], 10); x.fillRect(a[1] + a[2] / 2, 110, 4, 60); });
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(ren); scene.environment = pm.fromEquirectangular(t).texture; pm.dispose(); }
const dl = new THREE.DirectionalLight(0x9db8ff, .8); dl.position.set(-.3, 1, .8); scene.add(dl);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(2600, 500), new THREE.MeshStandardMaterial({ color: 0x070b16, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(-400, -.03, 0); scene.add(ground);
const road = new THREE.Mesh(new THREE.PlaneGeometry(640, 26), new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: .35, metalness: .5 }));
road.rotation.x = -Math.PI / 2; road.position.set(-320, 0, 0); scene.add(road);
const glowM = c => new THREE.MeshBasicMaterial({ color: c });
for (const z of [-12, 12]) { const e = new THREE.Mesh(new THREE.BoxGeometry(640, .06, .25), glowM(0x2ee6ff)); e.position.set(-320, .03, z); scene.add(e); }
for (let x = -630; x < -4; x += 12) { const d = new THREE.Mesh(new THREE.BoxGeometry(5, .03, .35), glowM(0xdfe8ff)); d.position.set(x, .02, 0); scene.add(d); }
for (let x = -600; x < -10; x += 45) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, 9), new THREE.MeshStandardMaterial({ color: 0x222a3c })); pole.position.set(x, 4.5, -15); scene.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.55, 10, 8), glowM(0xfff2c0)); bulb.position.set(x, 9.2, -15); scene.add(bulb);
}
/* skyline */
const tc = document.createElement('canvas'); tc.width = 64; tc.height = 128;
const tx = tc.getContext('2d'); tx.fillStyle = '#0a1020'; tx.fillRect(0, 0, 64, 128);
for (let y = 4; y < 128; y += 8) for (let x = 4; x < 64; x += 8) if (Math.random() < .3) { tx.fillStyle = Math.random() < .5 ? '#ffd98a' : '#7fd6ff'; tx.fillRect(x, y, 3, 4); }
const wt = new THREE.CanvasTexture(tc);
for (let i = 0; i < 70; i++) {
  const w = 10 + Math.random() * 18, h = 25 + Math.random() * 80;
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshBasicMaterial({ map: wt, color: 0x8899bb }));
  b.position.set(-560 + Math.random() * 660, h / 2, -70 - Math.random() * 90); scene.add(b);
}
{ const p = []; for (let i = 0; i < 500; i++) p.push((Math.random() - .5) * 1600 - 250, 70 + Math.random() * 450, -250 - Math.random() * 250);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false }))); }

/* ramp mesh */
{
  const rs = P.findIndex(p => p.s >= RUN - 1e-6), pos = [], idx = [], rung = [], edge = [];
  for (let i = rs; i < P.length; i++) pos.push(P[i].x, P[i].y, -6, P[i].x, P[i].y, 6);
  for (let i = 0; i < P.length - rs - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: .5, metalness: .4, side: THREE.DoubleSide })));
  for (let i = rs; i < P.length; i++) { const p = P[i]; if ((i - rs) % 4 === 0) rung.push(p.x, p.y, -6, p.x, p.y, 6);
    if (i > rs) { const q = P[i - 1]; edge.push(q.x, q.y, -6, p.x, p.y, -6, q.x, q.y, 6, p.x, p.y, 6); } }
  const mk = (a, c) => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); scene.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: c }))); };
  mk(rung, 0xff4fa3); mk(edge, 0x2ee6ff);
}

/* original car: "Volt Arrow" low electric roadster */
const wheels = [], plumes = []; let carLight;
function buildCar() {
  const g = new THREE.Group(), body = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xf4f7fb, metalness: .05, roughness: .35, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: .8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0b0e16, metalness: .6, roughness: .45 });
  const s = new THREE.Shape();
  s.moveTo(-7.5, .6); s.lineTo(-5.9, .6); s.lineTo(-5.9, 1.1); s.absarc(-4.6, 1.1, 1.3, Math.PI, 0, true);
  s.lineTo(-3.3, .6); s.lineTo(3.3, .6); s.lineTo(3.3, 1.1); s.absarc(4.6, 1.1, 1.3, Math.PI, 0, true);
  s.lineTo(5.9, .6); s.lineTo(7.5, .6); s.lineTo(7.5, 1.3); s.quadraticCurveTo(7.1, 2.1, 5.2, 2.55);
  s.lineTo(2.9, 2.7); s.bezierCurveTo(1.9, 2.8, 1.2, 3.9, -.5, 3.9); s.bezierCurveTo(-2.3, 3.9, -3, 3, -4.4, 2.9);
  s.lineTo(-6.9, 2.75); s.quadraticCurveTo(-7.4, 2.7, -7.5, 2.2); s.lineTo(-7.5, .6);
  const bg = new THREE.ExtrudeGeometry(s, { depth: 5.6, bevelEnabled: true, bevelSize: .2, bevelThickness: .2, bevelSegments: 4, curveSegments: 24 }); bg.translate(0, 0, -2.8);
  body.add(new THREE.Mesh(bg, paint));
  const gs = new THREE.Shape(); gs.moveTo(2.6, 2.74); gs.bezierCurveTo(1.8, 2.85, 1.15, 3.78, -.45, 3.78); gs.bezierCurveTo(-2.2, 3.78, -2.8, 3.05, -3.4, 2.95); gs.lineTo(2.6, 2.74);
  const gg = new THREE.ExtrudeGeometry(gs, { depth: 6.15, bevelEnabled: false }); gg.translate(0, 0, -3.075);
  body.add(new THREE.Mesh(gg, new THREE.MeshPhysicalMaterial({ color: 0x05080f, metalness: .9, roughness: .05, clearcoat: 1, envMapIntensity: 1.8 })));
  const box = (w, h, d, m, x, y, z, r) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (r) o.rotation.z = r; body.add(o); return o; };
  for (const z of [-3.04, 3.04]) box(6, .08, .06, glowM(0x2ee6ff), 0, 1.55, z);
  box(1.3, .1, 6, dark, 7.1, .62, 0); box(1.3, .1, 5.6, dark, -7.1, .62, 0);
  box(1.5, .12, 5.8, paint, -7.1, 2.9, 0, .08);
  for (const z of [-2.7, 2.7]) box(1.4, .5, .08, paint, -7.1, 2.75, z);
  for (const z of [-1.9, 1.9]) box(.12, .16, 1.7, glowM(0xe8fbff), 7.38, 1.5, z);
  box(.1, .2, 5.4, glowM(0xff2d6f), -7.62, 2.2, 0);
  for (const z of [-3.1, 3.1]) box(.5, .22, .35, paint, 2.2, 3, z);
  box(11, .1, 5.2, glowM(0x2ee6ff), 0, .52, 0);
  g.add(body);
  const tg = new THREE.CylinderGeometry(1.1, 1.1, .95, 32); tg.rotateX(Math.PI / 2);
  const rg = new THREE.CylinderGeometry(.82, .82, .98, 32); rg.rotateX(Math.PI / 2);
  const tire = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: .85 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x2a3142, metalness: 1, roughness: .3 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xdfe7f5, metalness: 1, roughness: .2 });
  const ringG = new THREE.TorusGeometry(.86, .04, 8, 36), spokeG = new THREE.BoxGeometry(1.45, .15, .06);
  for (const sx of [-4.6, 4.6]) for (const sz of [-2.65, 2.65]) {
    const w = new THREE.Group(), f = Math.sign(sz) * .5;
    w.add(new THREE.Mesh(tg, tire)); w.add(new THREE.Mesh(rg, rim));
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(spokeG, silver); sp.position.z = f; sp.rotation.z = i * Math.PI / 5; w.add(sp); }
    const ring = new THREE.Mesh(ringG, glowM(0x2ee6ff)); ring.position.z = f; w.add(ring);
    w.position.set(sx, 1.1, sz); g.add(w); wheels.push(w);
  }
  const pg = new THREE.ConeGeometry(.7, 9, 12, 1, true); pg.rotateX(Math.PI); pg.translate(0, -4.5, 0);
  const pm = new THREE.MeshBasicMaterial({ color: 0x4db8ff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
  for (const sx of [-2.6, 2.6]) for (const sz of [-1.9, 1.9]) {
    const port = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .15, 10), glowM(0x6b8cff)); port.position.set(sx, .55, sz); g.add(port);
    const p = new THREE.Mesh(pg, pm); p.position.set(sx, .5, sz); p.visible = false; g.add(p); plumes.push(p);
  }
  const key = new THREE.PointLight(0xffffff, 1.2, 45); key.position.set(0, 16, 8); g.add(key);
  carLight = new THREE.PointLight(0x2ee6ff, .9, 30); carLight.position.set(0, .2, 0); g.add(carLight);
  const hs = new THREE.SpotLight(0xdff6ff, 2, 70, .55, .6); hs.position.set(7, 1.5, 0); hs.target.position.set(150, -3, 0); g.add(hs); g.add(hs.target);
  g.scale.setScalar(.31); scene.add(g); return g;
}
const carG = buildCar();

/* ---------- state ---------- */
let state = 'title', best = 0, stateT = 0, resultsAt = 0, thrusting = false, shake = 0, spin = 0, tNow = 0, msgTimer = 0;
try { best = +localStorage.getItem('roadsterLoopBest') || 0; } catch (e) {}
const car = { s: 0, x: -RUN, y: 0, a: 0, w: 0, vx: 0, vy: 0, v: 0 };
let run = { react: 0, mph: 0, v0: 0, A: 0, gas: 1, rings: 0, flips: 0, maxAlt: 0, peakG: 1, airT: 0, flipZone: false, sink: 0, ok: false };
const cnt = { on: 0, t: 0, wait: 1, green: false, greenAt: 0, lock: 0 };
const keys = { left: false, right: false, space: false };
const rings = [], deb = []; let flash = null;
const Ls = [...document.querySelectorAll('.light')];
const setScreen = id => ['screen-title', 'screen-count', 'screen-results'].forEach(n => $(n).classList.toggle('active', n === id));
$('best-value').textContent = best.toLocaleString();

/* ---------- audio ---------- */
let ac;
function beep(f, d, type = 'sine', vol = .08) {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.stop(ac.currentTime + d); } catch (e) {}
}
function msg(t, ms, bad) { const m = $('msg'); m.textContent = t; m.className = 'on' + (bad ? ' bad' : ''); clearTimeout(msgTimer); msgTimer = setTimeout(() => m.className = '', ms); }

/* ---------- flow ---------- */
function clearFx() { deb.forEach(d => scene.remove(d.m)); deb.length = 0; if (flash) { scene.remove(flash); flash = null; } rings.forEach(r => scene.remove(r.m)); rings.length = 0; }
function startCount() {
  if (state === 'count') return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) {}
  clearFx(); Object.assign(car, { s: 0, x: -RUN, y: 0, a: 0, w: 0, vx: 0, vy: 0, v: 0 });
  carG.visible = true; state = 'count'; thrusting = false;
  run = { react: 0, mph: 0, v0: 0, A: 0, gas: 1, rings: 0, flips: 0, maxAlt: 0, peakG: 1, airT: 0, flipZone: false, sink: 0, ok: false };
  Object.assign(cnt, { on: 0, t: 0, wait: .8 + Math.random() * 1.4, green: false, lock: 0 });
  Ls.forEach(l => l.className = 'light'); setScreen('screen-count'); $('msg').className = ''; $('early-warning').classList.remove('visible'); $('hud-reaction').classList.add('hidden');
}
function press() {
  const n = performance.now();
  if (state === 'title') { startCount(); return; }
  if (state === 'results') { if (n - resultsAt > 600) startCount(); return; }
  if (state !== 'count' || n < cnt.lock) return;
  if (!cnt.green) { cnt.lock = n + 400; const w = $('early-warning'); w.classList.add('visible'); setTimeout(() => w.classList.remove('visible'), 1200); beep(180, .25, 'square'); return; }
  launch((n - cnt.greenAt) / 1000);
}
function launch(r) {
  const mph = clamp(90 - 5 * r, 76, 90), v0 = mph * MPH;
  run = { react: r, mph, v0, A: v0 * v0 / (2 * RUN), gas: 1, rings: 0, flips: 0, maxAlt: 0, peakG: 1, airT: 0, flipZone: false, sink: 0, ok: false };
  const e = sample(LEN), ve = Math.sqrt(Math.max(v0 * v0 - 2 * G * e.y, 16));
  const vx = ve * Math.cos(e.a), vy = ve * Math.sin(e.a), T = (vy + Math.sqrt(vy * vy + 2 * G * e.y)) / G;
  rings.forEach(q => scene.remove(q.m)); rings.length = 0;
  [.14, .3, .46, .62, .78].forEach((f, i) => {
    const t = T * f, x = e.x + vx * t, y = e.y + vy * t - .5 * G * t * t + (i % 2 ? 2 : -2);
    const m = new THREE.Mesh(new THREE.TorusGeometry(3, .22, 10, 40), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff4fa3 : 0x2ee6ff, transparent: true }));
    m.add(new THREE.Mesh(new THREE.TorusGeometry(3, .6, 8, 40), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff4fa3 : 0x2ee6ff, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }))); m.position.set(x, y, 0); scene.add(m); rings.push({ m, x, y, got: false, o: 1 });
  });
  car.s = 0; car.v = 0; state = 'drive'; msg('GO!', 700); beep(1000, .2);
  armed = !keys.space; $('val-reaction').textContent = r.toFixed(3); $('hud-reaction').classList.remove('hidden');
  setTimeout(() => { if (state === 'drive' || state === 'ramp' || state === 'air') $('screen-count').classList.remove('active'); }, 1200);
}
function touch() {
  run.sink = -car.vy; const tilt = Math.abs(wrap(car.a)); run.ok = run.sink <= LAND && tilt <= TILT; car.y = 0; stateT = 0;
  if (run.ok) { state = 'landed'; car.vy = 0; car.a = wrap(car.a); msg('Soft landing!', 1400); beep(300, .15); }
  else { state = 'crashed'; boom(); msg('CRASH', 1600, true); }
}
function boom() {
  carG.visible = false; shake = 1.4; thrusting = false;
  for (let i = 0; i < 44; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(.3 + Math.random() * .5, .2, .3), new THREE.MeshBasicMaterial({ color: [0xff7a1a, 0xffd24a, 0xdde6f2, 0x2a3140][i % 4] }));
    m.position.set(car.x, car.y + .6, (Math.random() - .5) * 1.5); scene.add(m);
    deb.push({ m, vx: car.vx * .5 + (Math.random() - .5) * 16, vy: Math.random() * 14 + 2, vz: (Math.random() - .5) * 10, r: Math.random() * 10 });
  }
  flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffa640, transparent: true, opacity: .9 }));
  flash.position.set(car.x, car.y + .6, 0); scene.add(flash);
  beep(70, .6, 'sawtooth', .2); beep(120, .4, 'square', .1);
}
const calc = fin => run.rings * 500 + run.flips * 1500 + Math.round(run.maxAlt * FT) + Math.round(run.airT * 100) + (fin && run.ok ? 1000 + Math.round((LAND - run.sink) * FT * 25) : 0);
function toResults() {
  state = 'results'; resultsAt = performance.now();
  const s = calc(true), nb = s > best;
  if (nb) { best = s; try { localStorage.setItem('roadsterLoopBest', best); } catch (e) {} }
  let g = s >= 11000 ? 'S' : s >= 7500 ? 'A' : s >= 4500 ? 'B' : s >= 2500 ? 'C' : 'D';
  if (!run.ok && 'SAB'.includes(g)) g = 'C';
  const set = (i, v) => $(i).textContent = v;
  set('result-grade', 'GRADE: ' + g + (run.ok ? '' : ' · CRASHED')); set('result-score', s.toLocaleString()); $('new-best-badge').classList.toggle('hidden', !nb);
  set('res-reaction', run.react.toFixed(3) + 's'); set('res-rampspeed', run.mph.toFixed(1) + ' mph'); set('res-peakg', run.peakG.toFixed(1) + ' G');
  set('res-alt', Math.round(run.maxAlt * FT) + ' ft'); set('res-airtime', run.airT.toFixed(1) + 's'); set('res-flips', run.flips); set('res-rings', run.rings + ' / 5');
  set('res-landing', (run.sink * FT).toFixed(1) + ' ft/s'); set('best-value', best.toLocaleString());
  setScreen('screen-results');
}

/* ---------- physics (fixed 1/120 s) ---------- */
function step() {
  if (state === 'drive' || state === 'ramp') {
    car.v = state === 'drive' ? Math.sqrt(2 * run.A * car.s) : Math.sqrt(Math.max(run.v0 * run.v0 - 2 * G * car.y, 16));
    car.s += Math.max(car.v, .5) * DT;
    if (state === 'drive' && car.s >= RUN) state = 'ramp';
    const p = sample(car.s); car.x = p.x; car.y = p.y; car.a = p.a;
    run.peakG = Math.max(run.peakG, 1 + car.v * car.v / (p.r * G));
    if (car.s >= LEN) { car.vx = car.v * Math.cos(car.a); car.vy = car.v * Math.sin(car.a); car.w = 0; state = 'air'; run.airT = 0; msg('← → rotate · SPACE thrust', 2500); }
  } else if (state === 'air') {
    const L = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
    car.w += L * 7 * DT; car.w *= Math.exp(-.8 * DT); car.w = clamp(car.w, -4.5, 4.5);
    thrusting = false;
    if (keys.space && armed && run.gas > 0) { run.gas = Math.max(0, run.gas - .28 * DT); car.vx += -Math.sin(car.a) * 26 * DT; car.vy += Math.cos(car.a) * 26 * DT; thrusting = true; }
    car.vy -= G * DT; car.x += car.vx * DT; car.y += car.vy * DT; car.a += car.w * DT; run.airT += DT;
    run.maxAlt = Math.max(run.maxAlt, car.y);
    const t = Math.abs(wrap(car.a));
    if (t > 2.62 && !run.flipZone) { run.flipZone = true; run.flips++; beep(660, .1); } else if (t < 1.57) run.flipZone = false;
    for (const r of rings) if (!r.got && Math.hypot(car.x - r.x, car.y + .5 - r.y) < 3.6) { r.got = true; run.rings++; run.gas = Math.min(1, run.gas + .35); beep(1200, .12); }
    if (car.y <= 0 && car.vy < 0) { thrusting = false; touch(); }
  } else if (state === 'landed') {
    car.x += car.vx * DT; car.vx *= Math.exp(-1.8 * DT); car.a *= Math.exp(-10 * DT); car.y = 0;
  }
}

/* ---------- frame ---------- */
let camX = -RUN, camY = 2, camD = 15, camOx = -8;
function visuals(dt) {
  tNow += dt;
  carG.position.set(car.x, car.y, 0); carG.rotation.z = car.a;
  const sp = state === 'drive' || state === 'ramp' ? car.v : state === 'landed' ? Math.abs(car.vx) : state === 'air' ? 4 : 0;
  spin += sp * dt / .34; wheels.forEach(w => w.rotation.z = -spin);
  plumes.forEach(p => { p.visible = thrusting; p.scale.set(1, .7 + Math.random() * .6, 1); });
  rings.forEach((r, i) => {
    if (r.got) { r.o -= dt * 2.5; r.m.scale.setScalar(1 + (1 - r.o) * .8); r.m.material.opacity = Math.max(0, r.o); r.m.visible = r.o > 0; }
    else r.m.scale.setScalar(1 + Math.sin(tNow * 5 + i) * .05);
  });
  deb.forEach(d => { d.vy -= G * dt; d.m.position.x += d.vx * dt; d.m.position.y += d.vy * dt; d.m.position.z += d.vz * dt; d.m.rotation.x += d.r * dt; d.m.rotation.z += d.r * dt;
    if (d.m.position.y < .1) { d.m.position.y = .1; d.vy *= -.35; d.vx *= .7; d.vz *= .7; } });
  if (flash) { const s = flash.scale.x + dt * 30; flash.scale.setScalar(s); flash.material.opacity = Math.max(0, .9 - s / 14); if (s > 14) { scene.remove(flash); flash = null; } }
  /* camera */
  let d, ox = 0;
  if (state === 'title' || state === 'count') { d = 15; ox = -8; } else if (state === 'drive') d = 24; else if (state === 'ramp') d = 38; else d = clamp(38 + car.y * .9, 38, 120);
  const k = 1 - Math.exp(-3 * dt), k2 = 1 - Math.exp(-6 * dt);
  camD += (d - camD) * k; camOx += (ox - camOx) * k; camX += (car.x - camX) * k2; camY += (car.y * .85 + 1.5 - camY) * k2;
  shake *= Math.exp(-2.5 * dt);
  cam.position.set(camX + camOx + (Math.random() - .5) * shake, camY + 3 + camD * .08 + (Math.random() - .5) * shake, camD);
  cam.lookAt(camX, camY + 1, 0);
  /* hud */
  const spd = state === 'drive' || state === 'ramp' ? car.v : state === 'air' ? Math.hypot(car.vx, car.vy) : state === 'landed' ? Math.abs(car.vx) : 0;
  $('hud-score').textContent = calc(false).toLocaleString(); $('hud-alt').textContent = Math.round(car.y * FT); $('hud-speed').textContent = Math.round(spd / MPH);
  $('hud-rings').textContent = run.rings; $('hud-flips').textContent = run.flips; $('gas-fill').style.width = (run.gas * 100) + '%';
  $('hud').classList.toggle('hud-hidden', state === 'title' || state === 'results');
  $('touch-action').classList.toggle('visible', state === 'count' || state === 'drive' || state === 'ramp' || state === 'air');
  $('touch-rot').classList.toggle('visible', state === 'air');
  carLight.intensity = thrusting ? 2.4 : .9;
}
let last = performance.now(), acc = 0;
function frame(n) {
  const dt = Math.max(0, Math.min((n - last) / 1000, .1)); last = n; acc += dt;
  if (state === 'count') {
    cnt.t += dt;
    if (cnt.on < 4) { if (cnt.t >= .7 * (cnt.on + 1)) { cnt.on++; Ls.forEach((l, i) => l.className = i < cnt.on ? 'light red' : 'light'); beep(440, .08); } }
    else if (!cnt.green) { if (cnt.t >= 2.8 + cnt.wait) { cnt.green = true; cnt.greenAt = performance.now(); Ls[3].className = 'light green'; beep(880, .15); } }
    else if (performance.now() - cnt.greenAt > 3000) launch(3);
  }
  while (acc >= DT) { acc -= DT; step(); }
  if (state === 'landed' || state === 'crashed') { stateT += dt; if (stateT > (state === 'landed' ? 1.5 : 1.9)) toResults(); }
  visuals(dt); ren.render(scene, cam); requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- input ---------- */
let armed = true;
const spaceDown = () => { keys.space = true; press(); };
const spaceUp = () => { keys.space = false; armed = true; };
const releaseAll = () => { keys.left = keys.right = false; spaceUp(); };
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) spaceDown(); }
  else if (e.code === 'ArrowLeft') { e.preventDefault(); keys.left = true; }
  else if (e.code === 'ArrowRight') { e.preventDefault(); keys.right = true; }
});
addEventListener('keyup', e => {
  if (e.code === 'Space') spaceUp(); else if (e.code === 'ArrowLeft') keys.left = false; else if (e.code === 'ArrowRight') keys.right = false;
});
addEventListener('blur', releaseAll);
document.addEventListener('visibilitychange', () => { releaseAll(); last = performance.now(); });
const hold = (el, down, up) => { el.addEventListener('pointerdown', e => { e.preventDefault(); down(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, up)); };
hold($('touch-action'), spaceDown, spaceUp);
hold($('rot-left'), () => keys.left = true, () => keys.left = false);
hold($('rot-right'), () => keys.right = true, () => keys.right = false);
$('screen-count').addEventListener('pointerdown', e => { if (e.target === $('screen-count') || e.target.closest('.lights-container')) press(); });
$('btn-start').addEventListener('click', e => { e.currentTarget.blur(); startCount(); });
$('btn-restart').addEventListener('click', e => { e.currentTarget.blur(); if (state === 'results') startCount(); });
})();
