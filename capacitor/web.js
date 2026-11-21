// الملزمة التفاعلية — التنقل، كشف الأجوبة، وضع الحفظ، المجسمات، المحاكيات، الاختبار
import * as THREE from 'three';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const P = window.PAGES, Q = new URLSearchParams(location.search);

/* ===== التنقل وأرقام الصفحات ===== */
const blocks = Object.entries(P.blocks).map(([p, b]) => [+p, +b]).sort((a, b) => a[0] - b[0]);
const pageOf = (bid) => { let pg = 1; for (const [p, b] of blocks) if (b <= bid) pg = p; return pg; };
const anchors = $$('a.anc');
function onScroll() {
  const y = scrollY + 90; let cur = null;
  for (const a of anchors) { if (a.getBoundingClientRect().top + scrollY <= y) cur = a; else break; }
  const pg = cur ? pageOf(+cur.id.slice(1)) : 1;
  $('#pg').textContent = 'ص ' + pg;
  const h = document.documentElement.scrollHeight - innerHeight;
  $('#prog i').style.width = (h > 0 ? scrollY / h * 100 : 0) + '%';
}
addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
// المحتويات
for (const h of $$('h2.les')) {
  const a = h.querySelector('a.anc'); if (!a) continue;
  const no = h.querySelector('.no')?.textContent || '';
  const t = h.cloneNode(true); t.querySelectorAll('.no,em,a').forEach(e => e.remove());
  const l = document.createElement('a'); l.href = '#' + a.id; l.innerHTML = `<b>${no}</b>${t.textContent.trim()}`;
  l.onclick = () => drawer(false); $('#toc').appendChild(l);
}
const sims = $$('.sim'); sims.forEach((s, i) => { s.id ||= 'sim' + i; const l = document.createElement('a'); l.href = '#' + s.id; l.innerHTML = `<b>▶</b>${s.querySelector('h3').textContent}`; l.onclick = () => drawer(false); $('#toc').appendChild(l); });
function drawer(on) { $('#drawer').classList.toggle('on', on); $('#scrim').classList.toggle('on', on); }
$('#menu').onclick = () => drawer(true); $('#scrim').onclick = () => drawer(false);

/* ===== كشف الأجوبة ===== */
function hideWithButton(el, label, after) {
  el.classList.add('hid');
  const b = document.createElement('button'); b.className = 'rvb'; b.textContent = '👁️ ' + label;
  b.onclick = () => { const h = el.classList.toggle('hid'); b.classList.toggle('open', !h); b.textContent = (h ? '👁️ ' : '🙈 ') + (h ? label : 'إخفاء'); };
  (after || el).before(b);
}
$$('.b-why .ba.rv').forEach(e => hideWithButton(e, 'أظهر الجواب'));
$$('.ex .sol').forEach(e => hideWithButton(e, 'أظهر الحل'));
$$('.qs.ansb').forEach(e => hideWithButton(e, 'أظهر الأجوبة'));
for (const q of $$('.qs:not(.ansb)')) {
  const kids = [...q.childNodes]; const i = kids.findIndex(n => n.nodeName === 'BR');
  let rest = [];
  if (i >= 0) rest = kids.slice(i + 1);
  else { const two = kids.find(n => n.nodeType === 1 && n.classList.contains('two')); if (two) rest = kids.slice(kids.indexOf(two)); }
  if (!rest.length || !q.textContent.trim()) continue;
  const w = document.createElement('div'); w.className = 'qa'; rest.forEach(n => w.appendChild(n));
  if (i >= 0) kids[i].remove();
  q.appendChild(w); hideWithButton(w, 'أظهر الحل');
}
// وضع الحفظ للتعاريف والتعاليل
for (const d of $$('.df, .wy')) {
  const kids = [...d.childNodes]; let k = d.classList.contains('df') ? kids.findIndex(n => n.nodeName === 'B') : kids.findIndex(n => n.nodeName === 'BR');
  if (k < 0) continue;
  const sp = document.createElement('span'); sp.className = 'dans'; kids.slice(k + 1).forEach(n => sp.appendChild(n)); d.appendChild(sp);
  d.addEventListener('click', () => d.classList.toggle('shown'));
}
$('#memo').onchange = (e) => { document.body.classList.toggle('memo', e.target.checked); $$('.df,.wy').forEach(d => d.classList.remove('shown')); };

/* ===== فتح الصفحة الممسوحة ===== */
function goPage(p) {
  const b = P.blocks[p];
  if (!b || +p <= 1) return;
  const a = document.getElementById('b' + b); if (!a) return;
  setTimeout(() => { a.scrollIntoView({ behavior: 'instant', block: 'start' }); const t = a.parentElement; t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1700); onScroll(); }, 120);
}
if (Q.get('p')) goPage(Q.get('p')); else onScroll();

