import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { paddyShape, mix } from '../layout.js';
import { randomSequence } from '../landscape.js';
import { modelPath } from '../model-path.js';
import { plantingKinds, plantingLOD, regionalPlantings, regionalPlantModels } from './planting.js';

export async function loadRegionalAssets(layout, onProgress, useBakedMaterials) {
  const {spec,buildings,crossings,dock,paddies} = layout;
  const names = new Set(['cedar','cedar-lod','bamboo','shrub','grass','torii','stone-lantern','rock','fence',
    'stair-tread','stair-tread-b','stair-tread-c','retaining-wall',...spec.ecology.slice(0,2),
    ...regionalPlantModels(layout.id)]);
  for (const building of buildings) names.add(building.model);
  for (const bridge of crossings) names.add(bridge.model);
  if (paddies.length) { names.add('rice'); names.add('river-sedge'); }
  if (dock) { names.add('dock'); names.add('fishing-boat'); names.add('river-sedge'); }
  if (spec.coast) names.add('fishing-rack');
  if (spec.sluice) names.add('sluice');
  if (spec.pool) names.add('onsen-pool');
  if (spec.basin) names.add('water-basin');
  if (spec.ecology.includes('maple')) names.add('maple-lod');
  if (spec.festival) names.add('festival-lantern');
  const loader = new GLTFLoader();
  let loaded=0;
  const loadedAssets = await Promise.all([...names].map(async name => {
    const model = name === 'cedar' || name === 'cedar-lod' ? 'ridge-' + name : name;
    const {scene} = await loader.loadAsync(modelPath(model, useBakedMaterials));
    scene.updateMatrixWorld(true);
    const parts=[];
    scene.traverse(node=>{
      if (node.isMesh) {
        node.userData.surfaceAsset = name;
        parts.push(node);
      }
    });
    if (!parts.length) throw new Error(`No mesh found in ${name}.glb`);
    onProgress(.08+.52*(++loaded/names.size),'載入地區模型');
    return [name,parts];
  }));
  return Object.fromEntries(loadedAssets);
}

function addInstances(group, parts, placement, castShadow, kind) {
  if (placement.length===0) return;
  const matrix=new THREE.Matrix4(), transform=new THREE.Object3D();
  for (const part of parts) {
    const batch=new THREE.InstancedMesh(part.geometry,part.material,placement.length);
    batch.name=part.name;
    batch.userData.surfaceAsset=part.userData.surfaceAsset;
    batch.castShadow=castShadow;
    batch.receiveShadow=true;
    const sourceName = part.userData.name ?? part.name;
    const petals = /(?:flower petals|azalea flowers)/i.test(sourceName);
    if (kind && /\b(?:foliage|leaves|leaf|needle sprays|mottled.*crown)\b/i.test(sourceName)) {
      batch.userData.gaussianKind=kind;
      if (kind === 'turf') batch.userData.gaussianSamples=4;
    } else if (kind === 'shrub' && petals) {
      batch.userData.gaussianKind='blossom';
      batch.userData.gaussianSamples=12;
      batch.userData.gaussianRadiusScale=.36;
    }
    for (let i=0;i<placement.length;i++) {
      const [x,y,z,yaw,s,sY=s,sZ=s,tint]=placement[i];
      transform.position.set(x,y,z);
      transform.rotation.set(0,yaw,0);
      transform.scale.set(s,sY,sZ);
      transform.updateMatrix();
      batch.setMatrixAt(i,matrix.multiplyMatrices(transform.matrix,part.matrixWorld));
      if (tint && !petals) batch.setColorAt(i,tint);
    }
    batch.computeBoundingSphere();
    group.add(batch);
  }
}

