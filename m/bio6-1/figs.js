// مجسمات أشكال ملزمة الخلية — أثر أكاديمي (كلها مبنية بالكود)
import * as THREE from 'three';
import { buildCell } from '../../cell/cell.js';

export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0, ...o });
const mesh = (g, m) => new THREE.Mesh(g, m);
function lab(parent, t, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); o.userData.label = t; parent.add(o); return o; }

// شكل الكبسولة (للمايتوكوندريا والبكتيريا) كمنحنى دوران حول المحور Y
function capsuleProfile(r, len, n = 24) {
  const pts = []; const h = len / 2 - r;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / n; pts.push(new THREE.Vector2(Math.max(0.0001, r * Math.cos(a)), -h + r * Math.sin(a))); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * i / n; pts.push(new THREE.Vector2(Math.max(0.0001, r * Math.cos(a)), h + r * Math.sin(a))); }
  return pts;
}
function stadiumShape(r, len) { // مقطع مستو للكبسولة في المستوي XY
  const s = new THREE.Shape(); const h = len / 2 - r;
  s.absarc(0, h, r, 0, Math.PI, false); s.absarc(0, -h, r, Math.PI, 2 * Math.PI, false); return s;
}
function ellipseProfile(rx, ry, n = 40) { const p = []; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; p.push(new THREE.Vector2(Math.max(0.0001, rx * Math.cos(a)), ry * Math.sin(a))); } return p; }
function halfLathe(profile, mat) { // نصف مجسم دوراني (الفتحة تواجه +z)
  const g = new THREE.LatheGeometry(profile, 64, Math.PI / 2, Math.PI); // من +x عبر -z إلى -x
  return mesh(g, mat);
}
function bumpy(geo, amp, freq, seed = 1) { // تضاريس خفيفة على السطح
  const p = geo.attributes.position, v = new THREE.Vector3(), r = rng(seed); const ph = [r() * 9, r() * 9, r() * 9];
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * freq + ph[0]) * Math.sin(v.y * freq * 1.3 + ph[1]) * Math.sin(v.z * freq * 0.9 + ph[2]); v.multiplyScalar(1 + amp * n); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}

// ===================== الخلية الحيوانية =====================
export function animal() { const { cell, anchors } = buildCell(); const g = new THREE.Group(); g.add(cell);
  const NM = { membrane: 'الغشاء البلازمي', cytoplasm: 'السايتوبلازم', nucleus: 'النواة', nucleolus: 'النوية', mito: 'المايتوكوندريا', golgi: 'جهاز كولجي', centriole: 'الجسيم المركزي', ribosome: 'رايبوسومات', lysosome: 'الجسيمات الحالة', er: 'الشبكة البلازمية الداخلية' };
  for (const k in anchors) if (NM[k]) anchors[k].userData.label = NM[k]; return { obj: g, rot: [0.42, -Math.PI / 4, 0], dist: 4.4 }; }

// ===================== المايتوكوندريا =====================
function halfDiskPlate(Ri, len, side, th) { // صفيحة عرف: جزء من نصف المقطع الدائري قرب الجدار
  const sh = new THREE.Shape(); const x0 = Ri - len; const n = 20;
  sh.moveTo(x0, 0); sh.lineTo(Ri * 0.999, 0);
  const a0 = 0, a1 = Math.acos(x0 / Ri);
  for (let i = 1; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; sh.lineTo(Ri * Math.cos(a), -Ri * Math.sin(a)); }
  sh.lineTo(x0, -0.0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: th * 0.3, bevelSize: th * 0.35, bevelSegments: 3, curveSegments: 8 });
  geo.rotateX(Math.PI / 2); if (side < 0) geo.scale(-1, 1, 1); geo.computeVertexNormals(); return geo;
}
export function mito() {
  const g = new THREE.Group(); const r = 0.55, L = 2.4, Ri = r * 0.88;
  g.add(halfLathe(capsuleProfile(r, L), M('#ff8a3d', { side: THREE.DoubleSide, roughness: 0.4 })));
  g.add(halfLathe(capsuleProfile(Ri, L - 0.14), M('#ffe0bf', { side: THREE.DoubleSide, roughness: 0.75 })));
  const ring = (rad, len, col) => { const s = stadiumShape(rad, len); const pts = s.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0.004)); return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.022, 8, true), M(col)); };
  g.add(ring(r, L, '#c75a12'), ring(Ri, L - 0.14, '#e8792c'));
  const cm = M('#f07a2a', { side: THREE.DoubleSide, roughness: 0.45 });
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y = -L / 2 + 0.5 + i * (L - 1.0) / (n - 1); const side = i % 2 === 0 ? 1 : -1;
    const len = Ri * (1.05 + 0.25 * Math.sin(i * 2.1));
    const p = mesh(halfDiskPlate(Ri - 0.01, Math.min(len, Ri * 1.4), side, 0.05), cm); p.position.y = y; g.add(p);
  }
  const rr = rng(4); const dm = M('#c75a12');
  for (let i = 0; i < 26; i++) { const s = mesh(new THREE.SphereGeometry(0.025, 10, 8), dm); s.position.set((rr() - 0.5) * Ri * 1.2, (rr() - 0.5) * (L - 0.8), -0.25 - rr() * 0.15); g.add(s); }
  lab(g, 'الغشاء الخارجي', 0.55, -0.75, 0); lab(g, 'الغشاء الداخلي', -0.484, 0.45, 0); lab(g, 'الأعراف', 0.28, 0.5 + 0 * 0, -0.2); lab(g, 'الحشوة', -0.05, -0.15, -0.42);
  g.rotation.z = Math.PI / 2;
  const w = new THREE.Group(); w.add(g); return { obj: w, rot: [0.8, -0.35, 0.1], dist: 4.2 };
}

