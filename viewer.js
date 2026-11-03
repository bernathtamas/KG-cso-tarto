import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

const container = document.getElementById('viewer');
const status = document.getElementById('model-status');
const nameLabel = document.getElementById('model-name');
const formatLabel = document.getElementById('model-format');

const WOOD = new THREE.MeshStandardMaterial({color: 0xcfa572, roughness: .72, metalness: 0});
const PIPE = {
  DN200: new THREE.MeshStandardMaterial({color: 0xb5501f, roughness: .42, metalness: .05}),
  DN150: new THREE.MeshStandardMaterial({color: 0xcf6a2a, roughness: .42, metalness: .05}),
  DN100: new THREE.MeshStandardMaterial({color: 0xe0823a, roughness: .42, metalness: .05}),
};
const WEDGE = new THREE.MeshStandardMaterial({color: 0x2a2018, roughness: .6});

let renderer, scene, camera, controls, group, home, spin = true, lastInteraction = 0;
let parts = [], explode = 0, demo = null;
let occtPromise;

function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 1, 100000);
  renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-label', 'Rotatable 3D model of the pipe rack');
  container.prepend(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1, 2, 1.5);
  scene.add(key, new THREE.HemisphereLight(0xffffff, 0x222222, .6));

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.addEventListener('start', () => { lastInteraction = performance.now(); });
  controls.addEventListener('end', () => { lastInteraction = performance.now(); });

  new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }).observe(container);

  // Render only while the viewer is on screen.
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(container);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (spin && !demo && group && performance.now() - lastInteraction > 2500) group.rotation.y += .0025;
    if (demo) poseParts();
    controls.update();
    renderer.render(scene, camera);
  });
}

function frame(object) {
  if (group) {
    scene.remove(group);
    group.traverse(o => o.geometry?.dispose());
  }
  // Wrap so auto-rotation spins around the model's own vertical axis.
  group = new THREE.Group();
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  // Generator output is Z-up (mm); glTF expects Y-up.
  if (size.z > size.y * 1.5) object.rotation.x = -Math.PI / 2;
  object.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(object);
  object.position.sub(box2.getCenter(new THREE.Vector3()));
  group.add(object);
  scene.add(group);

  const s = box2.getSize(new THREE.Vector3());
  const radius = s.length() / 2;
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * .95;
  home = new THREE.Vector3(.75, .42, 1).normalize().multiplyScalar(dist);
  camera.position.copy(home);
  camera.near = dist / 100;
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.minDistance = radius * .4;
  controls.maxDistance = dist * 3;
  controls.update();
  prepareParts();
}

/* ---------- explode + lift-the-rail demo ----------
   Offsets are worked out once in model space (Y up, +Z = front of the rack) and converted into each
   mesh's parent frame, so they keep working while the group spins. Sizes are in mm. */
const KIND = [
  ['pipe', o => o.userData.isPipe], ['rail', o => /zarolec/i.test(o.name)], ['wedge', o => /(^|[_-])ek([_-]|\b)/i.test(o.name)],
  ['wall', o => /oldalfal/i.test(o.name)], ['floor', o => /padlo/i.test(o.name)], ['comb', o => /fesu/i.test(o.name)],
  ['back', o => /hatfal/i.test(o.name)],
];

function prepareParts() {
  parts = [];
  explode = 0;
  demo = null;
  group.updateMatrixWorld(true);
  const meshes = [];
  group.traverse(o => { if (o.isMesh) meshes.push(o); });
  const info = meshes.map(o => ({o, c: new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()),
    kind: (KIND.find(([, f]) => f(o)) || ['other'])[0], mod: (o.name.match(/^([AB])[_-]/) || [])[1]}));
  const centre = {};
  for (const m of ['A', 'B']) {
    const own = info.filter(i => i.mod === m);
    if (own.length) centre[m] = own.reduce((a, i) => a.add(i.c), new THREE.Vector3()).divideScalar(own.length);
  }
  if (!centre.A || !centre.B) return;   // a model without module names: no explode / demo
  for (const i of info) {
    if (!i.mod) i.mod = Math.abs(i.c.x - centre.A.x) < Math.abs(i.c.x - centre.B.x) ? 'A' : 'B';
    const mc = centre[i.mod], side = Math.sign(i.c.x - mc.x) || 1;
    const v = new THREE.Vector3((i.mod === 'A' ? -1 : 1) * 260, 0, 0);
    if (i.kind === 'pipe') v.y += 1100;
    if (i.kind === 'wall') v.x += side * 420;
    if (i.kind === 'wedge') v.x += side * 700;
    if (i.kind === 'floor') v.y -= 280;
    if (i.kind === 'comb') v.z += 380;
    if (i.kind === 'rail') v.z += 650;
    if (i.kind === 'back') v.z -= 380;
    const parent = i.o.parent, inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const toLocal = w => i.c.clone().add(w).applyMatrix4(inv).sub(i.c.clone().applyMatrix4(inv));
    parts.push({...i, p0: i.o.position.clone(), ex: toLocal(v),
      up: toLocal(new THREE.Vector3(0, 1, 0)), fwd: toLocal(new THREE.Vector3(0, 0, 1))});
  }
  // The demo lifts the front-most DN200 pipe of module A.
  const pipesA = parts.filter(p => p.kind === 'pipe' && p.mod === 'A');
  const pick = pipesA.sort((a, b) => b.c.z - a.c.z || b.c.x - a.c.x)[0];
  if (pick) pick.demoPipe = true;
}

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const seg = (t, a, b) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));

