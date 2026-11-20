import * as THREE from 'three';
import { MindARThree } from '../lib/mindar-image-three.prod.js';
import { buildCell, PARTS } from './cell.js';

const $ = (id) => document.getElementById(id);

// عرض الصفحة = 1 وحدة. لكل صفحة هدف: موضع مركز الرسم (x,y عن منتصف الصفحة) وحجم الخلية
// 0 = صفحة الكتاب (target.png) ، 1 = صفحة ملزمة أثر أكاديمي (target2.png)
const PAGE_W = 1, PAGE_H = 1754 / 1240;
const TARGETS = [
  { x: 0, y: 0.151, s: 0.25, img: 'target.png' },
  { x: -0.019, y: 0.273, s: 0.21, img: 'target2.png' },
];
let tIdx = 0; const ts = () => TARGETS[tIdx];

let mode = null, renderer, scene, camera, anchorGroup, mindar;
let found = false, locked = false, detached = false, spinOn = true, flipOn = false, showLabels = false, selected = null, anchors3 = [];
let userScale = 1, appear = 1, hintShown = false, frame = 0, scaleMul = 1;
const vel = { x: 0, y: 0 }; // سرعة الدوران بعد رفع الإصبع (عطالة)
const ws = new THREE.Vector3();

// ----- بناء المشهد -----
const placement = new THREE.Group();
const tilt = new THREE.Group();
const spin = new THREE.Group();
placement.add(tilt); tilt.add(spin);
const { cell, meshes, anchors, mats } = buildCell();
spin.add(cell);

// ظل ناعم تحت الخلية
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(40,10,50,.55)'); gr.addColorStop(1, 'rgba(40,10,50,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -1.04; placement.add(sh);
}

function poseOnPage() {
  const t = ts();
  placement.position.set(t.x, t.y, t.s * 1.06);
  placement.rotation.set(Math.PI / 2, 0, 0);
}
function resetView() {
  userScale = 1; vel.x = vel.y = 0;
  spin.quaternion.setFromEuler(new THREE.Euler(0, -Math.PI / 4, 0)); tilt.rotation.set(0.15, 0, 0);
}

// ----- دوران حر 360° بكل الاتجاهات (كواترنيون: بدون قفل محاور) -----
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _ax = new THREE.Vector3(), _ay = new THREE.Vector3();
function rotateBy(dx, dy) { // dx: يمين/يسار ، dy: فوق/جوة (بالراديان) حول محاور الشاشة
  if (!camera) return;
  camera.updateMatrixWorld(); spin.parent.updateMatrixWorld();
  spin.parent.getWorldQuaternion(_pq).invert();
  _ay.setFromMatrixColumn(camera.matrixWorld, 1).applyQuaternion(_pq).normalize();
  _ax.setFromMatrixColumn(camera.matrixWorld, 0).applyQuaternion(_pq).normalize();
  if (dx) spin.quaternion.premultiply(_q.setFromAxisAngle(_ay, dx));
  if (dy) spin.quaternion.premultiply(_q.setFromAxisAngle(_ax, dy));
  spin.quaternion.normalize();
}
poseOnPage(); resetView();

function addLights(sc) {
  sc.add(new THREE.HemisphereLight(0xffffff, 0x5a3a6a, 1.15));
  const d = new THREE.DirectionalLight(0xffffff, 1.35); d.position.set(1, 1.5, 2); sc.add(d);
  const d2 = new THREE.DirectionalLight(0xffe0f0, 0.45); d2.position.set(-1.5, -0.5, 1); sc.add(d2);
}