// ===================== البلاستيدة الخضراء =====================
export function chloro() {
  const g = new THREE.Group(); const rx = 0.62, ry = 1.25;
  g.add(halfLathe(ellipseProfile(rx, ry), M('#2e9e47', { side: THREE.DoubleSide, roughness: 0.4 })));
  g.add(halfLathe(ellipseProfile(rx * 0.92, ry * 0.95), M('#c9ecbd', { side: THREE.DoubleSide, roughness: 0.8 })));
  const sh = new THREE.Shape(); sh.absellipse(0, 0, rx * 0.92, ry * 0.95, 0, Math.PI * 2);
  { const pts = sh.getPoints(96).map((p) => new THREE.Vector3(p.x, p.y, 0.003)); g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 0.022, 8, true), M('#1f7a33'))); }
  // البذيرات (الكرانا): أكوام أقراص
  const disc = new THREE.CylinderGeometry(0.15, 0.15, 0.045, 32); const dm = M('#1f7a33', { roughness: 0.35 }); const dm2 = M('#33a34b', { roughness: 0.35 });
  const lam = M('#2b8f40');
  const spots = [[-0.28, 0.75], [0.22, 0.55], [-0.25, 0.25], [0.25, -0.05], [-0.22, -0.4], [0.2, -0.65], [0, 0.05]];
  spots.forEach(([x, y], k) => {
    const st = new THREE.Group(); const n = 6 + (k % 3);
    for (let i = 0; i < n; i++) { const d = mesh(disc, i % 2 ? dm : dm2); d.position.y = i * 0.052; st.add(d); }
    st.rotation.x = Math.PI / 2; st.position.set(x, y, -0.02); // الأكوام تمتد نحو -z داخل النصف
    st.rotation.set(Math.PI / 2, 0, 0); st.position.z = -0.0;
    const holder = new THREE.Group(); holder.add(st); st.position.set(x, y, -0.03); st.rotation.x = -Math.PI / 2; g.add(holder);
  });
  // الصفائح الواصلة
  for (let i = 0; i < spots.length - 1; i++) {
    const a = new THREE.Vector3(spots[i][0], spots[i][1], -0.12), b = new THREE.Vector3(spots[i + 1][0], spots[i + 1][1], -0.16);
    const c = new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 4, 0.018, 8); g.add(mesh(c, lam));
  }
  lab(g, 'الغشاء المزدوج', 0.62, 0.3, 0); lab(g, 'البذيرة (الكرانوم)', 0.22, 0.55, -0.05); lab(g, 'السدى (الحشوة)', 0.05, -0.95, -0.35); lab(g, 'صفائح واصلة', -0.03, 0.65, -0.14);
  g.rotation.z = Math.PI / 2;
  const w = new THREE.Group(); w.add(g); return { obj: w, rot: [0.85, -0.3, 0.1], dist: 4.0 };
}

// ===================== جهاز كولجي =====================
function bend(geo, k) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) + k * (x * x + z * z * 0.6)); } geo.computeVertexNormals(); return geo; }
export function golgi() {
  const g = new THREE.Group(); const m1 = M('#f2c230', { roughness: 0.35 }); const m2 = M('#e3a90a', { roughness: 0.35 });
  for (let i = 0; i < 6; i++) {
    const R = 1.05 - Math.abs(i - 2.5) * 0.1; const k = 0.28;
    const c = new THREE.CylinderGeometry(R, R, 0.07, 80, 1); c.scale(1, 1, 0.62); bend(c, k);
    const s = mesh(c, i % 2 ? m1 : m2); s.position.y = i * 0.17; g.add(s);
    const t = new THREE.TorusGeometry(R, 0.06, 12, 96); t.rotateX(Math.PI / 2); t.scale(1, 1, 0.62); bend(t, k);
    const rim = mesh(t, m2); rim.position.y = i * 0.17; g.add(rim);
  }
  const rr = rng(9); const vm = M('#ffd54f', { roughness: 0.3 });
  for (let i = 0; i < 16; i++) { const a = rr() * Math.PI * 2; const d = 1.2 + rr() * 0.45; const s = mesh(new THREE.SphereGeometry(0.07 + rr() * 0.07, 20, 14), vm); s.position.set(Math.cos(a) * d, 0.25 + rr() * 1.0 + 0.28 * d * d * 0.6, Math.sin(a) * d * 0.62); g.add(s); }
  lab(g, 'صهريج (كيس مسطح)', 0.8, 5 * 0.17 + 0.18, 0); lab(g, 'حويصلات', Math.cos(0.3) * 1.45, 0.9, Math.sin(0.3) * 0.9);
  g.position.y = -0.75; const w = new THREE.Group(); w.add(g); return { obj: w, rot: [0.5, 0.35, 0], dist: 4.8 };
}

