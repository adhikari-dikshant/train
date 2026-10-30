import test from 'node:test';
import assert from 'node:assert/strict';
import { pageFromHash, containedPoint, specificationsFor, productHeroFrame } from '../piece-view.mjs';

test('journey and collection share deep-linkable piece pages', () => {
  assert.deepEqual(pageFromHash('#collection'), { type: 'collection' });
  for (const slug of ['jaipur', 'ahmedabad']) assert.deepEqual(pageFromHash(`#piece/${slug}`), { type: 'piece', slug });
  for (const hash of ['', '#piece/unknown', '#piece/jaipur/other']) assert.deepEqual(pageFromHash(hash), { type: 'journey' });
});

test('hotspots follow the contained image rather than its letterboxing', () => {
  assert.deepEqual(containedPoint(100, 200, 400, 400, .25, .5), { left: 150, top: 200 });
  assert.deepEqual(containedPoint(200, 100, 400, 400, .5, .25), { left: 200, top: 150 });
  assert.deepEqual(containedPoint(100, 200, 200, 400, 0, 1), { left: 0, top: 400 });
  assert.equal(containedPoint(0, 200, 400, 400, .5, .5), null);
  assert.equal(containedPoint(100, 200, 0, 0, .5, .5), null);
});

test('both product specifications retain unknown manufacturing facts as pending', () => {
  for (const slug of ['jaipur', 'ahmedabad']) {
    const specs = specificationsFor({ slug, details: [{text:'Motif note'}, {text:'Finish note'}] });
    assert.equal(specs.length, 6);
    assert.equal(new Set(specs.map(spec => spec.title)).size, 6);
    assert.match(specs[0].values[0][1], slug === 'jaipur' ? /set/ : /jacket/);
    assert.equal(specs[2].text, 'Motif note');
    assert.equal(specs[3].text, 'Finish note');
    for (const spec of specs.slice(4)) for (const [, value] of spec.values) assert.equal(value, 'To be confirmed');
  }
});

test('product opening expands fully before splitting and the garment rises after the cut begins', () => {
  const start = productHeroFrame(0), full = productHeroFrame(.4), cut = productHeroFrame(.65), end = productHeroFrame(1);
  assert.equal(start.expand, 0); assert.equal(start.intro, 1); assert.equal(start.piece, 0);
  assert.equal(full.expand, 1); assert.equal(full.cut, 0); assert.equal(full.piece, 0);
  assert.ok(cut.cut > 0 && cut.cut < 1); assert.ok(cut.piece > 0 && cut.piece < 1);
  assert.equal(end.cut, 1); assert.equal(end.piece, 1); assert.equal(end.intro, 0);
  assert.deepEqual(productHeroFrame(-1), start);
  assert.deepEqual(productHeroFrame(2), end);
  const sequence = [.1, .3, .55, .75, 1];
  const forwards = sequence.map(productHeroFrame);
  assert.deepEqual(sequence.toReversed().map(productHeroFrame).toReversed(), forwards);
  for (const point of [.08, .3, .38, .48, .63, .78, .95]) {
    const a = productHeroFrame(point - 1e-6), b = productHeroFrame(point + 1e-6);
    for (const key of Object.keys(a)) assert.ok(Math.abs(a[key] - b[key]) < .001, `${key} jumps at ${point}`);
  }
});
