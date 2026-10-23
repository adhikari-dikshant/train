export const clamp = value => Math.max(0, Math.min(1, value));
export function smoothstep(a, b, value) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function routeFrom(start) {
  if (![0, 1].includes(start)) throw new RangeError('Unknown starting station');
  return start === 0 ? [0, 1] : [1, 0];
}
export function arrivalProgress(station, route) {
  const leg = route.indexOf(station);
  if (leg < 0) throw new RangeError('Unknown destination');
  return (leg + .12) / route.length;
}
export function departureProgress(station, route) {
  const leg = route.indexOf(station);
  if (leg < 0) throw new RangeError('Unknown destination');
  return Math.max(0, leg - .12) / route.length;
}
export function journeyFrame(progress, route) {
  const p = clamp(progress);
  const leg = Math.min(route.length - 1, Math.floor(p * route.length));
  const local = p * route.length - leg;
  const final = leg === route.length - 1;
  const zoom = smoothstep(.12, .19, local) * (final ? 1 : 1 - smoothstep(.88, .98, local));
  const chapter = local < .19 ? 'travel' : local < .47 ? 'place' : local < .64 ? 'detail' : local < .88 || final ? 'piece' : 'travel';
  const mix = leg === 0 ? route[leg] : route[leg - 1] + (route[leg] - route[leg - 1]) * smoothstep(0, .06, local); // swap stations while the scenery fully covers the window
  const pieceShade = smoothstep(.61, .68, local) * (final ? 1 : 1 - smoothstep(.86, .9, local));
  const destination = !final && local >= .88 ? route[leg + 1] : route[leg];
  const inTransit = local < .12 || (!final && local >= .88);
  const transitProgress = local >= .88 && !final ? (local - .88) / .24 : leg === 0 ? clamp(local / .12) : clamp((local + .12) / .24);
  const cruiseEnd = .35, stopAt = .85;
  // Fast cruise, then linear braking to a standstill at stopAt, so distance has no speed jump.
  const t = Math.min(transitProgress, stopAt);
  const sceneryProgress = t <= cruiseEnd ? 2 * t / (stopAt + cruiseEnd) : 1 - (stopAt - t) ** 2 / ((stopAt - cruiseEnd) * (stopAt + cruiseEnd));
  const travelSpeed = Math.min(1, Math.max(0, (stopAt - transitProgress) / (stopAt - cruiseEnd)));
  const landscapeOpacity = inTransit ? (leg === 0 && local < .12 ? 1 : smoothstep(0, .12, transitProgress)) * (1 - smoothstep(stopAt - .03, 1, transitProgress)) : 0;
  return { leg, local, station: route[leg], destination, zoom, chapter, mix, pieceShade, inTransit, transitProgress, sceneryProgress, travelSpeed, landscapeOpacity, final, complete: p >= .999 };
}
