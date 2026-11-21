// الصفحة التفاعلية لكل صفحة من ملزمة الأحياء — أثر أكاديمي
// كل صفحة مطبوعة عليها QR يودّي هنا: ?p=رقم الصفحة
import * as THREE from 'three';
import { ALL } from './figs.js';
import { BOOK, FIGS, ON_PAGE, lessonOf } from './data.js';

const $ = (id) => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const raw = qs.get('p');
const P = raw === null || raw === '' || isNaN(+raw) ? null : Math.max(0, Math.min(BOOK.last, Math.round(+raw)));
const main = $('main');

function renderPage(p) {
  const les = lessonOf(p);
  const here = ON_PAGE[p] || [];
  const list = [...here, ...les.figs.filter((f) => !here.includes(f))];
  $('hPage').textContent = p === 0 ? 'الغلاف' : 'صفحة ' + p;
  document.title = (p === 0 ? 'الغلاف' : 'صفحة ' + p) + ' — ' + BOOK.title + ' | أثر أكاديمي';
  main.innerHTML = `
  <div class="card">
    <h2>🧊 ${here.length ? 'مجسمات هذه الصفحة' : 'مجسمات هذا الدرس'}<small>دوّره 360° بإصبعك</small></h2>
    <div class="lesson">${les.t}</div>
    <div id="stageWrap"><canvas id="stage"></canvas><div id="labels"></div><div id="loading">⏳ جاري تحميل المجسم...</div><div id="hint">اسحب بأي اتجاه • قرّب بإصبعين</div></div>
    <div class="tools">
      <button id="bH" class="on"><span>🔄</span>أفقي</button>
      <button id="bV"><span>↕️</span>عمودي</button>
      <button id="bL" class="on"><span>🏷️</span>الأسماء</button>
      <button id="bR"><span>↺</span>إعادة</button>
      <button id="bF"><span>⛶</span>ملء الشاشة</button>
    </div>
    <div class="info" id="info"></div>
    <div id="arSlot"></div>
    <div class="chips" id="chips"></div>
  </div>
  <div class="card page">
    <h2>📄 الصفحة المطبوعة<small>${p === 0 ? 'الغلاف' : 'صفحة ' + p + ' من ' + BOOK.last}</small></h2>
    <a href="pages/p${p}.webp" target="_blank"><img src="pages/p${p}.webp" alt="صفحة ${p}"></a>
    <a class="open" href="pages/p${p}.webp" target="_blank">🔍 افتح الصفحة بحجم كامل للتكبير</a>
  </div>`;
  const prev = p > 0 ? `?p=${p - 1}` : '#', next = p < BOOK.last ? `?p=${p + 1}` : '#';
  $('nav').innerHTML = `<a href="${next}" class="${p >= BOOK.last ? 'off' : ''}">التالية ←</a><a href="?" class="mid">كل الصفحات</a><a href="${prev}" class="${p <= 0 ? 'off' : ''}">→ السابقة</a>`;
  $('chips').innerHTML = list.map((k) => `<div class="chip" data-k="${k}"><img src="figs/${k}.webp" alt="">${FIGS[k].t}${here.includes(k) ? '<span class="tag">بهذه الصفحة</span>' : ''}</div>`).join('');
  $('chips').querySelectorAll('.chip').forEach((c) => (c.onclick = () => show(c.dataset.k)));
  initViewer();
  show(list[0]);
}

// ---------------- عارض المجسمات ----------------
let renderer, scene, camera, holder, spin, current = null, labels = [], dist = 4, baseDist = 4;
let hOn = true, vOn = false, lOn = true, dragging = null, last = performance.now();
const vel = { x: 0, y: 0 }, ptrs = new Map();
let pinch0 = 0, dist0 = 0;

