import * as THREE from 'three';
import { MindARThree } from '../lib/mindar-image-three.prod.js';
import { buildCap, PARTS } from './capacitor.js';

const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);

// أهداف التتبع: عرض الصفحة = 1 وحدة، (x,y) مركز الشكل عن منتصف الصفحة، s مقياس النموذج
// 0: صفحة الواقع المعزز في الملزمة — 1: صفحة المتسعة في كتاب الوزارة (الشكل 4)
const TARGETS = [
  { x: 0.012, y: 0.231, s: 0.145, img: 'target.png', h: 1754 / 1240 },
  { x: 0.032, y: -0.204, s: 0.140, img: 'target2.png', h: 1754 / 1240 },
];
const LIFT = 1.45; // ارتفاع النموذج فوق الصفحة بوحدات النموذج (عمق النموذج ±1.2)

let mode = null, renderer, scene, camera, mindar, active = 0;
const anchorGroups = [];
let found = false, detached = false, spinMode = 'h', showLabels = false, selected = null;
let userScale = 1, appear = 1, hintShown = false, frame = 0, scaleMul = 1, lastUnit = 0;
const vel = { x: 0, y: 0 };
const ws = new THREE.Vector3(), qq = new THREE.Quaternion(), qp = new THREE.Quaternion();

// ----- المشهد -----
const placement = new THREE.Group();
const spin = new THREE.Group();
placement.add(spin);
const { cap, meshes, anchors, mats } = buildCap();
spin.add(cap);
const R_MODEL = 2.7;

function poseOnPage(i = active) {
  const T = TARGETS[i];
  placement.position.set(T.x, T.y, T.s * LIFT);
  placement.quaternion.setFromEuler(new THREE.Euler(0.3, 0, 0)); // يواجه القارئ كما في الشكل المطبوع ومائل قليلاً
}
function resetView() {
  userScale = 1; vel.x = vel.y = 0;
  spin.quaternion.setFromEuler(new THREE.Euler(0.28, -0.42, 0));
}
poseOnPage(); resetView();

function addLights(sc) {
  sc.add(new THREE.HemisphereLight(0xffffff, 0x6a7890, 1.1));
  const d = new THREE.DirectionalLight(0xffffff, 1.3); d.position.set(1, 1.5, 2); sc.add(d);
  const d2 = new THREE.DirectionalLight(0xdfeaff, 0.45); d2.position.set(-1.5, -0.5, 1); sc.add(d2);
}

// ----- الأسماء -----
const labelEls = {};
for (const key of Object.keys(anchors)) {
  const el = document.createElement('div'); el.className = 'lbl';
  el.innerHTML = `<i style="background:${PARTS[key].color}"></i>${PARTS[key].name}`;
  el.style.opacity = 0; $('labels').appendChild(el); labelEls[key] = el;
}
const v = new THREE.Vector3(), camPos = new THREE.Vector3(), b = new THREE.Vector3();
const visible = () => mode === 'preview' || detached || found;
const occ = {}; const ray2 = new THREE.Raycaster();
function occluded(key, wp) {
  ray2.set(camPos, b.copy(wp).sub(camPos).normalize());
  const hit = ray2.intersectObjects(meshes, false)[0];
  return !!hit && hit.distance < camPos.distanceTo(wp) - cap.getWorldScale(ws).x * 0.08 && hit.object.userData.part !== key;
}
const ORDER = ['posPlate', 'negPlate', 'field', 'battery', 'gap', 'charges', 'wire'];
function updateLabels() {
  frame++;
  const rect = renderer.domElement.getBoundingClientRect();
  const vis = visible() && appear > 0.9;
  camera.getWorldPosition(camPos);
  const placed = [];
  for (const key in labelEls) {
    const el = labelEls[key];
    if (!(vis && (showLabels || key === selected))) { el.style.opacity = 0; continue; }
    anchors[key].getWorldPosition(v);
    if (frame % 4 === 0 || occ[key] === undefined) occ[key] = occluded(key, v);
    v.project(camera);
    if (v.z > 1 || (occ[key] && key !== selected)) { el.style.opacity = 0; continue; }
    placed.push({ key, el, x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height - 10, w: el.offsetWidth, h: el.offsetHeight });
  }
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

// ----- الاختيار -----
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

// ----- دوران حر 360°: كواترنيون حول محوري الشاشة محوّلين لفضاء الأب -----
const axUp = new THREE.Vector3(), axRight = new THREE.Vector3();
function screenAxes() {
  camera.updateMatrixWorld(); spin.parent.updateMatrixWorld();
  spin.parent.getWorldQuaternion(qp).invert();
  const cq = camera.getWorldQuaternion(qq);
  axUp.set(0, 1, 0).applyQuaternion(cq).applyQuaternion(qp).normalize();
  axRight.set(1, 0, 0).applyQuaternion(cq).applyQuaternion(qp).normalize();
}
function rotateBy(dx, dy) {
  screenAxes();
  spin.quaternion.premultiply(qq.setFromAxisAngle(axUp, dx));
  spin.quaternion.premultiply(qq.setFromAxisAngle(axRight, dy));
  spin.quaternion.normalize();
}

// ----- اللمس -----
const ptrs = new Map(); let drag = null, pinch = null;
const ray = new THREE.Raycaster(); const touch = $('touch');
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
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now(), dtm = Math.max(8, now - drag.lt);
    drag.x = e.clientX; drag.y = e.clientY; drag.lt = now;
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) { drag.moved = true; setSpin(null); }
    if (drag.moved) {
      const ax = dx * 0.011, ay = dy * 0.011;
      rotateBy(ax, ay);
      vel.x = ax / dtm * 16; vel.y = ay / dtm * 16; // عطالة بعد رفع الإصبع
    }
  }
});
const up = (e) => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0 && drag) {
    if (!drag.moved && performance.now() - drag.t < 400) tap(e.clientX, e.clientY);
    if (performance.now() - drag.lt > 90) vel.x = vel.y = 0;
    drag = null;
  }
};
touch.addEventListener('pointerup', up); touch.addEventListener('pointercancel', up);
function tap(x, y) {
  if (!visible()) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(meshes, false)[0];
  select(hit ? hit.object.userData.part : null);
}

