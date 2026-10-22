import { clamp, smoothstep, routeFrom, journeyFrame, arrivalProgress } from './journey-state.mjs';
import { constrainMapView, zoomMapView } from './map-view.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const gsap = window.gsap;
const lenis = !reducedMotion && window.Lenis ? new window.Lenis({ lerp: .085, autoRaf: !gsap }) : null;
lenis?.stop();
const journey = $('#journey');
const windowBox = $('#window-interior');
const travel = { speed: 0, departure: 0, progress: 0, mix: 0, pointerX: 0, pointerY: 0 };
let started = false;
let starting = false;
let inTransit = false;
let transitPromise;
let station = 0;
let route = routeFrom(0);
let frame = journeyFrame(0, route);
let lastChapter = '';
let savedJourneyScroll = 0;
let reading = false;
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
    note: 'Look at the floral shoulder panel, the framed pocket motif and the contrasting pocket flap. These are HASSTRA’s supplied design references, shown alongside the front and back study.'
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
    note: 'The floral lines draw the eye down the front, while the patterned cuffs and hem give the design a frame. This is the revised “Warrior” artwork supplied in the Gujarat folder.'
  }
];

function animate(target, properties) {
  if (gsap) return gsap.to(target, { overwrite: 'auto', ...properties, duration: reducedMotion ? 0 : properties.duration ?? .55 });
  const node = typeof target === 'string' ? $(target) : target;
  if (properties.opacity !== undefined) node.style.opacity = properties.opacity;
  if (properties.y !== undefined) node.style.transform = `translateY(${properties.y}px)`;
  properties.onComplete?.();
}
function clothTransition() {
  if (reducedMotion || !gsap || gsap.isTweening('#cloth-fold')) return;
  const fold = $('#cloth-fold');
  gsap.fromTo(fold,
    { x: -fold.offsetWidth - innerHeight * .3, skewX: -7, scaleX: .85 },
    { x: innerWidth + innerHeight * .3, skewX: 6, scaleX: 1.05, duration: .68, ease: 'power2.inOut' });
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
  animate(node, { opacity: visible ? 1 : 0, y: visible ? 0 : 18, duration: .4 });
}
function travelToStation(index, firstTrip = false) {
  if (inTransit) return transitPromise;
  if (!route.includes(index)) return;
  clothTransition();
  inTransit = true;
  closePanel();
  lenis?.stop();
  const origin = stations[station].name;
  const destination = stations[index].name;
  gsap?.killTweensOf('#culture-copy');
  ['#culture-copy', '#product-reveal', '#detail-fragment'].forEach(selector => reveal(selector, false));
  document.body.classList.add('in-transit', 'is-travelling');
  $('#route-progress').inert = true;
  $('#next-chapter').disabled = true;
  $('#map-toggle').disabled = true;
  $('#travel-caption').setAttribute('aria-hidden', 'false');
  $('#travel-kicker').textContent = firstTrip ? `FIRST STOP / ${destination.toUpperCase()}` : `${origin.toUpperCase()} → ${destination.toUpperCase()}`;
  $('#travel-name').textContent = firstTrip ? 'And we’re off.' : `Leaving ${origin} behind.`;
  $('#travel-description').textContent = 'Open fields. Little towns. A little time between places.';
  $('#status-text').textContent = `EN ROUTE / ${destination.toUpperCase()}`;
  transitPromise = new Promise(resolve => {
    const arrive = () => {
      clothTransition();
      frame = journeyFrame(arrivalProgress(index, route), route);
      travel.mix = index;
      updateStation(index);
      $('#travel-name').textContent = `Now arriving, ${destination}.`;
      $('#travel-description').textContent = 'The train is slowing. A new story is just outside.';
      $('#status-text').textContent = `NOW ARRIVING / ${destination.toUpperCase()}`;
      animate('#travel-landscape', { opacity: 0, duration: .8, onComplete: () => {
        travel.speed = 0;
        document.body.classList.remove('in-transit', 'is-travelling');
        lenis?.start();
        scrollToProgress(arrivalProgress(index, route), true);
        inTransit = false;
        lastChapter = '';
        $('#route-progress').inert = false;
        $('#next-chapter').disabled = false;
        $('#map-toggle').disabled = false;
        onProgress(progressFromScroll());
        $('#next-chapter').focus({ preventScroll: true });
        resolve();
      } });
    };
    if (gsap && !reducedMotion) {
      gsap.timeline()
        .to('#carriage', { '--zoom': 0, '--piece-shade': 0, duration: .8, ease: 'power2.inOut' }, 0)
        .to('#travel-landscape', { opacity: 1, duration: .5 }, 0)
        .to(travel, { speed: 1, duration: 1.1, ease: 'power2.in' }, .2)
        .call(() => { $('#travel-name').textContent = 'Watching India go by.'; }, [], 1.1)
        .call(() => {
          $('#travel-name').textContent = `Coming into ${destination}.`;
          $('#status-text').textContent = `APPROACHING / ${destination.toUpperCase()}`;
        }, [], 3.4)
        .to(travel, { speed: 0, duration: 1, ease: 'power2.out' }, 3.4)
        .call(arrive, [], 4.4);
    } else {
      $('#carriage').style.setProperty('--zoom', 0);
      $('#carriage').style.setProperty('--piece-shade', 0);
      $('#travel-landscape').style.opacity = 1;
      travel.speed = reducedMotion ? 0 : 1;
      setTimeout(arrive, reducedMotion ? 650 : 4400);
    }
  });
  return transitPromise;
}
function onProgress(p) {
  if (!started || starting || reading || inTransit) return;
  const nextFrame = journeyFrame(p, route);
  const requestedStation = nextFrame.station === station ? nextFrame.destination : nextFrame.station;
  // Route buttons and fast scrolling must both pass through the travel interlude.
  if (requestedStation !== station) { travelToStation(requestedStation); return; }
  frame = nextFrame;
  travel.progress = p;
  travel.mix = frame.mix;
  travel.speed = frame.chapter === 'travel' ? (frame.local < .12 ? Math.sin(frame.local / .12 * Math.PI) : 1 - frame.zoom) : 0;
  $('#carriage').style.setProperty('--zoom', frame.zoom.toFixed(4));
  $('#carriage').style.setProperty('--piece-shade', frame.pieceShade.toFixed(4));
  $('#carriage').dataset.chapter = frame.chapter;
  $('#travel-caption').setAttribute('aria-hidden', String(frame.zoom > .99));
  document.body.classList.toggle('is-travelling', travel.speed > .1 && !reducedMotion);
  $('#travelling-overlay').style.opacity = reducedMotion ? 0 : travel.speed * .3;
  $('.scene-jaipur').style.opacity = 1 - travel.mix;
  $('.scene-ahmedabad').style.opacity = travel.mix;
  if (station !== frame.station) updateStation(frame.station);
  const destination = stations[frame.destination];
  $('#travel-kicker').textContent = 'YOUR WINDOW SEAT';
  $('#travel-name').textContent = `Now at ${destination.name}.`;
  $('#travel-description').textContent = 'Stay a while. Scroll to step into the story.';
  if (frame.chapter === 'travel') $('#status-text').textContent = `NOW AT / ${destination.name.toUpperCase()}`;
  const key = `${station}/${frame.chapter}`;
  if (key !== lastChapter) {
    if (lastChapter) clothTransition();
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
    $('#status-text').textContent = frame.chapter === 'travel' ? `NOW AT / ${destination.name.toUpperCase()}` : `STOP 0${frame.leg + 1} / ${s.state.toUpperCase()}`;
    lastChapter = key;
  }
  $('#next-chapter').setAttribute('aria-label', frame.complete ? 'Explore the itinerary' : 'Next chapter');
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
  if (!started || starting || inTransit) return;
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
  if (mapChoosing || starting || inTransit) return;
  mapChoosing = true;
  const selection = ++mapSelection;
  const pin = $(`.map-pin[data-start="${index}"]`);
  mapViewport.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
  await focusMapPin(pin, 2.35, .85);
  if (selection !== mapSelection) return;
  mapChoosing = false;
  begin(index);
}
paintMap();
function openMap(event) {
  if (starting || inTransit || mapChoosing) return;
  clothTransition();
  if (reading) closeStory();
  closePanel();
  lenis?.stop();
  mapTrigger = event?.currentTarget || $('#map-toggle');
  $('#map-screen').hidden = false;
  moveMap({ scale: 1, x: 0, y: 0 }, 0);
  if (gsap && !reducedMotion) gsap.fromTo('#map-screen', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, overwrite: true, ease: 'power2.out' });
  document.body.classList.add('map-open');
  journey.inert = true;
  $('#intro-overlay').inert = true;
  $('#map-title').focus({ preventScroll: true });
}
function closeMap() {
  if (!$('#map-screen').hidden) clothTransition();
  mapSelection++;
  mapChoosing = false;
  gsap?.killTweensOf(mapView);
  paintMap();
  $('#map-screen').hidden = true;
  document.body.classList.remove('map-open');
  if (started && !starting && !inTransit) lenis?.start();
  journey.inert = !started;
  $('#intro-overlay').inert = started;
  mapTrigger?.focus({ preventScroll: true });
}
async function begin(index) {
  if (started) return goToStation(index);
  if (starting) return;
  starting = true;
  route = routeFrom(index);
  frame = journeyFrame(0, route);
  travel.mix = index;
  renderRoute();
  updateStation(index);
  $('#travel-landscape').style.opacity = 1;
  $('#intro-overlay').hidden = true;
  clothTransition();
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
  travel.departure = 1;
  travel.speed = 1;
  if (gsap && !reducedMotion) {
    await new Promise(resolve => gsap.timeline({ onComplete: resolve })
      .to('#shutter', { yPercent: -103, duration: 1.5, ease: 'power3.inOut' })
      .to(travel, { departure: 0, speed: 0, duration: 1.6, ease: 'power2.out' }, '<'));
  } else {
    $('#shutter').style.transform = 'translateY(-103%)';
    travel.departure = 0;
    travel.speed = 0;
  }
  started = true;
  starting = false;
  await travelToStation(index, true);
  $('#next-chapter').focus({ preventScroll: true });
}
$('#start-journey').addEventListener('click', openMap);
$('#map-toggle').addEventListener('click', openMap);
$('#close-map').addEventListener('click', closeMap);
$$('[data-start]').forEach(button => button.addEventListener('click', () => chooseStart(Number(button.dataset.start))));
$('#home-button').addEventListener('click', () => {
  if (reading) closeStory();
  if (started) openMap();
  else { closeMap(); $('#start-journey').focus(); }
});
$('#next-chapter').addEventListener('click', () => {
  if (inTransit) return;
  if (frame.complete) return openMap();
  const next = [.30, .52, .72, .94, 1].find(point => point > frame.local + .01);
  scrollToProgress((frame.leg + next) / route.length);
});
$('#next-stop').addEventListener('click', () => frame.final ? openMap() : travelToStation(route[frame.leg + 1]));

