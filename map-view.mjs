export function constrainMapView({ scale, x, y }) {
  scale = Math.max(1, Math.min(3, scale));
  const bound = value => Math.max(1 - scale, Math.min(0, value));
  return { scale, x: bound(x), y: bound(y) };
}

export function zoomMapView(view, scale, anchor = { x: .5, y: .5 }) {
  scale = Math.max(1, Math.min(3, scale));
  const ratio = scale / view.scale;
  return constrainMapView({
    scale,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio
  });
}