// ===================== النواة =====================
export function nucleus() {
  const g = new THREE.Group(); const wedge = new THREE.Group(); wedge.rotation.y = Math.PI; g.add(wedge);
  const shell = mesh(new THREE.SphereGeometry(1, 96, 64, 0, Math.PI * 1.5), M('#7b3fa0', { roughness: 0.35 })); wedge.add(shell);
  const inner = mesh(new THREE.SphereGeometry(0.93, 96, 64, 0, Math.PI * 1.5), M('#b07ad0', { side: THREE.BackSide })); wedge.add(inner);
  const cut = M('#d9bdeb', { side: THREE.DoubleSide, roughness: 0.8 });
  const half = new THREE.CircleGeometry(0.93, 72, Math.PI / 2, Math.PI);
  const fA = mesh(half, cut), fB = mesh(half, cut); fB.rotation.y = -Math.PI / 2; wedge.add(fA, fB);
  const em = M('#5b2580');
  for (const r of [0, -Math.PI / 2]) { const t = mesh(new THREE.TorusGeometry(0.965, 0.035, 10, 80, Math.PI), em); t.rotation.z = Math.PI / 2; const gg = new THREE.Group(); gg.add(t); gg.rotation.y = r; wedge.add(gg); }
  // الثقوب النووية
  const pm = M('#f1e1fa', { roughness: 0.3 }); const rr = rng(12);
  for (let i = 0; i < 70; i++) {
    const u = rr() * 2 - 1, a = rr() * Math.PI * 2; const v = new THREE.Vector3(Math.sqrt(1 - u * u) * Math.cos(a), u, Math.sqrt(1 - u * u) * Math.sin(a));
    if (v.x > 0.05 && v.z > 0.05) continue; // داخل الجزء المقطوع
    const t = mesh(new THREE.TorusGeometry(0.045, 0.016, 8, 20), pm); t.position.copy(v.multiplyScalar(1.0)); t.lookAt(v.clone().multiplyScalar(2)); g.add(t);
  }
  // النوية
  const nl = mesh(bumpy(new THREE.SphereGeometry(0.3, 48, 32), 0.06, 9, 3), M('#2d0f45', { roughness: 0.6 })); nl.position.set(0.18, 0.05, 0.18); g.add(nl);
  // الشبكة الكروماتينية على وجهي المقطع
  const chm = M('#4b1d6b', { roughness: 0.5 });
  for (let k = 0; k < 14; k++) {
    const onX = k % 2 === 0; const pts = []; let u = 0.15 + rr() * 0.6, v = (rr() - 0.5) * 1.3;
    for (let i = 0; i < 8; i++) { if (u * u + v * v < 0.82) pts.push(onX ? new THREE.Vector3(0.015, v, u) : new THREE.Vector3(u, v, 0.015)); u = Math.min(0.85, Math.max(0.05, u + (rr() - 0.5) * 0.3)); v += (rr() - 0.5) * 0.3; }
    if (pts.length > 2) g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.02, 8), chm));
  }
  lab(g, 'الغلاف النووي', -0.55, 0.45, 0.7); lab(g, 'ثقوب نووية', -0.2, 0.75, 0.63); lab(g, 'النوية', 0.18, 0.12, 0.2); lab(g, 'البلازم النووي', 0.015, -0.55, 0.45); lab(g, 'الشبكة الكروماتينية', 0.5, 0.2, 0.015);
  return { obj: g, rot: [0.35, -Math.PI / 4, 0], dist: 4.0 };
}

// ===================== الكروموسوم =====================
export function chromosome() {
  const g = new THREE.Group(); const m = M('#3f5bd8', { roughness: 0.55 }); const m2 = M('#5a76ea', { roughness: 0.55 });
  const arm = (ang, len, mat, seed) => {
    const geo = bumpy(new THREE.CapsuleGeometry(0.22, len, 16, 48), 0.07, 22, seed);
    const a = mesh(geo, mat); a.position.y = len / 2 + 0.05; const h = new THREE.Group(); h.add(a); h.rotation.z = ang; return h;
  };
  // كروماتيدان شقيقان، كل واحد له ذراعان
  const c1 = new THREE.Group(); c1.add(arm(0.32, 1.25, m, 1), arm(Math.PI - 0.28, 0.85, m, 2));
  const c2 = new THREE.Group(); c2.add(arm(-0.32, 1.25, m2, 3), arm(Math.PI + 0.28, 0.85, m2, 4));
  c1.position.x = -0.02; c2.position.x = 0.02;
  g.add(c1, c2);
  const cen = mesh(new THREE.SphereGeometry(0.2, 32, 24), M('#e05b7a', { roughness: 0.4 })); cen.scale.set(1.6, 1, 1); g.add(cen);
  lab(g, 'كروماتيد', -0.44, 1.3, 0.1); lab(g, 'كروماتيد شقيق', 0.44, 1.3, 0.1); lab(g, 'القطعة المركزية', 0, 0, 0.25);
  g.position.y = -0.2; return { obj: g, rot: [0.25, 0.5, 0], dist: 5.2 };
}