// ----- الأزرار -----
function setSpin(m) { spinMode = m; $('bSpinH').classList.toggle('on', m === 'h'); $('bSpinV').classList.toggle('on', m === 'v'); if (m) vel.x = vel.y = 0; }
$('bSpinH').onclick = () => setSpin(spinMode === 'h' ? null : 'h');
$('bSpinV').onclick = () => setSpin(spinMode === 'v' ? null : 'v');
$('bLabels').onclick = () => { showLabels = !showLabels; $('bLabels').classList.toggle('on', showLabels); };
$('bReset').onclick = () => { if (detached) setDetach(false); resetView(); select(null); };
$('bBack').onclick = () => location.reload();
$('bLock').onclick = () => setDetach(!detached);

// فصل المجسم عن الصفحة: يوضع أمام الكاميرا ويحتفظ باتجاهه؛ وحدات MindAR كبيرة فنضرب بـ unit
function setDetach(on) {
  if (on) {
    if (mode === 'ar') {
      if (!found && !lastUnit) { flashStatus('وجّه الكاميرا نحو الصفحة أولاً'); return; }
      const unit = found ? anchorGroups[active].getWorldScale(ws).x : lastUnit;
      scene.updateMatrixWorld(true);
      const wq = placement.getWorldQuaternion(new THREE.Quaternion());
      scene.add(placement);
      placement.quaternion.copy(wq);
      scaleMul = unit;
      const T = TARGETS[active];
      const rWorld = R_MODEL * T.s * unit;
      const dist = rWorld / (0.42 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(qq));
      placement.position.copy(camera.getWorldPosition(new THREE.Vector3())).addScaledVector(dir, dist);
      $('dim')?.classList.add('on');
    }
    detached = true;
  } else {
    if (mode === 'ar') { anchorGroups[active].add(placement); poseOnPage(); scaleMul = 1; $('dim')?.classList.remove('on'); }
    detached = false;
  }
  $('bLock').classList.toggle('on', detached);
  $('bLock').innerHTML = detached ? '<span>📄</span>أرجعه للصفحة' : '<span>✋</span>افصل المجسم';
  refreshStatus();
}

// ----- الحالة -----
let flashT = 0;
function setStatus(text, ok) { $('stxt').textContent = text; $('status').classList.toggle('ok', !!ok); }
function refreshStatus() {
  if (performance.now() < flashT) return;
  if (mode === 'preview') setStatus(detached ? 'المجسم مفصول — دوّره بحرية' : 'معاينة ثلاثية الأبعاد', true);
  else if (detached) setStatus('✋ المجسم مفصول — تستطيع إبعاد الكاميرا', true);
  else if (found) setStatus('تم التعرف على الصفحة ✓', true);
  else setStatus('وجّه الكاميرا نحو صفحة المتسعة', false);
  $('scan').style.display = mode === 'ar' && !found && !detached ? 'flex' : 'none';
}
function flashStatus(t) { setStatus(t, false); flashT = performance.now() + 1800; setTimeout(refreshStatus, 1850); }
function showHint() { if (hintShown) return; hintShown = true; $('hint').classList.add('show'); setTimeout(() => $('hint').classList.remove('show'), 5000); }

// ----- الحلقة -----
const clock = new THREE.Clock();
const AXY = new THREE.Vector3(0, 1, 0);
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (!drag) {
    if (spinMode === 'h') spin.quaternion.premultiply(qq.setFromAxisAngle(AXY, dt * 0.6));
    else if (spinMode === 'v') { screenAxes(); spin.quaternion.premultiply(qq.setFromAxisAngle(axRight, dt * 0.6)); }
    if (Math.abs(vel.x) + Math.abs(vel.y) > 1e-4) { rotateBy(vel.x, vel.y); vel.x *= 0.93; vel.y *= 0.93; }
  }
  appear = Math.min(1, appear + dt * 1.8);
  const k = appear < 1 ? 1 + 2.2 * Math.pow(appear - 1, 3) + 1.2 * Math.pow(appear - 1, 2) : 1;
  placement.scale.setScalar(TARGETS[active].s * userScale * Math.max(0.001, k) * scaleMul);
  if (found) lastUnit = anchorGroups[active].getWorldScale(ws).x;
  if (selected) for (const m of mats[selected]) m.emissiveIntensity = 0.25 + 0.2 * Math.sin(t * 6);
  renderer.render(scene, camera);
  updateLabels();
}

