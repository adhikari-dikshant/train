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
  const paint = material('#648e9c', .96);
  const ceilingPaint = material('#9fb8bc', .96);
  const trim = material('#759ca9', .55, .15);
  const darkTrim = material('#234c65');
  const vinyl = material('#346d83', .9);
  const vinylEdge = material('#28576d', .94);
  const vinylHighlight = material('#437c90', .91);
  const seam = material('#7ab3c7', .9);
  const chrome = material('#a2ada8', .58, .64);
  const brass = material('#a58b4e', .4, .66);
  const leather = material('#775b3b', .8);
  const leatherBand = material('#493b2a', .75);
  const oliveCanvas = material('#797c55');
  const floorMaterial = material('#64677b', .92);
  const floorLine = material('#55596b');
  const lampMaterial = new THREE.MeshStandardMaterial({ color: '#fff3cd', emissive: '#ead6a1', emissiveIntensity: .25, roughness: .5 });

  // Small, authored surface variations replace the perfectly clean CGI finish.
  // These are code-native materials; no generated or retouched photographs.
  let textureSeed = 9137;
  const random = () => { textureSeed = (textureSeed * 1664525 + 1013904223) >>> 0; return textureSeed / 4294967296; };
  function surfaceTexture(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#e9e7df'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6500; i++) {
      const value = 130 + Math.floor(random() * 110);
      ctx.fillStyle = `rgba(${value},${value},${value},${kind === 'cloth' ? .21 : .11})`;
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1);
    }
    if (kind === 'cloth') {
      for (let y = 0; y < 256; y += 3) { ctx.fillStyle = '#5f625d12'; ctx.fillRect(0, y, 256, 1); }
      for (let x = 0; x < 256; x += 4) { ctx.fillStyle = '#ffffff18'; ctx.fillRect(x, 0, 1, 256); }
    } else {
      for (let i = 0; i < 28; i++) {
        ctx.strokeStyle = i % 3 === 0 ? '#536b6b30' : '#ffffff44';
        ctx.lineWidth = .5;
        const x = random() * 256, y = random() * 256;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 18, y + random() * 3); ctx.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(kind === 'cloth' ? 4 : 3, kind === 'cloth' ? 3 : 2);
    return texture;
  }
  const fabricTexture = surfaceTexture('cloth');
  const paintTexture = surfaceTexture('paint');
  for (const mat of [vinyl, vinylEdge, vinylHighlight]) { mat.map = fabricTexture; mat.bumpMap = fabricTexture; mat.bumpScale = .012; }
  paint.map = paintTexture; paint.bumpMap = paintTexture; paint.bumpScale = .008;

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
  const rustCloth = material('#b35b3c');
  const canvasBag = material('#c9ba8f');
  canvasBag.map = fabricTexture;
  oliveCanvas.map = fabricTexture;

  const seats = [-1, 1].map(side => {
    const group = new THREE.Group();
    group.rotation.y = -side * Math.PI / 2;
    room.add(group);
    rounded(group, 8.8, 2.5, .3, .18, vinylEdge, 0, .5, 0);
    for (let i = 0; i < 3; i++) {
      const cushion = rounded(group, 2.86, 2.36 - (i === 1 ? .035 : 0), .2, .14, (side === -1 ? i === 0 : i === 2) ? vinylHighlight : vinyl, (i - 1) * 2.89, .5, .21);
      cushion.rotation.z = (i - 1) * .003 * side;
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
      newspaper.position.set(-1.72, -.66, 1.14); newspaper.rotation.y = .21;
      box(newspaper, 1.35, .025, .86, paper, 0, 0, 0);
      const page = document.createElement('canvas'); page.width = 768; page.height = 512;
      const pageContext = page.getContext('2d');
      pageContext.fillStyle = '#e3dcc5'; pageContext.fillRect(0, 0, 768, 512);
      pageContext.fillStyle = '#414b49'; pageContext.textAlign = 'center';
      pageContext.font = 'bold 68px Georgia'; pageContext.fillText('THE LOCAL', 384, 91);
      pageContext.font = '14px Georgia'; pageContext.fillText('WEEKEND PAGES  /  TRAVEL & EVERYDAY THINGS', 384, 122);
      pageContext.fillRect(35, 143, 698, 2);
      pageContext.font = '30px Georgia'; pageContext.fillText('The long way home', 384, 189);
      pageContext.textAlign = 'left'; pageContext.font = '15px Georgia';
      const lines = ['Window seats go first.', 'A spare shirt. A packed lunch.', 'Someone has brought a tiffin.', 'The paper goes around twice.', 'Outside, the towns pass by.', 'Inside, there is time for tea.', 'Keep the ticket for later.', 'There is still a little way to go.'];
      for (let col = 0; col < 3; col++) lines.forEach((line, row) => pageContext.fillText(line, 37 + col * 237, 235 + row * 28, 215));
      const pageTexture = new THREE.CanvasTexture(page); pageTexture.colorSpace = THREE.SRGBColorSpace;
      const printedPage = new THREE.Mesh(new THREE.PlaneGeometry(1.31, .82), new THREE.MeshStandardMaterial({ map: pageTexture, roughness: 1 }));
      printedPage.rotation.x = -Math.PI / 2; printedPage.position.y = .019; newspaper.add(printedPage);
      group.add(newspaper);
      const bottleMat = new THREE.MeshPhysicalMaterial({ color: '#9ed6db', transparent: true, opacity: .66, roughness: .2, metalness: .05 });
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .67, 16), bottleMat);
      bottle.position.set(-3.45, -.31, 1.1); group.add(bottle);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .1, 12), vinylEdge);
      cap.position.set(-3.45, .075, 1.1); group.add(cap);
    } else {
      const scarfCanvas = document.createElement('canvas'); scarfCanvas.width = scarfCanvas.height = 128;
      const scarfContext = scarfCanvas.getContext('2d'); scarfContext.fillStyle = '#a85e45'; scarfContext.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 128; i += 24) { scarfContext.fillStyle = '#d9c8a3'; scarfContext.fillRect(0, i, 128, 3); scarfContext.fillStyle = '#794a3b'; scarfContext.fillRect(0, i + 5, 128, 1); }
      const scarfTexture = new THREE.CanvasTexture(scarfCanvas); scarfTexture.colorSpace = THREE.SRGBColorSpace;
      const scarfGeometry = new THREE.PlaneGeometry(1.55, 1.45, 18, 20);
      const vertices = scarfGeometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), z = 1.45 + vertices.getY(i);
        const drop = Math.max(0, z - 1.86) * 2.8;
        vertices.setXYZ(i, x + 1.37, -.64 - drop + Math.sin(x * 11 + z * 4) * .024, z);
      }
      scarfGeometry.computeVertexNormals();
      const scarf = new THREE.Mesh(scarfGeometry, new THREE.MeshStandardMaterial({ map: scarfTexture, roughness: 1, side: THREE.DoubleSide }));
      scarf.castShadow = true; scarf.receiveShadow = true; group.add(scarf);
      for (let i = 0; i < 3; i++) {
        const tin = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .17, 24), chrome);
        tin.position.set(3.3, -.56 + i * .18, 1.0); group.add(tin);
      }
      tube(group, [[3.04, -.55, 1], [3.04, .01, 1], [3.3, .12, 1], [3.56, .01, 1], [3.56, -.55, 1]], .025, chrome);
    }
    const tote = new THREE.Group();
    tote.position.set(side * 4.35, side === -1 ? .46 : .7, side === -1 ? .48 : .4);
    tote.userData.restAngle = side === -1 ? .045 : -.065;
    tote.scale.setScalar(side === -1 ? 1 : .82);
    rounded(tote, .85, 1.05, .27, .11, side === -1 ? canvasBag : oliveCanvas, 0, -.6, 0);
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
    luggage(rack, side === -1 ? 1.4 : 1.05, .65, .9, side === -1 ? oliveCanvas : leather, side === -1 ? -.1 : .35, .38, .75, side === -1 ? -.03 : .08);
    luggage(rack, 1.5, side === -1 ? .9 : .75, 1, side === -1 ? rustCloth : canvasBag, side === -1 ? 2.7 : 2.4, .5, side === -1 ? .55 : .72, side === -1 ? .06 : -.045);
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
  const daylight = new THREE.DirectionalLight('#fff2df', 2.3);
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
      swayingBags.forEach((bag, i) => { bag.rotation.z = bag.userData.restAngle + Math.sin(time * .0016 + i) * (.008 + getMovement() * .025); });
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(render);
}
