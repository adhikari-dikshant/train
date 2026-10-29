import { clamp, smoothstep, routeFrom, journeyFrame, arrivalProgress, departureProgress, collageEntrance } from './journey-state.mjs';
import { constrainMapView, zoomMapView } from './map-view.mjs';
import { pageFromHash, containedPoint } from './piece-view.mjs';
import { guidanceStep, placeGuidance } from './journey-guidance.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsap = window.gsap;
const lenis = !reducedMotion && window.Lenis ? new window.Lenis({ lerp: .085, autoRaf: !gsap }) : null;
lenis?.stop();
const journey = $('#journey');
const windowBox = $('#window-interior');
const travel = { speed: 0, mix: 0, pointerX: 0, pointerY: 0 };
let started = false;
let starting = false;
let station = 0;
let route = routeFrom(0);
let frame = journeyFrame(0, route);
let lastChapter = '';
let savedJourneyScroll = 0;
let reading = false;
let activePieceIndex = 0;
let hintsEnabled = true;
let hintStep = null;
const dismissedHints = new Set();
let storyObserver;
let panelTrigger;
let mapTrigger;
let context;
let soundEnabled = false;
let soundTimer;
let soundBusy = false;
let isHidden = document.hidden;

const stations = [
  {
    slug: 'jaipur', name: 'Jaipur', state: 'Rajasthan', local: 'जयपुर',
    image: 'assets/rajasthan-look.jpg', notes: 'assets/rajasthan-notes.jpg', fragment: 'assets/rajasthan-motifs.jpg',
    title: 'The Rajasthan set.', caption: 'RAJASTHAN / FRONT & BACK DESIGN STUDY',
    description: 'A cream silhouette. Indigo and red details. A place remembered in the smallest marks.',
    chapters: [
      ['A city in\nrose.', 'Pink plaster, faded red, tiny floral repeats. Take in the colours before we follow them into cloth.'],
      ['Look a\nlittle closer.', 'A shoulder panel. A pocket. A line of small motifs down the back. The designer’s notes bring the details into focus.']
    ],
    placeTitle: 'Start with the colours.',
    place: 'The Rajasthan collage brings together warm architecture, textiles and ornamental details. It is the setting for this chapter: a place to look slowly, before moving into the design notebook.',
    detailTitle: 'The small marks matter.',
    detail: 'The supplied design sheets pair a cream shirt and trousers with indigo, red and cream motifs. Shoulder panels, decorated pockets and the long back panel carry the pattern; running-stitch notes trace the edges.',
    noteTitle: 'From the designer’s notebook.',
    note: 'Look at the floral shoulder panel, the framed pocket motif and the contrasting pocket flap. These are HASSTRA’s supplied design references, shown alongside the front and back study.',
    scenery: 'assets/rajasthan-landscape.webp',
    details: [
      { title: 'The shoulder panel.', x: .18, y: .212, text: 'A narrow floral panel follows the shoulder. Indigo, cream and red bring a small concentration of pattern to the otherwise quiet silhouette.' },
      { title: 'A pocket with a frame.', x: .222, y: .43, text: 'The lower pocket combines an arched motif with a contrasting geometric flap. Both details are drawn in the original front study.' },
      { title: 'A line down the back.', x: .646, y: .335, text: 'A long patterned panel anchors the back. Small motifs gather across the yoke, with running-stitch marks continuing down the centre.' }
    ]
  },
  {
    slug: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat', local: 'અમદાવાદ',
    image: 'assets/gujarat-look.jpg', notes: 'assets/gujarat-look.jpg', fragment: 'assets/gujarat-look.jpg',
    title: 'The Gujarat jacket.', caption: 'GUJARAT / REVISED “WARRIOR” DESIGN STUDY',
    description: 'Dark cloth, climbing florals and a patterned edge. A jacket with its own quiet rhythm.',
    chapters: [
      ['Colour in\nmotion.', 'Carved stone, dotted cloth, deep blue. In the collage, pattern moves from architecture to textiles.'],
      ['Follow\nthe thread.', 'Florals climb the front and sleeves. Pattern gathers at the cuffs and hem. The sketch turns a first impression into a garment.']
    ],
    placeTitle: 'A different rhythm.',
    place: 'The Gujarat collage brings carved architecture, cloth, dance and kites into one landscape. Repeated lines and lively colour set the scene before the focus returns to the garment.',
    detailTitle: 'A line worth following.',
    detail: 'The supplied revised “Warrior” study shows a dark jacket with floral panels across the front and sleeves. Patterned borders frame the neckline, cuffs and hem; three contrasting fastenings cross the front.',
    noteTitle: 'Follow the floral panels.',
    note: 'The floral lines draw the eye down the front, while the patterned cuffs and hem give the design a frame. This is the revised “Warrior” artwork supplied in the Gujarat folder.',
    scenery: 'assets/gujarat-landscape.webp',
    details: [
      { title: 'Florals in motion.', x: .335, y: .355, text: 'Climbing florals travel across the front and sleeves. Against the dark ground, their red and green details become the first thing the eye follows.' },
      { title: 'Three points of connection.', x: .505, y: .465, text: 'Three contrasting fastenings cross the patterned opening. They introduce a measured rhythm down the centre of the revised design study.' },
      { title: 'The finishing border.', x: .695, y: .69, text: 'Repeated bands frame the cuffs and hem. Their close pattern gives a defined edge to the loose, dark silhouette.' }
    ]
  }
];

