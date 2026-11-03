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
    if (spin && group && performance.now() - lastInteraction > 2500) group.rotation.y += .0025;
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
    o.material = isPipe ? PIPE[dn] || PIPE.DN150 : /^EK\b/.test(o.name) ? WEDGE : WOOD;
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