// ===================== الجسيم المركزي =====================
function centrioleMesh(mat) {
  const g = new THREE.Group(); const tube = new THREE.CylinderGeometry(0.036, 0.036, 1.0, 14);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    for (let j = 0; j < 3; j++) {
      const r = 0.5; const off = (j - 1) * 0.078;
      const t = mesh(tube, mat); const ax = a + 0.0; const px = Math.cos(ax) * r + Math.cos(ax + Math.PI / 2 - 0.55) * off, pz = Math.sin(ax) * r + Math.sin(ax + Math.PI / 2 - 0.55) * off;
      t.position.set(px, 0, pz); g.add(t);
    }
  }
  const sl = mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.0, 48, 1, true), M('#f7c5d2', { transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })); g.add(sl);
  return g;
}
export function centrosome() {
  const g = new THREE.Group(); const a = centrioleMesh(M('#e05b7a', { roughness: 0.4 })); const b = centrioleMesh(M('#b83a5b', { roughness: 0.4 }));
  a.position.set(-0.6, 0, 0); b.rotation.z = Math.PI / 2; b.position.set(0.75, -0.2, 0.1); g.add(a, b); lab(g, 'مريكز', -0.6, 0.5, 0.5); lab(g, 'مريكز (متعامد)', 1.2, -0.2, 0.55); lab(g, 'مجموعة ثلاثية من النبيبات', -1.1, 0.4, 0.0);
  return { obj: g, rot: [0.95, 0.35, 0], dist: 4.4 };
}

// ===================== الغشاء البلازمي =====================
export function membrane() {
  const g = new THREE.Group(); const head = new THREE.SphereGeometry(0.075, 16, 12); const tail = new THREE.CylinderGeometry(0.016, 0.016, 0.28, 6);
  const hm = M('#e2557f', { roughness: 0.35 }); const tm = M('#f5d36b', { roughness: 0.6 });
  const N = 18, sp = 0.17, rr = rng(5);
  const holes = [[-0.45, 0.2, 0.42], [0.65, -0.45, 0.35], [0.1, 0.75, 0.22]];
  const inHole = (x, z) => holes.some(([hx, hz, r]) => Math.hypot(x - hx, z - hz) < r);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = (i - N / 2) * sp + (j % 2) * sp / 2, z = (j - N / 2) * sp * 0.9;
    if (inHole(x, z)) continue;
    for (const side of [1, -1]) {
      const h = mesh(head, hm); h.position.set(x, side * 0.42, z); g.add(h);
      for (const dx of [-0.025, 0.025]) { const t = mesh(tail, tm); t.position.set(x + dx, side * 0.22, z); t.rotation.z = (rr() - 0.5) * 0.25; g.add(t); }
    }
  }
  // البروتينات الناقلة (تعبر الغشاء)
  const pm = [M('#3b8fd6', { roughness: 0.45 }), M('#7b3fa0', { roughness: 0.45 }), M('#2fb38a', { roughness: 0.45 })];
  holes.forEach(([x, z, r], k) => {
    const geo = bumpy(new THREE.SphereGeometry(r * 0.95, 48, 32), 0.08, 7, k + 2); geo.scale(1, 1.75 + k * 0.1, 1);
    const p = mesh(geo, pm[k]); p.position.set(x, k === 2 ? 0.28 : 0, z); g.add(p);
    if (k === 0) { const ch = mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 24, 1, true), M('#1f5f9e', { side: THREE.DoubleSide })); ch.position.set(x, 0, z); g.add(ch); }
  });
  lab(g, 'رأس محب للماء', 1.105, 0.47, 1.07); lab(g, 'ذيل نافر للماء', 1.33, 0.22, 1.07); lab(g, 'بروتين ناقل', -0.45, 0.62, 0.2); lab(g, 'بروتين', 0.65, 0.6, -0.45); lab(g, 'طبقتا الدهون المفسفرة', -1.5, -0.42, 1.2);
  return { obj: g, rot: [0.3, -0.5, 0], dist: 4.6 };
}