function animate(target, properties) {
  if (gsap) return gsap.to(target, { overwrite: 'auto', ...properties, duration: reducedMotion ? 0 : properties.duration ?? .55 });
  const node = typeof target === 'string' ? $(target) : target;
  if (properties.opacity !== undefined) node.style.opacity = properties.opacity;
  if (properties.y !== undefined) node.style.transform = `translateY(${properties.y}px)`;
  properties.onComplete?.();
}
function range() { return Math.max(1, journey.offsetHeight - $('#carriage').offsetHeight); }
function progressFromScroll() { return clamp((scrollY - journey.offsetTop) / range()); }
function scrollToPosition(top, immediate = false) {
  if (lenis) {
    lenis.resize();
    lenis.scrollTo(top, { immediate, force: immediate, lerp: 0, duration: 1.65, easing: t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2 });
  } else window.scrollTo({ top, behavior: immediate || reducedMotion ? 'instant' : 'smooth' });
}
function scrollToProgress(p, immediate = false) {
  closePanel();
  scrollToPosition(journey.offsetTop + range() * clamp(p), immediate);
}
function setImage(id, path, alt) { $(id).src = path; $(id).alt = alt; }
function updateStation(index) {
  station = index;
  const s = stations[index];
  $('#travel-name').textContent = `${s.name}, ahead.`;
  $('#product-eyebrow').textContent = `${s.state.toUpperCase()} / THE DESIGN`;
  $('#product-title').textContent = s.title;
  $('#product-description').textContent = s.description;
  $('#product-caption').textContent = s.caption;
  setImage('#product-image', s.image, s.caption);
  renderHotspots($('#product-hotspots'), s, index);
  setImage('#fragment-image', s.fragment, `${s.state} garment design reference`);
  $('#view-piece').href = `#piece/${s.slug}`;
  $('#next-stop').innerHTML = frame.final ? 'Explore the itinerary <span>↗</span>' : `On to ${stations[route[frame.leg + 1]].name} <span>→</span>`;
  $$('#route-progress button').forEach(button => {
    const active = Number(button.dataset.station) === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'step' : 'false');
  });
}
function reveal(selector, visible) {
  const node = $(selector);
  node.inert = !visible;
  node.setAttribute('aria-hidden', String(!visible));
  node.style.pointerEvents = visible ? 'auto' : 'none';
  animate(node, { opacity: visible ? 1 : 0, y: visible ? 0 : 18, duration: .4, onComplete: positionGuidance });
}
function travelToStation(index) {
  if (!route.includes(index)) return;
  closePanel();
  scrollToProgress(departureProgress(index, route), true);
  onProgress(progressFromScroll());
  $('#next-chapter').focus({ preventScroll: true });
}
function onProgress(p) {
  if (!started || starting || reading) return;
  const nextFrame = journeyFrame(p, route);
  frame = nextFrame;
  travel.mix = frame.mix;
  // Wipe instead of crossfading two busy images: scenery enters from the right on departure, the station follows it in on arrival.
  const sweep = frame.landscapeOpacity, arriving = frame.transitProgress > .5;
  const edge = arriving ? sweep * 110 - 10 : (1 - sweep) * 110 - 10;
  const mask = arriving ? `linear-gradient(90deg,#000 ${edge}%,transparent ${edge + 10}%)` : `linear-gradient(90deg,transparent ${edge}%,#000 ${edge + 10}%)`;
  const landscape = $('#travel-landscape');
  landscape.style.opacity = sweep > 0 ? 1 : 0;
  landscape.style.maskImage = landscape.style.webkitMaskImage = mask;
  const sceneryProgress = reducedMotion ? 0 : frame.sceneryProgress;
  $('.travel-panorama').style.transform = `translate3d(${-sceneryProgress * 1400}px,0,0)`;
  $('#carriage').style.setProperty('--zoom', frame.zoom.toFixed(4));
  $('#carriage').style.setProperty('--piece-shade', frame.pieceShade.toFixed(4));
  $('#carriage').dataset.chapter = frame.chapter;
  $('#travel-caption').setAttribute('aria-hidden', String(frame.zoom > .99));
  document.body.classList.toggle('is-travelling', frame.inTransit);
  $('.scene-jaipur').style.opacity = 1 - travel.mix;
  $('.scene-ahmedabad').style.opacity = travel.mix;
  if (station !== frame.station) updateStation(frame.station);
  const destination = stations[frame.destination];
  const approaching = frame.inTransit && frame.transitProgress >= .35;
  $('#travel-kicker').textContent = frame.inTransit ? (approaching ? 'APPROACHING THE STATION' : 'SCROLL TO TRAVEL') : 'NOW ARRIVING';
  $('#travel-name').textContent = frame.inTransit ? (approaching ? `Slowing into ${destination.name}.` : `On the way to ${destination.name}.`) : `Now at ${destination.name}.`;
  $('#travel-description').textContent = frame.inTransit ? (approaching ? 'The train is slowing. Your next story is coming into view.' : 'A little scroll. A little countryside. Your next story, just ahead.') : 'We’ve arrived. Scroll to step into the story.';
  if (frame.chapter === 'travel') $('#status-text').textContent = `${frame.inTransit ? 'EN ROUTE' : 'NOW AT'} / ${destination.name.toUpperCase()}`;
  const key = `${station}/${frame.chapter}`;
  if (key !== lastChapter) {
    closePanel();
    const culture = ['place', 'detail'].includes(frame.chapter);
    reveal('#product-reveal', frame.chapter === 'piece');
    $('#detail-fragment').hidden = false;
    reveal('#detail-fragment', frame.chapter === 'detail');
    const s = stations[station];
    const chapterIndex = frame.chapter === 'detail' ? 1 : 0;
    const updateCopy = () => {
      $('#chapter-kicker').textContent = `${s.state.toUpperCase()} / ${chapterIndex === 0 ? '01 — THE PLACE' : '02 — THE DETAILS'}`;
      $('#chapter-local').textContent = s.local;
      $('#chapter-title').textContent = s.chapters[chapterIndex][0];
      $('#chapter-description').textContent = s.chapters[chapterIndex][1];
      reveal('#culture-copy', culture);
    };
    gsap?.killTweensOf('#culture-copy');
    if (culture && [`${station}/place`, `${station}/detail`].includes(lastChapter) && !reducedMotion) {
      animate('#culture-copy', { opacity: 0, y: -12, duration: .18, onComplete: updateCopy });
    } else updateCopy();
    if (frame.chapter !== 'travel') $('#status-text').textContent = `STOP 0${frame.leg + 1} / ${s.state.toUpperCase()}`;
    lastChapter = key;
  }
  $('#next-chapter').childNodes[0].nodeValue = frame.inTransit ? 'SCROLL TO TRAVEL ' : 'SCROLL TO EXPLORE ';
  $('#next-chapter').setAttribute('aria-label', frame.complete ? 'Explore the itinerary' : frame.inTransit ? 'Continue travelling' : 'Next chapter');
  updateGuidance();
}
function renderRoute() {
  $('#route-progress').replaceChildren();
  route.forEach((index, i) => {
    const button = document.createElement('button');
    button.dataset.station = index;
    button.innerHTML = `<small>0${i + 1}</small>${stations[index].name}`;
    button.addEventListener('click', () => goToStation(index));
    $('#route-progress').append(button);
  });
}
function goToStation(index) {
  if (!started || starting) return;
  closeMap();
  if (index === station) scrollToProgress((route.indexOf(index) + .3) / route.length);
  else travelToStation(index);
}
const mapViewport = $('#map-viewport');
const mapContent = $('#map-content');
const mapView = { scale: 1, x: 0, y: 0 };
let mapTarget = { ...mapView };
let mapDrag;
let mapChoosing = false;
let mapSelection = 0;
function paintMap() {
  $('#map-zoom-level').textContent = `${Math.round(mapView.scale * 100)}%`;
  mapContent.style.transform = `translate(${mapView.x * 100}%,${mapView.y * 100}%) scale(${mapView.scale})`;
  mapContent.style.setProperty('--map-scale', mapView.scale);
  mapViewport.classList.toggle('is-zoomed', mapView.scale > 1.01);
  $('#map-zoom-in').disabled = mapChoosing || mapTarget.scale >= 3;
  $('#map-zoom-out').disabled = mapChoosing || mapTarget.scale <= 1;
  $('#map-reset').disabled = mapChoosing || mapTarget.scale <= 1;
}
function moveMap(target, duration = .55) {
  mapTarget = constrainMapView(target);
  paintMap();
  if (!gsap || reducedMotion) {
    Object.assign(mapView, mapTarget);
    paintMap();
    return Promise.resolve();
  }
  return new Promise(resolve => gsap.to(mapView, { ...mapTarget, duration, ease: 'power3.out', overwrite: true, onUpdate: paintMap, onComplete: resolve, onInterrupt: resolve }));
}
function zoomMap(scale, anchor) {
  if (!mapChoosing) moveMap(zoomMapView(mapTarget, scale, anchor));
}
function focusMapPin(pin, scale, duration = .55) {
  return moveMap({ scale, x: .5 - pin.offsetLeft / mapContent.clientWidth * scale, y: .45 - pin.offsetTop / mapContent.clientHeight * scale }, duration);
}
mapViewport.addEventListener('focusin', event => {
  const pin = event.target.closest('.map-pin');
  if (pin?.matches(':focus-visible') && !mapChoosing) focusMapPin(pin, mapTarget.scale);
});
$('#map-zoom-in').addEventListener('click', () => zoomMap(mapTarget.scale + .5));
$('#map-zoom-out').addEventListener('click', () => zoomMap(mapTarget.scale - .5));
$('#map-reset').addEventListener('click', () => moveMap({ scale: 1, x: 0, y: 0 }));
mapViewport.addEventListener('wheel', event => {
  event.preventDefault();
  const rect = mapViewport.getBoundingClientRect();
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
  zoomMap(mapTarget.scale * Math.exp(-delta * .002), { x: clamp((event.clientX - rect.left) / rect.width), y: clamp((event.clientY - rect.top) / rect.height) });
}, { passive: false });
mapViewport.addEventListener('dblclick', event => {
  if (event.target.closest('button')) return;
  const rect = mapViewport.getBoundingClientRect();
  zoomMap(mapTarget.scale > 1 ? 1 : 2, { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height });
});
mapViewport.addEventListener('pointerdown', event => {
  if (mapChoosing || mapDrag || mapView.scale <= 1.01 || event.button !== 0 || event.target.closest('button')) return;
  event.preventDefault();
  gsap?.killTweensOf(mapView);
  mapTarget = { ...mapView };
  mapDrag = { id: event.pointerId, clientX: event.clientX, clientY: event.clientY, view: { ...mapView }, rect: mapViewport.getBoundingClientRect() };
  mapViewport.setPointerCapture(event.pointerId);
  mapViewport.classList.add('is-dragging');
});
mapViewport.addEventListener('pointermove', event => {
  if (event.pointerId !== mapDrag?.id) return;
  Object.assign(mapView, constrainMapView({ scale: mapDrag.view.scale, x: mapDrag.view.x + (event.clientX - mapDrag.clientX) / mapDrag.rect.width, y: mapDrag.view.y + (event.clientY - mapDrag.clientY) / mapDrag.rect.height }));
  mapTarget = { ...mapView };
  paintMap();
});
mapViewport.addEventListener('lostpointercapture', () => {
  mapDrag = undefined;
  mapViewport.classList.remove('is-dragging');
});
mapViewport.addEventListener('keydown', event => {
  if (mapChoosing) return;
  const shifts = { ArrowLeft: [.12, 0], ArrowRight: [-.12, 0], ArrowUp: [0, .12], ArrowDown: [0, -.12] };
  if (['+', '=', '-', '0', 'Home', ...Object.keys(shifts)].includes(event.key)) event.preventDefault();
  if (['+', '='].includes(event.key)) zoomMap(mapTarget.scale + .5);
  else if (event.key === '-') zoomMap(mapTarget.scale - .5);
  else if (['0', 'Home'].includes(event.key)) moveMap({ scale: 1, x: 0, y: 0 });
  else if (shifts[event.key]) moveMap({ ...mapTarget, x: mapTarget.x + shifts[event.key][0], y: mapTarget.y + shifts[event.key][1] }, .25);
});
async function chooseStart(index) {
  if (mapChoosing || starting) return;
  mapChoosing = true;
  const selection = ++mapSelection;
  dismissedHints.add('place');
  updateGuidance();
  const pin = $(`.map-pin[data-start="${index}"]`);
  mapViewport.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
  await focusMapPin(pin, 2.35, .85);
  if (selection !== mapSelection) return;
  mapChoosing = false;
  begin(index);
}
paintMap();
function openMap(event) {
  if (starting || mapChoosing) return;
  if (reading) closeStory();
  closePanel();
  lenis?.stop();
  mapTrigger = event?.currentTarget || $('#map-toggle');
  $('#map-screen').hidden = false;
  moveMap({ scale: 1, x: 0, y: 0 }, 0);
  if (gsap && !reducedMotion) gsap.fromTo('#map-screen', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, overwrite: true, ease: 'power2.out', onComplete: positionGuidance });
  document.body.classList.add('map-open');
  journey.inert = true;
  $('#intro-overlay').inert = true;
  $('#map-title').focus({ preventScroll: true });
  updateGuidance();
}
function closeMap() {
  mapSelection++;
  mapChoosing = false;
  gsap?.killTweensOf(mapView);
  paintMap();
  $('#map-screen').hidden = true;
  document.body.classList.remove('map-open');
  if (started && !starting) lenis?.start();
  journey.inert = !started;
  $('#intro-overlay').inert = started;
  mapTrigger?.focus({ preventScroll: true });
  updateGuidance();
}
async function begin(index) {
  if (started) return goToStation(index);
  if (starting) return;
  starting = true;
  updateGuidance();
  route = routeFrom(index);
  frame = journeyFrame(0, route);
  travel.mix = index;
  renderRoute();
  updateStation(index);
  $('#travel-landscape').style.opacity = 1;
  $('#intro-overlay').hidden = true;
  if (gsap && !reducedMotion) await new Promise(resolve => gsap.to('#map-screen', { opacity: 0, duration: .35, overwrite: true, onComplete: resolve }));
  closeMap();
  $('#intro-overlay').hidden = true;
  $('#intro-overlay').inert = true;
  journey.inert = false;
  journey.classList.add('started');
  document.body.classList.remove('boarding');
  $('#journey-bottom').hidden = false;
  scrollToPosition(0, true);
  window.ScrollTrigger?.refresh();
  travel.speed = 0;
  if (gsap && !reducedMotion) {
    await new Promise(resolve => gsap.timeline({ onComplete: resolve })
      .to('#shutter', { yPercent: -103, duration: 1.2, ease: 'power3.inOut' }));
  } else {
    $('#shutter').style.transform = 'translateY(-103%)';
    travel.speed = 0;
  }
  started = true;
  starting = false;
  lenis?.start();
  onProgress(0);
  $('#next-chapter').focus({ preventScroll: true });
}
const hintContent = {
  start: { title: 'Begin here.', copy: 'Choose a place. Take the window seat.', target: '#start-journey' },
  place: { title: 'Choose your first place.', copy: 'Pick a city here, or a pin on the map. We’ll follow the route from there.', target: '.map-options' },
  window: { title: 'Why the window seat?', copy: 'Every piece begins somewhere. Scroll to follow the places that shape our cloth.', target: '#window-assembly' },
  piece: { title: 'Meet the piece.', copy: 'Tap a + to uncover a detail, then explore the piece’s story.', target: '#product-hotspots button' }
};
function updateGuidance() {
  if (hintStep === 'window' && frame.transitProgress >= .15) dismissedHints.add('window');
  const next = hintsEnabled ? guidanceStep({ started, starting: starting || mapChoosing, reading, mapOpen: !$('#map-screen').hidden, panelOpen: $('#detail-panel').open, frame }) : null;
  const step = dismissedHints.has(next) ? null : next;
  const changed = hintStep !== step;
  hintStep = step;
  if (!changed) return;
  $('#journey-hint').hidden = !step;
  document.body.classList.toggle('has-window-hint', step === 'window');
  $('#how-toggle').setAttribute('aria-pressed', String(hintsEnabled));
  if (!step) return;
  if (changed) {
    $('#journey-hint').dataset.step = step;
    $('#hint-title').textContent = hintContent[step].title;
    $('#hint-copy').textContent = hintContent[step].copy;
  }
  positionGuidance();
  if (changed && gsap && !reducedMotion) {
    gsap.fromTo('.hint-card', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .35, overwrite: true });
    const path = $('#hint-arrow-path'), length = path.getTotalLength();
    gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .7, ease: 'power2.out', overwrite: true, onComplete: () => gsap.set(path, { clearProps: 'strokeDasharray,strokeDashoffset' }) });
  }
}
function positionGuidance() {
  if (!hintStep) return;
  const target = $(hintContent[hintStep].target).getBoundingClientRect();
  const card = $('.hint-card');
  card.style.width = hintStep === 'piece' && innerWidth <= 760 ? `${Math.max(66, Math.min(140, target.left - 26))}px` : '';
  const position = placeGuidance(target, { width: card.offsetWidth, height: card.offsetHeight }, { width: document.documentElement.clientWidth, height: innerHeight }, hintStep);
  card.style.left = `${position.x}px`;
  card.style.top = `${position.y}px`;
  const { sx, sy, tx, ty } = position, dx = tx - sx, dy = ty - sy;
  $('#hint-arrow-path').setAttribute('d', `M${sx},${sy} C${sx + dx * .3 - dy * .3},${sy + dy * .3 + dx * .3} ${sx + dx * .7 - dy * .3},${sy + dy * .7 + dx * .3} ${tx},${ty}`);
}
function dismissGuidance(all = false) {
  if (!hintStep) return;
  const step = hintStep;
  if (all) hintsEnabled = false;
  else dismissedHints.add(step);
  updateGuidance();
  $(step === 'window' ? '#next-chapter' : step === 'place' ? '[data-start]' : hintContent[step].target).focus({ preventScroll: true });
}
$('#hint-dismiss').addEventListener('click', () => dismissGuidance());
$('#hint-skip').addEventListener('click', () => dismissGuidance(true));
$('#how-toggle').addEventListener('click', () => {
  const replay = reading || !hintStep;
  if (reading) closeStory();
  hintsEnabled = replay;
  if (replay) dismissedHints.clear();
  updateGuidance();
});
$('#start-journey').addEventListener('click', event => { dismissedHints.add('start'); openMap(event); });
window.addEventListener('resize', positionGuidance, { passive: true });
$('#map-screen').addEventListener('scroll', positionGuidance, { passive: true });
document.fonts?.ready.then(positionGuidance);
$('#map-toggle').addEventListener('click', openMap);
$('#close-map').addEventListener('click', closeMap);
$$('[data-start]').forEach(button => button.addEventListener('click', () => chooseStart(Number(button.dataset.start))));
$('#home-button').addEventListener('click', () => {
  if (reading) closeStory();
  if (started) openMap();
  else { closeMap(); $('#start-journey').focus(); }
});
$('#next-chapter').addEventListener('click', () => {
  if (frame.inTransit) return scrollToProgress(Math.min(arrivalProgress(frame.destination, route), progressFromScroll() + .04));
  if (frame.complete) return openMap();
  const next = [.30, .52, .72, .94, 1].find(point => point > frame.local + .01);
  scrollToProgress((frame.leg + next) / route.length);
});
$('#next-stop').addEventListener('click', () => frame.final ? openMap() : travelToStation(route[frame.leg + 1]));

