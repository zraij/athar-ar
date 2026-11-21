// أشكال ملزمة المتسعات — كل شكل مجسم three.js مبني بالكود
// كل دالة ترجع {obj, rot, view} ; view = اتجاه الكاميرا (من أين ننظر)
import * as THREE from 'three';

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.45, metalness: o.m ?? 0.15, transparent: o.t != null, opacity: o.t ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: o.dw ?? true, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 0 });
export const COL = { pos: 0xd8453a, neg: 0x2f6fc0, plate: 0xb9c2cc, gold: 0xe0a526, field: 0xf0a020, wire: 0x8a5a2b, dark: 0x2a3340, die: 0xf3c97a, green: 0x2e9d6a };

export function lab(parent, text, x, y, z) {
  const o = new THREE.Object3D(); o.position.set(x, y, z); o.userData.label = text; parent.add(o); return o;
}
function mesh(g, m, x = 0, y = 0, z = 0, p) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); if (p) p.add(o); return o; }

// إشارة + أو − ثلاثية الأبعاد تواجه +z
function sign(parent, kind, x, y, z, s = 0.16, col) {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const m = M(col ?? (kind === '+' ? COL.pos : COL.neg), { r: 0.3, e: col ?? (kind === '+' ? COL.pos : COL.neg), ei: 0.25 });
  mesh(new THREE.BoxGeometry(s, s * 0.28, s * 0.28), m, 0, 0, 0, g);
  if (kind === '+') mesh(new THREE.BoxGeometry(s * 0.28, s, s * 0.28), m, 0, 0, 0, g);
  parent.add(g); return g;
}
// سهم من a إلى b
export function arrow(parent, a, b, col = COL.field, r = 0.035) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A); const L = dir.length(); dir.normalize();
  const g = new THREE.Group(); const m = M(col, { r: 0.35, e: col, ei: 0.2 });
  const hl = Math.min(r * 6, L * 0.4);
  mesh(new THREE.CylinderGeometry(r, r, L - hl, 14), m, 0, (L - hl) / 2, 0, g);
  mesh(new THREE.ConeGeometry(r * 2.6, hl, 18), m, 0, L - hl / 2, 0, g);
  g.position.copy(A); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  parent.add(g); return g;
}
// سلك على مسار نقاط بزوايا مستديرة
export function wire(parent, pts, col = COL.wire, r = 0.04) {
  const P = pts.map(p => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  for (let i = 0; i < P.length - 1; i++) path.add(new THREE.LineCurve3(P[i], P[i + 1]));
  const g = new THREE.TubeGeometry(path, 40 * (P.length - 1), r, 10, false);
  const m = mesh(g, M(col, { m: 0.6, r: 0.35 }), 0, 0, 0, parent);
  for (const p of P) mesh(new THREE.SphereGeometry(r, 12, 10), M(col, { m: 0.6, r: 0.35 }), p.x, p.y, p.z, parent);
  return m;
}
// بطارية أفقية (المحور x) ; القطب الموجب نحو +x
export function battery(parent, x, y, z, len = 1.3, rad = 0.32, axis = 'x') {
  const g = new THREE.Group(); g.position.set(x, y, z);
  const body = mesh(new THREE.CylinderGeometry(rad, rad, len * 0.62, 32), M(0x22262c, { r: 0.4, m: 0.3 }), 0, -len * 0.19, 0, g);
  mesh(new THREE.CylinderGeometry(rad * 1.002, rad * 1.002, len * 0.38, 32), M(COL.gold, { r: 0.3, m: 0.5 }), 0, len * 0.31, 0, g);
  mesh(new THREE.CylinderGeometry(rad * 0.3, rad * 0.3, 0.1, 20), M(0xcfd5db, { m: 0.8, r: 0.2 }), 0, len / 2 + 0.05, 0, g);
  mesh(new THREE.CylinderGeometry(rad * 0.75, rad * 0.75, 0.03, 24), M(0xcfd5db, { m: 0.8, r: 0.2 }), 0, -len / 2 - 0.015, 0, g);
  const sg = new THREE.Group(); sg.position.set(0, len * 0.25, rad + 0.01); g.add(sg); sign(sg, '+', 0, 0, 0, 0.18, 0x22262c);
  const sg2 = new THREE.Group(); sg2.position.set(0, -len * 0.3, rad + 0.01); g.add(sg2); sign(sg2, '-', 0, 0, 0, 0.18, 0xffffff);
  if (axis === 'x') g.rotation.z = -Math.PI / 2;
  parent.add(g); return g;
}
// صفيحة: صندوق رقيق
function plate(parent, w, dpt, y, col, th = 0.1) {
  return mesh(new THREE.BoxGeometry(w, th, dpt), M(col, { m: 0.55, r: 0.3 }), 0, y, 0, parent);
}
// متسعة صفيحتين (المركز في الأصل) ; إشارات على الوجهين الداخليين عند الحافة الأمامية
export function capPlates(parent, w = 3.2, dpt = 2.2, gap = 1.3, opt = {}) {
  const g = new THREE.Group(); parent.add(g);
  plate(g, w, dpt, gap / 2 + 0.05, opt.top ?? 0xc9858a);
  plate(g, w, dpt, -gap / 2 - 0.05, opt.bot ?? 0x86a6cf);
  // حافة ملونة رقيقة
  if (opt.signs !== false) {
    const n = opt.n ?? 7;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + w * (i + 0.5) / n;
      sign(g, '+', x, gap / 2 - 0.13, dpt / 2 - 0.02, opt.ss ?? 0.17);
      sign(g, '-', x, -gap / 2 + 0.13, dpt / 2 - 0.02, opt.ss ?? 0.17);
      if (opt.backSigns) {
        for (const zz of [0, -dpt / 2 + 0.25]) {
          // نقاط شحنة على الوجه الداخلي
          mesh(new THREE.SphereGeometry(0.05, 10, 8), M(COL.pos, { e: COL.pos, ei: .3 }), x, gap / 2 - 0.05, zz, g);
          mesh(new THREE.SphereGeometry(0.05, 10, 8), M(COL.neg, { e: COL.neg, ei: .3 }), x, -gap / 2 + 0.05, zz, g);
        }
      }
    }
  }
  if (opt.field !== false) {
    const nx = opt.fx ?? 6, nz = opt.fz ?? 3;
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const x = -w / 2 + w * (i + 0.5) / nx, z = -dpt / 2 + dpt * (k + 0.5) / nz;
      arrow(g, [x, gap / 2 - 0.24, z], [x, -gap / 2 + 0.24, z], opt.fcol ?? COL.field, 0.026);
    }
  }
  return g;
}