// ===================== الخلية البكتيرية =====================
export function bacteria() {
  const g = new THREE.Group(); const r = 0.55, L = 2.6;
  g.add(halfLathe(capsuleProfile(r, L), M('#4caf50', { side: THREE.DoubleSide, roughness: 0.45 }))); // الجدار
  g.add(halfLathe(capsuleProfile(r * 0.9, L - 0.1), M('#e2557f', { side: THREE.DoubleSide, roughness: 0.4 }))); // الغشاء البلازمي
  const face = mesh(new THREE.ShapeGeometry(stadiumShape(r * 0.9, L - 0.1), 32), M('#fde3ec', { side: THREE.DoubleSide, roughness: 0.85 })); face.position.z = 0.002; g.add(face);
  // حافتا المقطع
  const ring = (rad, len, col) => { const s = stadiumShape(rad, len); const pts = s.getPoints(64).map((p) => new THREE.Vector3(p.x, p.y, 0.004)); return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 128, 0.02, 8, true), M(col)); };
  g.add(ring(r, L, '#2e7d32'), ring(r * 0.9, L - 0.1, '#b81e52'));
  // المنطقة النووية (DNA ملتف)
  const rr = rng(21); const pts = []; for (let i = 0; i < 40; i++) pts.push(new THREE.Vector3((rr() - 0.5) * 0.5, (rr() - 0.5) * 1.1, 0.03 + rr() * 0.05));
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.016, 6), M('#7b3fa0', { roughness: 0.5 })));
  // الرايبوسومات
  const rm = M('#1b2a49'); for (let i = 0; i < 70; i++) { const s = mesh(new THREE.SphereGeometry(0.03, 10, 8), rm); const y = (rr() - 0.5) * (L - 0.5), x = (rr() - 0.5) * 0.85; if (Math.abs(x) < 0.3 && Math.abs(y) < 0.6) continue; s.position.set(x, y, 0.03); g.add(s); }
  // السوط
  const fl = []; for (let i = 0; i <= 120; i++) { const t = i / 120; fl.push(new THREE.Vector3(Math.sin(t * 12) * 0.16 * Math.min(1, t * 3), L / 2 - 0.05 + t * 1.3, Math.cos(t * 12) * 0.16 * Math.min(1, t * 3) - 0.16)); }
  g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fl), 300, 0.035, 10), M('#8d6e63', { roughness: 0.6 })));
  // الأهداب
  const pmat = M('#8bc34a'); for (let i = 0; i < 26; i++) { const a = Math.PI / 2 + rr() * Math.PI; const y = (rr() - 0.5) * (L - 0.6); const p = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 6), pmat); const n = new THREE.Vector3(Math.cos(a), 0, Math.sin(a) * -1); p.position.set(n.x * (r + 0.13), y, -Math.abs(n.z) * (r + 0.13)); p.lookAt(p.position.clone().add(new THREE.Vector3(n.x, 0, -Math.abs(n.z)))); p.rotateX(Math.PI / 2); g.add(p); }
  lab(g, 'جدار الخلية', 0.55, 0.55, 0); lab(g, 'الغشاء البلازمي', -0.495, -0.55, 0); lab(g, 'المنطقة النووية (DNA)', 0.05, 0.1, 0.08); lab(g, 'رايبوسومات', 0.3, -0.95, 0.04); lab(g, 'سوط', 0.1, 2.3, -0.1); lab(g, 'أهداب', -0.62, 0.3, -0.25);
  g.rotation.z = Math.PI / 2 * 0.86; g.position.x = 0.5;
  const w = new THREE.Group(); w.add(g); return { obj: w, rot: [0.7, -0.25, 0], dist: 5.6 };
}

