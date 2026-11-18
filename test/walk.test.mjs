import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceWalker } from '../src/walk.js';

test('substeps stop the camera crossing a forbidden strip', () => {
  const result = advanceWalker({
    canWalk: (x) => x <= 0.4 || x >= 0.72,
    surfaceAt: () => 0,
  }, { x: 0, z: 0 }, { x: 1.4, z: 0 });

  assert.ok(result.x > 0 && result.x <= 0.4);
  assert.equal(result.z, 0);
});

test('a diagonal step slides along the side of an obstacle', () => {
  const result = advanceWalker({
    canWalk: (x) => x <= 0.1,
    surfaceAt: () => 0,
  }, { x: 0, z: 0 }, { x: 0.8, z: 0.8 });

  assert.ok(result.x <= 0.1);
  assert.ok(result.z >= 0.79);
});

test('the walker can follow a slope but stops at an abrupt drop', () => {
  const result = advanceWalker({
    canWalk: () => true,
    surfaceAt: (x) => x < 0.5 ? x * 0.4 : -3,
  }, { x: 0, z: 0 }, { x: 1, z: 0 });

  assert.ok(result.x >= 0.4 && result.x < 0.5);
});
