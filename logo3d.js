// Extrudes the PT pick logo (assets/product-team-logo.svg) into a slowly spinning 3D badge.
import * as THREE from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

export async function mountLogo(host) {
  const svg = await fetch('assets/product-team-logo.svg').then(r => r.text());
  const data = new SVGLoader().parse(svg);

  const gold = new THREE.MeshStandardMaterial({color: 0xd6a85b, metalness: 1, roughness: .28});
  const cream = new THREE.MeshStandardMaterial({color: 0xf2e8d5, metalness: .15, roughness: .35});
  const logo = new THREE.Group();
  const bevel = {bevelEnabled: true, bevelThickness: .6, bevelSize: .4, bevelSegments: 4, curveSegments: 48};
  const centre = new THREE.Vector2(40, 44);

  data.paths.forEach((path, i) => {
    const style = path.userData.style;
    if (i === 0) {
      // Shield outline is a stroke in the SVG: rebuild it as a ring (outer path with an inset hole).
      const pts = path.toShapes(true)[0].getPoints(160);
      const scaled = k => pts.map(p => p.clone().sub(centre).multiplyScalar(k).add(centre));
      const ring = new THREE.Shape(scaled(1.045));
      ring.holes.push(new THREE.Path(scaled(.955).reverse()));
      logo.add(new THREE.Mesh(new THREE.ExtrudeGeometry(ring, {...bevel, depth: 5}), gold));
      return;
    }
    const mat = style.fill?.toUpperCase() === '#F2E8D5' ? cream : gold;
    // P and T overlap in the SVG (T drawn on top); give T its own front/back planes so they don't z-fight.
    const depth = i === 2 ? 9 : 8, z = i === 2 ? -2 : -1.5;
    for (const shape of SVGLoader.createShapes(path)) {
      const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {...bevel, depth}), mat);
      mesh.position.z = z;
      logo.add(mesh);
    }
  });

  // SVG is y-down; flip and centre on the pivot.
  logo.scale.set(1, -1, 1);
  const box = new THREE.Box3().setFromObject(logo);
  const c = box.getCenter(new THREE.Vector3());
  logo.position.set(-c.x, -c.y, -c.z);
  const pivot = new THREE.Group();
  pivot.add(logo);

  const scene = new THREE.Scene();
  scene.add(pivot);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 2000);
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const rim = new THREE.DirectionalLight(0xffd9a0, 3);
  rim.position.set(-60, 40, -80);
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(60, 80, 100);
  scene.add(rim, key);
  host.appendChild(renderer.domElement);

  // Logo sits right of the copy on wide screens, above it on narrow ones.
  function layout() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    const wide = w > 760;
    camera.position.set(0, 0, wide ? 260 : 470);
    camera.setViewOffset(w, h, wide ? -w * .2 : 0, wide ? h * .02 : h * .24, w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(layout).observe(host);
  layout();

  // Drag to spin; it eases back into the idle rotation.
  let vel = .008, drag = null, tiltX = 0;
  host.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY}; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', e => {
    if (!drag) return;
    vel = (e.clientX - drag.x) * .004;
    tiltX = THREE.MathUtils.clamp(tiltX + (e.clientY - drag.y) * .004, -.5, .5);
    drag = {x: e.clientX, y: e.clientY};
  });
  host.addEventListener('pointerup', () => { drag = null; });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    if (!visible || host.offsetParent === null) return;
    const t = clock.getElapsedTime();
    if (!drag) vel += ((reduced ? 0 : .008) - vel) * .03;
    pivot.rotation.y += vel;
    if (!drag) tiltX *= .95;
    pivot.rotation.x = tiltX + Math.sin(t * .6) * .05;
    pivot.position.y = Math.sin(t * .8) * 1.5;
    renderer.render(scene, camera);
  });
  host.classList.add('is-3d');
}
