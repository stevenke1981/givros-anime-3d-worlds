import * as THREE from 'three';
import { createRegionalLayout } from './layout.js';
import { loadRegionalAssets, populateRegionalWorld } from './props.js';
import { addAtmosphere, addTerrain, addHydrology, addSteam } from './terrain.js';

export async function createRegionalWorld(id, {renderer,onProgress=()=>{}}={}) {
  const layout=createRegionalLayout(id);
  const {spec,surfaceAt,canWalk}=layout;
  onProgress(.08,'準備地形');
  const assets=await loadRegionalAssets(layout,onProgress);
  const scene=new THREE.Scene();
  if (renderer?.shadowMap) renderer.shadowMap.enabled=true;
  const sun=addAtmosphere(scene,layout);
  onProgress(.64,'生成河流、丘陵與步道');
  addTerrain(scene,layout);
  const clock=addHydrology(scene,layout,sun);
  onProgress(.83,'排列房屋、地標與林木');
  const blocks=populateRegionalWorld(scene,layout,assets,32671+Number(id)*3721);
  const steam=addSteam(scene,spec.pool);
  steam(0,false);
  const [x,z]=spec.spawn;
  const spawn={position:[x,surfaceAt(x,z)+1.65,z],target:spec.look};
  const views={overview:spec.overview,landmark:spec.featured,overlook:spec.overlook};
  const viewLabels={overview:'地形全景',landmark:spec.landmarkLabel,overlook:'山腰遠望'};
  if (layout.dock) {
    const {x,y,z,r}=layout.dock;
    views.waterfront={
      position:[x+Math.sin(r)*3.7,y+1.65,z+Math.cos(r)*3.7],
      target:[x+Math.sin(r)*27,y+1.0,z+Math.cos(r)*27]
    };
    viewLabels.waterfront=spec.coast?'灣口遠望':'湖心遠望';
  }
  if (layout.paddies.length) {
    const [x,z,rx,,y]=layout.paddies[0];
    views.fields={position:[x-rx-2.0,y+2.1,z+2.4],target:[x+12,y+1.25,z-4]};
    viewLabels.fields='濕田與田埂';
  }
  onProgress(1,spec.title+'已就緒');
  return {
    scene, spawn, views, viewLabels, landmarks:layout.landmarks, routes:layout.routes,
    surfaceAt, canWalk:(x,z)=>canWalk(x,z)&&!blocks(x,z),
    update(elapsed,_delta,reducedMotion) {
      clock.value=reducedMotion?0:elapsed;
      steam(elapsed,reducedMotion);
    }
  };
}