function initViewer() {
  const cv = $('stage');
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a5a7a, 1.0));
  const d1 = new THREE.DirectionalLight(0xffffff, 2.2); d1.position.set(2, 3, 3); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xfff0f5, 0.7); d2.position.set(-3, 0.5, 1.5); scene.add(d2);
  const d3 = new THREE.DirectionalLight(0xffffff, 0.9); d3.position.set(0, -1, -3); scene.add(d3);
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  holder = new THREE.Group(); spin = new THREE.Group(); holder.add(spin); scene.add(holder);
  resize(); addEventListener('resize', resize);
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 60));
  // التحكم باللمس والفأرة
  const w = $('stageWrap');
  w.addEventListener('pointerdown', (e) => { w.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { dragging = { x: e.clientX, y: e.clientY, t: performance.now() }; vel.x = vel.y = 0; }
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = dist; dragging = null; }
    hideHint(); });
  w.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 > 0) setDist(dist0 * pinch0 / d); return; }
    if (!dragging) return;
    const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y, now = performance.now(), dt = Math.max(1, now - dragging.t);
    dragging.x = e.clientX; dragging.y = e.clientY; dragging.t = now;
    if (hOn || vOn) setAuto(false, false);
    rotateBy(dx * 0.011, dy * 0.011);
    vel.x = THREE.MathUtils.lerp(vel.x, dx * 0.011 / dt * 16.7, 0.5); vel.y = THREE.MathUtils.lerp(vel.y, dy * 0.011 / dt * 16.7, 0.5); });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size === 0) dragging = null; if (ptrs.size === 1) { const [a] = [...ptrs.values()]; dragging = { x: a.x, y: a.y, t: performance.now() }; } };
  w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
  w.addEventListener('wheel', (e) => { e.preventDefault(); setDist(dist * (1 + Math.sign(e.deltaY) * 0.1)); }, { passive: false });
  $('bH').onclick = () => setAuto(!hOn, false);
  $('bV').onclick = () => setAuto(false, !vOn);
  $('bL').onclick = () => { lOn = !lOn; $('bL').classList.toggle('on', lOn); };
  $('bR').onclick = () => reset();
  $('bF').onclick = () => { const el = $('stageWrap'); if (document.fullscreenElement) document.exitFullscreen(); else (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el); };
  requestAnimationFrame(loop);
}
function hideHint() { const h = $('hint'); if (h) h.style.opacity = 0; }
function setAuto(h, v) { hOn = h; vOn = v; $('bH').classList.toggle('on', h); $('bV').classList.toggle('on', v); }
function setDist(d) { dist = THREE.MathUtils.clamp(d, baseDist * 0.45, baseDist * 2.2); camera.position.set(0, 0, dist); }
function resize() {
  const cv = $('stage'); const w = cv.clientWidth, h = cv.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fit();
}
// دوران حر 360° حول محوري الشاشة (الكاميرا ثابتة، فالمحوران هما X و Y)
const _q = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
function rotateBy(dx, dy) {
  if (dx) spin.quaternion.premultiply(_q.setFromAxisAngle(AY, dx));
  if (dy) spin.quaternion.premultiply(_q.setFromAxisAngle(AX, dy));
  spin.quaternion.normalize();
}
let startQ = new THREE.Quaternion();
function reset() { spin.quaternion.copy(startQ); setDist(baseDist); vel.x = vel.y = 0; }
function fit() {
  if (!current) return;
  const sph = new THREE.Box3().setFromObject(current).getBoundingSphere(new THREE.Sphere());
  const vf = THREE.MathUtils.degToRad(camera.fov / 2); const hf = Math.atan(Math.tan(vf) * camera.aspect);
  baseDist = sph.radius / Math.sin(Math.min(vf, hf)) * 0.84; setDist(baseDist);
}