// ----- الأسماء فوق الأجزاء -----
const labelEls = {};
for (const key of Object.keys(anchors)) {
  const el = document.createElement('div'); el.className = 'lbl';
  el.innerHTML = `<i style="background:${PARTS[key].color}"></i>${PARTS[key].name}`;
  el.style.opacity = 0; $('labels').appendChild(el); labelEls[key] = el;
}
const v = new THREE.Vector3(), camPos = new THREE.Vector3(), b = new THREE.Vector3();
function cellVisible() { return mode === 'preview' || locked || detached || found; }
const occ = {}; const ray2 = new THREE.Raycaster();
function occluded(key, wp) {
  ray2.set(camPos, b.copy(wp).sub(camPos).normalize());
  const dist = camPos.distanceTo(wp);
  const hit = ray2.intersectObjects(meshes, false)[0];
  return !!hit && hit.distance < dist - cell.getWorldScale(ws).x * 0.06 && hit.object.userData.part !== key;
}
function updateLabels() {
  frame++;
  const rect = renderer.domElement.getBoundingClientRect();
  const vis = cellVisible() && appear > 0.9;
  camera.getWorldPosition(camPos);
  const placed = [];
  for (const key in labelEls) {
    const el = labelEls[key];
    const want = vis && (showLabels || key === selected);
    if (!want) { el.style.opacity = 0; continue; }
    anchors[key].getWorldPosition(v);
    if (frame % 4 === 0 || occ[key] === undefined) occ[key] = occluded(key, v);
    v.project(camera);
    if (v.z > 1 || (occ[key] && key !== selected)) { el.style.opacity = 0; continue; }
    placed.push({ key, el, x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height - 10, w: el.offsetWidth, h: el.offsetHeight });
  }
  // منع تداخل الأسماء: نجرب عدة مواضع قريبة، وإن لم يوجد مكان نخفي الاسم (عدا المختار)
  const ORDER = ['nucleus', 'mito', 'membrane', 'golgi', 'er', 'lysosome', 'nucleolus', 'centriole', 'ribosome', 'cytoplasm'];
  placed.sort((p, q) => (q.key === selected) - (p.key === selected) || ORDER.indexOf(p.key) - ORDER.indexOf(q.key));
  const done = [];
  const hits = (x, y, L) => done.some((D) => Math.abs(D.x - x) < (D.w + L.w) / 2 + 4 && Math.abs(D.y - y) < (D.h + L.h) / 2 + 3);
  for (const L of placed) {
    const cands = [[0, 0], [0, -(L.h + 4)], [-(L.w * 0.55), -4], [L.w * 0.55, -4], [0, -2 * (L.h + 4)]];
    let pos = cands.map(([dx, dy]) => [L.x + dx, L.y + dy]).find(([x, y]) => !hits(x, y, L));
    if (!pos) { if (L.key !== selected) { L.el.style.opacity = 0; continue; } pos = [L.x, L.y]; }
    L.x = pos[0]; L.y = pos[1]; done.push(L);
    L.el.style.transform = `translate(${L.x.toFixed(1)}px,${L.y.toFixed(1)}px) translate(-50%,-100%)`;
    L.el.style.opacity = 1; L.el.classList.toggle('sel', L.key === selected);
  }
}

// ----- الاختيار وبطاقة المعلومات -----
function select(key) {
  selected = key;
  for (const k in mats) for (const m of mats[k]) { m.emissive.set(k === key ? PARTS[k].color : '#000'); m.emissiveIntensity = 0; }
  if (!key) { $('info').classList.remove('show'); return; }
  const p = PARTS[key];
  $('isw').style.background = p.color; $('iname').textContent = p.name; $('idesc').textContent = p.desc;
  $('info').classList.add('show');
  if (navigator.vibrate) navigator.vibrate(12);
}
$('ix').onclick = () => select(null);
$('say').onclick = () => {
  if (!('speechSynthesis' in window) || !selected) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(PARTS[selected].name + '. ' + PARTS[selected].desc);
  const ar = speechSynthesis.getVoices().find((vo) => vo.lang && vo.lang.toLowerCase().startsWith('ar'));
  if (ar) u.voice = ar; u.lang = ar ? ar.lang : 'ar-SA'; u.rate = 0.95;
  speechSynthesis.speak(u);
};

// ----- اللمس: تدوير، تكبير، لمس جزء -----
const ptrs = new Map(); let drag = null, pinch = null;
const ray = new THREE.Raycaster();
const touch = $('touch');
touch.addEventListener('pointerdown', (e) => {
  touch.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), lt: performance.now(), moved: false }; vel.x = vel.y = 0; }
  if (ptrs.size === 2) { const [p, q] = [...ptrs.values()]; pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), s: userScale }; if (drag) drag.moved = true; }
});
touch.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size >= 2 && pinch) {
    const [p, q] = [...ptrs.values()];
    userScale = THREE.MathUtils.clamp(pinch.s * Math.hypot(p.x - q.x, p.y - q.y) / pinch.d, 0.4, 3.5);
  } else if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { if (!drag.moved) { setSpin(false); setFlip(false); } drag.moved = true; }
    if (drag.moved) {
      const now = performance.now(), dt = Math.max(1, now - drag.lt); drag.lt = now;
      rotateBy(dx * 0.011, dy * 0.011); // دوران كامل بدون حدود: يمين/يسار وفوق/جوة
      vel.x = THREE.MathUtils.lerp(vel.x, dx * 0.011 / dt * 16.7, 0.5); vel.y = THREE.MathUtils.lerp(vel.y, dy * 0.011 / dt * 16.7, 0.5);
    }
  }
});
const up = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0 && drag) {
    if (!drag.moved && performance.now() - drag.t < 400) tap(e.clientX, e.clientY);
    drag = null;
  }
};
touch.addEventListener('pointerup', up); touch.addEventListener('pointercancel', up);

function tap(x, y) {
  if (!cellVisible()) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(meshes, false)[0];
  select(hit ? hit.object.userData.part : null);
}