/* ===== المجسم ثلاثي الأبعاد (نافذة) ===== */
let V = null;
async function open3D(name, cap) {
  $('#m3d').hidden = false; document.body.style.overflow = 'hidden'; $('#m3t').textContent = cap;
  if (!V) V = await makeViewer();
  V.load(name); $('#m3hint').style.opacity = .85; setTimeout(() => $('#m3hint').style.opacity = 0, 3500);
}
$('#m3x').onclick = () => { $('#m3d').hidden = true; document.body.style.overflow = ''; V?.stop(); };
$$('.b3d').forEach(b => b.onclick = () => open3D(b.dataset.fig, b.dataset.cap));
async function makeViewer() {
  await Promise.all(['700 30px Cairo', '800 30px Cairo'].map(f => document.fonts.load(f, 'اب')));
  const { FIGS } = await import('./figs.js');
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); $('#m3v').appendChild(r.domElement);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8890a0, .95));
  const l1 = new THREE.DirectionalLight(0xffffff, 1); l1.position.set(3, 6, 5); sc.add(l1); const l2 = new THREE.DirectionalLight(0xffffff, .35); l2.position.set(-5, 2, -3); sc.add(l2);
  const cam = new THREE.PerspectiveCamera(34, 1, .05, 500); const spin = new THREE.Group(); sc.add(spin);
  let cur = null, labs = [], rad = 3, us = 1, mode = 'h', showL = true; const vel = { x: 0, y: 0 }, qq = new THREE.Quaternion();
  const fit = () => { const w = innerWidth, h = innerHeight; r.setSize(w, h); cam.aspect = w / h; const f = THREE.MathUtils.degToRad(17), fh = Math.atan(Math.tan(f) * cam.aspect); cam.position.set(0, 0, rad / Math.sin(Math.min(f, fh)) * .62 / us); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); };
  addEventListener('resize', fit);
  function load(name) {
    if (cur) spin.remove(cur); labs.forEach(l => l.el.remove()); labs = [];
    const { obj, rot, view } = FIGS[name](); obj.rotation.set(...rot); obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3());
    cur = new THREE.Group(); cur.add(obj); obj.position.sub(c); spin.add(cur); rad = box.getBoundingSphere(new THREE.Sphere()).radius;
    spin.quaternion.setFromUnitVectors(new THREE.Vector3(...view).normalize(), new THREE.Vector3(0, 0, 1)); us = 1; vel.x = vel.y = 0;
    obj.traverse(o => { if (o.userData.label) { const e = document.createElement('div'); e.className = 'lbl'; e.textContent = o.userData.label; $('#m3l').appendChild(e); labs.push({ o, e }); } });
    fit(); r.setAnimationLoop(loop);
  }
  const ax = new THREE.Vector3(), ay = new THREE.Vector3();
  const rot = (dx, dy) => { ax.set(0, 1, 0); ay.set(1, 0, 0); spin.quaternion.premultiply(qq.setFromAxisAngle(ax, dx)).premultiply(qq.setFromAxisAngle(ay, dy)).normalize(); };
  const el = r.domElement, pts = new Map(); let drag = null, pinch = null;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, t: performance.now() }; vel.x = vel.y = 0; } if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: us }; } });
  el.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2 && pinch) { const [a, b] = [...pts.values()]; us = THREE.MathUtils.clamp(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, .5, 3); fit(); }
    else if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dt = Math.max(8, now - drag.t); drag.x = e.clientX; drag.y = e.clientY; drag.t = now; setM(null); rot(dx * .01, dy * .01); vel.x = dx * .01 / dt * 16; vel.y = dy * .01 / dt * 16; } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { if (drag && performance.now() - drag.t > 90) vel.x = vel.y = 0; drag = null; } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  const setM = m => { mode = m; $('#m3h').classList.toggle('on', m === 'h'); $('#m3v2').classList.toggle('on', m === 'v'); };
  $('#m3h').onclick = () => setM(mode === 'h' ? null : 'h'); $('#m3v2').onclick = () => setM(mode === 'v' ? null : 'v');
  $('#m3lab').onclick = () => { showL = !showL; $('#m3lab').classList.toggle('on', showL); };
  let lastName = null; $('#m3r').onclick = () => lastName && load(lastName);
  const clk = new THREE.Clock(), v3 = new THREE.Vector3();
  function loop() {
    const dt = Math.min(clk.getDelta(), .05);
    if (!drag) { if (mode === 'h') rot(dt * .5, 0); if (mode === 'v') rot(0, dt * .5); if (Math.abs(vel.x) + Math.abs(vel.y) > 1e-4) { rot(vel.x, vel.y); vel.x *= .93; vel.y *= .93; } }
    r.render(sc, cam);
    for (const l of labs) { l.o.getWorldPosition(v3); v3.project(cam); if (!showL || v3.z > 1) { l.e.style.opacity = 0; continue; } l.e.style.opacity = 1; l.e.style.transform = `translate(${((v3.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - v3.y) / 2 * innerHeight - 8).toFixed(1)}px) translate(-50%,-100%)`; }
  }
  return { load: (n) => { lastName = n; load(n); }, stop: () => r.setAnimationLoop(null) };
}

