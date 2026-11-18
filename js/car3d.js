/* =========================================================
   VORTEX WRAPS — 3D wrap preview (three.js)
   Upgrades every [data-car] box (booking summary + the home
   finish configurator) from the flat SVG drawn by car.js to a
   real-time 3D coupé. The box API is unchanged, so main.js and
   book.js drive it exactly as before:
     colour  → CSS variable --car on the box
     finish  → data-finish = gloss | satin | matte | metallic | chrome
     .is-changing class → the wheels spin once
   No WebGL, CDN blocked or an old browser → the SVG simply stays.
   ========================================================= */
const boxes = [...document.querySelectorAll('[data-car]')];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

if (boxes.length && hasWebGL()) {
  let lib = null;
  // three.js (~170 KB gzipped) is only fetched when a car is about to scroll into view
  const load = () => (lib ||= Promise.all([
    import('three'),
    import('three/addons/environments/RoomEnvironment.js'),
  ]));
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    load()
      .then(([THREE, env]) => { try { mount(en.target, THREE, env.RoomEnvironment); } catch (err) { console.warn('3D car unavailable, keeping the illustration.', err); } })
      .catch(() => { /* offline / CDN blocked: keep the SVG */ });
  }), { rootMargin: '600px 0px' });
  boxes.forEach(b => io.observe(b));
}

/* ---------- finishes: physically based paint settings ---------- */
const FINISHES = {
  gloss:    { metalness: 0.05, roughness: 0.32, clearcoat: 1.0,  clearcoatRoughness: 0.03 },
  satin:    { metalness: 0.25, roughness: 0.5,  clearcoat: 0.3,  clearcoatRoughness: 0.5 },
  matte:    { metalness: 0.0,  roughness: 0.92, clearcoat: 0.0,  clearcoatRoughness: 1.0 },
  metallic: { metalness: 0.75, roughness: 0.3,  clearcoat: 1.0,  clearcoatRoughness: 0.04 },
  chrome:   { metalness: 1.0,  roughness: 0.07, clearcoat: 1.0,  clearcoatRoughness: 0.02 },
};

/* ---------- small helpers ---------- */
const clamp01 = t => Math.min(1, Math.max(0, t));
const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - Math.pow(1 - t, 3);

// monotone cubic interpolation (no overshoot) for the side silhouette
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  return x => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

