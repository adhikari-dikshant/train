import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainMapView, zoomMapView } from '../map-view.mjs';

test('zoom keeps the point under the pointer in place', () => {
  const view = { scale: 1.5, x: -.2, y: -.3 };
  const anchor = { x: .3, y: .4 };
  const next = zoomMapView(view, 2.4, anchor);
  for (const axis of ['x', 'y']) {
    assert.ok(Math.abs((anchor[axis] - view[axis]) / view.scale - (anchor[axis] - next[axis]) / next.scale) < 1e-10);
  }
});

test('drag and zoom stay within the paper, including both zoom limits', () => {
  assert.deepEqual(constrainMapView({ scale: 2, x: 5, y: -5 }), { scale: 2, x: 0, y: -1 });
  assert.deepEqual(constrainMapView({ scale: 10, x: -9, y: 2 }), { scale: 3, x: -2, y: 0 });
  const reset = zoomMapView({ scale: 3, x: -1, y: -1.5 }, .2);
  assert.equal(reset.scale, 1);
  assert.equal(Math.abs(reset.x), 0);
  assert.equal(Math.abs(reset.y), 0);
});