export function populateRegionalWorld(scene, layout, assets, seed) {
  const {spec,groundAt,routeBlend,waterAt,riverEdge,seaEdge,buildings,crossings,paddies,dock,stairs,lanterns}=layout;
  const rand=randomSequence(seed);
  const groups=new Map();
  const put=(name,x,y,z,r=0,s=1,sy=s,sz=s,tint)=> {
    if (!groups.has(name)) groups.set(name,[]);
    groups.get(name).push([x,y,z,r,s,sy,sz,tint]);
  };
  const prop=(name,x,z,r=0,s=1,dy=0,tint)=>put(name,x,groundAt(x,z)+dy,z,r,s,s,s,tint);
  const blocked=[];
  const blocks=(x,z)=>blocked.some(([a,b,s])=>(x-a)**2+(z-b)**2 < s*s);
  const paints=['#fff4e9','#e9e2d7','#fff9ed','#e0e5e7','#efede1'].map(hex=>new THREE.Color(hex));
  buildings.forEach(({model,x,y,z,r,size},i)=>put(model,x,y,z,r,size,size,size,paints[i%paints.length]));
  for (const {model,x,y,z,stretch} of crossings) put(model,x,y,z,0,stretch,1,1);
  const stairTypes=['stair-tread','stair-tread-b','stair-tread-c'];
  for (let i=0;i<stairs.count;i++) {
    const z=stairs.start-(i+.5)*stairs.depth;
    put(stairTypes[(i+Math.floor(i/4))%3],stairs.x,stairs.yAt(z),z,0,
      1,1,stairs.depth/.38+.022,new THREE.Color().setScalar(.88+rand()*.12));
    if (i%5===0 && i>0) {
      for (const side of [-1,1]) {
        const x=stairs.x+side*1.94;
        put('retaining-wall',x,stairs.yAt(z)-.45,z,Math.PI*side/2,
          Math.min(.98,stairs.depth*5/2.49),.68,.85,paints[(i+3)%5]);
      }
    }
  }
  prop('torii',...spec.gate);
  if (spec.basin) {
    prop('water-basin',...spec.basin,.18);
    blocked.push([...spec.basin,.91]);
  }
  lanterns.forEach(([x,z],i)=>prop('stone-lantern',x,z,.19*i,.90+(.06*(i%3))));
  if (spec.sluice) put('sluice',spec.sluice[0],spec.sluice[2],spec.sluice[1],Math.PI*.50);
  if (spec.pool) {
    put('onsen-pool',spec.pool[0],spec.pool[2],spec.pool[1],0);
    for (let i=0;i<4;i++) {
      const a=i*.7+2.15,x=spec.pool[0]+Math.cos(a)*3.45,z=spec.pool[1]+Math.sin(a)*3.37;
      if (routeBlend(x,z)[0]>1.5) prop('fence',x,z,Math.PI/2-a,1.03);
    }
  }
  if (dock) {
    put('dock',dock.x,dock.y,dock.z,dock.r);
    const directionX=Math.sin(dock.r),directionZ=Math.cos(dock.r);
    for (let i=0;i<(spec.coast?3:1);i++) {
      const x=dock.x+directionX*(4.5+i*4.1)+directionZ*(2.4+i*1.1),
        z=dock.z+directionZ*(4.5+i*4.1)-directionX*(2.4+i*1.1);
      const y=waterAt(x,z);
      if (y > -98) put('fishing-boat',x,y+.016,z,dock.r+.32+i*.47,1-i*.09);
    }
    if (spec.coast) for (const [x,z,r] of [[-23,11,.2],[-20,10,-.18],[-4,11.7,.23],[6,13,.27]]) {
      if (routeBlend(x,z)[0]>1.55) prop('fishing-rack',x,z,r,1);
    }
  }
  if (spec.festival) {
    const glow = new THREE.Color('#ffc28b');
    const paper = ['#f8ca9a','#f3c4b2','#f5d4ab'].map(hex=>new THREE.Color(hex));
    for (const [i,[x,z,r]] of spec.stallSites.entries()) {
      const floor=groundAt(x,z);
      for (const side of [-1,1]) {
        const dx=side*1.07*Math.cos(r)+Math.sin(r)*.88;
        const dz=-side*1.07*Math.sin(r)+Math.cos(r)*.88;
        const s=.64+(i%3)*.085;
        put('festival-lantern',x+dx,floor+2.30-s*.9,z+dz,r,s,s,s,paper[i%3]);
      }
      if (i%2===0) {
        // A few local pools preserve the hue of the blue-hour terrain between stalls.
        const lamp=new THREE.PointLight(glow,12,6.8,2);
        lamp.position.set(x+Math.sin(r)*.89,floor+1.83,z+Math.cos(r)*.89);
        scene.add(lamp);
      }
    }
  }

  const planted = regionalPlantings(layout.id, layout, seed);
  const visited = [];
  for (const {model,x,y,z,yaw,scale,stretch,tint,trunk} of planted) {
    put(model,x,y,z,yaw,scale,scale*stretch,scale,new THREE.Color(tint));
    if (trunk) {
      visited.push([x,z]);
      blocked.push([x,z,trunk]);
    }
  }
  const tints=['#e0efc6','#bdcda3','#d5d9ab','#dfe6ca','#e4eee3','#bcccbf'].map(hex=>new THREE.Color(hex));
  const autumn=['#e96952','#f59c5b','#f8c166','#e9874c','#d66b51','#e1b068'].map(hex=>new THREE.Color(hex));
  const [primary,secondary,density]=spec.ecology;
  const reserveLandmarkShot=spec.sanctuary.model==='temple' || spec.grove || spec.pool;
  const [eyeX,,eyeZ]=spec.featured.position,[aimX,,aimZ]=spec.featured.target;
  const vx=aimX-eyeX,vz=aimZ-eyeZ;
  const shotLength=vx*vx+vz*vz;
  function inLandmarkShot(x,z) {
    if (!reserveLandmarkShot) return false;
    const t=Math.max(0,Math.min(1,((x-eyeX)*vx+(z-eyeZ)*vz)/shotLength));
    return Math.hypot(x-eyeX-t*vx,z-eyeZ-t*vz)<3.6;
  }
  for (let i=0;i<690*density;i++) {
    const x=mix(-71,71,rand()),z=mix(-81,44,rand());
    const [lane]=routeBlend(x,z),y=groundAt(x,z),edge=Math.min(riverEdge(x,z),seaEdge(x,z));
    const field=paddies.some(([a,b,rx,rz])=>paddyShape(x-a,z-b,rx+1,rz+1)<1.15);
    const rural=buildings.some(b=>Math.abs(b.x-x)<6.0&&Math.abs(b.z-z)<5.7);
    const clustered=Math.sin(x*.33-z*.16)+.82*Math.cos(x*.16+z*.43);
    if (field || rural || inLandmarkShot(x,z) || lane<2.15 || y<waterAt(x,z)+.22 || edge<1.8 || clustered<-.60 ||
        Math.hypot(x-spec.sanctuary.x,z-spec.sanctuary.z)<6.3) continue;
    if (Math.abs(z-stairs.start)<5&&Math.abs(x-stairs.x)<3.6) continue;
    if (visited.some(([a,b])=>(x-a)**2+(z-b)**2<2.38)) continue;
    if (primary==='bamboo' && Math.abs(x+3)<23 && z<15 && z>-43) {
      // Tall bamboo marks the narrow enclosure, while cut openings leave the stream visible.
      if (lane>8 && rand()<.18) continue;
    }
    const model=(clustered>.16 || rand()<.67)?primary:secondary;
    let s = model==='shrub' ? mix(.63,1.35,rand()) : model==='rock' ?
      mix(.62,1.75,rand()) : mix(.56,1.22,rand());
    if (model==='maple') s*=.85;
    const m=(model==='cedar'||model==='maple') && (z<-53 || Math.abs(x)>47) ? model+'-lod' : model;
    const tone=model==='maple'&&primary==='maple' ? autumn[Math.floor(rand()*autumn.length)] :
      tints[Math.floor(rand()*tints.length)];
    put(m,x,y-.075,z,rand()*Math.PI*2,s,s*mix(.82,1.19,rand()),s,tone);
    visited.push([x,z]);
    if (m!=='shrub' && Math.abs(x)<48 && z>=-54) blocked.push([x,z,s*(model==='bamboo'?.89:model==='rock'?.65:.42)]);
  }
  if (spec.grove) {
    for (let i=0;i<160;i++) {
      const x=mix(-15.5,7,rand()),z=mix(-25,17,rand());
      const [lane]=routeBlend(x,z);
      if (lane<2.0 || lane>4.6 || riverEdge(x,z)<1.2 || inLandmarkShot(x,z) ||
          Math.hypot(x-spec.gate[0],z-spec.gate[1])<3.1 ||
          visited.some(([a,b])=>(x-a)**2+(z-b)**2<1.8) ||
          buildings.some(b=>Math.abs(x-b.x)<4.9&&Math.abs(z-b.z)<4.5)) continue;
      const s=mix(.76,1.28,rand());
      put('bamboo',x,groundAt(x,z)-.095,z,rand()*6.28,s,s*mix(.95,1.23,rand()),s,tints[i%6]);
      visited.push([x,z]);
      blocked.push([x,z,s*.93]);
    }
  }

  // Forest structures continue toward the foothills while staying out of the dry clearings.
  for (let i=0;i<125;i++) {
    const x=mix(-73,77,rand()),z=mix(-108,-63,rand());
    if (Math.min(seaEdge(x,z),riverEdge(x,z))<2 || Math.sin(x*.20-z*.18)<-.33) continue;
    const s=mix(.38,.86,rand());
    prop('cedar-lod',x,z,rand()*Math.PI*2,s,-.21,tints[i%6]);
  }

  for (let i=0;i<195;i++) {
    const z=mix(-64,43,rand()),side=rand()<.5?-1:1;
    const x=layout.centerAt(z)+side*(layout.spanAt(z)+mix(-1.6,3,rand()));
    const y=groundAt(x,z);
    if (routeBlend(x,z)[0]<1.76 || seaEdge(x,z)<-.75 || blocks(x,z) ||
        crossings.some(b=>Math.abs(z-b.z)<3.1)) continue;
    const s=.13+.70*rand()**2,rockColor=spec.snow?tints[4]:paints[i%5];
    prop('rock',x,z,rand()*6.28,s,-.083,rockColor);
    if (s>.52) blocked.push([x,z,s*.72]);
    if (assets['river-sedge'] && i%3===0 && y>=waterAt(x,z)-.1 && rndClear(x,z)) {
      prop('river-sedge',x,z,rand()*6.28,.66+rand()*.49,-.075,tints[i%6]);
    }
  }
  function rndClear(x,z) { return !blocked.some(([a,b,s])=>Math.hypot(x-a,z-b)<s+.2); }

  if (spec.lake) {
    for (let i=0;i<145;i++) {
      const angle=rand()*Math.PI*2;
      const [x,z]=layout.lakeBoundary(angle,mix(1.005,1.057,rand()));
      const y=groundAt(x,z);
      if (routeBlend(x,z)[0]<1.72 || riverEdge(x,z)<.58 ||
          Math.cos(angle*7.2)+Math.sin(angle*11)<-.50) continue;
      const scale=mix(.24,.64,rand());
      prop('rock',x,z,rand()*6.28,scale,-.10,paints[i%5]);
      if (i%2===0 && y<spec.lake.level+.67) {
        prop('river-sedge',x+.29,z-.11,rand()*6.28,scale*1.42,-.01,tints[i%6]);
      }
    }
  }

  for (const [x,z,rx,rz,y] of paddies) {
    for (let dx=-rx;dx<rx;dx+=.75) for (let dz=-rz;dz<rz;dz+=.78) {
      const a=dx+(rand()-.5)*.16,b=dz+(rand()-.5)*.16,s=mix(.80,1.11,rand());
      if (paddyShape(a,b,rx,rz) < .85) put('rice',x+a,y-.14,z+b,rand()*6.28,s,s,s,tints[(Math.floor(rand()*6))]);
    }
    if (spec.sluice) for (let i=-1;i<=1;i++) {
      const px=x-rx-1.04,pz=z+i*2.42;
      if (routeBlend(px,pz)[0]>1.35) prop('retaining-wall',px,pz,-Math.PI/2,1,-.36,paints[3]);
    }
  }
  if (!spec.snow) for (let i=0;i<1950;i++) {
    const x=mix(-49,48,rand()),z=mix(-51,39,rand());
    const [lane]=routeBlend(x,z),y=groundAt(x,z);
    if (lane<1.2 || lane>7.3 || y<waterAt(x,z)+.12 || !rndClear(x,z) || !layout.canWalk(x,z) ||
        Math.sin(x*.92+z*.62)+Math.sin(z*.53-x*.28)<-.83) continue;
    const s=mix(.72,1.27,rand());
    put('grass',x,y-.032,z,rand()*6.28,s,s*mix(.85,1.23,rand()),s,tints[i%6]);
  }

  const treeModels=new Set(['cedar','cedar-lod','maple','maple-lod','bamboo']);
  const detailModels = new Set(regionalPlantModels(layout.id));
  for (const [name,positions] of groups) {
    const kind=plantingKinds[name] ?? (treeModels.has(name)?'tree':name==='shrub'?'shrub':undefined);
    const cast=!['grass','rice','river-sedge','meadow-grass','woodland-fern','seasonal-forbs','shore-reeds',
      'cedar-lod','maple-lod','coastal-pine-lod','stair-tread'].includes(name);
    if (kind||detailModels.has(name)||name==='grass'||name==='rice') {
      const chunks=new Map();
      for (const item of positions) {
        const cell=`${Math.floor(item[0]/28)},${Math.floor(item[2]/28)}`;
        if (!chunks.has(cell)) chunks.set(cell,[]);
        chunks.get(cell).push(item);
      }
      for (const chunk of chunks.values()) {
        if (!Object.hasOwn(plantingLOD, name)) {
          addInstances(scene,assets[name],chunk,cast,kind);
          continue;
        }
        const [x,,z]=chunk[Math.floor(chunk.length/2)];
        const level=new THREE.LOD();
        level.position.set(x,0,z);
        for (const [variant,distance] of [[name,0],[name+'-lod',plantingLOD[name]]]) {
          const batch=new THREE.Group();
          batch.position.set(-x,0,-z);
          addInstances(batch,assets[variant],chunk,distance===0 && cast,kind);
          level.addLevel(batch,distance,.11);
        }
        scene.add(level);
      }
    } else addInstances(scene,assets[name],positions,cast,kind);
  }
  return blocks;
}