function dipole(parent, x, y, z, dir, L = 0.34, r = 0.1) {
  // dir: متجه من − إلى + (العزم ثنائي القطب)
  const g = new THREE.Group(); g.position.set(x, y, z);
  const d = new THREE.Vector3(...dir).normalize();
  const hp = mesh(new THREE.SphereGeometry(r, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), M(COL.pos, { r: .35 }), 0, L / 2 - r * 0.2, 0, g);
  mesh(new THREE.CylinderGeometry(r, r, L - r * 0.4, 18, 1, true), M(0xeeeeee, { r: .5 }), 0, 0, 0, g);
  const hn = mesh(new THREE.SphereGeometry(r, 18, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M(COL.neg, { r: .35 }), 0, -L / 2 + r * 0.2, 0, g);
  // نصف الأسطوانة ملون
  mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, (L - r * 0.4) / 2, 18, 1, true), M(COL.pos, { r: .35 }), 0, (L - r * 0.4) / 4, 0, g);
  mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, (L - r * 0.4) / 2, 18, 1, true), M(COL.neg, { r: .35 }), 0, -(L - r * 0.4) / 4, 0, g);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  parent.add(g); return g;
}
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// ===================== الأشكال =====================
export const FIGS = {
  // الشكل الرئيس: متسعة الصفيحتين المتوازيتين مع البطارية
  capacitor() {
    const o = new THREE.Group();
    const w = 3.4, dpt = 2.4, gap = 1.4;
    capPlates(o, w, dpt, gap, { backSigns: true });
    // أسلاك إلى البطارية خلف/يمين
    const yT = gap / 2 + 0.1, yB = -gap / 2 - 0.1;
    wire(o, [[w / 2 - 0.3, yT + 0.02, -0.3], [w / 2 - 0.3, yT + 0.75, -0.3], [w / 2 + 1.25, yT + 0.75, -0.3], [w / 2 + 1.25, 0.72, -0.3]]);
    wire(o, [[w / 2 - 0.3, yB - 0.02, -0.3], [w / 2 - 0.3, yB - 0.75, -0.3], [w / 2 + 1.25, yB - 0.75, -0.3], [w / 2 + 1.25, -0.72, -0.3]]);
    const b = battery(o, w / 2 + 1.25, 0, -0.3, 1.3, 0.3, 'y');
    // بعد d
    arrow(o, [-w / 2 - 0.35, 0, dpt / 2], [-w / 2 - 0.35, gap / 2 + 0.05, dpt / 2], 0x333333, 0.02);
    arrow(o, [-w / 2 - 0.35, 0, dpt / 2], [-w / 2 - 0.35, -gap / 2 - 0.05, dpt / 2], 0x333333, 0.02);
    lab(o, 'صفيحة موجبة الشحنة (+Q)', -0.6, gap / 2 + 0.12, -0.3);
    lab(o, 'صفيحة سالبة الشحنة (−Q)', -0.6, -gap / 2 - 0.12, dpt / 2 - 0.2);
    lab(o, 'المجال الكهربائي المنتظم (E)', 0.35, 0, dpt / 2 - 0.4);
    lab(o, 'البعد بين الصفيحتين (d)', -w / 2 - 0.35, 0.05, dpt / 2);
    lab(o, 'بطارية (ΔV)', w / 2 + 1.25, 0, -0.0);
    lab(o, 'المساحة المتقابلة (A)', 0.9, gap / 2 + 0.15, 0.4);
    return { obj: o, rot: [0.28, -0.42, 0], view: [0, 0.12, 1] };
  },
  // نموذج الواقع المعزز (بدون أسماء أو بطارية)
  capacitorAR() {
    const o = new THREE.Group();
    capPlates(o, 3.4, 2.4, 1.4, { backSigns: true });
    return { obj: o, rot: [0.3, -0.5, 0], view: [0, 0.12, 1] };
  },
  // العازل القطبي: جزيئات عشوائية (بلا مجال)
  polarRandom() {
    const o = new THREE.Group(); const R = rng(7);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) {
      const v = [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1];
      dipole(o, i * 0.62 - 0.93 + (R() - .5) * .15, j * 0.62 - 0.62 + (R() - .5) * .15, k * 0.6 - 0.3, v, 0.4, 0.11);
    }
    const box = mesh(new THREE.BoxGeometry(2.8, 2.1, 1.3), M(COL.die, { t: 0.18, dw: false }), 0, 0, 0, o);
    lab(o, 'جزيئة قطبية (دايبول)', 0.95, 0.65, 0.3);
    lab(o, 'اتجاهات عشوائية', -0.4, -1.05, 0.65);
    return { obj: o, rot: [0.3, -0.45, 0], view: [0, 0.1, 1] };
  },
  // العازل المستقطب بين صفيحتي المتسعة
  dielectric() {
    const o = new THREE.Group();
    const w = 3.4, dpt = 2.2, gap = 1.9;
    capPlates(o, w, dpt, gap, { field: false, n: 7 });
    const sw = w - 0.5, sh = gap - 0.36;
    mesh(new THREE.BoxGeometry(sw, sh, dpt - 0.3), M(COL.die, { t: 0.32, dw: false, r: 0.2 }), 0, 0, 0, o);
    // دايبولات مصطفة: + نحو الصفيحة السالبة (أسفل)
    for (let i = 0; i < 6; i++) for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++)
      dipole(o, -sw / 2 + sw * (i + 0.5) / 6, -0.26 + j * 0.52, -0.4 + k * 0.8, [0, -1, 0], 0.36, 0.1);
    // شحنات سطحية على وجهي العازل
    for (let i = 0; i < 8; i++) {
      const x = -sw / 2 + sw * (i + 0.5) / 8;
      sign(o, '-', x, sh / 2 - 0.1, (dpt - 0.3) / 2 + 0.02, 0.13);
      sign(o, '+', x, -sh / 2 + 0.1, (dpt - 0.3) / 2 + 0.02, 0.13);
    }
    // E خارجي (يسار، نحو الأسفل) و Ed داخلي (نحو الأعلى)
    arrow(o, [-w / 2 + 0.12, gap / 2 - 0.15, dpt / 2 - 0.1], [-w / 2 + 0.12, -gap / 2 + 0.15, dpt / 2 - 0.1], COL.field, 0.035);
    arrow(o, [w / 2 - 0.12, -gap / 2 + 0.3, dpt / 2 - 0.1], [w / 2 - 0.12, gap / 2 - 0.3, dpt / 2 - 0.1], COL.green, 0.035);
    lab(o, 'المجال المؤثر E', -w / 2 + 0.12, 0.2, dpt / 2 - 0.1);
    lab(o, 'المجال داخل العازل Ed', w / 2 - 0.12, -0.1, dpt / 2 - 0.1);
    lab(o, 'شحنة سطحية سالبة على وجه العازل', 0.3, sh / 2 - 0.1, (dpt - 0.3) / 2);
    lab(o, 'شحنة سطحية موجبة على وجه العازل', -0.3, -sh / 2 + 0.1, (dpt - 0.3) / 2);
    lab(o, 'صفيحة موجبة +Q', 0, gap / 2 + 0.15, -0.6);
    lab(o, 'صفيحة سالبة −Q', 0.4, -gap / 2 - 0.15, 0.6);
    lab(o, 'دايبول مصطف', -0.75, 0.26, 0.4);
    return { obj: o, rot: [0.2, -0.32, 0], view: [0, 0.08, 1] };
  },
  // جزيئة غير قطبية: بلا مجال وبوجود مجال
  nonpolar() {
    const o = new THREE.Group();
    // (a) بلا مجال: كرة سحابة الكترونية والنواة في المركز
    const a = new THREE.Group(); a.position.x = -1.3; o.add(a);
    mesh(new THREE.SphereGeometry(0.75, 40, 30), M(COL.neg, { t: 0.28, dw: false }), 0, 0, 0, a);
    mesh(new THREE.SphereGeometry(0.17, 24, 18), M(COL.pos, { e: COL.pos, ei: .25 }), 0, 0, 0, a);
    // (b) بمجال: السحابة تزاح عكس المجال (المجال نحو +x)
    const b = new THREE.Group(); b.position.x = 1.3; o.add(b);
    const cl = mesh(new THREE.SphereGeometry(0.75, 40, 30), M(COL.neg, { t: 0.28, dw: false }), -0.2, 0, 0, b); cl.scale.set(1.12, 0.95, 0.95);
    mesh(new THREE.SphereGeometry(0.17, 24, 18), M(COL.pos, { e: COL.pos, ei: .25 }), 0.17, 0, 0, b);
    arrow(o, [0.5, -1.15, 0], [2.3, -1.15, 0], COL.field, 0.035);
    lab(o, 'بلا مجال: مركزا الشحنتين منطبقان', -1.3, 0.75, 0);
    lab(o, 'بوجود مجال: إزاحة ضئيلة للمركزين', 1.3, 0.75, 0);
    lab(o, 'المجال الخارجي E', 1.4, -1.15, 0);
    return { obj: o, rot: [0.15, -0.25, 0], view: [0, 0.1, 1] };
  },
  // ربط التوازي
  parallel() {
    const o = new THREE.Group();
    const g1 = new THREE.Group(); g1.position.x = -1.5; o.add(g1); capPlates(g1, 1.8, 1.4, 0.8, { n: 4, fx: 3, fz: 2, ss: 0.13 });
    const g2 = new THREE.Group(); g2.position.x = 1.5; o.add(g2); capPlates(g2, 1.8, 1.4, 0.8, { n: 4, fx: 3, fz: 2, ss: 0.13 });
    const yt = 0.5, yb = -0.5;
    wire(o, [[-1.5, yt, 0], [-1.5, 1.3, 0], [1.5, 1.3, 0], [1.5, yt, 0]]);
    wire(o, [[-1.5, yb, 0], [-1.5, -1.3, 0], [1.5, -1.3, 0], [1.5, yb, 0]]);
    wire(o, [[0, 1.3, 0], [0, 1.3, 1.4], [3.6, 1.3, 1.4], [3.6, 0.7, 1.4]]);
    wire(o, [[0, -1.3, 0], [0, -1.3, 1.4], [3.6, -1.3, 1.4], [3.6, -0.7, 1.4]]);
    battery(o, 3.6, 0, 1.4, 1.3, 0.28, 'y');
    lab(o, 'C₁', -1.5, 0, 0.7); lab(o, 'C₂', 1.5, 0, 0.7);
    lab(o, 'ΔV₁ = ΔV₂ = ΔV', 0, 1.3, 0.7);
    lab(o, 'البطارية ΔV', 3.6, 0, 1.4);
    return { obj: o, rot: [0.3, -0.38, 0], view: [0, 0.1, 1] };
  },
  // ربط التوالي
  series() {
    const o = new THREE.Group();
    const g1 = new THREE.Group(); g1.position.y = 1.1; o.add(g1); capPlates(g1, 2.2, 1.5, 0.7, { n: 5, fx: 4, fz: 2, ss: 0.13 });
    const g2 = new THREE.Group(); g2.position.y = -1.1; o.add(g2); capPlates(g2, 2.2, 1.5, 0.7, { n: 5, fx: 4, fz: 2, ss: 0.13 });
    wire(o, [[0, 0.7, 0], [0, -0.7, 0]], 0x9b6a2b, 0.05);
    wire(o, [[0, 1.55, 0], [0, 2.1, 0], [2.6, 2.1, 0], [2.6, 0.7, 0]]);
    wire(o, [[0, -1.55, 0], [0, -2.1, 0], [2.6, -2.1, 0], [2.6, -0.7, 0]]);
    battery(o, 2.6, 0, 0, 1.3, 0.28, 'y');
    lab(o, 'C₁', -1.1, 1.1, 0.75); lab(o, 'C₂', -1.1, -1.1, 0.75);
    lab(o, 'الصفيحتان الوسطيتان موصل واحد', 0, 0, 0);
    lab(o, 'Q₁ = Q₂ = Q', 1.1, 1.5, 0);
    lab(o, 'البطارية ΔV', 2.6, 0, 0);
    return { obj: o, rot: [0.25, -0.45, 0], view: [0, 0.1, 1] };
  },
  // المتسعة متغيرة السعة ذات الصفائح الدوارة
  variable() {
    const o = new THREE.Group();
    const n = 6, step = 0.4, R = 1.25;
    const metal = M(0xc8ced6, { m: 0.75, r: 0.28, side: THREE.DoubleSide });
    const metal2 = M(0xe0b45a, { m: 0.7, r: 0.3, side: THREE.DoubleSide });
    // الثابتة: أنصاف أقراص على الجهة السفلى
    for (let i = 0; i < n; i++) {
      const d = mesh(new THREE.CylinderGeometry(R, R, 0.035, 48, 1, false, Math.PI / 2, Math.PI), metal, 0, 0, 0, o);
      d.rotation.z = Math.PI / 2; d.position.x = -((n - 1) * step) / 2 + i * step;
      d.rotation.x = 0;
    }
    // الدوارة: مزاحة نصف خطوة ومدورة بزاوية
    const rot = new THREE.Group(); o.add(rot); rot.rotation.x = 1.0;
    for (let i = 0; i < n - 1; i++) {
      const d = mesh(new THREE.CylinderGeometry(R * 0.96, R * 0.96, 0.035, 48, 1, false, -Math.PI / 2, Math.PI), metal2, 0, 0, 0, rot);
      d.rotation.z = Math.PI / 2; d.position.x = -((n - 2) * step) / 2 + i * step;
    }
    // المحور
    mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 20), M(0x9aa3ad, { m: 0.8, r: 0.25 }), 0.3, 0, 0, o).rotation.z = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.35, 28), M(0x333a44, { r: .5 }), 1.95, 0, 0, o).rotation.z = Math.PI / 2;
    // قاعدة
    mesh(new THREE.BoxGeometry(2.8, 0.12, 1.2), M(0x6b4e2e, { r: .7 }), 0, -1.45, 0, o);
    mesh(new THREE.BoxGeometry(0.1, 1.45, 0.5), M(0x9aa3ad, { m: .6 }), -1.3, -0.72, 0, o);
    mesh(new THREE.BoxGeometry(0.1, 1.45, 0.5), M(0x9aa3ad, { m: .6 }), 1.3, -0.72, 0, o);
    lab(o, 'صفائح ثابتة', 0.2, -0.9, 0.5);
    lab(o, 'صفائح دوّارة', 0, 0.6, 0.85);
    lab(o, 'محور الدوران', 1.95, 0, 0);
    lab(o, 'الهواء عازل بين الصفائح', -0.65, 0.2, -0.3);
    return { obj: o, rot: [0.45, -1.05, 0], view: [0, 0.1, 1] };
  },
  // متسعة ملفوفة (شرائح معدنية + عازل) — الورق المشمع / الإلكتروليتية
  rolled() {
    const o = new THREE.Group();
    // اللفة
    const roll = mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.2, 48), M(0xd9dde2, { m: 0.6, r: 0.3 }), -1.1, 0, 0, o);
    mesh(new THREE.CylinderGeometry(0.751, 0.751, 2.0, 48, 1, true), M(0xe9c27a, { r: .6 }), -1.1, 0, 0, o);
    // حلقات على القاعدة العلوية
    for (let i = 1; i <= 5; i++) {
      const t = mesh(new THREE.TorusGeometry(0.13 * i, 0.012, 6, 48), M(i % 2 ? 0xa0a8b2 : 0xd6a650, { r: .5 }), -1.1, 1.105, 0, o);
      t.rotation.x = Math.PI / 2;
    }
    // الشريط المفرود: معدن / عازل / معدن / عازل
    const layers = [[0xc4cbd3, 0.62, 0.55], [0xe7bf72, 0.0, 0.5], [0xc4cbd3, -0.62, 0.45]];
    const strip = new THREE.Group(); strip.position.set(-0.35, 0, 0.75); o.add(strip);
    const cols = [0xc4cbd3, 0xe9c27a, 0xc4cbd3, 0xe9c27a];
    cols.forEach((c, i) => {
      const s = mesh(new THREE.BoxGeometry(2.7 - i * 0.25, i % 2 ? 2.1 : 1.85, 0.03), M(c, { m: i % 2 ? 0.05 : 0.65, r: .35 }), 1.35 - i * 0.125, 0, -i * 0.07, strip);
    });
    // طرفا التوصيل
    wire(o, [[-1.1, 1.1, 0.3], [-1.1, 1.9, 0.3]], 0xb0b6bc, 0.035);
    wire(o, [[-1.1, -1.1, -0.3], [-1.1, -1.9, -0.3]], 0xb0b6bc, 0.035);
    lab(o, 'شريحة معدنية رقيقة واسعة المساحة', 1.3, 0.75, 0.75);
    lab(o, 'شريط عازل رقيق (ثابت عزله كبير)', 1.6, -0.95, 0.65);
    lab(o, 'تُلف الشرائح بشكل أسطواني', -1.1, -0.3, 0.75);
    lab(o, 'طرف توصيل', -1.1, 1.75, 0.3);
    return { obj: o, rot: [0.3, -0.3, 0], view: [0, 0.12, 1] };
  },
  // متسعة لوحة المفاتيح
  keyboard() {
    const o = new THREE.Group();
    // القاعدة
    mesh(new THREE.BoxGeometry(3.2, 0.2, 2.0), M(0x3b434d, { r: .6 }), 0, -1.0, 0, o);
    // الصفيحة الثابتة
    mesh(new THREE.BoxGeometry(1.5, 0.06, 1.2), M(COL.neg, { m: .5, r: .3 }), 0, -0.86, 0, o);
    // العازل المرن
    mesh(new THREE.BoxGeometry(1.5, 0.3, 1.2), M(COL.die, { t: 0.5, dw: false }), 0, -0.68, 0, o);
    // الصفيحة المتحركة
    mesh(new THREE.BoxGeometry(1.5, 0.06, 1.2), M(COL.pos, { m: .5, r: .3 }), 0, -0.5, 0, o);
    // النابض
    const pts = []; for (let t = 0; t <= 1; t += 0.01) pts.push(new THREE.Vector3(0.35 * Math.cos(t * Math.PI * 12), -0.45 + t * 0.6, 0.35 * Math.sin(t * Math.PI * 12)));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.03, 8), M(0x9aa3ad, { m: .8, r: .25 }), 0, 0, 0, o);
    // غطاء المفتاح
    const cap = new THREE.Group(); cap.position.y = 0.45; o.add(cap);
    mesh(new THREE.BoxGeometry(1.7, 0.5, 1.5), M(0xf4f4f2, { r: .5 }), 0, 0, 0, cap);
    mesh(new THREE.BoxGeometry(1.45, 0.06, 1.25), M(0xffffff, { r: .4 }), 0, 0.27, 0, cap);
    arrow(o, [1.25, 1.4, 0.3], [1.25, 0.75, 0.3], 0x333333, 0.035);
    lab(o, 'غطاء المفتاح', -0.6, 0.45, 0.75);
    lab(o, 'صفيحة متحركة', 0.6, -0.5, 0.6);
    lab(o, 'صفيحة ثابتة', -0.6, -0.86, 0.6);
    lab(o, 'عازل مرن', 0.75, -0.68, 0.0);
    lab(o, 'الضغط يقلل d فتزداد C', 1.25, 1.2, 0.3);
    return { obj: o, rot: [0.42, -0.5, 0], view: [0, 0.1, 1] };
  },
  // الموصل المنفرد (تفريغ في الهواء)
  sphere() {
    const o = new THREE.Group();
    mesh(new THREE.SphereGeometry(0.9, 48, 36), M(0xc8ced6, { m: 0.8, r: 0.22 }), 0, 0.4, 0, o);
    mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.6, 20), M(0x3b434d, { r: .5 }), 0, -1.1, 0, o);
    mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.18, 32), M(0x3b434d, { r: .5 }), 0, -1.95, 0, o);
    const R = rng(3);
    for (let i = 0; i < 14; i++) { const th = R() * Math.PI * 2, ph = R() * 2.2 + 0.3; sign(o, '+', 0.92 * Math.sin(ph) * Math.cos(th), 0.4 + 0.92 * Math.cos(ph), 0.92 * Math.sin(ph) * Math.sin(th), 0.15); }
    // شرارة
    const sp = [[0.85, 0.7, 0.2], [1.25, 0.95, 0.2], [1.15, 1.15, 0.2], [1.65, 1.45, 0.2], [1.5, 1.6, 0.2], [2.05, 1.95, 0.2]];
    wire(o, sp, 0x7fb6ff, 0.03);
    lab(o, 'موصل كروي معزول مشحون', -0.6, 0.7, 0.6);
    lab(o, 'تفريغ كهربائي في الهواء', 1.6, 1.5, 0.2);
    lab(o, 'حامل عازل', 0, -1.2, 0.15);
    return { obj: o, rot: [0.15, -0.3, 0], view: [0, 0.1, 1] };
  },
};

