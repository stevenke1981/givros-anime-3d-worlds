import * as THREE from 'three';
import { mix, paddyShape } from './layout.js';
import { randomSequence } from './landscape.js';

export function groundEdgePlants({ routes, paddies, groundAt, laneDistance, halfWidth, canPlace, seed }) {
  const random = randomSequence(seed);
  const plants = [];
  const colors = ['#b6be86','#bfc281','#91aa74','#9eaa75','#b4be99'].map(color => new THREE.Color(color));
  function place(x,z,yaw,scale,pitch,minY=-Infinity) {
    const y = groundAt(x,z);
    if (y<minY || !canPlace(x,z,y)) return;
    plants.push([x,y-.021,z,yaw,scale,scale*mix(.84,1.16,random()),scale,
      colors[Math.floor(random()*colors.length)],pitch]);
  }
  for (const route of routes) {
    for (let i=1;i<route.length;i++) {
      const [ax,az]=route[i-1], [bx,bz]=route[i];
      const dx=bx-ax, dz=bz-az, length=Math.hypot(dx,dz);
      const nx=-dz/length, nz=dx/length;
      for (let distance=.30;distance<length;distance+=mix(.63,1.25,random())) {
        const t=distance/length, cx=mix(ax,bx,t), cz=mix(az,bz,t);
        for (const side of [-1,1]) {
          if (Math.sin(cx*.78-cz*.51+side*.8)+.52*Math.cos(cx*1.15+cz*.94)<-.39 || random()<.27) continue;
          const offset=halfWidth(cx,cz)+mix(.33,.78,random());
          for (let j=0,count=2+Math.floor(random()*4);j<count;j++) {
            const x=cx+side*nx*offset+(random()-.5)*.48, z=cz+side*nz*offset+(random()-.5)*.48;
            const verge=laneDistance(x,z)-halfWidth(x,z);
            if (verge<.30 || verge>.80) continue;
            const s=mix(.39,.87,random());
            place(x,z,Math.atan2(nx*side,nz*side)+(random()-.5)*2.5,s,(random()-.45)*.35);
          }
        }
      }
    }
  }
  for (const [cx,cz,rx,rz,water] of paddies) {
    for (let a=random()*.50;a<Math.PI*2;a+=mix(.09,.23,random())) {
      if (Math.sin(a*6.1+cx*.9)+.57*Math.cos(a*11.3+cz)<-.44 || random()<.19) continue;
      const u=Math.cos(a), v=Math.sin(a);
      for (let i=0,count=1+Math.floor(random()*3);i<count;i++) {
        const radius=mix(1.027,1.089,random())/paddyShape(u,v,1,1);
        const x=cx+u*rx*radius+(random()-.5)*.24, z=cz+v*rz*radius+(random()-.5)*.24;
        if (laneDistance(x,z)<halfWidth(x,z)+.18) continue;
        place(x,z,Math.atan2(-u,-v)+(random()-.5)*.77,mix(.64,1.14,random()),mix(.44,.88,random()),water+.075);
      }
    }
  }
  return plants;
}

// Shallow, non-blocking mineral fragments: dimensions are in metres.
// canPlace owns exclusions for water, buildings, bridges and other surfaces.
export function addSurfaceDetailGeometry(scene, { groundAt, canPlace, center, seed, vergeDistance }) {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const groups = new Map();
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const heading = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const palette = ['#77766c', '#8a8173', '#a09582', '#686d69', '#b0a28d'].map(color => new THREE.Color(color));
  let clusters = 0;
  const attempts = vergeDistance ? 2600 : 1600;
  for (let attempt = 0; attempt < attempts && clusters < 130; attempt++) {
    const angle = random() * Math.PI * 2;
    const distance = Math.sqrt(random()) * 26;
    const cx = center[0] + Math.cos(angle) * distance;
    const cz = center[1] + Math.sin(angle) * distance;
    if (!canPlace(cx, cz)) continue;
    if (vergeDistance) {
      const verge = vergeDistance(cx,cz);
      if ((verge < .30 || verge > .80) && random() < .94) continue;
    }
    clusters++;
    const count = 5 + Math.floor(random() * 6);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * (vergeDistance ? .44 : .65);
      const x = cx + Math.cos(a) * radius;
      const z = cz + Math.sin(a) * radius;
      if (!canPlace(x, z)) continue;
      if (vergeDistance) {
        const verge = vergeDistance(x,z);
        if (verge < .30 || verge > .80) continue;
      }
      const y = groundAt(x, z);
      const dx = (groundAt(x + .12, z) - groundAt(x - .12, z)) / .24;
      const dz = (groundAt(x, z + .12) - groundAt(x, z - .12)) / .24;
      if (Math.hypot(dx, dz) > .7) continue;
      normal.set(-dx, 1, -dz).normalize();
      rotation.setFromUnitVectors(up, normal);
      heading.setFromAxisAngle(up, random() * Math.PI * 2);
      rotation.multiply(heading);
      const width = .025 + random() * .075;
      const height = .009 + random() * .018;
      scale.set(width, height, width * (.55 + random() * .8));
      position.set(x, y + height * .13, z);
      matrix.compose(position, rotation, scale);
      const shape = random() < .5 ? 0 : 1;
      const key = `${Math.floor((x - center[0]) / 13)},${Math.floor((z - center[1]) / 13)},${shape}`;
      if (!groups.has(key)) groups.set(key, { shape, instances: [] });
      groups.get(key).instances.push({ matrix: matrix.clone(), color: palette[Math.floor(random() * palette.length)] });
    }
  }

  const geometries = [new THREE.IcosahedronGeometry(1, 0), new THREE.OctahedronGeometry(1, 0)];
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .94, metalness: 0 });
  for (const { shape, instances } of groups.values()) {
    const mesh = new THREE.InstancedMesh(geometries[shape], material, instances.length);
    mesh.name = 'embedded-mineral-fragments';
    mesh.receiveShadow = Boolean(vergeDistance);
    instances.forEach((instance, index) => {
      mesh.setMatrixAt(index, instance.matrix);
      mesh.setColorAt(index, instance.color);
    });
    mesh.computeBoundingSphere();
    scene.add(mesh);
  }
  // If no placements were accepted, no scene node owns these resources.
  if (!groups.size) {
    geometries.forEach(geometry => geometry.dispose());
    material.dispose();
  } else {
    for (let shape = 0; shape < geometries.length; shape++) {
      if (![...groups.values()].some(group => group.shape === shape)) geometries[shape].dispose();
    }
  }
}
