import test from 'node:test';
import assert from 'node:assert/strict';
import { guidanceStep, placeGuidance } from '../journey-guidance.mjs';
import { journeyFrame, routeFrom } from '../journey-state.mjs';

test('guidance follows the real action and disappears during travel or reading', () => {
  const state = { started: false, starting: false, reading: false, mapOpen: false, panelOpen: false, frame: journeyFrame(0, routeFrom(0)) };
  assert.equal(guidanceStep(state), 'start');
  assert.equal(guidanceStep({ ...state, mapOpen: true }), 'place');
  assert.equal(guidanceStep({ ...state, started: true }), 'window');
  for (const flag of ['starting', 'reading', 'panelOpen']) assert.equal(guidanceStep({ ...state, [flag]: true }), null);
  for (const route of [routeFrom(0), routeFrom(1)]) {
    assert.equal(guidanceStep({ ...state, started: true, frame: journeyFrame(.03, route) }), null);
    assert.equal(guidanceStep({ ...state, started: true, frame: journeyFrame(.2, route) }), null);
    assert.equal(guidanceStep({ ...state, started: true, frame: journeyFrame(.37, route) }), 'piece');
  }
});

test('hints stay inside desktop and phone viewports, with an arrow to the actual target', () => {
  for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    const card = { width: Math.min(250, viewport.width - 40), height: 145 };
    const target = { left: 30, top: 260, width: 200, height: 80, right: 230, bottom: 340 };
    for (const step of ['start', 'place', 'window', 'piece']) {
      const result = placeGuidance(target, card, viewport, step);
      assert.ok(result.x >= 12 && result.x + card.width <= viewport.width - 12);
      assert.ok(result.y >= 100 && result.y + card.height <= viewport.height - 16);
      assert.ok(result.tx >= target.left && result.tx <= target.right);
      assert.ok(result.ty >= target.top && result.ty <= target.bottom);
    }
  }
  const target = { left: 35, top: 420, width: 250, height: 140, right: 285, bottom: 560 };
  const result = placeGuidance(target, { width: 230, height: 140 }, { width: 390, height: 640 }, 'place');
  assert.ok(result.y + 140 < target.top, 'short phone puts the city hint above the choices');
});

test('compact phone garment cue sits to the left of the hotspot', () => {
  for (const left of [101, 137]) {
    const target = { left, top: 190, width: 34, height: 34, right: left + 34, bottom: 224 };
    const card = { width: left - 26, height: 130 };
    const position = placeGuidance(target, card, { width: 390, height: 844 }, 'piece');
    assert.ok(position.x + card.width < target.left);
  }
});