// ===================== الخلية النباتية =====================
export function plant() {
  const g = new THREE.Group(); const W = 2.2, H = 1.5, D = 1.4, t = 0.08;
  const wall = M('#5fb83a', { roughness: 0.55 }); const mem = M('#e2557f', { roughness: 0.4 });
  // الجدار: صندوق مفتوح من الأمام والأعلى جزئياً
  const box = (w, h, d, x, y, z, m) => { const b = mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(W, H, t, 0, 0, -D / 2, wall); box(t, H, D, -W / 2, 0, 0, wall); box(t, H, D, W / 2, 0, 0, wall); box(W, t, D, 0, -H / 2, 0, wall);
  const iw = W - 2 * t, ih = H - 2 * t, id = D - t;
  box(iw, ih, 0.025, 0, 0, -D / 2 + t / 2 + 0.02, mem); box(0.025, ih, id, -W / 2 + t / 2 + 0.02, 0, t / 2, mem); box(0.025, ih, id, W / 2 - t / 2 - 0.02, 0, t / 2, mem); box(iw, 0.025, id, 0, -H / 2 + t / 2 + 0.02, t / 2, mem);
  box(iw - 0.05, 0.02, id - 0.02, 0, -H / 2 + t / 2 + 0.035, t / 2, M('#c9f0b8', { roughness: 0.9 })); // أرضية السايتوبلازم
  // الفجوة العصارية الكبيرة
  const vac = mesh(bumpy(new THREE.SphereGeometry(0.5, 48, 32), 0.05, 4, 7), M('#8fd3f0', { roughness: 0.15, transparent: true, opacity: 0.8 })); vac.scale.set(1.45, 0.95, 0.85); vac.position.set(0.25, 0.0, -0.05); g.add(vac);
  // النواة مدفوعة إلى الجانب
  const nu = mesh(new THREE.SphereGeometry(0.24, 40, 30), M('#7b3fa0', { roughness: 0.35 })); nu.position.set(-0.72, 0.18, 0.05); g.add(nu);
  const nl = mesh(new THREE.SphereGeometry(0.08, 20, 16), M('#2d0f45')); nl.position.set(-0.68, 0.22, 0.27); g.add(nl);
  // البلاستيدات الخضراء
  const cm = M('#2e9e47', { roughness: 0.4 }); const rr = rng(33);
  const spots = [[-0.85, -0.45, -0.35], [-0.35, 0.5, -0.5], [0.55, 0.52, -0.45], [0.9, -0.42, 0.1], [-0.3, -0.5, 0.35], [0.95, 0.4, 0.35], [-0.9, 0.5, -0.4], [0.2, -0.52, -0.5], [-0.95, -0.2, 0.45]];
  spots.forEach(([x, y, z], k) => { const c = mesh(new THREE.SphereGeometry(0.13, 28, 20), cm); c.scale.set(1.5, 0.75, 0.9); c.position.set(x, y, z); c.rotation.set(rr() * 3, rr() * 3, rr() * 3); g.add(c);
    const gr = mesh(new THREE.SphereGeometry(0.05, 12, 10), M('#1b6b2c')); gr.position.copy(c.position).add(new THREE.Vector3(0.03, 0.06, 0.06)); g.add(gr); });
  // مايتوكوندريا صغيرة
  const mm = M('#ff8a3d'); [[-0.5, -0.1, 0.4], [0.75, 0.0, 0.45], [-0.15, 0.55, 0.25]].forEach(([x, y, z], k) => { const m = mesh(new THREE.CapsuleGeometry(0.06, 0.18, 8, 16), mm); m.position.set(x, y, z); m.rotation.set(k, k * 1.3, 1.2); g.add(m); });
  // جهاز كولجي (الدكتيوسوم)
  const gm = M('#f2c230', { roughness: 0.35 }); for (let i = 0; i < 4; i++) { const p = mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24, Math.PI * 0.9), gm); p.position.set(-0.45, -0.35 + i * 0.06, 0.15); p.rotation.set(Math.PI / 2, 0, 0.3); g.add(p); }
  lab(g, 'جدار الخلية', 1.1, 0.55, 0.4); lab(g, 'الغشاء البلازمي', -1.03, 0.55, -0.1); lab(g, 'الفجوة العصارية', 0.25, 0.42, 0.1); lab(g, 'بلاستيدة خضراء', 0.55, 0.6, -0.45); lab(g, 'النواة', -0.72, 0.42, 0.05); lab(g, 'السايتوبلازم', 0.1, -0.64, 0.5); lab(g, 'الدكتيوسوم', -0.45, -0.18, 0.15); lab(g, 'مايتوكوندريا', 0.75, 0.05, 0.5);
  return { obj: g, rot: [0.5, -0.55, 0], dist: 4.6 };
}

// ===================== الشبكة البلازمية الداخلية =====================
export function er() {
  const g = new THREE.Group(); const rr = rng(44);
  const sm = M('#3b8fd6', { roughness: 0.35, side: THREE.DoubleSide }); const rm = M('#1b2a49', { roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.BoxGeometry(2.0, 0.07, 1.1, 80, 1, 30); const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k), z = p.getZ(k); p.setY(k, p.getY(k) + 0.12 * Math.sin(x * 3.2 + i * 0.7) + 0.05 * Math.sin(z * 4)); }
    geo.computeVertexNormals(); const sh = mesh(geo, sm); sh.position.set(-0.6, i * 0.3, 0); g.add(sh);
    for (let k = 0; k < 110; k++) { const x = (rr() - 0.5) * 1.9, z = (rr() - 0.5) * 1.0; const side = rr() > 0.5 ? 1 : -1; const y = i * 0.3 + 0.12 * Math.sin(x * 3.2 + i * 0.7) + 0.05 * Math.sin(z * 4) + side * 0.06; const b = mesh(new THREE.SphereGeometry(0.03, 10, 8), rm); b.position.set(-0.6 + x, y, z); g.add(b); }
  }
  const tm = M('#8cc8f5', { roughness: 0.3 });
  for (let k = 0; k < 7; k++) { const pts = []; let p = new THREE.Vector3(0.45, -0.05 + k * 0.11, -0.45 + rr() * 0.9); for (let i = 0; i < 6; i++) { pts.push(p.clone()); p.add(new THREE.Vector3(0.16 + rr() * 0.1, (rr() - 0.5) * 0.22, (rr() - 0.5) * 0.3)); } g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 12), tm)); }
  lab(g, 'شبكة خشنة (عليها رايبوسومات)', -1.0, 0.75, 0.2); lab(g, 'شبكة ملساء', 1.05, 0.3, 0.1);
  return { obj: g, rot: [0.5, -0.4, 0], dist: 4.4 };
}