// ===================== دوائر ومخططات ثلاثية الأبعاد =====================
// نص على لوحة (Sprite) بخط Cairo — يواجه الكاميرا دائماً
export function textSprite(parent, text, x, y, z, o = {}) {
  const fs = 64, pad = 22;
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  const font = `${o.w ?? 800} ${fs}px Cairo, sans-serif`; g.font = font;
  const tw = Math.ceil(g.measureText(text).width);
  c.width = tw + pad * 2; c.height = fs + pad * 1.4;
  g.font = font; g.direction = /[؀-ۿ]/.test(text) ? 'rtl' : 'ltr';
  if (o.box !== false) {
    g.fillStyle = o.bg ?? 'rgba(255,255,255,0.96)'; g.strokeStyle = o.border ?? '#d9a21b'; g.lineWidth = 5;
    const r = 22, W = c.width - 4, H = c.height - 4;
    g.beginPath(); g.roundRect(2, 2, W, H, r); g.fill(); g.stroke();
  }
  g.fillStyle = o.col ?? '#17324d'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: o.depth ?? false, transparent: true }));
  const h = o.h ?? 0.34; sp.scale.set(h * c.width / c.height, h, 1); sp.position.set(x, y, z); sp.renderOrder = 10;
  parent.add(sp); return sp;
}
const WY = 0.16; // ارتفاع الأسلاك فوق اللوحة
const CU = 0xb87333;
function cwire(parent, pts) { return wire(parent, pts.map(([x, z]) => [x, WY, z]), CU, 0.045); }
function dot(parent, x, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), M(0x7a4a1f, { m: .6, r: .3 })); m.position.set(x, WY, z); parent.add(m); }

