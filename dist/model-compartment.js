import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const smoothstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const openings = [
  { minZ: -1.485, maxZ: -.255, minY: -.576, maxY: .488 },
  { minZ: -3.155, maxZ: -1.925, minY: -.576, maxY: .488 }
];

export async function createModelCompartmentScene({ canvas, container, reducedMotion, getJourneyState, isPaused }) {
  const loading = document.querySelector('#model-loading');
  loading.hidden = false;
  container.classList.add('model-loading');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 761 ? 1.25 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#c4cecb');
    const camera = new THREE.PerspectiveCamera(55, 1.6, .035, 60);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(environment, .04);
    scene.environment = environmentTarget.texture;
    environment.dispose(); pmrem.dispose();
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    const [gltf, textures] = await Promise.all([
      loader.loadAsync('assets/train-compartment.glb', event => {
        const percentage = Math.min(99, Math.round(event.loaded / (event.total || 15170704) * 100));
        loading.textContent = `Fitting your window seat… ${percentage}%`;
      }),
      Promise.all(['assets/rajasthan-collage.jpg', 'assets/gujarat-collage.png'].map(path => textureLoader.loadAsync(path)))
    ]);
    const model = gltf.scene;
    scene.add(model);
    const materials = new Set();
    model.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
    });
    materials.forEach(material => {
      material.envMapIntensity = .38;
      material.normalScale?.setScalar(.55);
      if (material.aoMap) material.aoMapIntensity = .65;
      if (material.name === 'Seats_001') { material.metalness = .015; material.roughness = .92; material.envMapIntensity = .18; }
      if (material.name === 'Inside' || material.name === 'Wall') { material.metalness = .04; material.roughness = .86; }
      if (material.name === 'Outside') { material.color.set('#71868c'); material.metalness = .3; material.roughness = .72; }
      if (material.name === 'Metal') { material.metalness = .7; material.roughness = .56; }
    });
    scene.add(new THREE.HemisphereLight('#ecf3ee', '#687674', 2.1));
    const daylight = new THREE.DirectionalLight('#fff0d8', 2.4);
    daylight.position.set(-5, 4, -.5);
    daylight.target.position.set(.1, -.4, -1.7);
    daylight.castShadow = true;
    daylight.shadow.mapSize.set(1024, 1024);
    daylight.shadow.camera.left = -3; daylight.shadow.camera.right = 3;
    daylight.shadow.camera.top = 3; daylight.shadow.camera.bottom = -3;
    daylight.shadow.camera.near = .1; daylight.shadow.camera.far = 15;
    daylight.shadow.normalBias = .015; daylight.shadow.bias = -.0002;
    scene.add(daylight, daylight.target);
    const ceilingLight = new THREE.PointLight('#fff4df', 3.4, 7, 2);
    ceilingLight.position.set(.15, 1.35, -1.7); scene.add(ceilingLight);
    const softFill = new THREE.PointLight('#d9eaf2', 2.2, 7, 2);
    softFill.position.set(1.5, .8, -1.7); scene.add(softFill);

    // Collage planes sit OUTSIDE the supplied model. Its actual openings,
    // frames, central pillar and bars provide all foreground occlusion.
    textures.forEach(texture => { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); });
    const panoramas = textures.map((texture, index) => {
      const group = new THREE.Group();
      group.rotation.y = Math.PI / 2;
      group.position.set(-2.18, -.044, -1.705);
      const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      backdrop.position.z = -.003; backdrop.renderOrder = -4 + index;
      group.add(backdrop);
      const panels = [];
      for (let i = 0; i < 6; i++) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const uv = geometry.attributes.uv;
        for (let v = 0; v < uv.count; v++) uv.setX(v, (i + uv.getX(v)) / 6);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
        mesh.renderOrder = index * 6 + i;
        group.add(mesh); panels.push(mesh);
      }
      scene.add(group);
      return { group, panels, backdrop, ratio: texture.image.width / texture.image.height, width: 3 };
    });
    // Two rolling shutters, fixed to the model's measured window openings.
    const shutterCanvas = document.createElement('canvas'); shutterCanvas.width = 128; shutterCanvas.height = 512;
    const ctx = shutterCanvas.getContext('2d');
    for (let y = 0; y < 512; y += 22) {
      const gradient = ctx.createLinearGradient(0, y, 0, y + 22);
      gradient.addColorStop(0, '#a5ad9e'); gradient.addColorStop(.35, '#949e91'); gradient.addColorStop(.8, '#6f7c72'); gradient.addColorStop(1, '#bcc0aa');
      ctx.fillStyle = gradient; ctx.fillRect(0, y, 128, 22);
    }
    const shutterTexture = new THREE.CanvasTexture(shutterCanvas); shutterTexture.colorSpace = THREE.SRGBColorSpace;
    const shutters = openings.map(opening => {
      const width = opening.maxZ - opening.minZ + .035;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, 1.08), new THREE.MeshStandardMaterial({ map: shutterTexture, roughness: .76, metalness: .18, side: THREE.DoubleSide }));
      mesh.rotation.y = Math.PI / 2;
      mesh.position.set(-2.035, opening.maxY, (opening.minZ + opening.maxZ) / 2);
      mesh.castShadow = true; mesh.receiveShadow = true;
      scene.add(mesh); return mesh;
    });

    // Keep the chai and ticket as small physical objects, rather than floating
    // illustrations. The shelf fits below the central window pillar.
    const paint = new THREE.MeshStandardMaterial({ color: '#718582', roughness: .9 });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(.5, .035, .47), paint);
    shelf.position.set(-1.78, -.75, -1.705); shelf.receiveShadow = true; scene.add(shelf);
    const clay = new THREE.MeshStandardMaterial({ color: '#9a6341', roughness: 1 });
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(.055, .038, .105, 20, 1, true), clay);
    cup.position.set(-1.64, -.68, -1.6); cup.castShadow = true; scene.add(cup);
    const tea = new THREE.Mesh(new THREE.CircleGeometry(.048, 20), new THREE.MeshStandardMaterial({ color: '#633f24', roughness: .5 }));
    tea.rotation.x = -Math.PI / 2; tea.position.set(-1.64, -.635, -1.6); scene.add(tea);
    const ticket = new THREE.Mesh(new THREE.PlaneGeometry(.13, .21), new THREE.MeshStandardMaterial({ color: '#dec6a0', roughness: 1, side: THREE.DoubleSide }));
    ticket.rotation.set(-Math.PI / 2, 0, .18); ticket.position.set(-1.81, -.73, -1.76); scene.add(ticket);

    let mobile = false;
    let pointerX = 0;
    let pointerY = 0;
    const baseCamera = new THREE.Vector3();
    const target = new THREE.Vector3();
    function projectWindow() {
      camera.updateMatrixWorld();
      const { width, height } = container.getBoundingClientRect();
      const visibleOpenings = mobile ? [openings[0]] : openings;
      const points = visibleOpenings.flatMap(o => [o.minZ, o.maxZ].flatMap(z => [o.minY, o.maxY].map(y => new THREE.Vector3(-2.019, y, z).project(camera))));
      const xs = points.map(p => (p.x + 1) / 2 * width), ys = points.map(p => (1 - p.y) / 2 * height);
      const left = Math.min(...xs), top = Math.min(...ys), right = Math.max(...xs), bottom = Math.max(...ys);
      container.style.setProperty('--model-window-left', `${left}px`);
      container.style.setProperty('--model-window-top', `${top}px`);
      container.style.setProperty('--model-window-width', `${right - left}px`);
      container.style.setProperty('--model-window-height', `${bottom - top}px`);
    }
    function resize() {
      const { width, height } = container.getBoundingClientRect();
      mobile = width <= 760;
      camera.aspect = width / height;
      camera.fov = mobile ? 62 : 55;
      baseCamera.set(mobile ? .25 : 1.1, .25, mobile ? -.87 : -1.705);
      target.set(-2.019, mobile ? .05 : .18, mobile ? -.87 : -1.705);
      camera.position.copy(baseCamera); camera.lookAt(target); camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      panoramas.forEach(panorama => {
        const width = Math.max(mobile ? 1.36 : 2.99, 1.14 * panorama.ratio);
        panorama.width = width;
        panorama.group.position.z = mobile ? -.87 : -1.705;
        panorama.backdrop.scale.set(width, Math.max(1.14, width / panorama.ratio), 1);
        panorama.panels.forEach((mesh, i) => {
          mesh.scale.set(width / 6 + .003, Math.max(1.14, width / panorama.ratio), 1);
          mesh.userData.baseX = (i + .5 - 3) * width / 6;
        });
      });
      projectWindow(); renderer.render(scene, camera);
    }
    const observer = new ResizeObserver(resize); observer.observe(container);
    resize();
    container.classList.add('compartment-3d-ready', 'model-compartment-ready');
    container.classList.remove('model-loading');
    loading.hidden = true;
    document.body.dataset.compartment = 'glb';
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault(); container.classList.remove('compartment-3d-ready', 'model-compartment-ready');
      document.body.dataset.compartment = 'fallback';
    });
    canvas.addEventListener('webglcontextrestored', () => {
      container.classList.add('compartment-3d-ready', 'model-compartment-ready'); document.body.dataset.compartment = 'glb';
    });
    container.addEventListener('pointermove', event => {
      if (reducedMotion || mobile || event.pointerType === 'touch' || event.target.closest('button, dialog, a, select')) return;
      const rect = container.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - .5) * .008;
      pointerY = ((event.clientY - rect.top) / rect.height - .5) * .006;
    });
    container.addEventListener('pointerleave', () => { pointerX = 0; pointerY = 0; });
    let last = 0;
    let lastProjection = 0;
    function render(time) {
      requestAnimationFrame(render);
      if (isPaused() || time - last < 32) return;
      last = time;
      const state = getJourneyState();
      const p = state.started ? state.progress : 0;
      const shift = smoothstep(.34, .65, p);
      panoramas.forEach((panorama, index) => {
        panorama.backdrop.material.opacity = index === 0 ? 1 - shift : shift;
        const phase = index === 0 ? -shift : 1 - shift;
        panorama.panels.forEach((mesh, i) => {
          const stagger = 1 + (index === 0 ? i : 5 - i) * .06;
          mesh.position.x = mesh.userData.baseX + (reducedMotion ? 0 : (phase + (index === 0 ? state.departure : 0)) * (panorama.width + .3) * stagger);
          mesh.position.y = reducedMotion ? 0 : Math.sin(Math.abs(phase) * Math.PI) * (i % 3 - 1) * .055;
          mesh.rotation.z = reducedMotion ? 0 : Math.sin(Math.abs(phase) * Math.PI) * (i % 2 - .5) * .04;
          mesh.material.opacity = index === 0 ? 1 - smoothstep(.45, .65, p) : smoothstep(.34, .54, p);
        });
      });
      shutters.forEach((mesh, i) => {
        const fraction = Math.max(.001, state.shutter);
        mesh.visible = state.shutter > .003;
        mesh.scale.y = fraction;
        mesh.position.y = openings[i].maxY - 1.08 * fraction / 2;
      });
      camera.position.y += (baseCamera.y + pointerY - camera.position.y) * .045;
      camera.position.z += (baseCamera.z + pointerX - camera.position.z) * .045;
      camera.lookAt(target);
      if (time - lastProjection > 120) { projectWindow(); lastProjection = time; }
      renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
  } catch (error) {
    renderer?.dispose();
    loading.textContent = 'Using the lightweight compartment.';
    setTimeout(() => { loading.hidden = true; }, 2200);
    container.classList.remove('model-loading', 'model-compartment-ready', 'compartment-3d-ready');
    throw error;
  }
}