/* ===== أدوات مشتركة للمحاكيات ===== */
const E0 = 8.85e-12;
function sci(x, unit) {
  if (x === 0 || !isFinite(x)) return '0 ' + unit;
  const e = Math.floor(Math.log10(Math.abs(x))); const m = x / 10 ** e;
  if (e >= -2 && e <= 3) return (+x.toPrecision(3)) + ' ' + unit;
  return `${(+m.toFixed(2))}×10${String(e).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])} ${unit}`;
}
function pref(x, unit) { // اختيار البادئة pF/nF/μF
  const a = Math.abs(x);
  if (a >= 1e-6) return (+(x * 1e6).toPrecision(3)) + ' μ' + unit;
  if (a >= 1e-9) return (+(x * 1e9).toPrecision(3)) + ' n' + unit;
  return (+(x * 1e12).toPrecision(3)) + ' p' + unit;
}
function slider(box, label, min, max, step, val, fmt) {
  const lab = document.createElement('label'); lab.textContent = label;
  const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = step; r.value = val;
  const o = document.createElement('output'); const upd = () => o.textContent = fmt(+r.value); upd(); r.addEventListener('input', upd);
  box.append(lab, r, o); return r;
}
function vals(box, items) {
  box.innerHTML = items.map(([k, v]) => `<div>${k}<b>${v}</b></div>`).join('');
}
function seg(box, opts, on, cb) {
  const s = document.createElement('div'); s.className = 'seg';
  opts.forEach(([k, t]) => { const b = document.createElement('button'); b.textContent = t; b.dataset.k = k; b.classList.toggle('on', k === on); b.onclick = () => { $$('button', s).forEach(x => x.classList.toggle('on', x === b)); cb(k); }; s.appendChild(b); });
  box.appendChild(s); return s;
}