// مكونات: كل مكون يُبنى حول الأصل والسلك على المحور x من −w/2 إلى w/2
const CS = { C: [1.0, 1.1], B: [1.3, 1.0], R: [1.5, 0.7], L: [1.1, 1.0], G: [1.2, 1.1], K: [1.4, 0.8], W: [0.6, 0.2] };
function comp(kind, label, o = {}) {
  const g = new THREE.Group(); const [w] = CS[kind];
  const lead = (a, b) => wire(g, [[a, 0, 0], [b, 0, 0]], CU, 0.045);
  if (kind === 'C') {
    lead(-w / 2, -0.11); lead(0.11, w / 2);
    for (const [x, c] of [[-0.11, o.pc ?? 0xc9858a], [0.11, o.nc ?? 0x86a6cf]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.72, 0.72), M(c, { m: .5, r: .3 })); p.position.set(x, 0.42, 0); g.add(p);
    }
    if (label) textSprite(g, label, 0, 1.12, 0, { h: 0.3 });
  } else if (kind === 'B') {
    lead(-w / 2, -0.5); lead(0.5, w / 2);
    const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.36, 28), M(COL.gold, { m: .5, r: .3 })); b1.rotation.z = Math.PI / 2; b1.position.set(-0.3, 0.3, 0); g.add(b1);
    const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.6, 28), M(0x22262c, { m: .3, r: .4 })); b2.rotation.z = Math.PI / 2; b2.position.set(0.18, 0.3, 0); g.add(b2);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 16), M(0xcfd5db, { m: .8, r: .2 })); t.rotation.z = Math.PI / 2; t.position.set(-0.53, 0.3, 0); g.add(t);
    textSprite(g, '+', -0.3, 0.3, 0.3, { box: false, col: '#17324d', h: 0.32 });
    textSprite(g, '−', 0.25, 0.3, 0.3, { box: false, col: '#ffffff', h: 0.32 });
    if (label) textSprite(g, label, 0, 0.95, 0, { h: 0.3 });
  } else if (kind === 'R') {
    lead(-w / 2, -0.42); lead(0.42, w / 2);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.84, 24), M(0xe8d3a6, { r: .6 })); body.rotation.z = Math.PI / 2; body.position.y = 0.2; g.add(body);
    [[-0.22, 0x8b4513], [-0.06, 0x111111], [0.1, 0xd32f2f], [0.28, 0xd4af37]].forEach(([x, c]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.06, 24), M(c, { r: .5 })); b.rotation.z = Math.PI / 2; b.position.set(x, 0.2, 0); g.add(b); });
    if (label) textSprite(g, label, 0, 0.75, 0, { h: 0.3 });
  } else if (kind === 'L') {
    lead(-w / 2, -0.15); lead(0.15, w / 2);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.26, 24), M(0x9aa3ad, { m: .7, r: .3 })); s.position.y = 0.25; g.add(s);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), M(0xfff6c8, { t: 0.45, r: .1, dw: false, e: 0xffd54a, ei: o.on ? 0.8 : 0.15 })); gl.position.y = 0.66; g.add(gl);
    const f = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 24, Math.PI), M(0xff8f00, { e: 0xff8f00, ei: .8 })); f.position.y = 0.62; g.add(f);
    if (label) textSprite(g, label, 0, 1.25, 0, { h: 0.3 });
  } else if (kind === 'G') {
    lead(-w / 2, -0.38); lead(0.38, w / 2);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.6), M(0x2a3340, { r: .5 })); box.position.y = 0.3; g.add(box);
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#fbf7ea'; x.fillRect(0, 0, 256, 160); x.strokeStyle = '#17324d'; x.lineWidth = 5;
    x.beginPath(); x.arc(128, 150, 110, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (1.15 + 0.07 * i); x.beginPath(); x.moveTo(128 + 100 * Math.cos(a), 150 + 100 * Math.sin(a)); x.lineTo(128 + 115 * Math.cos(a), 150 + 115 * Math.sin(a)); x.stroke(); }
    const na = Math.PI * (1.5 + (o.needle ?? 0)); x.strokeStyle = '#c0392b'; x.lineWidth = 6; x.beginPath(); x.moveTo(128, 150); x.lineTo(128 + 95 * Math.cos(na), 150 + 95 * Math.sin(na)); x.stroke();
    x.fillStyle = '#17324d'; x.font = '800 54px Cairo'; x.textAlign = 'center'; x.fillText('G', 128, 120);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.44), new THREE.MeshBasicMaterial({ map: tex })); face.position.set(0, 0.551, 0); face.rotation.x = -Math.PI / 2; g.add(face);
    if (label) textSprite(g, label, 0, 0.95, 0, { h: 0.3 });
  } else if (kind === 'K') {
    lead(-w / 2, -0.38); lead(0.38, w / 2);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.42), M(0x5b3a1e, { r: .7 })); base.position.y = 0.06; g.add(base);
    for (const xx of [-0.38, 0.38]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.2), M(0xc9a227, { m: .7, r: .3 })); p.position.set(xx, 0.2, 0); g.add(p); }
    const lev = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.05, 0.1), M(0xc9a227, { m: .7, r: .3 })); lev.position.set(-0.38, 0.28, 0); lev.geometry.translate(0.42, 0, 0); lev.rotation.z = o.closed ? 0 : 0.55; g.add(lev);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), M(0x111111)); h.position.set(-0.38 + 0.85 * Math.cos(lev.rotation.z), 0.28 + 0.85 * Math.sin(lev.rotation.z), 0); g.add(h);
    if (label) textSprite(g, label, 0, 1.05, 0, { h: 0.3 });
  } else if (kind === 'W') { lead(-w / 2, w / 2); }
  return g;
}