function closePanel() {
  if (!$('#detail-panel').open) return;
  $('#detail-panel').close();
  if ((started || reading) && !starting && $('#map-screen').hidden) lenis?.start();
  panelTrigger?.focus({ preventScroll: true });
  updateGuidance();
}
function openPanel(event, garment = false, detail, pieceIndex = station) {
  const s = stations[pieceIndex];
  panelTrigger = event.currentTarget;
  lenis?.stop();
  $('#panel-kicker').textContent = `${s.state.toUpperCase()} / A CLOSER LOOK`;
  $('#panel-title').textContent = detail ? detail.title : garment ? s.noteTitle : frame.chapter === 'place' ? s.placeTitle : s.detailTitle;
  $('#panel-description').textContent = detail ? detail.text : garment ? s.note : frame.chapter === 'place' ? s.place : s.detail;
  $('#panel-media').classList.toggle('is-closeup', !!detail);
  $('#panel-image').style.setProperty('--detail-x', detail?.x ?? .5);
  $('#panel-image').style.setProperty('--detail-y', detail?.y ?? .5);
  setImage('#panel-image', detail ? s.image : garment ? s.fragment : s.notes, detail ? `${s.state}: ${detail.title}` : `${s.state} design notebook`);
  $('#panel-story').href = `#piece/${s.slug}`;
  $('#panel-story').hidden = reading;
  $('#detail-panel').show();
  dismissedHints.add('piece');
  updateGuidance();
}
$('#culture-note').addEventListener('click', event => openPanel(event));
$('#close-panel').addEventListener('click', closePanel);

