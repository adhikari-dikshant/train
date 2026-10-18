const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsap = window.gsap;
const journey = $('#journey');
const shutter = $('#shutter');
const windowBox = $('#window-interior');
const travel = { speed: 0, shutter: .37, departure: 0, progress: 0, pointerX: 0, pointerY: 0 };
let started = false;
let starting = false;
let startPromise;
let station = 0;
let arrivalTimer;
let revealVisible = false;
let toastTimer;
let context;
let soundEnabled = false;
let soundTimer;
let isHidden = document.hidden;
let storyRevealed = false;

function revealStory(scrollToStory = false) {
  if (!storyRevealed) {
    storyRevealed = true;
    $('#our-story').hidden = false;
    $('footer').hidden = false;
    $('.story-link').hidden = false;
    requestAnimationFrame(() => window.ScrollTrigger?.refresh());
  }
  if (scrollToStory) $('#our-story').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
}
$('#finish-journey').addEventListener('click', () => revealStory(true));
new IntersectionObserver(([entry]) => {
  document.body.classList.toggle('at-story', entry.isIntersecting);
}, { threshold: .08 }).observe($('#our-story'));

const stations = [
  {
    name: 'Jaipur', state: 'RAJASTHAN', local: 'जयपुर', nickname: 'THE PINK CITY', coordinates: '26.92° N / 75.82° E',
    heading: '<em>Jaipur.</em><br>Take your time.',
    description: 'Pink plaster, faded red, tiny floral repeats. That’s the starting point for this shirt.',
    title: 'The Pink City Shirt.', shortTitle: 'The Pink City<br>Shirt.', price: '₹2,490', image: 'assets/jaipur-shirt.svg',
    productDescription: 'Terracotta, small florals, an open collar. A shirt for warm afternoons.',
    detail: 'A relaxed camp-collar shirt with a repeating floral print in terracotta and cream. A design study from the Jaipur stop; final fabric and production details are still to come.',
    crafts: [
      ['Start with the wall colour.', 'The pink and terracotta buildings in the collage gave this shirt its palette. The cream in the print leaves a little space between the florals.'],
      ['The little floral repeats.', 'Rajasthan’s block-printing traditions are the reference for this motif. This is a concept illustration; it isn’t a claim that the shirt has been hand-block printed.']
    ]
  },
  {
    name: 'Ahmedabad', state: 'GUJARAT', local: 'અમદાવાદ', nickname: 'COLOUR IN MOTION', coordinates: '23.02° N / 72.57° E',
    heading: 'Next stop,<br><em>Ahmedabad.</em>',
    description: 'Carved stone, dotted cloth, deep blue. The second stop becomes an easy layer.',
    title: 'The Indigo Trail Jacket.', shortTitle: 'The Indigo Trail<br>Jacket.', price: '₹3,890', image: 'assets/ahmedabad-jacket.svg',
    productDescription: 'An indigo layer with dotted motifs and one pocket that does things differently.',
    detail: 'A loose indigo overshirt with bandhani-inspired dots and a contrasting pocket. An imagined piece from the Ahmedabad stop, shown as a design study rather than a finished product.',
    crafts: [
      ['Look at those steps.', 'The stepwell’s repeating lines sit beside the tiny dots in the cloth. Both found their way into the design notes for this jacket.'],
      ['Keep one detail a little different.', 'The indigo is quiet. The pocket isn’t. Bandhani-inspired dots and a small patterned panel are the two details carried into this concept.']
    ]
  }
];

function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 2600);
}

function animate(target, properties) {
  if (gsap) return gsap.to(target, { duration: reducedMotion ? 0 : .65, overwrite: 'auto', ...properties });
  const nodes = typeof target === 'string' ? $$(target) : Array.isArray(target) ? target : [target];
  nodes.forEach(node => {
    if (!node?.style) return;
    if (properties.opacity !== undefined) node.style.opacity = properties.opacity;
    if (properties.y !== undefined || properties.rotation !== undefined) node.style.transform = `translateY(${properties.y || 0}px) rotate(${properties.rotation || 0}deg)`;
  });
  properties.onComplete?.();
}

