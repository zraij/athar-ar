// نموذج خلية حيوانية ثلاثي الأبعاد مبني بالكود (بدون ملفات خارجية)
// نصف القطر = 1 ، الربع المقطوع يواجه +x و +z
import * as THREE from 'three';

export const PARTS = {
  membrane:  { name: 'الغشاء البلازمي', color: '#e2557f', desc: 'طبقتان من الدهون المفسفرة تتخللهما جزيئات بروتينية؛ غشاء رقيق مرن اختياري النفاذية ينظم مرور المواد.' },
  cytoplasm: { name: 'السايتوبلازم', color: '#f6b8cb', desc: 'يقع بين الغشاء البلازمي والنواة: ماء 80% وبروتينات 15% وشحوم وسكريات وأملاح 5%، وتوجد فيه العضيات.' },
  nucleus:   { name: 'النواة', color: '#7b3fa0', desc: 'أهم مكونات الخلية؛ يحيطها غلاف نووي مزدوج فيه ثقوب، وتحوي البلازم النووي والنوية والشبكة الكروماتينية.' },
  nucleolus: { name: 'النوية', color: '#3d1757', desc: 'تركيب كروي داخل النواة يتكون من البروتين والحامض النووي RNA، ولها دور في تكوين الرايبوسومات.' },
  mito:      { name: 'المايتوكوندريا', color: '#ff8a3d', desc: 'بيوت الطاقة: وظيفتها الرئيسة التنفس الخلوي وإنتاج معظم جزيئات ATP، وغشاؤها الداخلي فيه أعراف.' },
  er:        { name: 'الشبكة البلازمية الداخلية الخشنة', color: '#3b8fd6', desc: 'نظام شبكي من نبيبات وحويصلات تلتصق بها الرايبوسومات فتبدو خشنة؛ لها دور في بناء البروتينات ونقل المواد إلى جهاز كولجي.' },
  ribosome:  { name: 'الرايبوسومات', color: '#1b2a49', desc: 'حبيبات صغيرة حرة في السايتوبلازم أو على الشبكة الخشنة، فيها تُبنى البروتينات.' },
  golgi:     { name: 'جهاز كولجي', color: '#f2c230', desc: 'جهاز إفرازي من صهاريج وحويصلات وفجوات؛ يفرز البروتينات والهورمونات والإنزيمات ويبني السكريات المعقدة.' },
  lysosome:  { name: 'الجسيمات الحالة', color: '#6cc04a', desc: 'حويصلات بغشاء أحادي تحوي أكثر من 40 إنزيماً محللاً، مسؤولة عن الهضم داخل الخلية.' },
  centriole: { name: 'الجسيم المركزي', color: '#e05b7a', desc: 'مريكزان متعامدان، كل منهما 9 مجاميع × 3 نبيبات دقيقة؛ له دور في انقسام الخلية الحيوانية.' },
};

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0, ...extra });
}

