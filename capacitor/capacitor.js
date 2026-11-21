// نموذج متسعة ذات صفيحتين متوازيتين مبني بالكود (بدون ملفات خارجية)
// المركز في الأصل، نصف القطر الإحاطي ≈ 2.6 وحدة
import * as THREE from 'three';

export const PARTS = {
  posPlate:  { name: 'الصفيحة الموجبة (+Q)', color: '#d8453a', desc: 'مربوطة بالقطب الموجب للبطارية، تظهر عليها شحنة موجبة على سطحها الداخلي المقابل للصفيحة الأخرى، وجهدها أعلى.' },
  negPlate:  { name: 'الصفيحة السالبة (−Q)', color: '#2f6fc0', desc: 'مربوطة بالقطب السالب، تتراكم عليها الإلكترونات فتظهر شحنة (−Q) مساوية للموجبة مقداراً، فصافي شحنة المتسعة صفر.' },
  field:     { name: 'المجال الكهربائي المنتظم (E)', color: '#f0a020', desc: 'خطوطه متوازية ومتساوية البعد، اتجاهه من الصفيحة الموجبة إلى السالبة، ومقداره E = ΔV/d. يكون منتظماً لأن البعد صغير مقارنة بأبعاد الصفيحة.' },
  charges:   { name: 'الشحنات على السطحين الداخليين', color: '#b23a8a', desc: 'الشحنتان تقعان على السطحين المتقابلين للصفيحتين بسبب قوى التجاذب بينهما.' },
  gap:       { name: 'البعد بين الصفيحتين (d)', color: '#26323f', desc: 'السعة تتناسب عكسياً مع البعد: C = ε₀A/d. تقريب الصفيحتين يزيد السعة.' },
  dielectric: { name: 'العازل الكهربائي (k)', color: '#e9b949', desc: 'يستقطب فيولّد مجالاً معاكساً فيقل المجال المحصل k مرة، وتزداد السعة: Cₖ = kC. إذا كانت المتسعة مفصولة تبقى الشحنة ثابتة ويقل فرق الجهد.' },
  battery:   { name: 'البطارية (ΔV)', color: '#e0a526', desc: 'تشحن المتسعة؛ بعد اكتمال الشحن يصبح فرق جهد المتسعة مساوياً لفرق جهد البطارية فيصبح التيار صفراً.' },
  wire:      { name: 'أسلاك التوصيل', color: '#8a5a2b', desc: 'تنقل الشحنات بين البطارية والصفيحتين أثناء الشحن فقط.' },
};

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.45, metalness: o.m ?? 0.15, transparent: o.t != null, opacity: o.t ?? 1, emissive: 0x000000 });