// شبكة متسعات: ['S',[...]] توالي ، ['P',[...]] توازي ، ['C','label'] ...
const GAP3 = 0.45, BR = 0.55;
function size3(e) {
  const k = e[0];
  if (CS[k]) return CS[k];
  const ws = e[1].map(size3);
  if (k === 'S') return [ws.reduce((a, b) => a + b[0], 0) + GAP3 * (ws.length + 1), Math.max(...ws.map(s => s[1]))];
  return [Math.max(...ws.map(s => s[0])) + 2 * GAP3, ws.reduce((a, b) => a + b[1], 0) + BR * (ws.length - 1)];
}
function draw3(parent, e, x, z) {
  const k = e[0]; const [w, h] = size3(e);
  if (CS[k]) { const c = comp(k, e[1], e[2] || {}); c.position.set(x + w / 2, WY, z); parent.add(c); return; }
  if (k === 'S') {
    let cx = x;
    for (const ch of e[1]) { const [cw] = size3(ch); cwire(parent, [[cx, z], [cx + GAP3, z]]); cx += GAP3; draw3(parent, ch, cx, z); cx += cw; }
    cwire(parent, [[cx, z], [x + w, z]]);
  } else {
    let cz = z - h / 2; const zs = [];
    for (const ch of e[1]) {
      const [cw, chh] = size3(ch); const zz = cz + chh / 2; zs.push(zz);
      const bx = x + GAP3 + (w - 2 * GAP3 - cw) / 2;
      cwire(parent, [[x + GAP3, zz], [bx, zz]]); draw3(parent, ch, bx, zz); cwire(parent, [[bx + cw, zz], [x + w - GAP3, zz]]);
      cz += chh + BR;
    }
    cwire(parent, [[x + GAP3, zs[0]], [x + GAP3, zs[zs.length - 1]]]); cwire(parent, [[x + w - GAP3, zs[0]], [x + w - GAP3, zs[zs.length - 1]]]);
    cwire(parent, [[x, z], [x + GAP3, z]]); cwire(parent, [[x + w - GAP3, z], [x + w, z]]);
    dot(parent, x + GAP3, z); dot(parent, x + w - GAP3, z);
  }
}
// الأسلاك داخل المكون بُنيت على ارتفاع WY بالنسبة للمكون، والمكون مرفوع WY — نعيدها
function fixLeads(c) { }