// مولد عشوائي ثابت حتى يكون الشكل نفسه كل مرة
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function buildCell() {
  const cell = new THREE.Group();
  const meshes = [];          // كل الأجزاء القابلة للمس
  const anchors = {};         // نقاط وضع الأسماء
  const mats = {};            // مواد كل جزء (للتظليل عند الاختيار)
  const rand = rng(1120);

  const reg = (key, mesh) => {
    mesh.userData.part = key; meshes.push(mesh);
    (mats[key] ||= new Set()).add(mesh.material);
    return mesh;
  };
  const anchor = (key, x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); cell.add(o); anchors[key] = o; };

  // ----- الغشاء البلازمي: كرة مقطوع منها ربع -----
  const wedgeGroup = new THREE.Group();
  wedgeGroup.rotation.y = Math.PI; // يجعل الفتحة تواجه +x و +z
  cell.add(wedgeGroup);
  const shellGeo = new THREE.SphereGeometry(1, 96, 64, 0, Math.PI * 1.5);
  const shellMat = mat(PARTS.membrane.color, { roughness: 0.35 });
  wedgeGroup.add(reg('membrane', new THREE.Mesh(shellGeo, shellMat)));
  const rimGeo = new THREE.SphereGeometry(0.965, 96, 64, 0, Math.PI * 1.5);
  const rimMat = mat('#f9cddb', { side: THREE.BackSide });
  wedgeGroup.add(reg('cytoplasm', new THREE.Mesh(rimGeo, rimMat)));

  // وجها المقطع (السايتوبلازم)
  const cutMat = mat(PARTS.cytoplasm.color, { side: THREE.DoubleSide, roughness: 0.8 });
  const half = new THREE.CircleGeometry(0.965, 72, Math.PI / 2, Math.PI);
  const faceA = new THREE.Mesh(half, cutMat); // المستوي z=0 جهة x<0 (قبل الدوران)
  const faceB = new THREE.Mesh(half, cutMat); faceB.rotation.y = -Math.PI / 2; // المستوي x=0 جهة z<0
  wedgeGroup.add(reg('cytoplasm', faceA)); wedgeGroup.add(reg('cytoplasm', faceB));
  // حلقة الغشاء على حافة المقطع
  const edgeMat = mat('#c2185b');
  for (const r of [0, -Math.PI / 2]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.985, 0.022, 10, 80, Math.PI), edgeMat);
    t.rotation.z = Math.PI / 2; const g = new THREE.Group(); g.add(t); g.rotation.y = r; wedgeGroup.add(g);
    reg('membrane', t);
  }

  // بعد الدوران: المستوي A هو z=0 مع x>0 ، والمستوي B هو x=0 مع z>0
  const onA = (u, v, off = 0.0) => new THREE.Vector3(u, v, off);  // u = بعد عن المحور
  const onB = (u, v, off = 0.0) => new THREE.Vector3(off, v, u);

  // ----- النواة (مقطوعة أيضاً) -----
  const nuc = new THREE.Group(); nuc.rotation.y = Math.PI; cell.add(nuc);
  const nucMat = mat(PARTS.nucleus.color, { roughness: 0.4 });
  nuc.add(reg('nucleus', new THREE.Mesh(new THREE.SphereGeometry(0.36, 64, 48, 0, Math.PI * 1.5), nucMat)));
  const nucCut = mat('#b07fd0', { side: THREE.DoubleSide, roughness: 0.9 });
  const nhalf = new THREE.CircleGeometry(0.355, 48, Math.PI / 2, Math.PI);
  const na = new THREE.Mesh(nhalf, nucCut); na.position.z = 0.004;
  const nb = new THREE.Mesh(nhalf, nucCut); nb.rotation.y = -Math.PI / 2; nb.position.x = -0.004;
  nuc.add(reg('nucleus', na)); nuc.add(reg('nucleus', nb));
  // ثقوب الغلاف النووي
  const poreMat = mat('#f3e6ff');
  for (let i = 0; i < 40; i++) {
    const th = rand() * Math.PI * 2, ph = Math.acos(2 * rand() - 1);
    const p = new THREE.Vector3().setFromSphericalCoords(0.362, ph, th);
    if (p.x < 0 && p.z < 0) continue;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), poreMat); m.position.copy(p).applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI);
    reg('nucleus', m); cell.add(m);
  }
  // الكروماتين على وجهي المقطع
  const chromMat = mat('#4a1d6b');
  for (let i = 0; i < 60; i++) {
    const u = 0.15 + rand() * 0.18, v = (rand() - 0.5) * 0.6; if (u * u + v * v > 0.33 * 0.33) continue;
    const p = rand() < 0.5 ? onA(u, v, 0.008) : onB(u, v, 0.008);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012 + rand() * 0.012, 6, 5), chromMat); m.position.copy(p); cell.add(reg('nucleus', m));
  }
  // النوية
  const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), mat(PARTS.nucleolus.color, { roughness: 0.6 }));
  nucleolus.position.set(0.02, 0.06, 0.02); cell.add(reg('nucleolus', nucleolus));

  // ----- المايتوكوندريا -----
  const mitoMat = mat(PARTS.mito.color, { roughness: 0.45 });
  const cristaMat = mat('#c4510c');
  const mitoAt = (p, rotZ, axis) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.2, 8, 20), mitoMat); body.rotation.z = Math.PI / 2; g.add(reg('mito', body));
    for (let i = 0; i < 5; i++) { // الأعراف
      const c = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 16, Math.PI), cristaMat);
      c.position.x = -0.12 + i * 0.06; c.rotation.y = Math.PI / 2; c.rotation.x = (i % 2) * Math.PI; c.position.z = 0.03;
      g.add(reg('mito', c));
    }
    g.position.copy(p); g.rotation.z = rotZ; if (axis === 'B') g.rotation.y = -Math.PI / 2;
    cell.add(g); return g;
  };
  mitoAt(onA(0.62, 0.42, 0.04), 0.6);
  mitoAt(onA(0.58, -0.5, 0.04), -0.4);
  mitoAt(onB(0.6, -0.35, 0.04), 0.3, 'B');
  mitoAt(onB(0.45, 0.6, 0.04), -0.5, 'B');
  // واحدة كاملة داخل الفتحة تطفو قليلاً
  mitoAt(new THREE.Vector3(0.45, -0.1, 0.42), 0.9);

  // ----- الشبكة الاندوبلازمية الخشنة -----
  const erMat = mat(PARTS.er.color, { roughness: 0.4 });
  const riboMat = mat(PARTS.ribosome.color, { roughness: 0.7 });
  const riboPts = [];
  const erArc = (plane, r0, a0, a1, phase) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = a0 + (a1 - a0) * i / 40; const r = r0 + Math.sin(i * 0.9 + phase) * 0.03;
      const u = Math.cos(a) * r, v = Math.sin(a) * r;
      pts.push(plane === 'A' ? onA(Math.abs(u), v, 0.02) : onB(Math.abs(u), v, 0.02));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    cell.add(reg('er', new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.02, 8), erMat)));
    for (let i = 0; i < 16; i++) { const p = curve.getPoint(rand()); p.add(new THREE.Vector3((rand()-.5)*.04, (rand()-.5)*.04, (rand()-.5)*.04)); riboPts.push(['er', p]); }
  };
  for (let k = 0; k < 3; k++) { erArc('A', 0.43 + k * 0.07, -1.3, -0.15, k); erArc('B', 0.43 + k * 0.07, 0.1, 1.2, k + 2); }
  anchors.er = new THREE.Object3D(); anchors.er.position.copy(onA(Math.cos(-0.7) * 0.5, Math.sin(-0.7) * 0.5, 0.04)); cell.add(anchors.er);

  // ----- أجسام كولجي -----
  const golgiMat = mat(PARTS.golgi.color, { roughness: 0.45 });
  const golgi = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.16 - i * 0.012, 0.016, 8, 30, Math.PI * 0.75), golgiMat);
    t.position.y = -i * 0.042; t.rotation.z = Math.PI * 0.125; t.scale.set(1, 1, 2.2); golgi.add(reg('golgi', t));
  }
  for (let i = 0; i < 5; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 10), golgiMat); v.position.set(-0.2 + rand() * 0.4, 0.08 + rand() * 0.06, (rand() - .5) * .06); golgi.add(reg('golgi', v)); }
  golgi.position.copy(onA(0.6, 0.12, 0.05)); golgi.rotation.z = -0.3; cell.add(golgi);

  // ----- الأجسام الحالّة -----
  const lysoMat = mat(PARTS.lysosome.color, { roughness: 0.35 });
  [onA(0.82, -0.12, 0.05), onB(0.7, 0.25, 0.05), onB(0.28, -0.62, 0.05), new THREE.Vector3(0.3, 0.35, 0.3)].forEach((p, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 18), lysoMat); m.position.copy(p); cell.add(reg('lysosome', m));
    if (i === 0) anchor('lysosome', p.x, p.y + 0.07, p.z);
  });

  // ----- الجسيم المركزي -----
  const cenMat = mat(PARTS.centriole.color, { roughness: 0.45 });
  const cen = new THREE.Group();
  const c1 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 18), cenMat);
  const c2 = c1.clone(); c2.rotation.z = Math.PI / 2; c2.position.set(0.07, 0.02, 0);
  cen.add(reg('centriole', c1)); cen.add(reg('centriole', c2));
  cen.position.set(0.3, -0.42, 0.28); cell.add(cen);

  // ----- رايبوسومات حرة -----
  for (let i = 0; i < 170; i++) {
    const u = 0.4 + rand() * 0.52, v = (rand() - .5) * 1.8; if (u * u + v * v > 0.92 * 0.92) continue;
    riboPts.push(['ribosome', rand() < 0.5 ? onA(u, v, 0.012) : onB(u, v, 0.012)]);
  }
  const rg = new THREE.SphereGeometry(0.014, 6, 5);
  riboPts.forEach(([k, p]) => { const m = new THREE.Mesh(rg, riboMat); m.position.copy(p); cell.add(reg(k === 'er' ? 'ribosome' : 'ribosome', m)); });

  // ----- نقاط الأسماء -----
  anchor('membrane', -0.42, 0.62, 0.66);
  anchor('cytoplasm', 0.78, -0.42, 0.02);
  anchor('nucleus', 0.2, 0.3, 0.05);
  anchor('nucleolus', 0.1, 0.14, 0.1);
  anchor('mito', 0.62, 0.5, 0.08);
  anchor('golgi', 0.62, 0.2, 0.09);
  anchor('centriole', 0.33, -0.36, 0.3);
  anchor('ribosome', 0.012, -0.72, 0.5);

  return { cell, meshes, anchors, mats };
}
