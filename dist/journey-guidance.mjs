export function guidanceStep({ started, starting, reading, mapOpen, panelOpen, frame }) {
  if (reading || starting || panelOpen) return null;
  if (mapOpen) return 'place';
  if (!started) return 'start';
  if (frame.inTransit && frame.transitProgress < .15 && frame.zoom < .01) return 'window';
  return frame.chapter === 'piece' ? 'piece' : null;
}

export function placeGuidance(target, card, viewport, step) {
  const mobile = viewport.width <= 760;
  let x, y, tx = target.left + target.width / 2, ty = target.top + target.height / 2;
  if (step === 'start') {
    x = mobile ? target.right - card.width + 16 : target.left - card.width - 55;
    y = mobile ? target.top - card.height - 16 : target.top - 12;
    if (mobile) ty = target.top;
    else tx = target.left;
  } else if (step === 'place') {
    x = mobile ? target.left : target.right + 45;
    y = mobile ? target.bottom + 14 : target.top + 5;
    if (mobile && y + card.height > viewport.height - 16) y = target.top - card.height - 14;
    if (mobile) ty = y < target.top ? target.top : target.bottom;
    else tx = target.right;
  } else if (step === 'window') {
    x = mobile ? (viewport.width - card.width) / 2 : target.left - card.width - 55;
    y = mobile ? target.bottom + 18 : target.top + 20;
    tx = mobile ? target.left + target.width * .78 : target.left + 12;
    ty = mobile ? target.bottom - 8 : target.top + target.height * .5;
  } else {
    x = target.left - card.width - (mobile ? 16 : 30);
    y = target.top - 15;
  }
  x = Math.max(12, Math.min(viewport.width - card.width - 12, x));
  y = Math.max(mobile ? 100 : 132, Math.min(viewport.height - card.height - (step === 'place' ? 16 : 80), y));
  const cx = x + card.width / 2, cy = y + card.height / 2;
  const horizontal = Math.abs(tx - cx) > Math.abs(ty - cy);
  const sx = horizontal ? (tx > cx ? x + card.width : x) : cx;
  const sy = horizontal ? cy : (ty > cy ? y + card.height : y);
  return { x, y, sx, sy, tx, ty };
}