function closePanel() {
  if (!$('#detail-panel').open) return;
  $('#detail-panel').close();
  if (started && !starting && !inTransit && !reading && $('#map-screen').hidden) lenis?.start();
  panelTrigger?.focus({ preventScroll: true });
}
function openPanel(event, garment = false) {
  const s = stations[station];
  panelTrigger = event.currentTarget;
  lenis?.stop();
  $('#panel-kicker').textContent = `${s.state.toUpperCase()} / A CLOSER LOOK`;
  $('#panel-title').textContent = garment ? s.noteTitle : frame.chapter === 'place' ? s.placeTitle : s.detailTitle;
  $('#panel-description').textContent = garment ? s.note : frame.chapter === 'place' ? s.place : s.detail;
  setImage('#panel-image', garment ? s.fragment : s.notes, `${s.state} design notebook`);
  $('#panel-story').href = `#piece/${s.slug}`;
  $('#detail-panel').show();
}
$('#culture-note').addEventListener('click', event => openPanel(event));
$('#garment-note').addEventListener('click', event => openPanel(event, true));
$('#close-panel').addEventListener('click', closePanel);

function showStory() {
  const slug = location.hash.match(/^#piece\/(jaipur|ahmedabad)$/)?.[1];
  if (!slug) {
    if (reading) leaveStory();
    return;
  }
  const s = stations.find(item => item.slug === slug);
  if (!reading) clothTransition();
  if (!reading) savedJourneyScroll = scrollY;
  reading = true;
  lenis?.stop();
  closePanel();
  $('#map-screen').hidden = true;
  document.body.classList.remove('map-open', 'boarding');
  document.body.classList.add('reading');
  $('#piece-page').hidden = false;
  $('#piece-name').textContent = s.title;
  $('#story-region').textContent = `${s.state.toUpperCase()} / THE STORY OF THE PIECE`;
  $('#story-intro').textContent = s.description;
  $('#story-place-title').textContent = s.placeTitle;
  $('#story-place').textContent = s.place;
  $('#story-detail-title').textContent = s.detailTitle;
  $('#story-detail').textContent = s.detail;
  $('#story-notes-caption').textContent = s.slug === 'jaipur' ? 'ORIGINAL ANNOTATED BACK DESIGN / HASSTRA' : s.caption;
  setImage('#story-image', s.image, s.caption);
  setImage('#story-notes-image', s.notes, `${s.state} original garment design sheet`);
  document.title = `${s.title} — HASSTRA`;
  scrollToPosition(0, true);
  lenis?.start();
  $('#piece-name').focus({ preventScroll: true });
}
function leaveStory() {
  clothTransition();
  lenis?.stop();
  reading = false;
  $('#piece-page').hidden = true;
  document.body.classList.remove('reading');
  document.body.classList.toggle('boarding', !started);
  document.title = 'HASSTRA — A journey, woven.';
  window.ScrollTrigger?.refresh();
  scrollToPosition(savedJourneyScroll, true);
  if (started) lenis?.start();
  onProgress(progressFromScroll());
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
    else if (!$('#map-screen').hidden) closeMap();
  }
  if (event.key === 'Tab' && !$('#map-screen').hidden) {
    const controls = $$('#map-screen button');
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

// Six independent collage panels keep the existing lateral travel effect.
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
    const textures = await Promise.all(['assets/rajasthan-collage.jpg', 'assets/gujarat-collage.jpg'].map(path => loader.loadAsync(path)));
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
    function render(time) {
      if (reading || isHidden || scrollY > journey.offsetTop + journey.offsetHeight) return;
      const t = time * .001;
      const shift = travel.mix;
      backdrops.forEach((mesh, i) => { mesh.material.opacity = i === 0 ? 1 - shift : shift; });
      groups.forEach((group, groupIndex) => {
        const phase = groupIndex === 0 ? -shift : 1 - shift;
        group.visible = groupIndex === 0 ? shift < 1 : shift > 0;
        group.userData.panels.forEach((mesh, i) => {
          const stagger = 1 + (groupIndex === 0 ? i : 5 - i) * .065;
          const movement = reducedMotion ? 0 : (phase + (groupIndex === station ? travel.departure : 0)) * (aspect * 2 + 1.5) * stagger;
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
    if (gsap) gsap.ticker.add(time => render(time * 1000));
    else {
      const tick = time => { render(time); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  } catch (error) {
    renderer?.dispose();
    windowBox.classList.remove('webgl-ready');
    $('#landscape').classList.remove('ready');
    console.info('Using the accessible image-based scenery fallback.', error.message);
  }
}
initScene();