function setReveal(visible) {
  if (visible === revealVisible) return;
  revealVisible = visible;
  $('#product-reveal').inert = !visible;
  $('#station-caption').inert = !visible;
  $('#product-reveal').style.pointerEvents = visible ? 'auto' : 'none';
  animate('#product-reveal', { opacity: visible ? 1 : 0, y: visible ? 0 : 35, rotation: visible ? -2 : 3, duration: visible ? .8 : .28, ease: 'power3.out' });
  animate('#station-caption', { opacity: visible ? 1 : 0, y: visible ? 0 : 18, duration: visible ? .75 : .25 });
  animate('.station-stamp', { opacity: visible ? 1 : 0 });
  $$('.craft-marker').forEach(button => { button.style.display = visible ? 'flex' : 'none'; });
}

function updateStation(index) {
  station = index;
  document.body.dataset.station = stations[index].name.toLowerCase();
  const s = stations[index];
  $('#station-index').textContent = `DESIGN NOTE 0${index + 1} / ${s.state}`;
  $('#station-name').innerHTML = s.heading;
  $('#station-description').textContent = s.description;
  $('#station-continue').textContent = index === 0 ? 'Ahmedabad’s next. Scroll when you’re ready. ↓' : 'That’s our two stops. Stay a little, if you like.';
  $('#collection-tag').textContent = `THE ${s.name.toUpperCase()} EDIT`;
  $('#product-eyebrow').textContent = `0${index + 1} / ${s.state}`;
  $('#product-title').innerHTML = s.shortTitle;
  $('#product-description').textContent = s.productDescription;
  $('#product-price').textContent = s.price;
  $('#product-image').src = s.image;
  $('#product-image').alt = `${s.title} — illustrative clothing concept`;
  $('#station-stamp').innerHTML = `<span>STOP 0${index + 1}</span><strong>${s.local}</strong><small>${s.name.toUpperCase()}</small>`;
  $$('.stop-button').forEach((button, i) => {
    button.classList.toggle('active', index === i);
    button.setAttribute('aria-current', index === i ? 'step' : 'false');
  });
}

function announceArrival(index) {
  clearTimeout(arrivalTimer);
  const s = stations[index];
  $('#arrival-label strong').textContent = `${s.name} Junction`;
  animate('#arrival-label', { opacity: 1, duration: .35 });
  arrivalTimer = setTimeout(() => {
    animate('#arrival-label', { opacity: 0, duration: .6 });
  }, reducedMotion ? 400 : 1250);
}

function journeyRange() { return Math.max(1, journey.offsetHeight - $('#carriage').offsetHeight); }
function progressFromScroll() { return Math.max(0, Math.min(1, (scrollY - journey.offsetTop) / journeyRange())); }
function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function onProgress(p) {
  travel.progress = p;
  if (!started || starting) return;
  const between = p > .34 && p < .65;
  const nextStation = p < .5 ? 0 : 1;
  if (station !== nextStation) updateStation(nextStation);
  const atFinalStop = p >= .72;
  $('#finish-journey').hidden = !atFinalStop;
  $('#station-continue').hidden = atFinalStop;
  if (p >= .96) revealStory();
  setReveal(!between);
  const velocity = between ? Math.sin(((p - .34) / .31) * Math.PI) : 0;
  travel.speed = between ? travel.speed + (velocity - travel.speed) * .28 : 0;
  document.body.classList.toggle('is-travelling', between);
  const status = between ? 'ON THE WAY · WATCH THE WORLD GO BY' : `NOW AT ${stations[station].name.toUpperCase()} JUNCTION`;
  if ($('#status-text').textContent !== status) $('#status-text').textContent = status;
  $('#travelling-overlay').style.opacity = reducedMotion ? 0 : velocity * .8;
  const fill = smoothstep(.3, .7, p);
  $('#track-fill').style.width = `${fill * 100}%`;
  $('#track-train').style.left = `calc(${fill * 100}% - 2px)`;
  $('.scene-jaipur').style.opacity = 1 - smoothstep(.43, .57, p);
  $('.scene-ahmedabad').style.opacity = smoothstep(.43, .57, p);
  if (!windowBox.classList.contains('webgl-ready')) {
    $('.scene-jaipur').style.transform = `translateX(${-smoothstep(.34, .65, p) * 50}%)`;
    $('.scene-ahmedabad').style.transform = `translateX(${(1 - smoothstep(.34, .65, p)) * 50}%)`;
  }
  const previous = onProgress.previous;
  if (previous !== undefined && ((previous < .65 && p >= .65) || (previous > .34 && p <= .34))) announceArrival(station);
  onProgress.previous = p;
}

