import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFrom, journeyFrame, arrivalProgress, departureProgress } from '../journey-state.mjs';

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

test('the fixed route identifies the next stop during departure and arrival', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    assert.equal(journeyFrame(.43, route).destination, route[0]);
    assert.equal(journeyFrame(.441, route).destination, route[1]);
    assert.equal(journeyFrame(.5, route).destination, route[1]);
    assert.equal(journeyFrame(.9, route).destination, route[1]);
    for (const destination of route) {
      const departing = journeyFrame(departureProgress(destination, route), route);
      assert.equal(departing.destination, destination);
      assert.equal(departing.inTransit, true);
      assert.ok(Math.abs(departing.sceneryProgress) < 1e-10);
      assert.equal(departing.travelSpeed, 1);
      const arrived = journeyFrame(arrivalProgress(destination, route), route);
      assert.equal(arrived.station, destination);
      assert.equal(arrived.destination, destination);
      assert.equal(arrived.chapter, 'travel');
      assert.ok(arrived.zoom < .00001);
    }
    assert.throws(() => arrivalProgress(2, route), RangeError);
    assert.throws(() => departureProgress(2, route), RangeError);
  }
});

test('first departure and intercity travel advance only with scroll position', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    const first = journeyFrame(0, route);
    assert.equal(first.inTransit, true);
    assert.equal(first.transitProgress, 0);
    assert.equal(first.landscapeOpacity, 1);
    assert.equal(journeyFrame(.03, route).transitProgress, .5);
    assert.equal(journeyFrame(.06, route).inTransit, false);
    assert.equal(journeyFrame(.06, route).landscapeOpacity, 0);
    assert.equal(journeyFrame(.1, route).chapter, 'place');
    assert.equal(journeyFrame(.1, route).zoom, 1);
    for (const [progress, expected] of [[.44, 0], [.47, .25], [.5, .5], [.53, .75], [.56, 1]]) {
      const current = journeyFrame(progress, route);
      assert.ok(Math.abs(current.transitProgress - expected) < 1e-10);
      assert.deepEqual(current, journeyFrame(progress, route));
      assert.equal(current.destination, route[1]);
    }
    assert.equal(journeyFrame(.5, route).landscapeOpacity, 1);
    assert.equal(journeyFrame(.56, route).inTransit, false);
    assert.equal(journeyFrame(.56, route).landscapeOpacity, 0);
    assert.equal(journeyFrame(.6, route).chapter, 'place');
    assert.equal(journeyFrame(.6, route).zoom, 1);
    assert.equal(journeyFrame(.63, route).chapter, 'place');
    for (const property of ['transitProgress', 'landscapeOpacity']) {
      assert.ok(Math.abs(journeyFrame(.5 - 1e-7, route)[property] - journeyFrame(.5 + 1e-7, route)[property]) < .0001);
    }
  }
});

test('scroll beyond either end stays within the journey', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    assert.deepEqual(journeyFrame(-2, route), journeyFrame(0, route));
    assert.deepEqual(journeyFrame(3, route), journeyFrame(1, route));
  }
});

test('scenery cruises fast, brakes smoothly and reveals the station near standstill', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    for (const at of [t => t * .06, t => .44 + t * .12]) {
      const get = t => journeyFrame(at(t), route);
      const distance = (from, to) => get(to).sceneryProgress - get(from).sceneryProgress;
      assert.ok(Math.abs(distance(0, .1) - distance(.2, .3)) < 1e-10);
      assert.ok(distance(.5, .6) < distance(.2, .3));
      assert.ok(distance(.7, .8) < distance(.5, .6));
      assert.equal(distance(.85, 1), 0);
      const epsilon = 1e-5;
      const before = distance(.35 - epsilon, .35) / epsilon;
      const after = distance(.35, .35 + epsilon) / epsilon;
      assert.ok(Math.abs(before - after) < .0001);
      assert.ok(Math.abs(get(0).sceneryProgress) < 1e-10);
      assert.equal(get(1).sceneryProgress, 1);
      assert.ok(get(.8).landscapeOpacity > .9999 && get(.8).travelSpeed > 0);
      assert.ok(Math.abs(get(.82).mix - get(.82).destination) < 1e-10);
      assert.ok(get(.9).landscapeOpacity > 0 && get(.9).landscapeOpacity < 1);
      assert.equal(get(.9).travelSpeed, 0);
      assert.equal(get(1).travelSpeed, 0);
      assert.equal(get(1).landscapeOpacity, 0);
    }
  }
});

test('zoom, scenery and garment shade stay continuous across every chapter boundary', () => {
  for (const route of [routeFrom(0), routeFrom(1)]) {
    for (const progress of [.06, .095, .235, .305, .32, .34, .43, .44, .45, .49, .5, .56, .595, .735, .805, .82, .84]) {
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
