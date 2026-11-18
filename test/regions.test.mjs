import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRegionalLayout } from '../src/world/regions/layout.js';

test('the open teahouse foundation stays below the visible floor', () => {
  const { groundAt, buildings } = createRegionalLayout('05');
  const { x, y, z, r } = buildings.find((building) => building.model === 'teahouse');
  for (const localX of [-3.7, -2, 0, 2, 3.7]) {
    for (const localZ of [-2.8, -1, 0, 1, 2.8]) {
      const worldX = x + localX * Math.cos(r) + localZ * Math.sin(r);
      const worldZ = z - localX * Math.sin(r) + localZ * Math.cos(r);
      assert.ok(groundAt(worldX, worldZ) < y + 0.14, localX + ', ' + localZ);
    }
  }
});

const ids = Array.from({length: 9}, (_,i) => String(i+2).padStart(2,'0'));
const landmarks = ['river-bridge','shrine','water-gate','teahouse','temple','onsen','harbour','jetty','festival-court'];

for (const [index,id] of ids.entries()) {
  const world = createRegionalLayout(id);
  test(`World ${id}: paths stay connected, with walkable grade and named scenic destinations`, () => {
    assert.equal(world.landmarks[0].id, landmarks[index]);
    assert.ok(world.canWalk(...world.spec.spawn));
    for (const [routeId,route] of world.routes.entries()) {
      for (let s = 1; s < route.length; s++) {
        const [ax,az] = route[s - 1], [bx,bz] = route[s];
        const samples = Math.ceil(Math.hypot(bx - ax,bz - az)/.09);
        let last = world.surfaceAt(ax,az);
        for (let n = 0; n <= samples; n++) {
          const x = ax + (bx - ax) * n / samples, z = az + (bz - az) * n / samples;
          const y = world.surfaceAt(x,z);
          assert.ok(world.canWalk(x,z), `Route ${routeId} segment ${s}, blocked at (${x.toFixed(2)}, ${z.toFixed(2)})`);
          assert.ok(Math.abs(y - last) <= .36, `Route ${routeId} segment ${s}, discontinuous path`);
          last = y;
        }
      }
    }
    const stair = world.stairs;
    assert.ok(world.surfaceAt(stair.x,stair.end) - world.surfaceAt(stair.x,stair.start)>1.5);
    assert.ok(world.landmarks.every(({position}) => position.every(Number.isFinite)));
  });

  test(`World ${id}: real bridge deck height, rails, water and protected basins`, () => {
    for (const {x,y,z,deck,camber,inside,outside} of world.crossings) {
      assert.ok(world.canWalk(x,z));
      assert.ok(Math.abs(world.surfaceAt(x,z) - y - deck - camber)<1e-9);
      assert.ok(!world.canWalk(x,z + .5*(inside + outside)));
    }
    for (const [x,z] of world.paddies) assert.ok(!world.canWalk(x,z));
    const z = -13;
    assert.ok(!world.canWalk(world.centerAt(z),z) || id==='09');
    if (world.ford) {
      assert.ok(world.canWalk(world.centerAt(world.ford.z),world.ford.z));
      assert.ok(Math.abs(world.surfaceAt(world.centerAt(world.ford.z),world.ford.z)-world.ford.y)<1e-9);
    }
    if (world.dock) {
      const {x,y,z,r} = world.dock;
      assert.ok(world.canWalk(x,z));
      assert.equal(world.surfaceAt(x,z),y);
      assert.ok(!world.canWalk(x + Math.sin(r)*5.6,z + Math.cos(r)*5.6));
    }
  });
}

test('Temple photo is at walkable eye height with a clear sightline above the hillside', () => {
  const world = createRegionalLayout('06');
  const {position:[x,y,z],target:[tx,ty,tz]} = world.spec.featured;
  assert.ok(world.canWalk(x,z));
  assert.ok(Math.abs(y-world.surfaceAt(x,z)-1.65)<.08);
  for (let t=0;t<1;t+=.04) {
    const [cx,cy,cz]=[x+(tx-x)*t,y+(ty-y)*t,z+(tz-z)*t];
    assert.ok(cy-world.groundAt(cx,cz)>1.25);
  }
});

test('Warped lake contours match the physical waterline, dock and outlet', () => {
  const world = createRegionalLayout('09');
  const {x,z,rx,rz}=world.spec.lake;
  const scales=[];
  for (let i=0;i<48;i++) {
    const a=i*Math.PI/24, [px,pz]=world.lakeBoundary(a);
    scales.push(Math.hypot((px-x)/rx,(pz-z)/rz));
    assert.ok(Math.abs(world.seaEdge(px,pz))<1e-8);
    assert.equal(world.waterAt(...world.lakeBoundary(a,.98)),world.spec.lake.level);
  }
  assert.ok(Math.max(...scales)-Math.min(...scales)>.18);
  assert.ok(world.baseWaterAt(world.crossings[0].z)<world.spec.lake.level);
});