async function startJourney(scrollToStop = true) {
  if (started && !starting) return;
  if (starting) return startPromise;
  starting = true;
  $('#start-journey').disabled = true;
  document.body.dataset.journey = 'opening';
  startPromise = new Promise(resolve => {
    const complete = () => {
      started = true;
      starting = false;
      document.body.dataset.journey = 'started';
      window.ScrollTrigger?.refresh();
      $('#intro-overlay').inert = true;
      $('#intro-overlay').style.display = 'none';
      $('#prelude-scenery').style.display = 'none';
      if (scrollToStop) window.scrollTo({ top: journey.offsetTop + journeyRange() * .13, behavior: reducedMotion ? 'instant' : 'smooth' });
      updateStation(progressFromScroll() < .5 ? 0 : 1);
      announceArrival(station);
      onProgress(progressFromScroll());
      resolve();
    };
    if (gsap && !reducedMotion) {
      const tl = gsap.timeline({ onComplete: complete });
      tl.to('#intro-overlay', { opacity: 0, y: -12, duration: .45 })
        .to(shutter, { yPercent: 0, y: 0, duration: .5, ease: 'power2.in' }, '<')
        .to(travel, { shutter: 1, duration: .5, ease: 'power2.in' }, '<')
        .call(() => {
          journey.classList.add('started');
          updateStation(progressFromScroll() < .5 ? 0 : 1);
          travel.speed = 1;
          travel.departure = 1;
          animate('#travelling-overlay', { opacity: .7, duration: .3 });
        })
        .to(shutter, { yPercent: -103, duration: 1.7, ease: 'power3.inOut' }, '+=.25')
        .to(travel, { shutter: 0, duration: 1.7, ease: 'power3.inOut' }, '<')
        .to('#prelude-scenery', { opacity: 0, duration: .8 }, '<')
        .to(travel, { departure: 0, duration: 1.7, ease: 'power2.out' }, '-=1.4')
        .to(travel, { speed: 0, duration: 1.2 }, '-=.7')
        .to('#travelling-overlay', { opacity: 0, duration: .6 }, '-=.6');
    } else {
      journey.classList.add('started');
      shutter.style.transform = 'translateY(-103%)';
      travel.shutter = 0;
      $('#prelude-scenery').style.display = 'none';
      complete();
    }
  });
  return startPromise;
}

async function goToStation(index) {
  $$('dialog[open]').forEach(dialog => dialog.close());
  await startJourney(false);
  const target = journey.offsetTop + journeyRange() * (index === 0 ? .15 : .82);
  window.scrollTo({ top: target, behavior: reducedMotion ? 'instant' : 'smooth' });
}

$('#start-journey').addEventListener('click', () => startJourney());
$$('[data-station]').forEach(button => button.addEventListener('click', () => goToStation(Number(button.dataset.station))));
$$('[data-go]').forEach(button => button.addEventListener('click', () => goToStation(Number(button.dataset.go))));
$$('[data-open]').forEach(button => button.addEventListener('click', () => {
  const name = button.dataset.open;
  if (name === 'bag') renderBag();
  $(`#${name === 'collection' ? 'route' : name}-dialog`).showModal();
}));
$$('.dialog-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
}));

