import * as THREE from './vendor/three.module.js';

export function createCompartmentScene({ canvas, container, reducedMotion, getMovement, isPaused }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dddcc7');
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, .1, 60);
  camera.position.set(0, 1.4, 15);
  camera.lookAt(0, .05, 0);
  const room = new THREE.Group();
  scene.add(room);

  const material = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const paint = material('#d6d5bc');
  const ceilingPaint = material('#c7cfb5');
  const trim = material('#8e9d7f', .55, .15);
  const darkTrim = material('#526b51');
  const vinyl = material('#224e3c', .58);
  const vinylEdge = material('#193d2d', .7);
  const vinylHighlight = material('#365b44', .6);
  const seam = material('#60816b', .9);
  const chrome = material('#a8b4aa', .29, .78);
  const brass = material('#a58b4e', .4, .66);
  const leather = material('#775b3b', .8);
  const leatherBand = material('#493b2a', .75);
  const oliveCanvas = material('#797c55');
  const floorMaterial = material('#6c7762', .92);
  const floorLine = material('#56634f');
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#fff3cd', emissive: '#ead6a1', emissiveIntensity: .25, roughness: .5 });

  function box(parent, w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function rounded(parent, w, h, d, r, mat, x, y, z) {
    const shape = new THREE.Shape();
    const l = -w / 2, b = -h / 2;
    shape.moveTo(l + r, b);
    shape.lineTo(l + w - r, b); shape.quadraticCurveTo(l + w, b, l + w, b + r);
    shape.lineTo(l + w, b + h - r); shape.quadraticCurveTo(l + w, b + h, l + w - r, b + h);
    shape.lineTo(l + r, b + h); shape.quadraticCurveTo(l, b + h, l, b + h - r);
    shape.lineTo(l, b + r); shape.quadraticCurveTo(l, b, l + r, b);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSize: .045, bevelThickness: .045, bevelSegments: 3, curveSegments: 5, steps: 1 });
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z - d / 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function tube(parent, points, radius, mat) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, radius, 8, false), mat);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const wall = box(room, 32, 12, .25, paint, 0, 0, -2.15);
  wall.castShadow = false;
  box(room, 32, .09, .16, brass, 0, 3.55, -1.93);
  box(room, 32, .18, .14, trim, 0, -3.8, -1.91);
  box(room, 32, .07, .16, darkTrim, 0, -4.02, -1.9);
  box(room, 32, .7, 6, ceilingPaint, 0, 5.1, -.6);
  const floor = box(room, 32, .2, 15, floorMaterial, 0, -4.6, 3);
  floor.castShadow = false;
  for (let i = -14; i <= 14; i++) box(room, .018, .012, 14, floorLine, i * .65, -4.49, 3);
  const sideWalls = [-1, 1].map(side => box(room, 3.5, 10, 6.5, ceilingPaint, side * 9, .5, -1));
  const wallSeams = [-1, 1].map(side => box(room, .035, 8.9, .02, trim, side * 7, .1, -1.99));

  const seats = [-1, 1].map(side => {
    const group = new THREE.Group();
    group.rotation.y = -side * .28;
    room.add(group);
    rounded(group, 2.65, 3.55, .45, .16, vinylEdge, 0, .28, 0);
    for (let i = 0; i < 4; i++) {
      rounded(group, .62, 3.34, .29, .11, i === 0 ? vinylHighlight : vinyl, (i - 1.5) * .64, .31, .29);
      box(group, .009, 2.96, .012, seam, (i - 1.5) * .64 + .23, .28, .49);
    }
    const cushion = rounded(group, 2.68, .39, 2.8, .13, vinyl, 0, -1.47, 1.02);
    cushion.rotation.x = -.015;
    box(group, 2.68, .24, 2.6, vinylEdge, 0, -1.75, .93);
    box(group, 2.35, .11, .02, seam, 0, -1.48, 2.45);
    for (const armSide of [-1, 1]) {
      tube(group, [[armSide * 1.4, -2.75, 2.1], [armSide * 1.4, -1.3, 2.1], [armSide * 1.4, -.92, 1.8], [armSide * 1.4, -.88, .25]], .055, chrome);
      rounded(group, .21, .13, 1.57, .05, vinylEdge, armSide * 1.4, -.82, 1.08);
      box(group, .1, 1, .1, chrome, armSide * 1.03, -2.36, 0);
    }
    return group;
  });

  function luggage(parent, width, height, depth, mat, x, y, z, angle) {
    const group = new THREE.Group();
    group.position.set(x, y, z); group.rotation.z = angle;
    rounded(group, width, height, depth, .12, mat, 0, 0, 0);
    for (const side of [-1, 1]) {
      box(group, .11, height + .02, depth + .025, leatherBand, side * width * .28, 0, 0);
      box(group, .16, .13, .035, brass, side * width * .28, -.08, depth / 2 + .04);
    }
    tube(group, [[-.23, height / 2, 0], [-.2, height / 2 + .16, 0], [.2, height / 2 + .16, 0], [.23, height / 2, 0]], .035, leatherBand);
    parent.add(group);
    return group;
  }
  const racks = [-1, 1].map(side => {
    const rack = new THREE.Group();
    room.add(rack);
    const width = 3.2;
    for (const z of [-1.3, -.7, 0, .7]) tube(rack, [[-width / 2, 0, z], [width / 2, 0, z]], .037, chrome);
    for (let x = -width / 2; x <= width / 2; x += .4) tube(rack, [[x, 0, -1.3], [x, 0, .7]], .027, chrome);
    for (const x of [-width / 2, width / 2]) tube(rack, [[x, -.55, -1.5], [x, -.4, .65], [x, 0, .76]], .045, chrome);
    luggage(rack, 1.95, .75, .9, side === -1 ? leather : oliveCanvas, -.28 * side, .46, -.1, side * .025);
    if (side === -1) luggage(rack, 1.1, .37, .67, oliveCanvas, .3, 1.04, -.23, -.06);
    return rack;
  });

  const shelf = new THREE.Group();
  room.add(shelf);
  rounded(shelf, 5.3, .1, 1.17, .08, paint, 0, -3.15, -1.12);
  box(shelf, 5.3, .06, .07, brass, 0, -3.13, -.49);
  tube(shelf, [[-1.6, -3.18, -.65], [-1.6, -3.62, -1.7]], .035, chrome);
  tube(shelf, [[1.6, -3.18, -.65], [1.6, -3.62, -1.7]], .035, chrome);

  const lamps = [-1, 1].map(side => {
    const group = new THREE.Group();
    box(group, .38, .14, .15, brass, 0, 0, 0);
    rounded(group, .28, .45, .15, .07, lampMaterial, 0, -.2, .02);
    room.add(group);
    return group;
  });
  const fan = new THREE.Group();
  fan.position.set(0, 4.75, .2);
  room.add(fan);
  const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .62, 12), chrome);
  fanStem.position.y = .31; fan.add(fanStem);
  const rotor = new THREE.Group();
  rotor.rotation.x = .9;
  fan.add(rotor);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .18, 24), darkTrim);
  rotor.add(motor);
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Group();
    blade.rotation.y = i * Math.PI * 2 / 3;
    const panel = box(blade, .3, .035, 1.1, trim, 0, 0, .7);
    panel.rotation.z = .1;
    rotor.add(blade);
  }

  scene.add(new THREE.HemisphereLight('#fff5dc', '#7c8c6c', 2.6));
  const daylight = new THREE.DirectionalLight('#fff0ce', 3.1);
  daylight.position.set(-4, 6, 8);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(1024, 1024);
  daylight.shadow.camera.left = -13; daylight.shadow.camera.right = 13;
  daylight.shadow.camera.top = 9; daylight.shadow.camera.bottom = -8;
  daylight.shadow.normalBias = .025;
  daylight.shadow.bias = -.0004;
  daylight.shadow.radius = 3;
  scene.add(daylight);
  const bounce = new THREE.PointLight('#e6e3a4', 8, 16, 2);
  bounce.position.set(2, 1, 4); scene.add(bounce);

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    const aspect = width / height;
    camera.left = -aspect * 5; camera.right = aspect * 5;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const edge = aspect * 5;
    const mobile = width <= 760;
    seats.forEach((seat, i) => {
      const side = i === 0 ? -1 : 1;
      seat.position.set(side * (edge - (mobile ? -.38 : .4)), -1.42, 1.05);
      seat.scale.set(mobile ? .62 : 1, 1.08, 1.08);
      sideWalls[i].position.x = side * (edge + 1.4);
      wallSeams[i].position.x = side * (edge - .4);
      racks[i].position.set(side * (edge - (mobile ? -.85 : 1.1)), 3.0, -.45);
      racks[i].scale.setScalar(mobile ? .65 : 1);
      lamps[i].position.set(side * edge * .73, 2.95, -1.8);
    });
    fan.scale.setScalar(mobile ? .48 : .8);
    fan.position.y = mobile ? 4.6 : 4.75;
    shelf.scale.x = mobile ? .45 : 1;
    shelf.position.y = mobile ? -.15 : 0;
    renderer.render(scene, camera);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  container.classList.add('compartment-3d-ready');
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    container.classList.remove('compartment-3d-ready');
  });
  let last = 0;
  function render(time) {
    requestAnimationFrame(render);
    if (isPaused() || time - last < 40) return;
    last = time;
    if (!reducedMotion) {
      rotor.rotation.y = time * .00085;
      room.rotation.z = Math.sin(time * .008) * getMovement() * .0008;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(render);
}