/* ===== 1) مختبر المتسعة ===== */
function simLab(root) {
  const cv = document.createElement('canvas'); cv.className = 'simcv'; root.appendChild(cv);
  const ctl = document.createElement('div'); ctl.className = 'ctl'; root.appendChild(ctl);
  const sA = slider(ctl, 'المساحة A', 20, 400, 5, 100, v => v + ' cm²');
  const sD = slider(ctl, 'البعد d', 1, 10, .5, 4, v => v + ' mm');
  const sV = slider(ctl, 'فرق جهد البطارية', 1, 100, 1, 12, v => v + ' V');
  const MAT = [['1', 'هواء k=1'], ['2.1', 'تفلون 2.1'], ['3.7', 'ورق 3.7'], ['5.6', 'بايركس 5.6'], ['80', 'ماء 80']];
  let k = 1, connected = true, Q0 = 0;
  seg(root, MAT, '1', v => { k = +v; upd(); });
  seg(root, [['on', '🔋 متصلة بالبطارية'], ['off', '✂️ افصل البطارية']], 'on', v => { if (v === 'off' && connected) Q0 = state().Q; connected = v === 'on'; sV.disabled = !connected; upd(); });
  const out = document.createElement('div'); out.className = 'vals'; root.appendChild(out);
  const note = document.createElement('div'); note.className = 'note2'; root.appendChild(note);
  const state = () => { const A = +sA.value * 1e-4, d = +sD.value * 1e-3, C = k * E0 * A / d; let dV, Q; if (connected) { dV = +sV.value; Q = C * dV; } else { Q = Q0; dV = Q / C; } return { A, d, C, Q, dV, E: dV / d, PE: .5 * C * dV * dV }; };
  // المشهد
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x6a7890, 1.1)); const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(2, 5, 4); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(32, 2, .1, 100); cam.position.set(0, 2.0, 7.2); cam.lookAt(0, 0, 0);
  const g = new THREE.Group(); g.rotation.set(.25, -.5, 0); sc.add(g);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: o.m ?? .4, roughness: o.r ?? .4, transparent: o.t != null, opacity: o.t ?? 1, depthWrite: o.t == null });
  let parts = new THREE.Group(); g.add(parts);
  const DCOL = { 1: null, 2.1: 0xdde6ee, 3.7: 0xf3e2b8, 5.6: 0xb8e0e6, 80: 0x7fb8ff };
  function build(s) {
    g.remove(parts); parts.traverse(o => o.geometry?.dispose()); parts = new THREE.Group(); g.add(parts);
    const side = .22 * Math.sqrt(+sA.value), gap = .35 + +sD.value * .26;
    const top = new THREE.Mesh(new THREE.BoxGeometry(side, .1, side * .75), M(0xc9858a)); top.position.y = gap / 2 + .05; parts.add(top);
    const bot = new THREE.Mesh(new THREE.BoxGeometry(side, .1, side * .75), M(0x86a6cf)); bot.position.y = -gap / 2 - .05; parts.add(bot);
    if (k > 1) { const sl = new THREE.Mesh(new THREE.BoxGeometry(side * .96, gap * .92, side * .72), M(DCOL[k], { t: .55, m: 0, r: .3 })); parts.add(sl); }
    const nQ = Math.max(1, Math.min(16, Math.round(s.Q / 2e-10 * 3)));
    for (let i = 0; i < nQ; i++) {
      const x = -side / 2 + side * (i + .5) / nQ;
      const p = new THREE.Mesh(new THREE.SphereGeometry(.06, 10, 8), M(0xd8453a, { m: 0 })); p.position.set(x, gap / 2 - .04, side * .37); parts.add(p);
      const n = p.clone(); n.material = M(0x2f6fc0, { m: 0 }); n.position.y = -gap / 2 + .04; parts.add(n);
    }
    const nE = Math.max(2, Math.min(12, Math.round(s.E / 3000 * 5)));
    for (let i = 0; i < nE; i++) {
      const x = -side / 2 + side * (i + .5) / nE, L = gap - .25;
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, L * .8, 8), M(0xf0a020, { m: 0 })); sh.position.set(x, .1 * L / L, 0); parts.add(sh);
      const hd = new THREE.Mesh(new THREE.ConeGeometry(.07, L * .2, 12), M(0xf0a020, { m: 0 })); hd.rotation.z = Math.PI; hd.position.set(x, -L * .4, 0); parts.add(hd);
      sh.position.y = L * .1;
    }
    if (connected) {
      const bat = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, 1, 24), M(0xe0a526)); bat.position.set(side / 2 + .9, 0, 0); parts.add(bat);
      const w = (y0, y1) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 6), M(0xb87333)); const len = side / 2 + .9; c.scale.y = len; c.rotation.z = Math.PI / 2; c.position.set(len / 2, y0, 0); parts.add(c); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, Math.abs(y1 - y0), 6), M(0xb87333)); c2.position.set(side / 2 + .9, (y0 + y1) / 2, 0); parts.add(c2); };
      w(gap / 2 + .05, .5); w(-gap / 2 - .05, -.5);
    }
  }
  let prev = {};
  function upd() {
    const s = state(); build(s);
    const items = [['السعة C', pref(s.C, 'F')], ['الشحنة Q', pref(s.Q, 'C')], ['فرق الجهد ΔV', (+s.dV.toPrecision(3)) + ' V'], ['المجال E', sci(s.E, 'V/m')], ['الطاقة PE', sci(s.PE, 'J')]];
    vals(out, items);
    $$('div', out).forEach((d, i) => { if (prev[i] !== items[i][1]) d.classList.add('chg'); prev[i] = items[i][1]; });
    note.textContent = connected ? 'المتسعة متصلة: فرق الجهد ثابت = فرق جهد البطارية، فإدخال العازل يزيد الشحنة k مرة.' : 'المتسعة مفصولة: الشحنة ثابتة، فإدخال العازل أو تقريب الصفيحتين يقلل فرق الجهد.';
  }
  [sA, sD, sV].forEach(s => s.addEventListener('input', upd));
  let dr = null; cv.addEventListener('pointerdown', e => { dr = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!dr) return; g.rotation.y += (e.clientX - dr.x) * .01; g.rotation.x += (e.clientY - dr.y) * .01; dr = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', () => dr = null);
  const size = () => { const w = cv.clientWidth, h = cv.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(cv); size(); upd();
  let vis = false; new IntersectionObserver(es => { vis = es[0].isIntersecting; }).observe(cv);
  r.setAnimationLoop(() => { if (!vis) return; if (!dr) g.rotation.y += .003; r.render(sc, cam); });
}

/* ===== 2) حاسبة التوالي والتوازي ===== */
function simCombo(root) {
  const inp = document.createElement('div'); inp.className = 'cinp'; root.appendChild(inp);
  const def = [4, 8, 12, 6]; const ins = def.map((v, i) => { const w = document.createElement('div'); w.innerHTML = `<label>C${'₁₂₃₄'[i]} (μF)</label>`; const x = document.createElement('input'); x.type = 'number'; x.min = 0; x.step = 'any'; x.value = v; x.inputMode = 'decimal'; w.appendChild(x); inp.appendChild(w); return x; });
  let mode = 'P'; seg(root, [['P', '⫴ توازي'], ['S', '— توالي']], 'P', v => { mode = v; upd(); });
  const ctl = document.createElement('div'); ctl.className = 'ctl'; root.appendChild(ctl);
  const sV = slider(ctl, 'فرق الجهد الكلي', 1, 120, 1, 12, v => v + ' V');
  const out = document.createElement('div'); out.className = 'vals'; root.appendChild(out);
  const tb = document.createElement('table'); tb.className = 'tb'; root.appendChild(tb);
  function upd() {
    const cs = ins.map(x => +x.value).filter(v => v > 0); if (!cs.length) { out.innerHTML = ''; tb.innerHTML = ''; return; }
    const V = +sV.value; const Ceq = mode === 'P' ? cs.reduce((a, b) => a + b, 0) : 1 / cs.reduce((a, b) => a + 1 / b, 0);
    const Qt = Ceq * V; const rows = cs.map(c => { const q = mode === 'P' ? c * V : Qt; const dv = q / c; return [c, q, dv, .5 * c * 1e-6 * dv * dv]; });
    vals(out, [['السعة المكافئة', (+Ceq.toPrecision(4)) + ' μF'], ['الشحنة الكلية', (+Qt.toPrecision(4)) + ' μC'], ['القاعدة', mode === 'P' ? 'ΔV متساوٍ' : 'Q متساوية']]);
    tb.innerHTML = '<tr><th>المتسعة</th><th>C (μF)</th><th>Q (μC)</th><th>ΔV (V)</th><th>PE (J)</th></tr>' + rows.map((r, i) => `<tr><td>C${'₁₂₃₄'[i]}</td><td>${r[0]}</td><td>${+r[1].toPrecision(4)}</td><td>${+r[2].toPrecision(4)}</td><td dir="ltr">${sci(r[3], '')}</td></tr>`).join('');
  }
  ins.forEach(x => x.addEventListener('input', upd)); sV.addEventListener('input', upd); upd();
  const n = document.createElement('div'); n.className = 'note2'; n.textContent = 'جرّب قيم أمثلة الكتاب: (4، 8، 12، 6) توازي على 12V ⟵ 30μF و 360μC — و (6، 9، 18) توالي.'; root.appendChild(n);
}

/* ===== 3) الطاقة = مساحة المثلث ===== */
function simEnergy(root) {
  const cv = document.createElement('canvas'); cv.className = 'plot'; root.appendChild(cv);
  const ctl = document.createElement('div'); ctl.className = 'ctl'; root.appendChild(ctl);
  const sC = slider(ctl, 'السعة C', 1, 20, 1, 2, v => v + ' μF');
  const sV = slider(ctl, 'فرق الجهد ΔV', 0, 100, 1, 60, v => v + ' V');
  const out = document.createElement('div'); out.className = 'vals'; root.appendChild(out);
  function draw() {
    const dpr = Math.min(devicePixelRatio, 2), W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; const x = cv.getContext('2d'); x.scale(dpr, dpr); x.direction = 'ltr';
    const C = +sC.value, V = +sV.value, ox = 44, oy = H - 28, sx = (W - 70) / 100, qmax = C * 110, sy = (H - 48) / qmax;
    x.clearRect(0, 0, W, H); x.strokeStyle = '#26323f'; x.lineWidth = 2; x.beginPath(); x.moveTo(ox, 12); x.lineTo(ox, oy); x.lineTo(W - 16, oy); x.stroke();
    x.fillStyle = '#26323f'; x.font = '700 13px Cairo'; x.fillText('ΔV (V)', W - 58, oy + 20); x.fillText('Q (μC)', 6, 12);
    x.fillStyle = 'rgba(246,185,74,.7)'; x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + V * sx, oy); x.lineTo(ox + V * sx, oy - C * V * sy); x.closePath(); x.fill();
    x.strokeStyle = '#c0392b'; x.lineWidth = 3; x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + 100 * sx, oy - C * 100 * sy); x.stroke();
    x.fillStyle = '#17324d'; x.font = '800 14px Cairo'; x.fillText('PE = ½ Q ΔV', ox + V * sx * .45, oy - C * V * sy * .25);
    const Q = C * V; vals(out, [['الشحنة Q = CΔV', Q + ' μC'], ['الطاقة PE = ½CΔV²', sci(.5 * C * 1e-6 * V * V, 'J')]]);
  }
  [sC, sV].forEach(s => s.addEventListener('input', draw)); new ResizeObserver(draw).observe(cv);
}

