import test from 'node:test';
import assert from 'node:assert/strict';
import { pageFromHash, containedPoint } from '../piece-view.mjs';

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