// ===================== أطوار الانقسام =====================
function cellShell(sx = 1, col = '#f6b8cb') { return mesh(new THREE.SphereGeometry(1, 64, 48), M(col, { transparent: true, opacity: 0.32, roughness: 0.2, depthWrite: false })); }
function xchrom(col, s = 0.22) { // كروموسوم مضاعف صغير بشكل X
  const g = new THREE.Group(); const m = M(col, { roughness: 0.5 });
  for (const a of [0.35, -0.35, Math.PI - 0.3, Math.PI + 0.3]) { const c = mesh(new THREE.CapsuleGeometry(0.035, a > 1 ? 0.13 : 0.2, 6, 12), m); c.position.y = (a > 1 ? 0.13 : 0.2) / 2 + 0.03; const h = new THREE.Group(); h.add(c); h.rotation.z = a; g.add(h); }
  g.scale.setScalar(s / 0.22); return g;
}
function vchrom(col, up) { const g = new THREE.Group(); const m = M(col, { roughness: 0.5 }); for (const a of [0.45, -0.45]) { const c = mesh(new THREE.CapsuleGeometry(0.035, 0.2, 6, 12), m); c.position.y = 0.13; const h = new THREE.Group(); h.add(c); h.rotation.z = a + (up ? Math.PI : 0); g.add(h); } return g; }
const CC = ['#3f5bd8', '#e2557f', '#2fb38a', '#ff8a3d'];
function spindle(g, pA, pB, targets) { const fm = M('#9aa4b5', { roughness: 0.6 }); for (const t of targets) for (const p of [pA, pB]) { if (!p) continue; g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p, t), 2, 0.008, 5), fm)); } }
function pole(g, p) { const c = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 12), M('#e05b7a')); c.position.copy(p); g.add(c); const c2 = c.clone(); c2.rotation.z = Math.PI / 2; g.add(c2); const am = M('#c9b2c0'); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; const d = new THREE.Vector3(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0); g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(p, p.clone().add(d)), 2, 0.006, 4), am)); } }

export function interphase() {
  const g = new THREE.Group(); g.add(cellShell()); const n = mesh(new THREE.SphereGeometry(0.45, 48, 32), M('#b07ad0', { transparent: true, opacity: 0.55, depthWrite: false })); g.add(n);
  const rr = rng(3); const chm = M('#4b1d6b');
  for (let k = 0; k < 7; k++) { const pts = []; let p = new THREE.Vector3((rr() - .5) * .4, (rr() - .5) * .4, (rr() - .5) * .4); for (let i = 0; i < 8; i++) { pts.push(p.clone()); p.add(new THREE.Vector3((rr() - .5) * .25, (rr() - .5) * .25, (rr() - .5) * .25)); p.clampLength(0, 0.36); } g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 50, 0.012, 6), chm)); }
  const nl = mesh(new THREE.SphereGeometry(0.11, 24, 16), M('#2d0f45')); nl.position.set(0.12, 0.1, 0.1); g.add(nl);
  pole(g, new THREE.Vector3(0.62, 0.45, 0.2));
  return { obj: g, rot: [0.2, 0.3, 0], dist: 3.6 };
}
export function prophase() {
  const g = new THREE.Group(); g.add(cellShell()); const n = mesh(new THREE.SphereGeometry(0.5, 48, 32), M('#d9bdeb', { transparent: true, opacity: 0.25, depthWrite: false })); g.add(n);
  const rr = rng(7); for (let i = 0; i < 4; i++) { const c = xchrom(CC[i]); c.position.set((rr() - .5) * .55, (rr() - .5) * .55, (rr() - .5) * .3); c.rotation.set(rr() * 3, rr() * 3, rr() * 3); g.add(c); }
  pole(g, new THREE.Vector3(-0.55, 0.62, 0)); pole(g, new THREE.Vector3(0.55, 0.62, 0)); return { obj: g, rot: [0.15, 0.25, 0], dist: 3.6 };
}
export function metaphase() {
  const g = new THREE.Group(); g.add(cellShell()); const A = new THREE.Vector3(-0.82, 0, 0), B = new THREE.Vector3(0.82, 0, 0); const ts = [];
  for (let i = 0; i < 4; i++) { const c = xchrom(CC[i]); c.position.set(0, (i - 1.5) * 0.27, (i % 2 ? .1 : -.1)); c.rotation.z = Math.PI / 2; g.add(c); ts.push(c.position.clone()); }
  spindle(g, A, B, ts); pole(g, A); pole(g, B); lab(g, 'الجسيم المركزي', -0.82, 0.05, 0); lab(g, 'خيوط المغزل', -0.45, 0.2, 0.0); lab(g, 'كروموسوم على خط الاستواء', 0.05, 0.42, 0.1); return { obj: g, rot: [0.15, 0.3, 0], dist: 3.6 };
}
export function anaphase() {
  const g = new THREE.Group(); g.add(cellShell()); g.children[0].scale.set(1.12, 0.95, 0.95); const A = new THREE.Vector3(-0.92, 0, 0), B = new THREE.Vector3(0.92, 0, 0); const ts = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { const c = vchrom(CC[i], false); c.position.set(s * 0.42, (i - 1.5) * 0.22, (i % 2 ? .08 : -.08)); c.rotation.z = s * Math.PI / 2; g.add(c); ts.push(c.position.clone()); }
  const fm = M('#9aa4b5'); for (const t of ts) g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(t.x < 0 ? A : B, t), 2, 0.008, 5), fm));
  pole(g, A); pole(g, B); return { obj: g, rot: [0.15, 0.3, 0], dist: 3.8 };
}
export function telophase() {
  const g = new THREE.Group(); const m = M('#f6b8cb', { transparent: true, opacity: 0.32, depthWrite: false, roughness: 0.2 });
  for (const s of [-1, 1]) { const c = mesh(new THREE.SphereGeometry(0.72, 64, 48), m); c.position.x = s * 0.6; g.add(c); const n = mesh(new THREE.SphereGeometry(0.3, 40, 30), M('#b07ad0', { transparent: true, opacity: 0.6, depthWrite: false })); n.position.x = s * 0.72; g.add(n);
    const rr = rng(s + 5); const chm = M('#4b1d6b'); for (let k = 0; k < 4; k++) { const pts = []; let p = new THREE.Vector3(s * .72 + (rr() - .5) * .2, (rr() - .5) * .2, (rr() - .5) * .2); for (let i = 0; i < 6; i++) { pts.push(p.clone()); p.add(new THREE.Vector3((rr() - .5) * .15, (rr() - .5) * .15, (rr() - .5) * .15)); } g.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.012, 6), chm)); } }
  const ring = mesh(new THREE.TorusGeometry(0.5, 0.05, 16, 64), M('#e2557f', { roughness: 0.35 })); ring.rotation.y = Math.PI / 2; g.add(ring);
  return { obj: g, rot: [0.15, 0.3, 0], dist: 3.9 };
}
// الطور الاستوائي الأول في الاختزالي: رباعيات على خط الاستواء
export function metaphase1() {
  const g = new THREE.Group(); g.add(cellShell()); const A = new THREE.Vector3(-0.82, 0, 0), B = new THREE.Vector3(0.82, 0, 0); const ts = [];
  for (let i = 0; i < 2; i++) for (const s of [-1, 1]) { const c = xchrom(CC[i * 2 + (s > 0 ? 1 : 0)] , 0.2); c.position.set(s * 0.13, (i - 0.5) * 0.42, 0); c.rotation.z = Math.PI / 2; g.add(c); ts.push(c.position.clone()); }
  const fm = M('#9aa4b5'); for (const t of ts) g.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(t.x < 0 ? A : B, t), 2, 0.008, 5), fm));
  pole(g, A); pole(g, B); return { obj: g, rot: [0.15, 0.3, 0], dist: 3.6 };
}