// ----- الأزرار -----
function setSpin(on) { spinOn = on; $('bSpin').classList.toggle('on', on); if (on) setFlip(false, true); }
function setFlip(on, quiet) { flipOn = on; $('bFlip').classList.toggle('on', on); if (on && !quiet) setSpin(false); }
$('bSpin').onclick = () => setSpin(!spinOn);
$('bFlip').onclick = () => { const on = !flipOn; if (on) { spinOn = false; $('bSpin').classList.remove('on'); } setFlip(on, true); };
$('bLabels').onclick = () => { showLabels = !showLabels; $('bLabels').classList.toggle('on', showLabels); };
$('bReset').onclick = () => { if (detached) setDetach(false); if (locked) setLock(false); resetView(); select(null); };
$('bDetach').onclick = () => setDetach(!detached);
$('bBack').onclick = () => location.reload();
$('bLock').onclick = () => setLock(!locked);
function setLock(on) {
  if (mode !== 'ar') return;
  if (on) {
    if (!found) { flashStatus('وجّه الكاميرا نحو الصفحة أولاً'); return; }
    scene.updateMatrixWorld(true); const before = placement.scale.x; scene.attach(placement); scaleMul *= placement.scale.x / before; locked = true;
  } else {
    anchorGroup.add(placement); poseOnPage(); scaleMul = 1; locked = false;
  }
  $('bLock').classList.toggle('on', locked); refreshStatus();
}
// ----- فصل المجسم: يطلع من الورقة ويصير بنص الشاشة حتى تدوّره براحتك -----
let dim = null;
function setDetach(on) {
  if (mode !== 'ar') return;
  if (on) {
    if (!found && !locked) { flashStatus('وجّه الكاميرا نحو الصفحة أولاً'); return; }
    if (locked) { locked = false; $('bLock').classList.remove('on'); }
    // وحدات MindAR كبيرة (بالبكسل)، فنحسب مقياس الصفحة الحالي ونضع المجسم أمام الكاميرا مباشرة
    scene.updateMatrixWorld(true);
    const unit = anchorGroup.getWorldScale(new THREE.Vector3()).x || 1;
    scene.add(placement); placement.rotation.set(0, 0, 0); scaleMul = unit;
    const r = ts().s * 1.25 * unit; const d = r / (0.42 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const dir = camera.getWorldDirection(new THREE.Vector3());
    placement.position.copy(camera.getWorldPosition(new THREE.Vector3())).addScaledVector(dir, d);
    placement.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion())); tilt.rotation.set(0.15, 0, 0);
    detached = true; appear = 0.35; dim.style.opacity = 1;
  } else {
    anchorGroup.add(placement); poseOnPage(); scaleMul = 1; detached = false; dim.style.opacity = 0;
  }
  $('bDetach').classList.toggle('on', detached); $('bLock').style.display = detached ? 'none' : '';
  refreshStatus();
}

// ----- الحالة -----
let flashT = 0;
function setStatus(text, ok) { $('stxt').textContent = text; $('status').classList.toggle('ok', !!ok); }
function refreshStatus() {
  if (performance.now() < flashT) return;
  if (detached) setStatus('🧊 المجسم مفصول — دوّره 360° براحتك', true);
  else if (locked) setStatus('📌 الخلية مثبتة — تستطيع إبعاد الكاميرا', true);
  else if (found) setStatus('تم التعرف على الصفحة ✓', true);
  else setStatus('وجّه الكاميرا نحو صفحة الخلية', false);
  $('scan').style.display = mode === 'ar' && !found && !locked && !detached ? 'flex' : 'none';
}
function flashStatus(t) { setStatus(t, false); flashT = performance.now() + 1800; setTimeout(refreshStatus, 1850); }
function showHint() { if (hintShown) return; hintShown = true; $('hint').classList.add('show'); setTimeout(() => $('hint').classList.remove('show'), 5000); }

// ----- الحلقة -----
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (!drag) {
    if (spinOn) rotateBy(dt * 0.6, 0);            // دوران أفقي مستمر 360°
    else if (flipOn) rotateBy(0, dt * 0.6);       // دوران عمودي مستمر 360° (فوق وجوة)
    else if (Math.abs(vel.x) + Math.abs(vel.y) > 0.0004) { rotateBy(vel.x, vel.y); vel.x *= 0.93; vel.y *= 0.93; } // عطالة بعد السحب
  }
  appear = Math.min(1, appear + dt * 1.8);
  const k = appear < 1 ? 1 + 2.2 * Math.pow(appear - 1, 3) + 1.2 * Math.pow(appear - 1, 2) : 1; // easeOutBack
  placement.scale.setScalar(ts().s * userScale * Math.max(0.001, k) * scaleMul);
  if (selected) for (const m of mats[selected]) m.emissiveIntensity = 0.25 + 0.2 * Math.sin(t * 6);
  renderer.render(scene, camera);
  updateLabels();
}