function openPiece() {
  const s = stations[station];
  $('#detail-image').src = s.image;
  $('#detail-image').alt = `${s.title} — illustrative garment`;
  $('#detail-edit').textContent = `THE ${s.name.toUpperCase()} EDIT`;
  $('#detail-name').textContent = s.title;
  $('#detail-description').textContent = s.detail;
  $('#detail-price').textContent = s.price;
  $('#piece-dialog').dataset.station = station;
  $('#piece-dialog').showModal();
}
$('#view-piece').addEventListener('click', openPiece);
$$('[data-craft]').forEach(button => button.addEventListener('click', () => {
  const s = stations[station];
  const craft = s.crafts[Number(button.dataset.craft)];
  $('#craft-kicker').textContent = `A DETAIL FROM ${s.name.toUpperCase()}`;
  $('#craft-title').textContent = craft[0];
  $('#craft-description').textContent = craft[1];
  $('#craft-dialog').showModal();
}));
$('#craft-product').addEventListener('click', () => { $('#craft-dialog').close(); openPiece(); });

let saved = [];
try {
  const stored = JSON.parse(localStorage.getItem('sutra-saved') || '[]');
  saved = Array.isArray(stored) ? stored.filter(item => [0, 1].includes(item.station) && ['S', 'M', 'L', 'XL'].includes(item.size)) : [];
} catch { /* Private browsing can disable local storage. */ }
function persistSaved() {
  $('#bag-count').textContent = saved.length;
  try { localStorage.setItem('sutra-saved', JSON.stringify(saved)); } catch { /* The bag remains usable for this visit. */ }
}
function renderBag() {
  const container = $('#saved-items');
  container.replaceChildren();
  if (!saved.length) {
    const p = document.createElement('p');
    p.className = 'empty-bag';
    p.textContent = 'Nothing saved yet. Take a look at either stop and keep a piece here for later.';
    container.append(p);
    return;
  }
  saved.forEach((item, index) => {
    const s = stations[item.station];
    const article = document.createElement('article');
    article.className = 'saved-item';
    article.innerHTML = `<img src="${s.image}" alt="${s.title}"><div><h3>${s.title}</h3><p>Size ${item.size} · ${s.price}</p></div><button aria-label="Remove ${s.title}">Remove</button>`;
    article.querySelector('button').addEventListener('click', () => { saved.splice(index, 1); persistSaved(); renderBag(); });
    container.append(article);
  });
}
$('#save-piece').addEventListener('click', () => {
  const item = { station: Number($('#piece-dialog').dataset.station), size: $('#size-select').value };
  const exists = saved.some(piece => piece.station === item.station && piece.size === item.size);
  if (!exists) saved.push(item);
  persistSaved();
  $('#piece-dialog').close();
  toast(exists ? 'This piece is already saved in your bag.' : 'Saved. It’ll be here when you’re back.');
});
$('#continue-journey').addEventListener('click', () => $('#bag-dialog').close());
$('#back-top').addEventListener('click', () => window.scrollTo({ top: started ? journey.offsetTop + journeyRange() * .13 : 0, behavior: reducedMotion ? 'instant' : 'smooth' }));
persistSaved();
updateStation(0);

