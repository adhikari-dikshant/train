export const clamp = value => Math.max(0, Math.min(1, value));
export function smoothstep(a, b, value) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function routeFrom(start) {
  if (![0, 1].includes(start)) throw new RangeError('Unknown starting station');
  return start === 0 ? [0, 1] : [1, 0];
}
export function journeyFrame(progress, route) {
  const p = clamp(progress);
  const leg = Math.min(route.length - 1, Math.floor(p * route.length));
  const local = p * route.length - leg;
  const final = leg === route.length - 1;
  const zoom = smoothstep(.12, .25, local) * (final ? 1 : 1 - smoothstep(.88, .98, local));
  const chapter = local < .25 ? 'travel' : local < .47 ? 'place' : local < .64 ? 'detail' : local < .88 || final ? 'piece' : 'travel';
  const mix = leg === 0 ? route[leg] : route[leg - 1] + (route[leg] - route[leg - 1]) * smoothstep(0, .12, local);
  const pieceShade = smoothstep(.61, .68, local) * (final ? 1 : 1 - smoothstep(.86, .9, local));
  return { leg, local, station: route[leg], zoom, chapter, mix, pieceShade, final, complete: p >= .999 };
}