// ===================== كريات الدم الحمر في المحاليل =====================
function rbcProfile(k = 1) { const p = []; for (let i = 0; i <= 40; i++) { const r = i / 40; const R = 0.8 * r; const tth = 0.035 + 0.36 * (0.08 + 2.3 * r * r - 1.7 * r ** 4) * Math.sqrt(Math.max(0, 1 - r * r)); p.push(new THREE.Vector2(R, tth * k)); } for (let i = 40; i >= 0; i--) { const r = i / 40; const tth = 0.035 + 0.36 * (0.08 + 2.3 * r * r - 1.7 * r ** 4) * Math.sqrt(Math.max(0, 1 - r * r)); p.push(new THREE.Vector2(0.8 * r, -tth * k)); } return p; }
export function rbc_iso() { const c = mesh(new THREE.LatheGeometry(rbcProfile(), 96), M('#d63a3a', { roughness: 0.35 })); const g = new THREE.Group(); g.add(c); return { obj: g, rot: [0.85, 0, 0.25], dist: 3.2 }; }
export function rbc_hypo() { const c = mesh(bumpy(new THREE.SphereGeometry(0.66, 64, 48), 0.01, 5, 2), M('#e05050', { roughness: 0.3 })); const g = new THREE.Group(); g.add(c); return { obj: g, rot: [1.0, 0, 0.2], dist: 3.2 }; }
export function rbc_hyper() { const geo = new THREE.LatheGeometry(rbcProfile(0.7), 96); const p = geo.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x); const r = Math.hypot(v.x, v.z); const f = 0.78 * (1 + 0.1 * Math.max(0, Math.sin(a * 11))); p.setXYZ(i, v.x * f, v.y, v.z * f); } geo.computeVertexNormals(); const c = mesh(geo, M('#a92424', { roughness: 0.45 })); const g = new THREE.Group(); g.add(c); return { obj: g, rot: [1.0, 0, 0.2], dist: 3.2 }; }

export const ALL = { animal, plant, bacteria, membrane, mito, chloro, golgi, er, nucleus, chromosome, centrosome, interphase, prophase, metaphase, anaphase, telophase, metaphase1, rbc_iso, rbc_hypo, rbc_hyper };