// p: {A (cm²), d (mm), k, connected, qn (عدد الشحنات بالصف), en (عدد خطوط المجال)}
export const DEFAULTS = { A: 100, d: 4, k: 1, connected: true, qn: 7, en: 6 };
const DCOL = { 2.1: 0xdde6ee, 3.7: 0xf3e2b8, 5.6: 0xa9dde6, 80: 0x7fb8ff };
export function buildCap(p = DEFAULTS) {
  const cap = new THREE.Group();
  const meshes = [], anchors = {}, mats = {};
  const matOf = {};
  const mat = (key, c, o) => (matOf[key + c + (o?.t ?? '')] ||= ((mats[key] ||= new Set()).add(M(c, o)), [...mats[key]].pop()));
  const add = (key, geo, c, x, y, z, o, parent = cap) => {
    const m = new THREE.Mesh(geo, mat(key, c, o)); m.position.set(x, y, z); m.userData.part = key; meshes.push(m); parent.add(m); return m;
  };
  const anchor = (key, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); cap.add(o); anchors[key] = o; };
  const sign = (kind, x, y, z, s = 0.17) => {
    const c = kind === '+' ? 0xd8453a : 0x2f6fc0;
    add('charges', new THREE.BoxGeometry(s, s * 0.28, s * 0.28), c, x, y, z);
    if (kind === '+') add('charges', new THREE.BoxGeometry(s * 0.28, s, s * 0.28), c, x, y, z);
  };
  const arrow = (key, a, b, c, r) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length(); d.normalize();
    const g = new THREE.Group(); const hl = Math.min(r * 6, L * 0.4);
    add(key, new THREE.CylinderGeometry(r, r, Math.max(0.01, L - hl), 12), c, 0, (L - hl) / 2, 0, {}, g);
    add(key, new THREE.ConeGeometry(r * 2.6, hl, 16), c, 0, L - hl / 2, 0, {}, g);
    g.position.copy(A); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); cap.add(g);
  };
  const wire = (pts) => {
    const P = pts.map(q => new THREE.Vector3(...q)); const path = new THREE.CurvePath();
    for (let i = 0; i < P.length - 1; i++) path.add(new THREE.LineCurve3(P[i], P[i + 1]));
    add('wire', new THREE.TubeGeometry(path, 20 * (P.length - 1), 0.045, 8, false), 0x8a5a2b, 0, 0, 0, { m: 0.6, r: 0.35 });
    for (const q of P) add('wire', new THREE.SphereGeometry(0.045, 10, 8), 0x8a5a2b, q.x, q.y, q.z, { m: .6, r: .35 });
  };

  const f = Math.sqrt(p.A / 100);                // مقياس طول الصفيحة
  const w = 3.4 * f, dpt = 2.4 * f;
  const gap = 0.5 + p.d * 0.225;                  // البعد بين الصفيحتين بوحدات النموذج
  const ox = p.connected ? -0.78 : 0;
  add('posPlate', new THREE.BoxGeometry(w, 0.1, dpt), 0xc9858a, ox, gap / 2 + 0.05, 0, { m: .55, r: .3 });
  add('negPlate', new THREE.BoxGeometry(w, 0.1, dpt), 0x86a6cf, ox, -gap / 2 - 0.05, 0, { m: .55, r: .3 });
  if (p.k > 1) add('dielectric', new THREE.BoxGeometry(w * 0.97, gap * 0.9, dpt * 0.97), DCOL[p.k] ?? 0xe9b949, ox, 0, 0, { t: 0.5, r: .25, m: 0 });
  const n = Math.max(1, Math.min(18, p.qn));
  for (let i = 0; i < n; i++) {
    const x = ox - w / 2 + w * (i + 0.5) / n;
    for (const z of [dpt / 2 - 0.05, -dpt / 2 + 0.05]) { sign('+', x, gap / 2 - 0.13, z, Math.min(0.17, w / n * 0.8)); sign('-', x, -gap / 2 + 0.13, z, Math.min(0.17, w / n * 0.8)); }
    for (const z of [-0.4 * f, 0.4 * f]) {
      add('charges', new THREE.SphereGeometry(0.05, 10, 8), 0xd8453a, x, gap / 2 - 0.05, z);
      add('charges', new THREE.SphereGeometry(0.05, 10, 8), 0x2f6fc0, x, -gap / 2 + 0.05, z);
    }
  }
  const ne = Math.max(1, Math.min(12, p.en));
  for (let i = 0; i < ne; i++) for (let k = 0; k < 3; k++) {
    const x = ox - w / 2 + w * (i + 0.5) / ne, z = -dpt / 2 + dpt * (k + 0.5) / 3;
    arrow('field', [x, gap / 2 - 0.24, z], [x, -gap / 2 + 0.24, z], 0xf0a020, 0.028);
  }
  arrow('gap', [ox - w / 2 - 0.35, 0, dpt / 2], [ox - w / 2 - 0.35, gap / 2 + 0.05, dpt / 2], 0x26323f, 0.022);
  arrow('gap', [ox - w / 2 - 0.35, 0, dpt / 2], [ox - w / 2 - 0.35, -gap / 2 - 0.05, dpt / 2], 0x26323f, 0.022);
  if (p.connected) {
    const bx = ox + w / 2 + 1.25, bz = -0.3, L = 1.3, R = 0.3;
    add('battery', new THREE.CylinderGeometry(R, R, L * 0.62, 32), 0x22262c, bx, -L * 0.19, bz, { r: .4, m: .3 });
    add('battery', new THREE.CylinderGeometry(R, R, L * 0.38, 32), 0xe0a526, bx, L * 0.31, bz, { r: .3, m: .5 });
    add('battery', new THREE.CylinderGeometry(R * 0.3, R * 0.3, 0.1, 20), 0xcfd5db, bx, L / 2 + 0.05, bz, { m: .8, r: .2 });
    add('battery', new THREE.BoxGeometry(0.18, 0.05, 0.05), 0x22262c, bx, L * 0.25, bz + R);
    add('battery', new THREE.BoxGeometry(0.05, 0.18, 0.05), 0x22262c, bx, L * 0.25, bz + R);
    add('battery', new THREE.BoxGeometry(0.18, 0.05, 0.05), 0xffffff, bx, -L * 0.3, bz + R);
    const yT = gap / 2 + 0.1, yB = -gap / 2 - 0.1, wx = ox + w / 2 - 0.3, top = Math.max(yT + 0.45, 0.9), bot = Math.min(yB - 0.45, -0.9);
    wire([[wx, yT + 0.02, bz], [wx, top, bz], [bx, top, bz], [bx, 0.72, bz]]);
    wire([[wx, yB - 0.02, bz], [wx, bot, bz], [bx, bot, bz], [bx, -0.72, bz]]);
    anchor('battery', bx, 0.1, bz + R);
    anchor('wire', (wx + bx) / 2, top, bz);
  }
  anchor('posPlate', ox - 0.6 * f, gap / 2 + 0.12, -0.5 * f);
  anchor('negPlate', ox - 0.4 * f, -gap / 2 - 0.12, dpt / 2 - 0.2);
  anchor('field', ox + 0.3 * f, 0.05, dpt / 2 - 0.4);
  anchor('charges', ox + 1.2 * f, gap / 2 - 0.13, dpt / 2);
  anchor('gap', ox - w / 2 - 0.35, 0.05, dpt / 2);
  if (p.k > 1) anchor('dielectric', ox + 0.5 * f, -gap * 0.25, dpt / 2);
  return { cap, meshes, anchors, mats };
}

// الفيزياء: الحالة الكاملة من المدخلات
export const E0 = 8.85e-12;
export function physics(s) {
  const A = s.A * 1e-4, d = s.d * 1e-3, C = s.k * E0 * A / d;
  let dV, Q;
  if (s.connected) { dV = s.V; Q = C * dV; } else { Q = s.Q0; dV = Q / C; }
  return { C, Q, dV, E: dV / d, PE: 0.5 * C * dV * dV };
}