function radialTexture(THREE, inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* =========================================================
   The car — a coupé lofted from cross-sections (units ≈ metres,
   front of the car points to +x, y is up, z is across)
   ========================================================= */
function buildCar(THREE) {
  const HL = 2.25, W2 = 0.92;            // half length, half width
  const WR = 0.34, AR = 0.43;            // wheel radius, wheel-arch radius
  const FX = 1.38, RX = -1.40, TZ = 0.79; // axle positions, wheel track (half)

  const topY = monotone(
    [-2.25, -2.20, -2.00, -1.70, -1.25, -0.80, -0.30, 0.02, 0.30, 0.72, 1.05, 1.60, 2.05, 2.20, 2.25],
    [0.90, 0.93, 0.95, 1.02, 1.17, 1.30, 1.32, 1.27, 1.13, 0.95, 0.92, 0.87, 0.79, 0.72, 0.66],
  );
  const beltY = x => (x >= 0.72 ? 0.95 : 0.95 + (0.72 - x) * 0.016);
  const halfW = x => W2 * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(x) / HL), 6)), 1 / 6);
  const botY = x => {
    let y = 0.17;
    if (x > 1.9) y += 0.05 * smooth((x - 1.9) / 0.35);
    if (x < -1.95) y += 0.10 * smooth((-1.95 - x) / 0.30);
    for (const wx of [FX, RX]) {
      const d = x - wx;
      if (Math.abs(d) < AR) y = Math.max(y, WR + Math.sqrt(AR * AR - d * d));
    }
    return y;
  };

  /* one half cross-section, bottom-centre → top-centre: [z, y, kind] */
  function half(x) {
    const zh = Math.max(halfW(x), 0.0005);
    const yb = botY(x), yt = topY(x), belt = beltY(x);
    const gh = Math.max(0, yt - belt), g = smooth(gh / 0.22);   // greenhouse (cabin) amount
    const be = Math.min(belt, yt);
    const rb = Math.min(0.06, (be - yb) * 0.3, zh * 0.5);
    const trimTop = Math.max(yb + rb, Math.min(yb + 0.10, 0.27));
    const rs = Math.max(0.004, Math.min(0.08, (be - trimTop) * 0.45, zh * 0.5));
    const zA = Math.max(0, zh - rs - 0.035 * g);
    const zB = zA - (zA - 0.64 * zh) * g;
    const rr = Math.min(0.07 * g, zB * 0.5);
    const crown = 0.02;
    const out = [];
    const part = (kind, n, f) => { for (let i = 0; i < n; i++) out.push([...f(i / n), kind]); };
    const line = (z0, y0, z1, y1) => t => [z0 + (z1 - z0) * t, y0 + (y1 - y0) * t];
    const arc = (cz, cy, r, a0, a1) => t => { const a = a0 + (a1 - a0) * t; return [cz + r * Math.cos(a), cy + r * Math.sin(a)]; };
    part('trim', 3, line(0, yb, zh - rb, yb));                          // underside
    part('trim', 5, arc(zh - rb, yb + rb, rb, -Math.PI / 2, 0));       // lower corner
    part('trim', 2, line(zh, yb + rb, zh, trimTop));                    // sill / bumper cladding
    part('body', 5, t => [zh - 0.035 * Math.pow(1 - t, 2), trimTop + (be - rs - trimTop) * t]); // door & bumper sides (tuck-under)
    part('body', 5, arc(zh - rs, be - rs, rs, 0, Math.PI / 2));         // shoulder
    part('body', 1, line(zh - rs, be, zA, be));                         // ledge under the glass
    part('glass', 6, t => [zA + (zB - zA) * t + 0.03 * g * Math.sin(Math.PI * t), be + (yt - rr - be) * t]);
    part('pillar', 4, arc(zB - rr, yt - rr, rr, 0, Math.PI / 2));       // roof rails, A & C pillars
    part('roof', 5, t => [(zB - rr) * (1 - t), yt + crown * Math.sin(Math.PI / 2 * t)]);
    out.push([0, yt + crown, 'roof']);
    return out;
  }

  const H = half(0).length;          // 37 points per half
  const R = 2 * H - 2;               // full ring
  const kinds = half(0).map(p => p[2]);
  const segKind = r => { const h = r <= H - 1 ? r : R - r; const h2 = (r + 1) % R <= H - 1 ? (r + 1) % R : R - ((r + 1) % R); return kinds[Math.min(h, h2)]; };

  const S = 360;
  const xs = [];
  for (let i = 0; i <= S; i++) {
    const t = -1 + (2 * i) / S;
    xs.push(HL * Math.sign(t) * (1 - Math.pow(1 - Math.abs(t), 1.5)));   // denser towards the bumpers
  }
  const pos = new Float32Array((S + 1) * R * 3);
  xs.forEach((x, i) => {
    const h = half(x);
    for (let r = 0; r < R; r++) {
      const [z, y] = r <= H - 1 ? h[r] : h[R - r];
      const k = (i * R + r) * 3;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = r <= H - 1 ? z : -z;
    }
  });
  const groups = [[], [], []]; // paint, glass, trim
  for (let i = 0; i < S; i++) {
    const xm = (xs[i] + xs[i + 1]) / 2, gh = topY(xm) - beltY(xm);
    for (let r = 0; r < R; r++) {
      const a = i * R + r, b = i * R + ((r + 1) % R), c = (i + 1) * R + ((r + 1) % R), d = (i + 1) * R + r;
      const kind = segKind(r);
      let m = 0;
      if (kind === 'trim') m = 2;
      else if (kind === 'glass') m = gh > 0.04 && xm > -1.62 && xm < 0.70 ? (xm > -0.60 && xm < -0.50 ? 2 : 1) : 0;
      else if (kind === 'roof') m = gh > 0.04 && ((xm > 0.0 && xm < 0.74) || (xm < -0.86 && xm > -2.0)) ? 1 : 0;
      groups[m].push(a, d, b, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const index = [];
  groups.forEach((g, m) => { geo.addGroup(index.length, g.length, m); index.push(...g); });
  geo.setIndex(index);
  geo.computeVertexNormals();

  /* materials */
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x7d8084, ...FINISHES.satin });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x06080b, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.45, metalness: 0.2 });
  const tyreM = new THREE.MeshStandardMaterial({ color: 0x131313, roughness: 0.9, side: THREE.DoubleSide });
  const rimM = new THREE.MeshStandardMaterial({ color: 0x45484e, metalness: 0.9, roughness: 0.28 });
  const rimInner = new THREE.MeshStandardMaterial({ color: 0x0e0e0f, metalness: 0.5, roughness: 0.6, side: THREE.DoubleSide });
  const discM = new THREE.MeshStandardMaterial({ color: 0x6b6d72, metalness: 0.9, roughness: 0.45 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe3141b, roughness: 0.35, metalness: 0.1 });
  const gloss = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0b, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  const head = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const tail = new THREE.MeshBasicMaterial({ color: 0xff1f26 });

  const car = new THREE.Group();
  car.add(new THREE.Mesh(geo, [paint, glass, trim]));

  // underbody — hides the gap behind the wheels
  const under = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.4, 1.3), trim);
  under.position.set(0, 0.42, 0);
  car.add(under);

  /* lights, intake, mirrors, shut lines */
  const noseX = z => HL * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(z) / W2, 6)), 1 / 6);
  const tube = (pts, r, mat) => new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 48, r, 10, false), mat);
  for (const s of [1, -1]) {
    const pts = [];
    for (let k = 0; k <= 14; k++) { const z = s * (0.30 + 0.52 * k / 14); pts.push([noseX(z) - 0.004, 0.52 + 0.035 * k / 14, z]); }
    car.add(tube(pts, 0.026, head));
  }
  const tailPts = [], grille = [];
  for (let k = 0; k <= 30; k++) { const z = -0.86 + 1.72 * k / 30; tailPts.push([-noseX(z) + 0.004, 0.78, z]); }
  for (let k = 0; k <= 20; k++) { const z = -0.6 + 1.2 * k / 20; grille.push([noseX(z) - 0.01, 0.34, z]); }
  car.add(tube(tailPts, 0.022, tail));
  car.add(tube(grille, 0.045, trim));
  for (const s of [1, -1]) {
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), gloss);
    mirror.scale.set(0.09, 0.05, 0.075);
    mirror.position.set(0.5, 1.02, s * 0.95);
    car.add(mirror);
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.12), trim);
    stalk.position.set(0.55, 0.99, s * 0.87);
    car.add(stalk);
    for (const sx of [0.70, -0.62]) {          // door shut lines
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.56, 0.004), trim);
      line.position.set(sx, 0.58, s * (halfW(sx) + 0.001));
      car.add(line);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.022, 0.012), trim);
    handle.position.set(-0.36, 0.80, s * (halfW(-0.36) + 0.004));
    car.add(handle);
  }

  /* wheels */
  const spinners = [];
  function wheel() {
    const g = new THREE.Group(), spin = new THREE.Group();
    g.add(spin);
    const ri = 0.245, ro = WR, hw = 0.115, rc = 0.05, prof = [new THREE.Vector2(ri, -hw)];
    for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + (k / 6) * Math.PI / 2; prof.push(new THREE.Vector2(ro - rc + rc * Math.cos(a), -hw + rc + rc * Math.sin(a))); }
    for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; prof.push(new THREE.Vector2(ro - rc + rc * Math.cos(a), hw - rc + rc * Math.sin(a))); }
    prof.push(new THREE.Vector2(ri, hw));
    const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), tyreM);
    tyre.rotation.x = Math.PI / 2;
    spin.add(tyre);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.2, 48, 1, true), rimInner);
    barrel.rotation.x = Math.PI / 2;
    spin.add(barrel);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.022, 48), discM);
    disc.rotation.x = Math.PI / 2;
    disc.position.z = 0.01;
    spin.add(disc);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.238, 0.013, 10, 64), rimM);
    lip.position.z = 0.095;
    spin.add(lip);
    for (let k = 0; k < 5; k++) {
      for (const off of [-0.12, 0.12]) {          // five twin spokes
        const a = (k / 5) * Math.PI * 2 + off;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.19, 0.034), rimM);
        sp.position.set(Math.cos(a) * 0.135, Math.sin(a) * 0.135, 0.085);
        sp.rotation.z = a - Math.PI / 2;
        spin.add(sp);
      }
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.066, 0.05, 28), rimM);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = 0.09;
    spin.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 24), red);
    cap.rotation.x = Math.PI / 2;
    cap.position.z = 0.118;
    spin.add(cap);
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.07), red);  // stays still
    const ca = (150 * Math.PI) / 180;
    caliper.position.set(Math.cos(ca) * 0.17, Math.sin(ca) * 0.17, 0.045);
    caliper.rotation.z = ca - Math.PI / 2;
    g.add(caliper);
    spinners.push(spin);
    return g;
  }
  for (const [x, z] of [[FX, TZ], [FX, -TZ], [RX, TZ], [RX, -TZ]]) {
    const w = wheel();
    w.position.set(x, WR, z);
    if (z < 0) w.scale.z = -1;   // mirror for the left side
    car.add(w);
  }

  return { car, paint, spinners };
}

