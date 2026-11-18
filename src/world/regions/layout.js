import { mix, paddyShape, smooth } from '../layout.js';
import { regionSpecs } from './specs.js';

const modelSizes = {
  house: [4.12,3.12],
  teahouse: [4.12,3.12],
  'snow-inn': [4.12,3.12],
  shrine: [3.14,2.94],
  temple: [4.21,3.14],
  'festival-stall': [1.61,1.12],
};
const waterOff = -99;

export function createRegionalLayout(id) {
  const spec = regionSpecs[id];
  if (!spec) throw new RangeError(`Unknown regional world: ${id}`);
  const { terrain, stream, coast, lake, routes, sanctuary, stair, ford, pool, sluice } = spec;
  const [northRise,eastRise,bankRise,shoulders] = terrain;
  const [center,bend,frequency,radius,datum,gradient] = stream;
  const baseWaterAt = z => datum - (z * gradient);
  const centerAt = z => center + bend * Math.sin(z * frequency) + bend * .15 * Math.sin(z * .242) - (id === '03' ? 8.5 * smooth(-22,-43,z) : 0);
  const spanAt = z => radius * (.93 + .09 * Math.sin(z * .188 + .50) + .06 * Math.sin(z * .056));
  const crossings = spec.crossings.map(item => {
    const arched = item.model === 'bridge';
    const length = arched ? 14 : 6;
    const need = Math.max(0, (spanAt(item.z) * 2 + 2.0) / length - 1);
    const stretch = 1 + need;
    return { ...item, x: centerAt(item.z), length, stretch,
      half: length * stretch / 2, inside: arched ? 1.30 : .58, outside: arched ? 2.04 : .91,
      deck: arched ? .20 : .18, camber: arched ? 1.35 : 0 };
  });
  const dockSpec = coast?.dock ?? lake?.dock;
  const dock = dockSpec && { x: dockSpec[0], z: dockSpec[1], y: dockSpec[2], r: dockSpec[3] ?? 0 };
  const paddies = spec.paddies ?? [];
  const segments = routes.flatMap(route => route.slice(1).map(([x1,z1,y1],index) => {
    const [x0,z0,y0] = route[index];
    const dx = x1 - x0, dz = z1 - z0;
    return [x0,z0,y0,dx,dz,y1 - y0,dx * dx + dz * dz];
  }));
  function routeBlend(x, z) {
    let d2 = Infinity, elevation = 0;
    for (const [a,b,h,dx,dz,dy,l2] of segments) {
      const t = Math.max(0,Math.min(1, ((x-a)*dx+(z-b)*dz)/l2));
      const distance2 = (a+t*dx-x)**2 + (b+t*dz-z)**2;
      if (distance2 < d2) { d2 = distance2; elevation = h + t * dy; }
    }
    return [Math.sqrt(d2),elevation];
  }

  function riverEdge(x, z) {
    if (lake && z < 9) return 100;
    return Math.abs(x - centerAt(z)) - spanAt(z);
  }

  function seaEdge(x, z) {
    if (coast) return coast.z + coast.bend * (Math.sin(x * .077) * .43 + Math.sin((x - 13) * .157) * .26) - z;
    if (lake) return (Math.hypot((x - lake.x) / lake.rx, (z - lake.z) / lake.rz) - 1) * 23;
    return 100;
  }

  function waterAt(x,z) {
    const lakeEdge = seaEdge(x,z);
    if (lakeEdge < 0) return (coast ?? lake).level;
    if (riverEdge(x,z) < 0) return baseWaterAt(z);
    return waterOff;
  }

  function naturalAt(x,z) {
    const edge = riverEdge(x,z), shore = seaEdge(x,z);
    const water = baseWaterAt(z);
    const foothill = .27 + northRise * smooth(-5,-55,z) * smooth(-2,12,edge) +
      eastRise * smooth(-15,37,x) + .30 * Math.sin(x*.15+z*.26) +
      bankRise * smooth(28,58, Math.abs(x)) + shoulders * .22 * smooth(56,118,Math.abs(x));
    const riverbed = mix(water - (radius > 3 ? 1.43 : .80), foothill, smooth(-2.8,2.1,edge));
    const coastal = (coast ?? lake)?.level ?? -.4;
    return mix(coastal - 7 * smooth(0,-32,shore), riverbed,
      smooth(-1.25,3,shore));
  }

  function landscaped(x,z) {
    const [distance,h] = routeBlend(x,z);
    const edge = riverEdge(x,z), shore = seaEdge(x,z);
    let y = naturalAt(x,z);
    for (const [cx,cz,rx,rz,wet] of paddies) {
      if (Math.abs(cx-x)>rx+2 || Math.abs(cz-z)>rz+2) continue;
      const d = paddyShape(x-cx,z-cz,rx,rz);
      const waterbed = mix(wet - .17,wet + .25,smooth(.86,.99,d));
      y = mix(waterbed, y, smooth(1.01,1.42,d));
    }
    const r = sanctuary.model === 'temple' ? 6.2 : 5.2;
    y = mix(sanctuary.y,y,smooth(r,r+6,Math.hypot(x-sanctuary.x,(z-sanctuary.z) * .97)));
    if (pool) y = mix(pool[2], y, smooth(3.1,4.5,Math.hypot(x-pool[0],z-pool[1])));
    const active = smooth(-.16,.31,edge) * smooth(-.15,.52,shore);
    y = mix(y,h, smooth(3.6,.88,distance) * active);
    for (const bridge of crossings) {
      if (Math.abs(z-bridge.z) > 2.1) continue;
      const lateral = Math.abs(x-bridge.x) - bridge.half;
      const abutment = smooth(-.76,-.32,lateral) * smooth(2.75,.36,lateral) *
        smooth(2.1,.81,Math.abs(z-bridge.z));
      y = mix(y,bridge.y + bridge.deck -.012,abutment);
    }
    if (ford && Math.abs(z-ford.z) < ford.width + 1) {
      const shallow = smooth(ford.width + .8,ford.width-.3,Math.abs(z-ford.z)) * smooth(1,-.7,edge);
      y = mix(y,ford.y,shallow);
    }
    return y;
  }

  const footprints = [...spec.houses, {...sanctuary, size: 1, r: 0},
    ...(spec.stallSites ?? []).map(([x,z,r]) => ({x,z,r,size:1,model:'festival-stall'}))];
  const buildings = footprints.map(item => ({ ...item, y: item.y ?? landscaped(item.x,item.z) }));
  const lanterns = [
    [spec.gate[0]-2.37,spec.gate[1]+1], [spec.gate[0]+2.42,spec.gate[1]+1],
    [stair.x-2.19,stair.start+1.28],[stair.x+2.21,stair.start+1.28],
    [stair.x-2.14,stair.end - .54],[stair.x+2.16,stair.end - .54]
  ].filter(([x,z]) => routeBlend(x,z)[0] > .91);
  const count = Math.ceil(Math.max((stair.high - stair.low) / .175, (stair.start - stair.end) / .37));
  const stairDepth = (stair.start - stair.end) / count;
  const stairY = z => mix(stair.low,stair.high,
    Math.min(count-1,Math.max(0,Math.floor((stair.start-z)/stairDepth))) / (count-1));

  function groundAt(x,z) {
    let y = landscaped(x,z);
    for (const building of buildings) {
      const size = modelSizes[building.model], dx = x-building.x, dz = z-building.z;
      if (Math.abs(dx)>7 || Math.abs(dz)>7) continue;
      const r = building.r, s = building.size;
      const horizontal = dx * Math.cos(r) - dz * Math.sin(r);
      const forward = dx * Math.sin(r) + dz * Math.cos(r);
      const pad = Math.max(Math.abs(horizontal) - size[0] * s - .38, Math.abs(forward) - size[1] * s - .49);
      const [distance] = routeBlend(x,z);
      y = mix(y,building.y, smooth(1.55,-.06,pad) * smooth(.35,1.6,distance));
    }
    if (z < stair.start + 1.35 && z > stair.end - 1.22 && Math.abs(x-stair.x)<3.25) {
      const line = Math.min(1,Math.max(0,(stair.start-z)/(stair.start-stair.end)));
      const belt = smooth(3.25,1.38,Math.abs(x-stair.x)) *
        smooth(1.3,0,Math.max(z-stair.start,stair.end-z,0));
      const cut = .21 * smooth(-.27,.16,stair.start - z) * smooth(-.24,.19,z - stair.end);
      y = mix(y,mix(stair.low,stair.high,line) - cut,belt);
    }
    if (dock) {
      const [dx,dz] = dockLocal(x,z);
      if (dz < -3.9 && dz > -6.4) {
        const apron = smooth(2.6,1.1,Math.abs(dx)) * smooth(-6.4,-4.52,dz) * smooth(-3.9,-4.51,dz);
        y = mix(y,dock.y,apron);
      }
    }
    return y;
  }

  function dockLocal(x,z) {
    const dx = x - dock.x, dz = z - dock.z;
    return [dx * Math.cos(dock.r) - dz * Math.sin(dock.r), dx * Math.sin(dock.r) + dz * Math.cos(dock.r)];
  }

  function surfaceAt(x,z) {
    for (const bridge of crossings) {
      const along = (x-bridge.x) / bridge.half;
      if (Math.abs(along) <= 1 && Math.abs(z-bridge.z)<bridge.inside+.15) {
        return bridge.y + bridge.deck + bridge.camber*(1-along*along);
      }
    }
    if (dock) {
      const [dx,dz] = dockLocal(x,z);
      if (Math.abs(dx) < 1.42 && Math.abs(dz) <= 4.52) return dock.y;
    }
    if (z <= stair.start && z >= stair.end && Math.abs(x-stair.x) < 1.38) return stairY(z);
    return groundAt(x,z);
  }

  function canWalk(x,z) {
    if (Math.abs(x) > 48 || z > 39 || z < -54) return false;
    for (const bridge of crossings) {
      if (Math.abs(x-bridge.x) > bridge.half) continue;
      const offset = Math.abs(z-bridge.z);
      if (offset < bridge.inside) return true;
      if (offset < bridge.outside) return false;
    }
    if (dock) {
      const [dx,dz] = dockLocal(x,z);
      if (Math.abs(dx)<1.22 && Math.abs(dz)<4.21) return true;
      if (Math.abs(dx)<1.60 && dz>-4.12 && dz<4.76) return false;
    }
    if (ford && Math.abs(z-ford.z) < ford.width-.30 && riverEdge(x,z) < 0) return true;
    if (groundAt(x,z) < waterAt(x,z)+.045) return false;
    if (paddies.some(([px,pz,rx,rz]) => paddyShape(x-px,z-pz,rx,rz)<.985)) return false;
    if (pool && Math.hypot(x-pool[0],z-pool[1]) < 2.78) return false;
    for (const building of buildings) {
      const dx=x-building.x, dz=z-building.z, s=building.size, r=building.r;
      const dims = modelSizes[building.model];
      if (Math.abs(dx*Math.cos(r)-dz*Math.sin(r)) < dims[0]*s &&
          Math.abs(dx*Math.sin(r)+dz*Math.cos(r)) < dims[1]*s) return false;
    }
    const [tx,tz] = spec.gate;
    if (Math.abs(z-tz)<.64 && Math.abs(Math.abs(x-tx)-1.65)<.53) return false;
    if (lanterns.some(([a,b]) => Math.hypot(x-a,z-b)<.42)) return false;
    if (z > stair.end && z < stair.start) {
      const dx = Math.abs(x-stair.x);
      if (dx<1.19) return true;
      if (dx<1.76) return false;
    }
    const [distance] = routeBlend(x,z);
    if (distance < .82) return true;
    const dx = (groundAt(x+.23,z)-groundAt(x-.23,z))/.46;
    const dz = (groundAt(x,z+.23)-groundAt(x,z-.23))/.46;
    return dx * dx + dz * dz <= .83;
  }

  const bridge = crossings[0];
  const at = (id,x,z) => ({ id, position: [x,surfaceAt(x,z),z] });
  const featured = id === '04' ? at('water-gate',sluice[0],sluice[1]) :
    id === '07' ? at('onsen',pool[0],pool[1]) :
    dock ? at(lake ? 'jetty' : 'harbour',dock.x,dock.z) :
    id === '10' ? at('festival-court',-20,0) :
    id === '05' ? at('teahouse',10,8) :
    id === '02' ? at('river-bridge',bridge.x,bridge.z) :
    at(sanctuary.model === 'temple' ? 'temple' : 'shrine',sanctuary.x,sanctuary.z);
  return {
    spec, routes, crossings, dock, ford, paddies, buildings, lanterns,
    stairs: {...stair,count,depth:stairDepth,yAt:stairY},
    landmarks: [featured,at('lookout',spec.overlook.position[0],spec.overlook.position[2]),
      at('gate',...spec.gate),at('crossing',bridge.x,bridge.z)],
    baseWaterAt, centerAt, spanAt, riverEdge, seaEdge, waterAt, routeBlend, groundAt, surfaceAt, canWalk
  };
}