function board(parent, x0, z0, x1, z1) {
  const m = 0.55;
  const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 2 * m, 0.12, z1 - z0 + 2 * m), M(0xdfe8f2, { r: .85 }));
  b.position.set((x0 + x1) / 2, -0.06, (z0 + z1) / 2); parent.add(b);
  const e = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 2 * m + 0.22, 0.1, z1 - z0 + 2 * m + 0.22), M(0x17324d, { r: .6 }));
  e.position.set((x0 + x1) / 2, -0.1, (z0 + z1) / 2); parent.add(e);
}
// دائرة كاملة: الشبكة في الأعلى (z سالب) والبطارية في الخط الأمامي
export function circuit3(net, bottom, opt = {}) {
  const o = new THREE.Group();
  const [w, h] = size3(net); const [bw, bh] = bottom ? size3(bottom) : [0, 0];
  const W = Math.max(w + 1.0, bw + 2.2, 4);
  const x0 = -W / 2, xn = -w / 2;
  const zTop = 0, zBot = h / 2 + 1.0 + bh / 2;
  draw3(o, net, xn, zTop);
  const L = Math.min(x0, xn - 0.5), R = Math.max(-x0, xn + w + 0.5);
  cwire(o, [[xn, zTop], [L, zTop], [L, zBot]]); cwire(o, [[xn + w, zTop], [R, zTop], [R, zBot]]);
  if (bottom) { const bx = -bw / 2; cwire(o, [[L, zBot], [bx, zBot]]); draw3(o, bottom, bx, zBot); cwire(o, [[bx + bw, zBot], [R, zBot]]); }
  else cwire(o, [[L, zBot], [R, zBot]]);
  board(o, L, zTop - h / 2 - 0.2, R, zBot + 0.3);
  if (opt.title) textSprite(o, opt.title, 0, 0.2, zBot + 0.95, { h: 0.34, bg: '#17324d', col: '#f6e3a8', border: '#17324d' });
  o.position.z = -(zTop + zBot) / 2;
  return { obj: o, rot: [0, 0, 0], view: [0, 1.15, 1] };
}
function netOnly(net, title) {
  const o = new THREE.Group(); const [w, h] = size3(net);
  draw3(o, net, -w / 2, 0);
  for (const xx of [-w / 2 - 0.3, w / 2 + 0.3]) { cwire(o, [[xx < 0 ? xx : w / 2, 0], [xx < 0 ? -w / 2 : xx, 0]]); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 18), M(0xc9a227, { m: .7, r: .3 })); t.position.set(xx, WY, 0); o.add(t); }
  board(o, -w / 2 - 0.4, -h / 2 - 0.2, w / 2 + 0.4, h / 2 + (title ? 0.7 : 0.2));
  if (title) textSprite(o, title, 0, 0.2, h / 2 + 0.55, { h: 0.36, bg: '#17324d', col: '#f6e3a8', border: '#17324d' });
  return o;
}
// مخطط بياني ثلاثي الأبعاد على لوحة قائمة
function graphPanel(kind) {
  const o = new THREE.Group();
  const pw = 5.2, ph = 3.6;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.12), M(0xfbfaf6, { r: .8 })); panel.position.set(pw / 2 - 0.6, ph / 2 - 0.5, -0.08); o.add(panel);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.12, ph + 0.12, 0.08), M(0x17324d, { r: .6 })); frame.position.set(pw / 2 - 0.6, ph / 2 - 0.5, -0.15); o.add(frame);
  const ax = 0x26323f;
  const y0 = kind === 'idis' ? 1.4 : 0;
  arrow(o, [0, y0, 0.02], [4.2, y0, 0.02], ax, 0.035); arrow(o, [0, kind === 'idis' ? -0.25 : 0, 0.02], [0, 2.9, 0.02], ax, 0.035);
  if (kind === 'qv') {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(3.5, 0); sh.lineTo(3.5, 2.5); sh.lineTo(0, 0);
    const tri = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }), M(0xf6b94a, { r: .5 })); tri.position.z = 0.0; o.add(tri);
    wire(o, [[0, 0, 0.24], [3.5, 2.5, 0.24]], 0xc0392b, 0.045);
    wire(o, [[3.5, 0, 0.12], [3.5, 2.5, 0.12]], 0x26323f, 0.018); wire(o, [[0, 2.5, 0.12], [3.5, 2.5, 0.12]], 0x26323f, 0.018);
    textSprite(o, 'PE = ½ Q ΔV', 2.3, 0.75, 0.5, { h: 0.36 });
    textSprite(o, 'ΔV', 4.4, -0.05, 0.1, { box: false, h: 0.36 }); textSprite(o, 'Q', -0.28, 2.95, 0.1, { box: false, h: 0.36 });
    textSprite(o, 'Q', -0.3, 2.5, 0.1, { box: false, h: 0.3, col: '#c0392b' }); textSprite(o, 'ΔV', 3.5, -0.32, 0.1, { box: false, h: 0.3, col: '#c0392b' });
  } else {
    const s = kind === 'idis' ? -1 : 1, amp = kind === 'idis' ? 1.5 : 2.6;
    const pts = []; for (let i = 0; i <= 80; i++) { const t = i / 80 * 4.0; pts.push(new THREE.Vector3(t, y0 + s * amp * Math.exp(-t / 0.8), 0.06)); }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.05, 10), M(0xc0392b, { r: .4 })); o.add(tube);
    // ظل المساحة تحت المنحني
    const sh = new THREE.Shape(); sh.moveTo(0, y0); pts.forEach(p => sh.lineTo(p.x, p.y)); sh.lineTo(4.0, y0); sh.lineTo(0, y0);
    const fill = new THREE.Mesh(new THREE.ShapeGeometry(sh), M(0xf6b94a, { t: 0.45, dw: false, side: THREE.DoubleSide })); fill.position.z = 0.01; o.add(fill);
    textSprite(o, 't', 4.4, y0, 0.1, { box: false, h: 0.36 }); textSprite(o, 'I', -0.25, 2.9, 0.1, { box: false, h: 0.36 });
    textSprite(o, kind === 'idis' ? 'تيار التفريغ (−Imax)' : 'Imax = ΔV / R', kind === 'idis' ? 1.5 : 1.6, kind === 'idis' ? -0.15 : 2.6, 0.3, { h: 0.32 });
  }
  return { obj: o, rot: [0, 0, 0], view: [0.35, 0.22, 1] };
}

