import * as THREE from './vendor/three.module.js';

export function createCompartmentScene({ canvas, container, reducedMotion, getMovement, isPaused }) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fb9c3');
  const camera = new THREE.PerspectiveCamera(43, 1.6, .1, 80);
  camera.position.set(0, 2.15, 11.5);
  camera.lookAt(0, 1.15, -4);
  const room = new THREE.Group();
  scene.add(room);

  const material = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const paint = material('#5493a8');
  const ceilingPaint = material('#98bfc8');
  const trim = material('#759ca9', .55, .15);
  const darkTrim = material('#234c65');
  const vinyl = material('#17688b', .64);
  const vinylEdge = material('#104d71', .7);
  const vinylHighlight = material('#217d9f', .62);
  const seam = material('#7ab3c7', .9);
  const chrome = material('#a8b4aa', .29, .78);
  const brass = material('#a58b4e', .4, .66);
  const leather = material('#775b3b', .8);
  const leatherBand = material('#493b2a', .75);
  const oliveCanvas = material('#797c55');
  const floorMaterial = material('#64677b', .92);
  const floorLine = material('#55596b');
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

  const wall = box(room, 32, 14, .25, paint, 0, 1.6, -4.6);
  wall.castShadow = false;
  box(room, 32, .07, .16, darkTrim, 0, 4.5, -4.4);
  box(room, 32, .17, .14, trim, 0, -1.6, -4.4);
  box(room, 32, .07, .16, darkTrim, 0, -1.8, -4.4);
  box(room, 32, .35, 22, ceilingPaint, 0, 6.15, 3);
  const floor = box(room, 32, .2, 22, floorMaterial, 0, -2.05, 3);
  floor.castShadow = false;
  for (let i = -14; i <= 14; i++) box(room, .012, .012, 22, floorLine, i * .65, -1.94, 3);
  const sideWalls = [-1, 1].map(side => box(room, .24, 12, 22, paint, side * 6, 2, 3));
  const wallSeams = [-1, 1].map(side => box(room, .11, 9, .12, trim, side * 7, .1, -4.35));
  const swayingBags = [];
  const paper = material('#e8e4cf');
  const ink = material('#435368');
  const rustCloth = material('#b35b3c');
  const canvasBag = material('#c9ba8f');

  const seats = [-1, 1].map(side => {
    const group = new THREE.Group();
    group.rotation.y = -side * Math.PI / 2;
    room.add(group);
    rounded(group, 8.8, 2.5, .3, .18, vinylEdge, 0, .5, 0);
    for (let i = 0; i < 3; i++) {
      rounded(group, 2.86, 2.36, .2, .14, i === 0 ? vinylHighlight : vinyl, (i - 1) * 2.89, .5, .21);
      box(group, .018, 2.0, .012, seam, (i - 1) * 2.89 + 1.28, .5, .35);
      rounded(group, 2.87, .35, 1.9, .12, i === 1 ? vinylHighlight : vinyl, (i - 1) * 2.89, -.88, .98);
      box(group, 2.76, .012, .012, seam, (i - 1) * 2.89, -.84, 1.97);
    }
    box(group, 8.85, .2, 1.85, darkTrim, 0, -1.13, .94);
    for (const armSide of [-1, 1]) {
      tube(group, [[armSide * 4.45, -2.1, 1.8], [armSide * 4.45, -.45, 1.8], [armSide * 4.45, -.12, 1.5], [armSide * 4.45, -.12, .13], [armSide * 4.45, 2.9, .13]], .045, chrome);
      rounded(group, .12, 2.8, .3, .05, trim, armSide * 4.47, .4, .12);
      box(group, .09, .85, .09, chrome, armSide * 3.5, -1.62, .2);
      box(group, .09, .85, .09, chrome, armSide * 3.5, -1.62, 1.65);
    }
    // Shared seats, shared stories: newspapers, a scarf, a tiffin and a bottle.
    if (side === -1) {
      const newspaper = new THREE.Group();
      newspaper.position.set(-1.55, -.66, 1.18); newspaper.rotation.y = .12;
      box(newspaper, 1.35, .025, .86, paper, 0, 0, 0);
      box(newspaper, .98, .008, .07, ink, 0, .02, -.26);
      for (let row = 0; row < 6; row++) {
        for (const col of [-1, 1]) box(newspaper, .46, .008, .014, ink, col * .29, .02, -.1 + row * .07);
      }
      group.add(newspaper);
      const bottleMat = new THREE.MeshPhysicalMaterial({ color: '#9ed6db', transparent: true, opacity: .66, roughness: .2, metalness: .05 });
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .67, 16), bottleMat);
      bottle.position.set(-3.45, -.31, 1.1); group.add(bottle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .1, 12), vinylEdge);
      cap.position.set(-3.45, .075, 1.1); group.add(cap);
    } else {
      box(group, 1.5, .035, .77, rustCloth, 1.55, -.66, 1.27);
      for (let i = 0; i < 5; i++) box(group, 1.5, .01, .028, paper, 1.55, -.636, 1.01 + i * .12);
      box(group, 1.5, .7, .035, rustCloth, 1.55, -1.02, 1.65);
      for (let i = 0; i < 3; i++) {
        const tin = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .17, 24), chrome);
        tin.position.set(3.3, -.56 + i * .18, 1.0); group.add(tin);
      }
      tube(group, [[3.04, -.55, 1], [3.04, .01, 1], [3.3, .12, 1], [3.56, .01, 1], [3.56, -.55, 1]], .025, chrome);
    }
    const tote = new THREE.Group();
    tote.position.set(side * 4.35, .5, .48);
    rounded(tote, .85, 1.05, .27, .11, canvasBag, 0, -.6, 0);
    tube(tote, [[-.25, -.1, 0], [-.23, .35, 0], [.23, .35, 0], [.25, -.1, 0]], .025, leatherBand);
    box(tote, .58, .012, .015, leather, 0, -.56, .17);
    group.add(tote); swayingBags.push(tote);
    for (let shoe = 0; shoe < 2; shoe++) {
      rounded(group, .3, .18, .68, .09, leatherBand, side * 2.55 + shoe * .4, -1.99, 1.5);
      box(group, .31, .045, .69, paper, side * 2.55 + shoe * .4, -2.06, 1.5);
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
    const width = 8.8;
    rack.rotation.y = -side * Math.PI / 2;
    for (const z of [0, .5, 1, 1.5]) tube(rack, [[-width / 2, 0, z], [width / 2, 0, z]], .035, chrome);
    for (let x = -width / 2; x <= width / 2; x += .45) tube(rack, [[x, 0, 0], [x, 0, 1.5]], .024, chrome);
    for (const x of [-width / 2, 0, width / 2]) tube(rack, [[x, -.65, -.1], [x, -.38, 1.45], [x, 0, 1.56]], .04, chrome);
    luggage(rack, 1.8, .85, 1.0, side === -1 ? leather : oliveCanvas, -2.7, .48, .65, side * .035);
    luggage(rack, 1.4, .65, .9, side === -1 ? oliveCanvas : leather, 0, .38, .75, -.03);
    luggage(rack, 1.5, .9, 1, side === -1 ? rustCloth : canvasBag, 2.7, .5, .55, .06);
    return rack;
  });

  const shelf = new THREE.Group();
  room.add(shelf);
  rounded(shelf, 2.1, .1, .9, .05, trim, 0, -.5, -4.05);
  box(shelf, 2.1, .05, .07, chrome, 0, -.48, -3.59);
  tube(shelf, [[-.7, -.55, -3.7], [-.7, -1.1, -4.3]], .03, chrome);
  tube(shelf, [[.7, -.55, -3.7], [.7, -1.1, -4.3]], .03, chrome);

  const lamps = [-1, 1].map(side => {
    const group = new THREE.Group();
    box(group, .38, .14, .15, brass, 0, 0, 0);
    rounded(group, .28, .45, .15, .07, lampMaterial, 0, -.2, .02);
    room.add(group);
    return group;
  });
  const fan = new THREE.Group();
  fan.position.set(0, 5.25, -1.7);
  room.add(fan);
  const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .62, 12), chrome);
  fanStem.position.y = .31; fan.add(fanStem);
  const rotor = new THREE.Group();
  rotor.rotation.x = .12;
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

  scene.add(new THREE.HemisphereLight('#eff9ff', '#526477', 2.5));
  const daylight = new THREE.DirectionalLight('#fff2d9', 2.8);
  daylight.position.set(-4, 6, 8);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(1024, 1024);
  daylight.shadow.camera.left = -13; daylight.shadow.camera.right = 13;
  daylight.shadow.camera.top = 9; daylight.shadow.camera.bottom = -8;
  daylight.shadow.normalBias = .025;
  daylight.shadow.bias = -.0004;
  daylight.shadow.radius = 3;
  scene.add(daylight);
  const bounce = new THREE.PointLight('#bfe5f1', 7, 20, 2);
  bounce.position.set(2, 1, 4); scene.add(bounce);

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    const aspect = width / height;
    const mobile = width <= 760;
    camera.aspect = aspect;
    camera.fov = mobile ? 51 : 43;
    camera.lookAt(0, mobile ? .9 : 1.15, -4);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    const edge = aspect * 2.45 + .15;
    seats.forEach((seat, i) => {
      const side = i === 0 ? -1 : 1;
      seat.position.set(side * edge, .15, 1);
      seat.scale.set(1, 1, mobile ? .45 : 1);
      sideWalls[i].position.x = side * (edge + .28);
      wallSeams[i].position.x = side * (edge + .2);
      racks[i].position.set(side * (edge + .06), mobile ? 5.6 : 4.35, 1);
      racks[i].scale.set(1, 1, mobile ? .4 : 1);
      lamps[i].position.set(side * (mobile ? 1.8 : 6.3), 3.8, -4.2);
    });
    fan.scale.setScalar(mobile ? .65 : 1);
    shelf.scale.x = mobile ? .65 : 1;
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
      swayingBags.forEach((bag, i) => { bag.rotation.z = Math.sin(time * .0016 + i) * (.008 + getMovement() * .025); });
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(render);
}