// Sound is synthesized locally and begins only after an explicit sound-button click.
async function toggleSound() {
  try {
    if (soundEnabled) {
      soundEnabled = false;
      clearInterval(soundTimer);
      await context?.suspend();
    } else {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('No audio context');
      if (!context) context = new AudioContext();
      await context.resume();
      soundEnabled = true;
      const clack = () => {
        if (context.state !== 'running') return;
        [0, .12].forEach(delay => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(85, context.currentTime + delay);
          oscillator.frequency.exponentialRampToValueAtTime(26, context.currentTime + delay + .11);
          gain.gain.setValueAtTime(0, context.currentTime + delay);
          gain.gain.linearRampToValueAtTime(.035 + travel.speed * .035, context.currentTime + delay + .005);
          gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + delay + .12);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(context.currentTime + delay);
          oscillator.stop(context.currentTime + delay + .13);
        });
      };
      clack();
      soundTimer = setInterval(clack, 630);
    }
    $('#sound-toggle').setAttribute('aria-pressed', String(soundEnabled));
    $('#sound-toggle').setAttribute('aria-label', `Turn train ambience ${soundEnabled ? 'off' : 'on'}`);
    $('#sound-toggle span').textContent = `SOUND ${soundEnabled ? 'ON' : 'OFF'}`;
  } catch { toast('Train ambience is unavailable in this browser.'); }
}
$('#sound-toggle').addEventListener('click', toggleSound);
document.addEventListener('visibilitychange', () => {
  isHidden = document.hidden;
  if (context && soundEnabled) {
    if (isHidden) context.suspend().catch(() => {});
    else context.resume().catch(() => {});
  }
});

if (gsap && window.ScrollTrigger) {
  gsap.registerPlugin(window.ScrollTrigger);
  window.ScrollTrigger.create({ trigger: journey, start: 'top top', end: 'bottom bottom', onUpdate: self => onProgress(self.progress), onRefresh: self => onProgress(self.progress) });
} else {
  window.addEventListener('scroll', () => onProgress(progressFromScroll()), { passive: true });
}
window.addEventListener('resize', () => onProgress(progressFromScroll()), { passive: true });