const C = (l) => ['C', l], S = (...a) => ['S', a], P = (...a) => ['P', a];
Object.assign(FIGS, {
  ex3: () => circuit3(P(C('C₁=4μF'), C('C₂=8μF'), C('C₃=12μF'), C('C₄=6μF')), ['B', 'ΔV=12V']),
  ex4: () => { const o = netOnly(S(C('6μF'), C('9μF'), C('18μF')), 'Qtotal = 300μC'); return { obj: o, rot: [0, 0, 0], view: [0, 1.15, 1] }; },
  ex5: () => circuit3(P(S(C('C₁=20μF'), C('C₂=30μF')), C('C₃=18μF')), ['B', 'ΔV=12V']),
  ex7: () => circuit3(S(C('C₁=3μF'), C('C₂=6μF')), ['B', 'ΔV=24V']),
  ex8a: () => circuit3(S(P(['L', 'r=10Ω'], C('C=5μF')), ['R', 'R=20Ω']), ['B', '6V'], { title: '(a) المتسعة توازي المصباح' }),
  ex8b: () => circuit3(S(['L', 'r=10Ω'], C('C=5μF'), ['R', 'R=20Ω']), ['B', '6V'], { title: '(b) المتسعة على التوالي' }),
  p1: () => circuit3(S(C('C=100μF'), ['R', 'R=20Ω'], ['K', 'مفتاح']), ['B', 'V=12V']),
  p7: () => circuit3(S(P(S(C('C₁=6μF'), C('C₂=3μF')), C('C₃=2μF')), C('C₄=4μF')), ['B', 'ΔV=40V']),
  qv: () => graphPanel('qv'), icharge: () => graphPanel('icharge'), idis: () => graphPanel('idis'),
  // أشكال أسئلة الكتاب
  fig37: () => {
    const o = new THREE.Group();
    const nets = [['a', S(P(C('2μF'), C('4μF')), C('3μF'))], ['b', P(C('2μF'), C('1μF'))], ['c', S(C('12μF'), C('6μF'))], ['d', P(C('4μF'), S(C('2μF'), C('2μF')))]];
    nets.forEach(([t, n], i) => { const g = netOnly(n, '(' + t + ')'); g.position.set((i % 2) * 8.0 - 4.0, 0, Math.floor(i / 2) * 5.0 - 2.5); o.add(g); });
    return { obj: o, rot: [0, 0, 0], view: [0, 1.25, 1] };
  },
  fig39: () => {
    const o = new THREE.Group();
    const nets = [['a', S(C('C'), C('C'), C('C'))], ['b', P(S(C('C'), C('C')), C('C'))], ['c', S(P(C('C'), C('C')), C('C'))], ['d', P(C('C'), C('C'), C('C'))]];
    nets.forEach(([t, n], i) => { const g = netOnly(n, '(' + t + ')'); g.position.set((i % 2) * 7.6 - 3.8, 0, Math.floor(i / 2) * 5.6 - 2.8); o.add(g); });
    return { obj: o, rot: [0, 0, 0], view: [0, 1.25, 1] };
  },
  nine: () => { // فكّر: تسع متسعات
    const o = netOnly(P(S(C('10μF'), C('10μF'), C('10μF')), S(C('10μF'), C('10μF'), C('10μF')), S(C('10μF'), C('10μF'), C('10μF'))), 'Ceq = 10μF');
    return { obj: o, rot: [0, 0, 0], view: [0, 1.15, 1] };
  },
  rc: () => {
    const o = new THREE.Group();
    // K مزدوج: المحور P عند (-1,0) والطرفان 1 (−2.2,1.3) و2 (0.2,1.3)
    const Px = -1.0, zT = -2.2, zN = 2.4;
    // الخط العلوي: P ← G ← R ← A (المتسعة يمين)
    const g = comp('G', 'G'); g.position.set(1.2, WY, zT); o.add(g); fixLeads(g);
    const r = comp('R', 'R'); r.position.set(3.3, WY, zT); o.add(r); fixLeads(r);
    cwire(o, [[Px, zT], [0.6, zT]]); cwire(o, [[1.8, zT], [2.55, zT]]); cwire(o, [[4.05, zT], [5.2, zT], [5.2, -0.5]]);
    // المتسعة عمودية على المحور z
    const c = comp('C', 'C'); c.rotation.y = Math.PI / 2; c.position.set(5.2, WY, 0); o.add(c); fixLeads(c);
    textSprite(o, 'A', 5.7, 0.5, -0.25, { box: false, h: 0.3 }); textSprite(o, 'B', 5.7, 0.5, 0.3, { box: false, h: 0.3 });
    cwire(o, [[5.2, 0.5], [5.2, zN], [-2.6, zN]]);
    // المفتاح المزدوج
    for (const [bx, bz] of [[Px, zT], [-2.4, zT + 0.95], [0.0, zT + 0.95]]) { const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 20), M(0x5b3a1e, { r: .7 })); base.position.set(bx, 0.04, bz); o.add(base); }
    for (const [xx, zz, t] of [[Px, zT, ''], [-2.4, zT + 0.95, '1'], [0.0, zT + 0.95, '2']]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 16), M(0xc9a227, { m: .7, r: .3 })); p.position.set(xx, 0.2, zz); o.add(p);
      if (t) textSprite(o, t, xx, 0.75, zz, { h: 0.3 });
    }
    const lev = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.05, 0.1), M(0xc9a227, { m: .7, r: .3 })); lev.geometry.translate(-0.87, 0, 0);
    lev.position.set(Px, 0.32, zT); lev.rotation.y = -Math.atan2(0.95, 1.4); lev.rotation.z = -0.25; o.add(lev);
    textSprite(o, 'K', Px - 0.4, 0.9, zT - 0.3, { h: 0.3 });
    // الفرع 1: L1 ثم البطارية
    cwire(o, [[-2.4, zT + 0.95], [-2.4, -0.6]]);
    const l1 = comp('L', 'L₁'); l1.rotation.y = Math.PI / 2; l1.position.set(-2.4, WY, -0.05); o.add(l1); fixLeads(l1);
    cwire(o, [[-2.4, 0.5], [-2.4, 0.75]]);
    const bt = comp('B', 'بطارية'); bt.rotation.y = Math.PI / 2; bt.position.set(-2.4, WY, 1.4); o.add(bt); fixLeads(bt);
    cwire(o, [[-2.4, 2.05], [-2.4, zN], [-2.6, zN]]);
    // الفرع 2: L2
    cwire(o, [[0.0, zT + 0.95], [0.0, 0.0]]);
    const l2 = comp('L', 'L₂'); l2.rotation.y = Math.PI / 2; l2.position.set(0.0, WY, 0.55); o.add(l2); fixLeads(l2);
    cwire(o, [[0.0, 1.1], [0.0, zN]]); dot(o, 0.0, zN);
    board(o, -3.0, zT - 0.3, 5.7, zN + 0.2);
    o.position.z = -(zT + zN) / 2 + 0.2;
    return { obj: o, rot: [0, 0, 0], view: [0, 1.1, 1] };
  },
});