/* =========================================================
   Mount one 3D viewer into a [data-car] box
   ========================================================= */
function mount(box, THREE, RoomEnvironment) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 7, 5);
  const rim = new THREE.DirectionalLight(0xfff1f1, 1.0);   // neutral back light — coloured light would falsify the wrap colour
  rim.position.set(-7, 2.5, -4);
  scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0x220000, 0.35));

  const { car, paint, spinners } = buildCar(THREE);
  const stand = new THREE.Group();     // the turntable
  stand.add(car);
  scene.add(stand);

  // floor: soft contact shadow + a glow in the wrap colour
  const flat = (w, d, mat, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = -1; return m; };
  const glow = new THREE.MeshBasicMaterial({ map: radialTexture(THREE, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const shadowTex = radialTexture(THREE, 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0)');
  stand.add(flat(6.2, 3.2, glow, 0.001));
  stand.add(flat(5.6, 2.7, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.85, depthWrite: false }), 0.002));
  stand.add(flat(4.6, 1.9, new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.7, depthWrite: false }), 0.003));

  const camera = new THREE.PerspectiveCamera(26, 2, 0.1, 100);
  const target = new THREE.Vector3(0, 0.56, 0);
  const place = dist => {
    const az = THREE.MathUtils.degToRad(38), el = THREE.MathUtils.degToRad(11);
    camera.position.set(dist * Math.cos(el) * Math.cos(az), target.y + dist * Math.sin(el), dist * Math.cos(el) * Math.sin(az));
    camera.lookAt(target);
  };

  /* swap the SVG for the canvas */
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive 3D model of a coupé showing the selected wrap colour and finish. Drag to rotate.');
  canvas.style.touchAction = 'pan-y';   // vertical swipes still scroll the page on phones
  const hint = document.createElement('span');
  hint.className = 'car3d__hint';
  hint.setAttribute('aria-hidden', 'true');
  hint.textContent = 'Drag to rotate';
  box.querySelector('svg')?.remove();
  box.classList.add('is-3d');
  box.dataset.cursor = 'Drag';
  box.append(canvas, hint);

  /* state */
  let dirty = true, visible = true, raf = 0, last = performance.now();
  let angle = -0.35, vel = 0, drag = null, idleUntil = 0, spinT = 1, wheelAngle = 0;
  const finishNow = { ...FINISHES.satin }, finishGoal = { ...FINISHES.satin };
  const colourNow = new THREE.Color(), colourGoal = new THREE.Color();

  const readColour = () => (box.style.getPropertyValue('--car') || getComputedStyle(box).getPropertyValue('--car') || '#7d8084').trim();
  const setColour = () => { try { colourGoal.set(readColour()); } catch { /* ignore bad values */ } dirty = true; };
  const setFinish = () => { Object.assign(finishGoal, FINISHES[box.dataset.finish] || FINISHES.satin); dirty = true; };
  setColour(); setFinish();
  colourNow.copy(colourGoal); Object.assign(finishNow, finishGoal);

  new MutationObserver(records => {
    for (const r of records) {
      if (r.attributeName === 'style') setColour();
      if (r.attributeName === 'data-finish') setFinish();
      if (r.attributeName === 'class' && box.classList.contains('is-changing') && !(r.oldValue || '').includes('is-changing')) spinT = 0;
    }
  }).observe(box, { attributes: true, attributeFilter: ['style', 'data-finish', 'class'], attributeOldValue: true });

  /* drag to rotate (with a little inertia) */
  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, t: performance.now() };
    vel = 0;
    canvas.setPointerCapture(e.pointerId);
    hint.classList.add('is-hidden');
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dx = e.clientX - drag.x;
    angle += dx * 0.009;
    vel = (dx * 0.009) / Math.max(1, now - drag.t) * 16;
    drag.x = e.clientX; drag.t = now; dirty = true;
  });
  const release = () => { drag = null; idleUntil = performance.now() + 2500; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* size */
  const resize = () => {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2, hf = Math.atan(Math.tan(vf) * camera.aspect);
    place(Math.max(2.45 / Math.sin(hf), 1.0 / Math.sin(vf)));
    dirty = true;
  };
  new ResizeObserver(resize).observe(box);
  resize();

  /* render loop — runs only while the car is on screen */
  const frame = now => {
    raf = 0;
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!drag) {
      if (Math.abs(vel) > 0.0005) { angle += vel; vel *= 0.93; dirty = true; }
      else if (!reduce && now > idleUntil) { angle += dt * 0.22; dirty = true; }
    }
    stand.rotation.y = angle;

    const k = reduce ? 1 : 1 - Math.pow(0.002, dt);   // ~0.5s ease towards the new paint
    if (colourNow.getHex() !== colourGoal.getHex() || Object.keys(finishGoal).some(p => Math.abs(finishNow[p] - finishGoal[p]) > 0.002)) {
      colourNow.lerp(colourGoal, k);
      for (const p in finishGoal) finishNow[p] += (finishGoal[p] - finishNow[p]) * k;
      if (Math.abs(colourNow.r - colourGoal.r) + Math.abs(colourNow.g - colourGoal.g) + Math.abs(colourNow.b - colourGoal.b) < 0.002) colourNow.copy(colourGoal);
      dirty = true;
    }
    paint.color.copy(colourNow);
    Object.assign(paint, finishNow);
    glow.color.copy(colourNow);

    if (spinT < 1) {                         // colour change: wheels spin once, body dips
      spinT = reduce ? 1 : Math.min(1, spinT + dt / 0.9);
      wheelAngle = -Math.PI * 2 * easeOut(spinT);
      spinners.forEach(s => { s.rotation.z = wheelAngle; });
      car.position.y = -0.025 * Math.sin(Math.PI * spinT);
      dirty = true;
    }

    if (dirty) { renderer.render(scene, camera); dirty = false; }
  };
  const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { dirty = true; start(); } }).observe(box);
  document.addEventListener('visibilitychange', start);
  start();
}
