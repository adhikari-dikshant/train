export function pageFromHash(hash) {
  if (hash === '#collection') return { type: 'collection' };
  const slug = hash.match(/^#piece\/(jaipur|ahmedabad)$/)?.[1];
  return slug ? { type: 'piece', slug } : { type: 'journey' };
}

export function containedPoint(imageWidth, imageHeight, boxWidth, boxHeight, x, y) {
  if (![imageWidth, imageHeight, boxWidth, boxHeight].every(value => value > 0)) return null;
  const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
  return {
    left: (boxWidth - imageWidth * scale) / 2 + imageWidth * scale * x,
    top: (boxHeight - imageHeight * scale) / 2 + imageHeight * scale * y
  };
}