function show(k) {
  if (!FIGS[k]) return;
  document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.k === k));
  if (current) { spin.remove(current); dispose(current); }
  $('loading').style.display = 'flex';
  const { obj, rot } = ALL[k]();
  // مركزة المجسم
  obj.updateMatrixWorld(true);
  const c = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
  const wrap = new THREE.Group(); obj.position.sub(c); wrap.add(obj);
  current = wrap; spin.add(wrap);
  spin.quaternion.setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])); startQ.copy(spin.quaternion);
  fit();
  // الأسماء
  $('labels').innerHTML = ''; labels = [];
  wrap.traverse((o) => { if (o.userData.label) { const d = document.createElement('div'); d.className = 'lb'; d.textContent = o.userData.label; $('labels').appendChild(d); labels.push({ o, d }); } });
  const f = FIGS[k];
  $('info').innerHTML = `<b>${f.t}</b> <span style="color:#8a6aa0;font-size:12px;font-weight:800">• ${f.fig}</span><br>${f.d}`;
  $('arSlot').innerHTML = f.ar ? `<a class="arbtn" href="${f.ar}">📱 شغّل الواقع المعزز ووجّه الكاميرا على الصفحة</a>` : '';
  setTimeout(() => ($('loading').style.display = 'none'), 50);
}
function dispose(o) { o.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }

const v = new THREE.Vector3(), cpos = new THREE.Vector3(), ctr = new THREE.Vector3(), n = new THREE.Vector3();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (!dragging && ptrs.size === 0) {
    if (hOn) rotateBy(dt * 0.55, 0);
    else if (vOn) rotateBy(0, dt * 0.55);
    else if (Math.abs(vel.x) + Math.abs(vel.y) > 0.0004) { rotateBy(vel.x, vel.y); vel.x *= 0.93; vel.y *= 0.93; }
  }
  renderer.render(scene, camera);
  // تحديث مواضع الأسماء، وإخفاء ما يقع خلف المجسم
  const W = $('stage').clientWidth, H = $('stage').clientHeight;
  if (current) current.getWorldPosition(ctr);
  for (const { o, d } of labels) {
    o.getWorldPosition(v); n.copy(v).sub(ctr);
    const facing = n.lengthSq() < 1e-6 ? 1 : n.normalize().dot(cpos.copy(camera.position).sub(v).normalize());
    v.project(camera);
    const vis = lOn && facing > -0.35 && v.z < 1;
    d.style.opacity = vis ? 1 : 0;
    d._vis = vis; d._x = (v.x + 1) / 2 * W; d._y = (1 - v.y) / 2 * H;
  }
  // منع تراكب الأسماء: ترتيب حسب الارتفاع وإزاحة المتداخل للأسفل
  const vis = labels.map((l) => l.d).filter((d) => d._vis).sort((a, b) => a._y - b._y);
  const placed = [];
  for (const d of vis) {
    const w = d.offsetWidth || 80; let y = d._y;
    for (const p of placed) if (Math.abs(p.x - d._x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < 24) y = p.y + 24;
    placed.push({ x: d._x, y, w });
    d.style.left = d._x + 'px'; d.style.top = y + 'px'; d.classList.toggle('sh', Math.abs(y - d._y) > 2);
  }
  requestAnimationFrame(loop);
}

// ---------------- التشغيل: الفهرس أو صفحة محددة ----------------
if (P === null) {
  $('hPage').textContent = 'الفهرس';
  let g = '<div class="card"><h2>📖 كل صفحات الملزمة<small>الصفحات المؤطرة بالذهبي فيها مجسمات</small></h2><div class="grid">';
  for (let i = 0; i <= BOOK.last; i++) g += `<a href="?p=${i}" class="${ON_PAGE[i] ? 'has' : ''}"><img loading="lazy" src="pages/t${i}.webp" alt="">${i === 0 ? 'الغلاف' : 'صفحة ' + i}</a>`;
  g += '</div></div>';
  main.innerHTML = g;
  $('nav').innerHTML = '<a href="?p=0" class="mid">ابدأ من الغلاف</a>';
} else {
  renderPage(P);
}

