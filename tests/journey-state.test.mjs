import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFrom, journeyFrame, arrivalProgress } from '../journey-state.mjs';

test('either origin follows the fixed route exactly once', () => {
  assert.deepEqual(routeFrom(0), [0, 1]);
  assert.deepEqual(routeFrom(1), [1, 0]);
  assert.throws(() => routeFrom(2), RangeError);
  for (const start of [0, 1]) {
    const route = routeFrom(start);
    for (let leg = 0; leg < 2; leg++) {
      const get = local => journeyFrame((leg + local) / 2, route);
      assert.equal(get(0).station, route[leg]);
      assert.equal(get(0).zoom, 0);
      assert.equal(get(.3).chapter, 'place');
      assert.equal(get(.3).zoom, 1);
      assert.equal(get(.53).chapter, 'detail');
      assert.equal(get(.74).chapter, 'piece');
      assert.equal(get(.74).zoom, 1);
      assert.equal(get(.3).mix, route[leg]);
    }
    assert.equal(journeyFrame(.4999, route).zoom, 0);
    assert.equal(journeyFrame(.5, route).zoom, 0);
    assert.ok(Math.abs(journeyFrame(.4999, route).mix - journeyFrame(.5, route).mix) < .001);
    assert.equal(journeyFrame(1, route).complete, true);
    assert.equal(journeyFrame(1, route).station, route[1]);
    assert.equal(journeyFrame(1, route).chapter, 'piece');
    assert.equal(journeyFrame(1, route).zoom, 1);
  }
});

test('departure and skipped scroll positions request travel before a new city', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    assert.equal(journeyFrame(.43, route).destination, route[0]);
    assert.equal(journeyFrame(.441, route).destination, route[1]);
    assert.equal(journeyFrame(.5, route).destination, route[1]);
    assert.equal(journeyFrame(.9, route).destination, route[1]);
    for (const destination of route) {
      const arrived = journeyFrame(arrivalProgress(destination, route), route);
      assert.equal(arrived.station, destination);
      assert.equal(arrived.destination, destination);
      assert.equal(arrived.chapter, 'travel');
      assert.ok(arrived.zoom < .00001);
    }
    assert.throws(() => arrivalProgress(2, route), RangeError);
  }
});

test('scroll beyond either end stays within the journey', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    assert.deepEqual(journeyFrame(-2, route), journeyFrame(0, route));
    assert.deepEqual(journeyFrame(3, route), journeyFrame(1, route));
  }
});

test('zoom, scenery and garment shade stay continuous across every chapter boundary', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    for (const progress of [.06, .125, .235, .305, .32, .34, .43, .44, .45, .49, .5, .56, .625, .735, .805, .82, .84]) {
      const before = journeyFrame(progress - .000001, route);
      const after = journeyFrame(progress + .000001, route);
      for (const property of ['zoom', 'mix', 'pieceShade']) {
        assert.ok(Math.abs(before[property] - after[property]) < .001, `${property} jumps at ${progress}`);
      }
    }
    assert.equal(journeyFrame(.37, route).pieceShade, 1);
    assert.equal(journeyFrame(.5, route).pieceShade, 0);
    assert.equal(journeyFrame(1, route).pieceShade, 1);
  }
});
