import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bounds, canWalk, crossings, paddies, routes, steps, surfaceAt, torii } from '../src/world/layout.js';

test('all ten mapped corridors, including both crossings and the bamboo return, connect on foot', () => {
  for (const [routeIndex, route] of routes.entries()) {
    for (let i = 1; i < route.length; i++) {
      const [fromX, fromZ] = route[i - 1];
      const [dx, dz] = [route[i][0] - fromX, route[i][1] - fromZ];
      const samples = Math.ceil(Math.hypot(dx, dz) / .09);
      let previousY = surfaceAt(fromX, fromZ);
      for (let j = 0; j <= samples; j++) {
        const x = fromX + dx * j / samples, z = fromZ + dz * j / samples;
        const y = surfaceAt(x, z);
        assert.ok(canWalk(x, z), `Route ${routeIndex}: blocked at (${x}, ${z})`);
        assert.ok(Math.abs(y - previousY) < .19, `Route ${routeIndex}: step too high at (${x}, ${z})`);
        previousY = y;
      }
    }
  }
});

test('bridge decks follow their arches, with blocked rails and river away from crossings', () => {
  for (const { x, y, z } of crossings) {
    assert.ok(Math.abs(surfaceAt(x, z) - (y + 1.55)) < 1e-9);
    assert.ok(Math.abs(surfaceAt(x + 7, z) - (y + .20)) < 1e-9);
    assert.equal(canWalk(x, z + 1.45), false);
    assert.equal(canWalk(x, z + 3), false);
  }
});

test('stairs descend to the torii, and structures, rice basins and outside terrain block walking', () => {
  assert.equal(surfaceAt(steps.x, steps.end), steps.high);
  assert.equal(surfaceAt(steps.x, steps.start), steps.low);
  assert.ok(canWalk(torii.x, torii.z));
  assert.equal(canWalk(torii.x + 1.58, torii.z), false);
  assert.equal(canWalk(-16, 6), false);
  assert.equal(canWalk(-18, -47), false);
  assert.equal(canWalk(bounds.east + .01, 22), false);
  for (const [x, z] of paddies) assert.equal(canWalk(x, z), false);
});