function enterUI() {
  $('start').style.display = 'none';
  $('top').style.display = 'flex'; $('bar').style.display = 'flex'; $('touch').hidden = false;
}
function fail(text) { $('loading').style.display = 'none'; $('mtxt').innerHTML = text; $('msg').style.display = 'flex'; }

// ----- الكاميرا -----
async function startAR() {
  let framed = false; try { framed = window.top !== window.self; } catch { framed = true; }
  if (framed) return fail('الكاميرا لا تعمل داخل نافذة المعاينة هذه.<br>افتح الصفحة من رابطها المباشر، أو جرّب «المعاينة بدون كاميرا».');
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return fail('الكاميرا تحتاج رابطاً آمناً يبدأ بـ <b>https://</b><br>افتح الصفحة من رابط GitHub Pages أو جرّب «المعاينة بدون كاميرا».');
  mode = 'ar'; $('loading').style.display = 'flex';
  mindar = new MindARThree({
    container: $('ar'), imageTargetSrc: './targets.mind', maxTrack: 1,
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    filterMinCF: 0.0001, filterBeta: 0.01, warmupTolerance: 3, missTolerance: 8,
  });
  ({ renderer, scene, camera } = mindar);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  addLights(scene);
  const addAnchor = (i) => {
    const a = mindar.addAnchor(i); anchorGroups[i] = a.group;
    a.onTargetFound = () => {
      if (!detached && (active !== i || placement.parent !== a.group)) { active = i; a.group.add(placement); poseOnPage(i); }
      if (!found && !detached) appear = 0;
      found = true; refreshStatus(); showHint();
    };
    a.onTargetLost = () => { if (active === i) { found = false; refreshStatus(); } };
  };
  TARGETS.forEach((_, i) => addAnchor(i));
  anchorGroups[0].add(placement);
  try { await mindar.start(); }
  catch (err) { console.error(err); return fail('تعذّر تشغيل الكاميرا 😕<br>اسمح للمتصفح باستخدام الكاميرا ثم أعد المحاولة.'); }
  const dim = document.createElement('div'); dim.id = 'dim'; $('ar').insertBefore(dim, renderer.domElement);
  $('loading').style.display = 'none'; enterUI(); refreshStatus();
  clock.start(); renderer.setAnimationLoop(loop);
}

// ----- المعاينة بدون كاميرا (?preview&page=mulzama|book) -----
function startPreview() {
  mode = 'preview'; $('preview').hidden = false;
  active = Q.get('page') === 'book' ? 1 : 0; poseOnPage(active);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  $('preview').appendChild(renderer.domElement);
  scene = new THREE.Scene(); addLights(scene);
  camera = new THREE.PerspectiveCamera(40, 1, 0.01, 50);
  const T = TARGETS[active];
  const pageG = new THREE.Group(); pageG.rotation.x = -Math.PI / 2; scene.add(pageG); anchorGroups[active] = pageG;
  const tex = new THREE.TextureLoader().load(T.img); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  pageG.add(new THREE.Mesh(new THREE.PlaneGeometry(1, T.h), new THREE.MeshBasicMaterial({ map: tex })));
  pageG.add(placement);
  const fit = () => {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h); camera.aspect = w / h;
    const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const d = Math.max(1.7, 0.62 / Math.tan(hf / 2));
    const target = new THREE.Vector3(T.x, 0.12, -T.y);
    camera.position.copy(target).add(new THREE.Vector3(0, 0.62, 0.78).normalize().multiplyScalar(d));
    camera.lookAt(target); camera.updateProjectionMatrix();
  };
  fit(); addEventListener('resize', fit);
  // في المعاينة "افصل المجسم" يقرّبه نحو الكاميرا
  $('bLock').onclick = () => {
    if (!detached) { scene.attach(placement); detached = true; const dir = new THREE.Vector3(); camera.getWorldDirection(dir); placement.position.copy(camera.position).addScaledVector(dir, 1.0); }
    else { pageG.add(placement); poseOnPage(active); detached = false; }
    $('bLock').classList.toggle('on', detached);
    $('bLock').innerHTML = detached ? '<span>📄</span>أرجعه للصفحة' : '<span>✋</span>افصل المجسم';
    refreshStatus();
  };
  enterUI(); refreshStatus(); appear = 0; showHint();
  clock.start(); renderer.setAnimationLoop(loop);
}

$('goAR').onclick = startAR;
$('go3D').onclick = startPreview;
if (Q.has('preview')) startPreview();