function enterUI() {
  $('start').style.display = 'none';
  $('top').style.display = 'flex'; $('bar').style.display = 'flex'; $('touch').hidden = false;
}
function fail(text) { $('loading').style.display = 'none'; $('mtxt').innerHTML = text; $('msg').style.display = 'flex'; }

// ----- وضع الكاميرا (الواقع المعزز) -----
async function startAR() {
  let framed = false; try { framed = window.top !== window.self; } catch { framed = true; }
  if (framed) {
    return fail('الكاميرا لا تعمل داخل نافذة المعاينة هذه.<br>افتح الصفحة من رابطها المباشر على GitHub Pages، أو جرّب «المعاينة بدون كاميرا».');
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    return fail('الكاميرا تحتاج رابطاً آمناً يبدأ بـ <b>https://</b><br>افتح الصفحة من رابط GitHub Pages أو جرّب «المعاينة بدون كاميرا».');
  }
  mode = 'ar'; $('loading').style.display = 'flex';
  mindar = new MindARThree({
    container: $('ar'), imageTargetSrc: './targets.mind',
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    filterMinCF: 0.0001, filterBeta: 0.01, warmupTolerance: 3, missTolerance: 8,
  });
  ({ renderer, scene, camera } = mindar);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  addLights(scene);
  // هدفان: صفحة الكتاب وصفحة الملزمة — أيهما يظهر تخرج عليه الخلية
  dim = document.createElement('div');
  dim.style.cssText = 'position:absolute;inset:0;background:radial-gradient(90% 70% at 50% 45%,rgba(60,25,90,.55),rgba(15,7,25,.88));opacity:0;transition:opacity .35s;pointer-events:none;z-index:1';
  const nAnch = TARGETS.length; let seen = 0;
  for (let i = 0; i < nAnch; i++) {
    const a = mindar.addAnchor(i); anchors3.push(a);
    a.onTargetFound = () => {
      seen |= 1 << i;
      if (!locked && !detached && (i !== tIdx || placement.parent !== a.group)) { tIdx = i; anchorGroup = a.group; anchorGroup.add(placement); poseOnPage(); }
      if (!found && !locked && !detached) appear = 0; found = true; refreshStatus(); showHint();
    };
    a.onTargetLost = () => { seen &= ~(1 << i); found = seen !== 0; refreshStatus(); };
  }
  anchorGroup = anchors3[0].group; anchorGroup.add(placement);
  try {
    await mindar.start();
  } catch (err) {
    console.error(err);
    return fail('تعذّر تشغيل الكاميرا 😕<br>اسمح للمتصفح باستخدام الكاميرا ثم أعد المحاولة.');
  }
  renderer.domElement.style.zIndex = 2; renderer.domElement.style.position = 'absolute';
  $('ar').insertBefore(dim, renderer.domElement);
  $('loading').style.display = 'none'; enterUI(); refreshStatus();
  clock.start(); renderer.setAnimationLoop(loop);
}

// ----- وضع المعاينة بدون كاميرا -----
function startPreview() {
  mode = 'preview'; $('preview').hidden = false; $('bLock').style.display = 'none'; $('bDetach').style.display = 'none';
  tIdx = new URLSearchParams(location.search).get('page') === 'mulzama' ? 1 : 0;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  $('preview').appendChild(renderer.domElement);
  scene = new THREE.Scene(); addLights(scene);
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  // صفحة الكتاب مستلقية على "طاولة" افتراضية، والخلية فوقها كما في الكاميرا
  anchorGroup = new THREE.Group(); anchorGroup.rotation.x = -Math.PI / 2; scene.add(anchorGroup);
  const tex = new THREE.TextureLoader().load(ts().img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const page = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), new THREE.MeshBasicMaterial({ map: tex }));
  anchorGroup.add(page); anchorGroup.add(placement);
  const fit = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h;
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const d = Math.max(1.7, 0.62 / Math.tan(hf / 2));
    const target = new THREE.Vector3(ts().x, ts().s * 0.88, -ts().y * 0.33);
    camera.position.copy(target).add(new THREE.Vector3(0, 0.62, 0.78).normalize().multiplyScalar(d));
    camera.lookAt(target); camera.updateProjectionMatrix();
  };
  fit(); addEventListener('resize', fit);
  enterUI(); setStatus('معاينة ثلاثية الأبعاد', true); appear = 0; showHint();
  clock.start(); renderer.setAnimationLoop(loop);
}

$("goAR").onclick = startAR;
$('go3D').onclick = startPreview;
if (new URLSearchParams(location.search).has('preview')) startPreview();
