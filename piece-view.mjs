import { smoothstep } from './journey-state.mjs';

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

export function specificationsFor(piece) {
  const rajasthan = piece.slug === 'jaipur';
  return [
    { title: 'Silhouette', text: rajasthan ? 'A long, collared shirt, drawn with a tied waist and a straight trouser. An easy outline gives the patterned panels space.' : 'A relaxed jacket with a V neckline and generous sleeves. Its broad shape gives the botanical panels room to move.', values: [['Form', rajasthan ? 'Belted shirt & trouser set' : 'Relaxed jacket'], ['Reference', rajasthan ? 'Front & back study' : 'Revised Warrior study']] },
    { title: 'Palette', text: rajasthan ? 'A quiet ecru ground, interrupted by small concentrations of indigo and madder red.' : 'An ink-dark ground carries botanical greens, warm reds and small cream accents.', values: [['Ground', rajasthan ? 'Ecru' : 'Ink navy'], ['Accents', rajasthan ? 'Indigo / red / cream' : 'Green / red / cream']] },
    { title: 'Motif', text: piece.details[0].text, values: [['Language', rajasthan ? 'Floral shoulder panels' : 'Climbing botanical panels'], ['Placement', rajasthan ? 'Shoulders & back yoke' : 'Front & upper sleeves']] },
    { title: 'Finishing', text: piece.details[1].text, values: [['Detail', rajasthan ? 'Framed lower pockets' : 'Three front fastenings'], ['Edge', rajasthan ? 'Running-stitch marks' : 'Patterned cuffs & hem']] },
    { title: 'Material', text: 'The visual explores texture and surface. The final fibre composition, fabric weight and lining have not yet been specified.', values: [['Composition', 'To be confirmed'], ['Fabric weight', 'To be confirmed']] },
    { title: 'Fit & care', text: 'The artwork establishes the silhouette. Measurements, available sizes and garment care will follow the final production sample.', values: [['Sizing', 'To be confirmed'], ['Care instructions', 'To be confirmed']] }
  ];
}

export function productHeroFrame(progress) {
  const expand = smoothstep(0, .38, progress);
  const cut = smoothstep(.48, .78, progress);
  return {
    expand, cut,
    intro: 1 - smoothstep(.08, .3, progress),
    piece: smoothstep(.63, .95, progress),
    caption: 1 - smoothstep(.45, .58, progress),
    pan: 45 + 16 * smoothstep(0, .78, progress)
  };
}