function poseParts() {
  let lift = 0, pull = 0, raise = 0;
  if (demo) {
    const t = (performance.now() - demo.t0) / 1000;
    // up 20 mm → pull 160 mm forward → pipe comes up → hold → everything back
    lift = seg(t, 0, .45) - seg(t, 3.9, 4.3);
    pull = seg(t, .45, 1.1) - seg(t, 3.3, 3.9);
    raise = seg(t, 1.1, 1.9) - seg(t, 2.6, 3.3);
    if (t > 4.4) { demo.done(); demo = null; }
  }
  for (const p of parts) {
    const pos = p.p0.clone().addScaledVector(p.ex, explode);
    if (p.kind === 'rail') pos.addScaledVector(p.up, 20 * lift).addScaledVector(p.fwd, 160 * pull);
    if (p.demoPipe) pos.addScaledVector(p.up, 700 * raise);
    p.o.position.copy(pos);
  }
}

export function setExplode(t) {
  explode = t;
  poseParts();
}

export function liftDemo() {
  if (!parts.length) return Promise.resolve(false);
  if (demo) return demo.promise;
  setPipes(true);
  group.rotation.y = 0;
  camera.position.copy(home);
  controls.target.set(0, 0, 0);
  controls.update();
  let done;
  const promise = new Promise(r => { done = () => r(true); });
  demo = {t0: performance.now(), done, promise};
  return promise;
}

function styleGlb(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    // The generator's GLB carries no normals; flat ones keep the plate edges crisp.
    if (!o.geometry.attributes.normal) {
      o.geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      o.geometry.computeVertexNormals();
    }
    // GLB names pipes "cso_DN200_01", the Fusion STEP "KGEM DN200".
    const name = `${o.name} ${o.parent?.name || ''}`;
    const dn = (name.match(/DN(100|150|200)/) || [])[0];
    const isPipe = /cso_|KGEM/i.test(name);
    o.material = isPipe ? PIPE[dn] || PIPE.DN150 : /(^|[_-])ek([_-]|\b)/i.test(o.name) ? WEDGE : WOOD;
    o.userData.isPipe = isPipe;
  });
}

export async function loadGlb(url, label) {
  if (!renderer) init();
  status.textContent = 'LOADING 3D MODEL…';
  const gltf = await new GLTFLoader().loadAsync(url);
  styleGlb(gltf.scene);
  frame(gltf.scene);
  nameLabel.textContent = label;
  formatLabel.textContent = '.GLB';
  status.textContent = '';
  return gltf.scene;
}

function occt() {
  if (!occtPromise) occtPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js';
    script.onload = () => window.occtimportjs({locateFile: p => 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/' + p}).then(resolve, reject);
    script.onerror = reject;
    document.head.appendChild(script);
  }).catch(e => { occtPromise = null; throw e; });
  return occtPromise;
}

export async function loadStep(buffer, label) {
  if (!renderer) init();
  status.textContent = 'PROCESSING STEP…';
  const result = (await occt()).ReadStepFile(new Uint8Array(buffer), {
    linearUnit: 'millimeter', linearDeflectionType: 'bounding_box_ratio', linearDeflection: .001, angularDeflection: .5,
  });
  if (!result.success || !result.meshes?.length) throw Error('Invalid STEP');
  // Fusion leaves the pipe bodies unnamed; their node ("KG csövek") carries the name.
  const nodeOf = [];
  (function walk(n) { n.meshes.forEach(i => { nodeOf[i] = n.name; }); n.children.forEach(walk); })(result.root);
  const root = new THREE.Group();
  for (const [i, m] of result.meshes.entries()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
    if (m.attributes.normal) g.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
    g.setIndex(m.index.array);
    if (!m.attributes.normal) g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, WOOD);
    mesh.name = m.name || nodeOf[i] || '';
    if (/KG cs/i.test(mesh.name)) {
      // DN from the cross-section: pipe 110/160/200 mm, socket 128/183/228 mm (middle bbox side).
      g.computeBoundingBox();
      const d = g.boundingBox.getSize(new THREE.Vector3()).toArray().sort((a, b) => a - b)[1];
      mesh.name = `KGEM DN${d <= 140 ? 100 : d <= 195 ? 150 : 200}`;
    }
    root.add(mesh);
  }
  styleGlb(root);
  frame(root);
  nameLabel.textContent = label;
  formatLabel.textContent = '.STEP';
  status.textContent = '';
  return root;
}

export function setPipes(on) {
  group?.traverse(o => { if (o.userData.isPipe) o.visible = on; });
}
export function setSpin(on) { spin = on; }
export function resetView() {
  if (!home) return;
  group.rotation.y = 0;
  camera.position.copy(home);
  controls.target.set(0, 0, 0);
  controls.update();
}