/* ===== 4) دائرة الشحن والتفريغ ===== */
function simRC(root) {
  const cv = document.createElement('canvas'); cv.className = 'plot'; cv.style.height = '230px'; root.appendChild(cv);
  const sb = seg(root, [['0', '⏸ المفتاح مفتوح'], ['1', 'K على (1) شحن'], ['2', 'K على (2) تفريغ']], '0', v => { pos = +v; });
  const ctl = document.createElement('div'); ctl.className = 'ctl'; root.appendChild(ctl);
  const sV = slider(ctl, 'فرق جهد البطارية', 2, 24, 1, 12, v => v + ' V');
  const sR = slider(ctl, 'المقاومة R', 10, 100, 5, 20, v => v + ' Ω');
  const sC = slider(ctl, 'السعة C', 100, 2000, 50, 1000, v => v + ' μF');
  const pl = document.createElement('canvas'); pl.className = 'plot'; pl.style.height = '150px'; pl.style.marginTop = '8px'; root.appendChild(pl);
  const out = document.createElement('div'); out.className = 'vals'; root.appendChild(out);
  const n = document.createElement('div'); n.className = 'note2'; n.textContent = 'الزمن معروض ببطء حتى تلاحظ التغير. لاحظ: التيار يبدأ أعظماً (ΔV/R) ثم يتناقص للصفر، وفي التفريغ يتعكس اتجاهه.'; root.appendChild(n);
  let pos = 0, Vc = 0, I = 0, t = 0; const hist = [];
  const ctx = (c) => { const dpr = Math.min(devicePixelRatio, 2), W = c.clientWidth, H = c.clientHeight; if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; } const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.direction = 'ltr'; return [x, W, H]; };
  function lamp(x, cx, cy, b, lab) { const gr = x.createRadialGradient(cx, cy, 2, cx, cy, 34); gr.addColorStop(0, `rgba(255,214,74,${.15 + b * .85})`); gr.addColorStop(1, 'rgba(255,214,74,0)'); x.fillStyle = gr; x.beginPath(); x.arc(cx, cy, 34, 0, 7); x.fill(); x.fillStyle = b > .05 ? '#fff3b0' : '#f4f1e6'; x.strokeStyle = '#26323f'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 12, 0, 7); x.fill(); x.stroke(); x.beginPath(); x.moveTo(cx - 8, cy - 8); x.lineTo(cx + 8, cy + 8); x.moveTo(cx - 8, cy + 8); x.lineTo(cx + 8, cy - 8); x.stroke(); x.fillStyle = '#26323f'; x.font = '800 12px Cairo'; x.fillText(lab, cx + 16, cy + 4); }
  function drawCircuit() {
    const [x, W, H] = ctx(cv); x.clearRect(0, 0, W, H); const s = Math.min(W / 440, H / 230); x.save(); x.translate((W - 440 * s) / 2, (H - 230 * s) / 2); x.scale(s, s);
    x.strokeStyle = '#b87333'; x.lineWidth = 3.2; const L = (pts) => { x.beginPath(); x.moveTo(...pts[0]); pts.slice(1).forEach(p => x.lineTo(...p)); x.stroke(); };
    const Imax = +sV.value / +sR.value, b = Math.min(1, Math.abs(I) / Imax);
    L([[150, 40], [217, 40]]); L([[243, 40], [270, 40]]); L([[330, 40], [400, 40], [400, 108]]); L([[400, 122], [400, 200], [112, 200]]);
    L([[112, 84], [112, 100]]); L([[112, 126], [112, 150]]); L([[112, 162], [112, 200]]); L([[188, 84], [188, 124]]); L([[188, 152], [188, 200]]);
    // R
    x.strokeStyle = '#26323f'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(330, 40); for (let i = 0; i < 8; i++) x.lineTo(324 - i * 6, 40 + (i % 2 ? 7 : -7)); x.lineTo(270, 40); x.stroke(); x.fillStyle = '#26323f'; x.font = '800 12px Cairo'; x.fillText('R', 296, 26);
    // C مع شحنات
    x.lineWidth = 4; x.beginPath(); x.moveTo(380, 108); x.lineTo(420, 108); x.moveTo(380, 122); x.lineTo(420, 122); x.stroke();
    const nq = Math.round(Vc / +sV.value * 5); x.font = '800 12px Cairo'; for (let i = 0; i < nq; i++) { x.fillStyle = '#d8453a'; x.fillText('+', 380 + i * 8, 103); x.fillStyle = '#2f6fc0'; x.fillText('−', 380 + i * 8, 136); }
    x.fillStyle = '#26323f'; x.fillText('C', 362, 120);
    // بطارية
    x.lineWidth = 2.4; x.beginPath(); x.moveTo(94, 152); x.lineTo(130, 152); x.stroke(); x.lineWidth = 4.5; x.beginPath(); x.moveTo(102, 162); x.lineTo(122, 162); x.stroke(); x.font = '700 11px Cairo'; x.fillText('بطارية', 40, 160);
    lamp(x, 112, 113, pos === 1 ? b : 0, 'L₁'); lamp(x, 188, 138, pos === 2 ? b : 0, 'L₂');
    // كلفانوميتر
    x.fillStyle = '#fff'; x.strokeStyle = '#26323f'; x.lineWidth = 2.2; x.beginPath(); x.arc(230, 40, 15, 0, 7); x.fill(); x.stroke();
    const ang = -Math.PI / 2 + (I / Imax) * 1.0; x.strokeStyle = '#c0392b'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(230, 46); x.lineTo(230 + 13 * Math.cos(ang), 46 + 13 * Math.sin(ang)); x.stroke(); x.fillStyle = '#26323f'; x.font = '800 10px Cairo'; x.fillText('G', 226, 36);
    // المفتاح
    x.fillStyle = '#26323f'; [[150, 40], [112, 84], [188, 84]].forEach(([a, c]) => { x.beginPath(); x.arc(a, c, 4, 0, 7); x.fill(); }); x.font = '800 12px Cairo'; x.fillText('1', 96, 88); x.fillText('2', 198, 88); x.fillText('K', 150, 70);
    x.strokeStyle = '#c9a227'; x.lineWidth = 4; x.beginPath(); x.moveTo(150, 40); const tg = pos === 1 ? [114, 80] : pos === 2 ? [186, 80] : [150, 78]; x.lineTo(...tg); x.stroke();
    x.restore();
  }
  function drawPlot() {
    const [x, W, H] = ctx(pl); x.clearRect(0, 0, W, H); const oy = H / 2, ox = 30; x.strokeStyle = '#26323f'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(ox, 8); x.lineTo(ox, H - 8); x.moveTo(ox, oy); x.lineTo(W - 8, oy); x.stroke();
    x.fillStyle = '#26323f'; x.font = '700 12px Cairo'; x.fillText('I', 12, 16); x.fillText('t', W - 16, oy - 6);
    const Imax = 24 / 10; x.strokeStyle = '#c0392b'; x.lineWidth = 2.5; x.beginPath();
    hist.forEach((h, i) => { const px = ox + i * (W - ox - 10) / 300, py = oy - h / Imax * (H / 2 - 10) * 2.2; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
  }
  const clk = new THREE.Clock(); let vis = false; new IntersectionObserver(es => vis = es[0].isIntersecting).observe(cv);
  (function loop() {
    requestAnimationFrame(loop); const dt = Math.min(clk.getDelta(), .05); if (!vis) return;
    const V = +sV.value, R = +sR.value, C = +sC.value * 1e-6, tau = R * C * 40;
    if (pos === 1) { Vc += (V - Vc) / tau * dt; I = (V - Vc) / R; } else if (pos === 2) { Vc += -Vc / tau * dt; I = -Vc / R; } else I = 0;
    if (Math.abs(I) < 1e-4) I = 0;
    t += dt; hist.push(I); if (hist.length > 300) hist.shift();
    drawCircuit(); drawPlot();
    if ((t * 10 | 0) % 2 === 0) vals(out, [['فرق جهد المتسعة', Vc.toFixed(2) + ' V'], ['التيار I', (I >= 0 ? '' : '−') + Math.abs(I).toFixed(3) + ' A'], ['الشحنة Q', (+(C * Vc * 1e6).toFixed(0)) + ' μC'], ['Imax = ΔV/R', (V / R).toFixed(2) + ' A']]);
  })();
}

/* ===== 5) الاختبار ===== */
const QZ = [
  ['متسعة مشحونة ومفصولة عن البطارية، أُدخل عازل (k = 2) ملأ الحيز بين صفيحتيها؛ المجال E<sub>k</sub> مقارنة بـ E يصير:', ['E/4', '2E', 'E', 'E/2'], 3, 'المتسعة مفصولة: E<sub>k</sub> = E/k = E/2.'],
  ['وحدة الفاراد لا تكافئ إحدى الوحدات الآتية:', ['Coulomb²/J', 'Coulomb/V', 'Coulomb × V²', 'J/V²'], 2, 'F = C/V = C²/J = J/V² ، أما C·V² فلا تكافئه.'],
  ['متسعة سعتها C قُرّبت صفيحتاها حتى صار البعد ⅓ ما كان عليه؛ السعة الجديدة:', ['⅓ C', '1/9 C', '3C', '9C'], 2, 'C ∝ 1/d ، فنقصان البعد إلى الثلث يجعل السعة 3 أمثالها.'],
  ['متسعة (20μF) تختزن طاقة (2.5J) يتطلب ربطها بمصدر فرق جهده:', ['150 V', '350 V', '500 V', '250 kV'], 2, 'ΔV² = 2PE/C = 5/20×10⁻⁶ = 25×10⁴ ⟹ ΔV = 500 V.'],
  ['متسعة (50μF) ازدادت سعتها بمقدار (60μF) بعد إدخال عازل؛ ثابت العزل:', ['0.45', '0.55', '1.1', '2.2'], 3, 'C<sub>k</sub> = 50 + 60 = 110 μF ⟹ k = 110/50 = 2.2.'],
  ['تحتاج متسعة (10μF) ولديك متسعات متماثلة (15μF):', ['4 على التوالي', '6 على التوازي', '3: اثنتان توالي ومعهما الثالثة توازي', '3: اثنتان توازي ومعهما الثالثة توالي'], 3, 'اثنتان توازي = 30μF ، ومع 15μF توالي: (30×15)/45 = 10μF.'],
  ['متسعة متصلة ببطارية أُبعدت صفيحتاها قليلاً؛ المجال والشحنة:', ['المجال يزداد والشحنة تزداد', 'المجال يقل والشحنة تقل', 'يبقيان ثابتين', 'المجال ثابت والشحنة تزداد'], 1, 'ΔV ثابت وd يزداد فـ E = ΔV/d يقل، وC تقل فـ Q = CΔV تقل.'],
  ['أكبر سعة مكافئة في الشكل (37):', ['(a) = 2μF', '(b) = 3μF', '(c) = 4μF', '(d) = 5μF'], 3, '(d): 4 + (2 و 2 توالي = 1) = 5μF.'],
  ['متسعتان على التوالي و C₁ > C₂ ؛ فرق الجهد:', ['ΔV₁ > ΔV₂', 'ΔV₁ < ΔV₂', 'ΔV₁ = ΔV₂', 'يعتمد على الشحنة'], 1, 'الشحنة متساوية وΔV = Q/C ، فالأكبر سعة جهدها أقل.'],
  ['ثلاث متسعات على التوازي C₁ > C₂ > C₃ ؛ الشحنات:', ['Q₃ > Q₂ > Q₁', 'Q₁ > Q₃ > Q₂', 'Q₁ > Q₂ > Q₃', 'Q₁ = Q₂ = Q₃'], 2, 'ΔV متساوٍ وQ = CΔV.'],
];
function simQuiz(root) {
  let score = 0, done = 0; const sc = document.createElement('div'); sc.className = 'score';
  QZ.forEach(([q, ops, ok, ex], i) => {
    const d = document.createElement('div'); d.className = 'qz'; d.innerHTML = `<div class="qt">${i + 1}- ${q}</div>`;
    ops.forEach((o, j) => { const b = document.createElement('button'); b.className = 'op'; b.innerHTML = `(${'abcd'[j]}) ${o}`; b.onclick = () => {
      if (d.dataset.ans) return; d.dataset.ans = 1; done++; if (j === ok) score++;
      $$('.op', d).forEach((x, k) => { if (k === ok) x.classList.add('ok'); else if (k === j) x.classList.add('bad'); });
      const e = document.createElement('div'); e.className = 'ex2'; e.innerHTML = (j === ok ? '✅ صح! ' : '❌ الجواب الصحيح (' + 'abcd'[ok] + '). ') + ex; d.appendChild(e);
      sc.textContent = `درجتك: ${score} من ${done}` + (done === QZ.length ? (score >= 8 ? ' — ممتاز 🌟' : score >= 5 ? ' — جيد، راجع الأخطاء' : ' — راجع الفصل وأعد المحاولة') : '');
    }; d.appendChild(b); });
    root.appendChild(d);
  });
  root.appendChild(sc);
  const rb = document.createElement('button'); rb.className = 'rvb'; rb.textContent = '↺ أعد الاختبار'; rb.onclick = () => { root.innerHTML = ''; simQuiz(root); }; root.appendChild(rb);
}

const SIMS = { lab: simLab, combo: simCombo, energy: simEnergy, rc: simRC, quiz: simQuiz };
for (const s of $$('.sim')) { const f = SIMS[s.dataset.sim]; if (f) try { f($('.simb', s)); } catch (e) { console.error(e); } }

// روابط صفحة المحتويات المطبوعة
for (const li of $$('.tocl li')) {
  const no = li.querySelector('b')?.textContent.trim();
  const h = $$('h2.les').find(h => h.querySelector('.no')?.textContent.trim() === no && no !== '★')
    || $$('h2.les').find(h => no === '★' && li.textContent.includes(h.textContent.replace('★', '').trim().slice(0, 10)));
  if (h) { li.style.cursor = 'pointer'; li.onclick = () => h.scrollIntoView({ behavior: 'smooth' }); }
}