function renderHotspots(container, piece, pieceIndex) {
  container.replaceChildren(...piece.details.map((detail, i) => {
    const button = document.createElement('button');
    button.className = 'garment-marker';
    button.textContent = '+';
    button.setAttribute('aria-label', `Explore ${detail.title.toLowerCase()}`);
    button.dataset.detail = i;
    button.addEventListener('click', event => openPanel(event, true, detail, pieceIndex));
    return button;
  }));
  positionHotspots(container);
}
function positionHotspots(container) {
  const image = container.previousElementSibling;
  const box = image.getBoundingClientRect();
  const piece = stations[container.id === 'story-hotspots' ? activePieceIndex : station];
  [...container.children].forEach((button, i) => {
    const detail = piece.details[i];
    const position = containedPoint(image.naturalWidth, image.naturalHeight, box.width, box.height, detail.x, detail.y);
    if (!position) return;
    button.style.left = `${position.left}px`;
    button.style.top = `${position.top}px`;
  });
  if (hintStep === 'piece') positionGuidance();
}
const hotspotObserver = new ResizeObserver(() => $$('.garment-hotspots').forEach(positionHotspots));
$$('.garment-stage').forEach(stage => {
  hotspotObserver.observe(stage);
  stage.querySelector('img').addEventListener('load', () => positionHotspots(stage.querySelector('.garment-hotspots')));
});
$('#collection-grid').replaceChildren(...stations.map((piece, i) => {
  const article = document.createElement('article');
  article.className = 'collection-piece';
  const link = document.createElement('a');
  link.href = `#piece/${piece.slug}`;
  link.innerHTML = `<figure><img src="${piece.image}" alt="${piece.caption}" loading="lazy"><span>Explore the piece ↗</span></figure><div class="collection-piece-heading"><span class="eyebrow">0${i + 1} / ${piece.state.toUpperCase()}</span><h2>${piece.title}</h2><p>${piece.description}</p></div>`;
  article.append(link);
  return article;
}));
$('#collection-back').addEventListener('click', closeStory);
$('#collection-journey').addEventListener('click', () => { closeStory(); openMap(); });
$('#story-detail-link').addEventListener('click', event => { event.preventDefault(); scrollToPosition($('#piece-details').offsetTop - 115); });
$('#interest-form').addEventListener('submit', event => event.preventDefault());