// A real Three.js scene. Six independently animated collage panels per station
// form one continuous panorama at rest, then peel apart at different depths.
async function initScene() {
  let renderer;
  try {
    const THREE = await import('./vendor/three.module.js');
    const canvas = $('#landscape');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2, 2, 1, -1, .1, 30);
    camera.position.z = 10;
    const loader = new THREE.TextureLoader();
    const textures = await Promise.all(['assets/rajasthan-collage.jpg', 'assets/gujarat-collage.png'].map(path => loader.loadAsync(path)));
    textures.forEach(texture => { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); });
    const groups = [];
    const backdrops = textures.map((texture, i) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, color: '#f5eddd' }));
      mesh.position.z = -1;
      mesh.renderOrder = -5 + i;
      mesh.userData.ratio = texture.image.width / texture.image.height;
      scene.add(mesh);
      return mesh;
    });
    let aspect = 2.5;
    textures.forEach((texture, groupIndex) => {
      const group = new THREE.Group();
      group.userData.panels = [];
      for (let i = 0; i < 6; i++) {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const uv = geometry.attributes.uv;
        for (let v = 0; v < uv.count; v++) uv.setX(v, (i + uv.getX(v)) / 6);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, color: '#f5eddd' });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.index = i;
        mesh.userData.ratio = texture.image.width / texture.image.height;
        mesh.renderOrder = groupIndex * 6 + i;
        group.add(mesh);
        group.userData.panels.push(mesh);
      }
      scene.add(group);
      groups.push(group);
    });
    // Small paper kites are independent foreground objects, not baked into the collage.
    const ornaments = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(0, .09); shape.lineTo(.055, 0); shape.lineTo(0, -.075); shape.lineTo(-.055, 0); shape.closePath();
      const material = new THREE.MeshBasicMaterial({ color: ['#b95839', '#e1b44e', '#f2e4b6', '#698979'][i % 4], transparent: true, opacity: .65, side: THREE.DoubleSide, depthWrite: false });
      const kite = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
      kite.position.set((i / 7 - .5) * 5, .65 + Math.sin(i) * .15, 2);
      kite.rotation.z = i * .55;
      kite.userData.origin = kite.position.clone();
      ornaments.add(kite);
    }
    scene.add(ornaments);

    function resize() {
      const width = windowBox.clientWidth;
      const height = windowBox.clientHeight;
      aspect = width / height;
      renderer.setSize(width, height, false);
      camera.left = -aspect; camera.right = aspect; camera.updateProjectionMatrix();
      backdrops.forEach(mesh => {
        const width = Math.max(aspect * 2, mesh.userData.ratio * 2) * 1.09;
        mesh.scale.set(width, width / mesh.userData.ratio, 1);
      });
      groups.forEach(group => group.userData.panels.forEach(mesh => {
        const fullWidth = Math.max(aspect * 2, mesh.userData.ratio * 2) * 1.06;
        const fullHeight = fullWidth / mesh.userData.ratio;
        mesh.scale.set(fullWidth / 6 + .003, fullHeight, 1);
        mesh.userData.baseX = (mesh.userData.index + .5 - 3) * fullWidth / 6;
      }));
    }
    const observer = new ResizeObserver(resize);
    observer.observe(windowBox);
    resize();
    windowBox.classList.add('webgl-ready');
    canvas.classList.add('ready');
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      windowBox.classList.remove('webgl-ready');
      canvas.classList.remove('ready');
    });
    windowBox.addEventListener('pointermove', event => {
      if (reducedMotion || event.pointerType === 'touch') return;
      const rect = windowBox.getBoundingClientRect();
      travel.pointerX = ((event.clientX - rect.left) / rect.width - .5) * .05;
      travel.pointerY = ((event.clientY - rect.top) / rect.height - .5) * .035;
    });
    windowBox.addEventListener('pointerleave', () => { travel.pointerX = 0; travel.pointerY = 0; });
    let lastTime = 0;
    function render(time) {
      requestAnimationFrame(render);
      if (isHidden || scrollY > journey.offsetTop + journey.offsetHeight || time - lastTime < 28) return;
      lastTime = time;
      const t = time * .001;
      const p = started ? travel.progress : 0;
      const shift = smoothstep(.34, .65, p);
      backdrops.forEach((mesh, i) => { mesh.material.opacity = i === 0 ? 1 - shift : shift; });
      groups.forEach((group, groupIndex) => {
        const phase = groupIndex === 0 ? -shift : 1 - shift;
        group.visible = groupIndex === 0 ? shift < 1 : shift > 0;
        group.userData.panels.forEach((mesh, i) => {
          const stagger = 1 + (groupIndex === 0 ? i : 5 - i) * .065;
          const movement = reducedMotion ? 0 : (phase + (groupIndex === 0 ? travel.departure : 0)) * (aspect * 2 + 1.5) * stagger;
          mesh.position.x = mesh.userData.baseX + movement;
          mesh.position.y = reducedMotion ? 0 : Math.sin(t * 14 + i * .3) * travel.speed * .007 + Math.sin(Math.abs(phase) * Math.PI) * ((i % 3) - 1) * .18;
          mesh.position.z = -i * .005;
          mesh.rotation.z = reducedMotion ? 0 : Math.sin(Math.abs(phase) * Math.PI) * ((i % 2) - .5) * .1;
          mesh.material.opacity = reducedMotion ? (groupIndex === 0 ? 1 - shift : shift) : 1;
        });
        group.position.x += (travel.pointerX - group.position.x) * .035;
        group.position.y += (-travel.pointerY - group.position.y) * .035;
      });
      ornaments.visible = !reducedMotion && started && shift > .6;
      ornaments.children.forEach((kite, i) => {
        kite.position.y = kite.userData.origin.y + Math.sin(t * .7 + i) * .03;
        kite.position.x = kite.userData.origin.x + Math.sin(t * .5 + i * 1.5) * .06;
        kite.rotation.y = Math.sin(t * .8 + i) * .25;
      });
      renderer.render(scene, camera);
    }
    requestAnimationFrame(render);
  } catch (error) {
    renderer?.dispose();
    windowBox.classList.remove('webgl-ready');
    $('#landscape').classList.remove('ready');
    console.info('Using the accessible image-based scenery fallback.', error.message);
  }
}
// The illustrated compartment follows the supplied warm travel references.
// Three.js keeps the cultural scenery animated within its single window.
initScene();