function showStory() {
  const page = pageFromHash(location.hash);
  if (page.type === 'journey') {
    if (reading) leaveStory();
    return;
  }
  if (!reading) savedJourneyScroll = scrollY;
  closePanel();
  if (!$('#map-screen').hidden) closeMap();
  reading = true;
  lenis?.stop();
  document.body.classList.remove('map-open', 'boarding');
  document.body.classList.add('reading');
  updateGuidance();
  $('#piece-page').hidden = page.type !== 'piece';
  $('#collection-page').hidden = page.type !== 'collection';
  storyObserver?.disconnect();
  if (page.type === 'collection') {
    document.title = 'The collection — HASSTRA';
    scrollToPosition(0, true);
    lenis?.start();
    $('#collection-title').focus({ preventScroll: true });
    return;
  }
  activePieceIndex = stations.findIndex(item => item.slug === page.slug);
  const s = stations[activePieceIndex];
  $('#piece-name').textContent = s.title;
  $('#story-region').textContent = `${s.state.toUpperCase()} / THE STORY OF THE PIECE`;
  $('#story-intro').textContent = s.description;
  $('#story-place-title').textContent = s.placeTitle;
  $('#story-place').textContent = s.place;
  $('#story-detail-title').textContent = s.detailTitle;
  $('#story-detail').textContent = s.detail;
  $('#story-notes-caption').textContent = s.slug === 'jaipur' ? 'ORIGINAL ANNOTATED BACK DESIGN / HASSTRA' : s.caption;
  setImage('#story-image', s.image, s.caption);
  setImage('#story-landscape', s.scenery, `${s.state} cultural landscape illustration`);
  renderHotspots($('#story-hotspots'), s, activePieceIndex);
  $('#story-detail-list').replaceChildren(...s.details.map((detail, i) => {
    const article = document.createElement('article');
    article.innerHTML = `<div class="detail-image"><img src="${s.image}" alt="${detail.title}" loading="lazy" style="--detail-x:${detail.x};--detail-y:${detail.y}"></div><span class="eyebrow">0${i + 1} / THE DETAIL</span><h3>${detail.title}</h3><p>${detail.text}</p>`;
    return article;
  }));
  $$('.story-section').forEach(section => section.classList.remove('in-view'));
  if (!reducedMotion && 'IntersectionObserver' in window) {
    document.body.classList.add('story-motion');
    storyObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); storyObserver.unobserve(entry.target); }
    }), { threshold: .1 });
    $$('.story-section').forEach(section => storyObserver.observe(section));
  }
  setImage('#story-notes-image', s.notes, `${s.state} original garment design sheet`);
  document.title = `${s.title} — HASSTRA`;
  scrollToPosition(0, true);
  lenis?.start();
  $('#piece-name').focus({ preventScroll: true });
}
function leaveStory() {
  closePanel();
  lenis?.stop();
  reading = false;
  $('#piece-page').hidden = true;
  $('#collection-page').hidden = true;
  storyObserver?.disconnect();
  document.body.classList.remove('reading');
  document.body.classList.toggle('boarding', !started);
  journey.inert = !started;
  $('#intro-overlay').inert = started;
  document.title = 'HASSTRA — A journey, woven.';
  window.ScrollTrigger?.refresh();
  scrollToPosition(savedJourneyScroll, true);
  if (started) lenis?.start();
  onProgress(progressFromScroll());
  updateGuidance();
  (started ? $(frame.chapter === 'piece' ? '#view-piece' : '#next-chapter') : $('#start-journey')).focus({ preventScroll: true });
}
function closeStory() {
  history.replaceState(null, '', location.pathname + location.search);
  leaveStory();
}
$('#back-journey').addEventListener('click', closeStory);
$('#story-continue').addEventListener('click', closeStory);
window.addEventListener('hashchange', showStory);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if ($('#detail-panel').open) closePanel();
    else if (hintStep) dismissGuidance();
    else if (!$('#map-screen').hidden) closeMap();
  }
  if (event.key === 'Tab' && !$('#map-screen').hidden) {
    const controls = $$('#map-screen button, #journey-hint button').filter(button => button.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === $('#map-title'))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

async function toggleSound() {
  if (soundBusy) return;
  soundBusy = true;
  try {
    if (soundEnabled) {
      clearInterval(soundTimer);
      await context?.suspend();
      soundEnabled = false;
    } else {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('Audio unavailable');
      context ||= new AudioContext();
      await context.resume();
      soundEnabled = true;
      soundTimer = setInterval(() => {
        if (context.state !== 'running' || travel.speed < .05) return;
        [0, .12].forEach(delay => {
          const oscillator = context.createOscillator(), gain = context.createGain();
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(85, context.currentTime + delay);
          oscillator.frequency.exponentialRampToValueAtTime(26, context.currentTime + delay + .11);
          gain.gain.setValueAtTime(0, context.currentTime + delay);
          gain.gain.linearRampToValueAtTime(.025 * travel.speed, context.currentTime + delay + .005);
          gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + delay + .12);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(context.currentTime + delay);
          oscillator.stop(context.currentTime + delay + .13);
        });
      }, 630);
    }
    $('#sound-toggle').setAttribute('aria-pressed', String(soundEnabled));
    $('#sound-toggle').setAttribute('aria-label', `Turn train ambience ${soundEnabled ? 'off' : 'on'}`);
    $('#sound-toggle span').textContent = `SOUND ${soundEnabled ? 'ON' : 'OFF'}`;
  } catch {
    $('#sound-toggle span').textContent = 'SOUND UNAVAILABLE';
    $('#sound-toggle').setAttribute('aria-label', 'Train ambience unavailable');
  } finally { soundBusy = false; }
}
$('#sound-toggle').addEventListener('click', toggleSound);
document.addEventListener('visibilitychange', () => {
  isHidden = document.hidden;
  if (context && soundEnabled) (isHidden ? context.suspend() : context.resume()).catch(() => {});
});
if (lenis && gsap) {
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
let previousMotionScroll = scrollY;
function updateTravelSpeed() {
  travel.speed = !reducedMotion && started && frame.inTransit && !reading ? Math.min(1, Math.abs(scrollY - previousMotionScroll) / 12) * frame.travelSpeed : 0;
  previousMotionScroll = scrollY;
}
if (gsap) gsap.ticker.add(updateTravelSpeed);
if (gsap && window.ScrollTrigger) {
  gsap.registerPlugin(window.ScrollTrigger);
  if (lenis) {
    lenis.on('scroll', window.ScrollTrigger.update);
    window.ScrollTrigger.addEventListener('refresh', () => lenis.resize());
  }
  window.ScrollTrigger.create({ trigger: journey, start: 'top top', end: 'bottom bottom', onUpdate: self => onProgress(self.progress), onRefresh: self => onProgress(self.progress) });
} else window.addEventListener('scroll', () => onProgress(progressFromScroll()), { passive: true });
window.addEventListener('resize', () => onProgress(progressFromScroll()), { passive: true });
journey.inert = true;
showStory();
updateGuidance();

// Transparent subjects assemble with scroll; the complete images remain the WebGL fallback.
async function initScene() {
  let renderer;
  try {
    const THREE = await import('./vendor/three.module.js');
    const canvas = $('#landscape');
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2, 2, 1, -1, .1, 30);
    camera.position.z = 10;
    const loader = new THREE.TextureLoader();
    const backdrops = await Promise.all(['assets/rajasthan-landscape.webp', 'assets/gujarat-landscape.webp'].map(async file => {
      const texture = await loader.loadAsync(file);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
      mesh.userData.ratio = texture.image.width / texture.image.height;
      mesh.position.z = -1;
      mesh.renderOrder = -1;
      scene.add(mesh);
      return mesh;
    }));
    const subjects = [
      [
        { file: 'assets/rajasthan-palace.webp', x: -.12, y: .04, height: 1.65, fromX: -1, fromY: .35, tilt: -.12 },
        { file: 'assets/rajasthan-musician.webp', x: -.48, y: -.44, height: 1.25, fromX: -.8, fromY: -1, tilt: .18 },
        { file: 'assets/rajasthan-camel.webp', x: .57, y: -.39, height: 1.3, fromX: 1, fromY: .3, tilt: -.15 },
        { file: 'assets/rajasthan-peacock.webp', x: -.57, y: -.72, height: .8, fromX: -.5, fromY: -1, tilt: .12 },
        { file: 'assets/rajasthan-foreground.webp', x: 0, y: -.72, height: 1.25, fromX: .3, fromY: -1, tilt: -.08 }
      ],
      [
        { file: 'assets/gujarat-stepwell.webp', x: -.4, y: -.14, height: 1.75, fromX: -1, fromY: .25, tilt: -.1 },
        { file: 'assets/gujarat-dancer.webp', x: .55, y: -.25, height: 1.8, fromX: 1, fromY: -.25, tilt: .22 },
        { file: 'assets/gujarat-peacock.webp', x: -.58, y: -.74, height: .83, fromX: -.5, fromY: -1, tilt: -.15 },
        { file: 'assets/gujarat-kites.webp', x: .72, y: .69, height: .65, fromX: .4, fromY: 1, tilt: .3 },
        { file: 'assets/gujarat-foreground.webp', x: 0, y: -.72, height: 1.25, fromX: -.3, fromY: -1, tilt: .08 }
      ]
    ];
    let aspect = 2.5;
    const groups = await Promise.all(subjects.map(async pieces => {
      const group = new THREE.Group();
      const meshes = await Promise.all(pieces.map(async (piece, i) => {
        const texture = await loader.loadAsync(piece.file);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
        mesh.userData = { ...piece, ratio: texture.image.width / texture.image.height };
        mesh.renderOrder = piece.file.includes('kites') ? .5 : i;
        return mesh;
      }));
      group.add(...meshes);
      scene.add(group);
      return group;
    }));

    let bufferWidth = 0, bufferHeight = 0;
    function resize() {
      const width = Math.max(1, windowBox.clientWidth);
      const height = Math.max(1, windowBox.clientHeight);
      aspect = width / height;
      const stage = $('#carriage');
      // Keep the GPU buffer stable while the window zooms; only its projection changes.
      if (stage.clientWidth !== bufferWidth || stage.clientHeight !== bufferHeight) {
        bufferWidth = Math.max(1, stage.clientWidth);
        bufferHeight = Math.max(1, stage.clientHeight);
        renderer.setSize(bufferWidth, bufferHeight, false);
      }
      camera.left = -aspect; camera.right = aspect; camera.updateProjectionMatrix();
      backdrops.forEach(mesh => {
        const width = Math.max(aspect * 2, mesh.userData.ratio * 2) * 1.02;
        mesh.scale.set(width, width / mesh.userData.ratio, 1);
      });
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
    function render() {
      if (reading || isHidden || scrollY > journey.offsetTop + journey.offsetHeight) return;
      const shift = travel.mix;
      backdrops.forEach((mesh, i) => { mesh.material.opacity = i === 0 ? 1 - shift : shift; });
      groups.forEach((group, groupIndex) => {
        const opacity = groupIndex === 0 ? 1 - shift : shift;
        group.visible = opacity > 0;
        group.children.forEach((mesh, i) => {
          const piece = mesh.userData;
          const assembled = reducedMotion ? 1 : collageEntrance(frame.local, Math.min(i, 3));
          const remaining = 1 - assembled;
          const height = piece.height * (aspect < 1 ? .8 : 1) * (1 - remaining * .22);
          mesh.scale.set(height * piece.ratio, height, 1);
          mesh.position.set(piece.x * aspect + remaining * piece.fromX * (aspect * 2 + 2), piece.y + remaining * piece.fromY * 3, i * .01);
          mesh.rotation.z = remaining * piece.tilt;
          mesh.material.opacity = opacity * (reducedMotion ? 1 : smoothstep(0, .18, assembled));
        });
        group.position.x += (travel.pointerX - group.position.x) * .035;
        group.position.y += (-travel.pointerY - group.position.y) * .035;
      });
      renderer.render(scene, camera);
    }
    if (gsap) gsap.ticker.add(render);
    else {
      const tick = () => { updateTravelSpeed(); render(); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  } catch (error) {
    renderer?.dispose();
    windowBox.classList.remove('webgl-ready');
    $('#landscape').classList.remove('ready');
    console.info('Using the accessible image-based scenery fallback.', error.message || error.target?.src || String(error));
  }
}
initScene();
