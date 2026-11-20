import * as THREE from 'three';
import { createRegionalLayout, terracePathHalfWidth } from './layout.js';
import { loadRegionalAssets, populateRegionalWorld } from './props.js';
import { addAtmosphere, addTerrain, addHydrology, addSteam } from './terrain.js';
import { applyAssetSurfaces } from '../surface-material.js';
import { addSurfaceDetailGeometry } from '../surface-detail-geometry.js';
import { createVegetationWind } from '../vegetation-wind.js';
import { createContactOcclusion } from '../contact-occlusion.js';
import { extendRoofOverhangs } from '../roof-overhang.js';
import { addWoodedFoothills } from '../wooded-foothills.js';
import { randomSequence } from '../landscape.js';

const trailLabels = {
  '02': '礫岸步道', '03': '竹林入口', '04': '田野入口',
  '05': '楓葉山道', '06': '杉林古道', '07': '雪國小徑',
  '08': '海岬小徑', '09': '湖畔山徑', '10': '祭典入口',
};

export async function createRegionalWorld(id, {
  renderer, onProgress=()=>{}, useBakedMaterials=false, physicalSurfaces=false,
  naturalLighting=false, coarse=false,
}={}) {
  const layout=createRegionalLayout(id,{naturalLighting});
  const {spec,surfaceAt,canWalk,groundAt,waterAt,routeBlend}=layout;
  onProgress(.08,'準備地形');
  const assets=await loadRegionalAssets(layout,onProgress,useBakedMaterials);
  const scene=new THREE.Scene();
  if (spec.night) scene.userData.gaussianExposure=.47;
  if (renderer?.shadowMap) renderer.shadowMap.enabled=true;
  const sun=addAtmosphere(scene,layout,physicalSurfaces,naturalLighting,coarse);
  onProgress(.64,'生成河流、丘陵與步道');
  const contacts=naturalLighting ? createContactOcclusion(coarse, Boolean(layout.canal)) : undefined;
  const {groundDetail,turf}=addTerrain(scene,layout,physicalSurfaces,contacts);
  if (naturalLighting) await addWoodedFoothills(scene,turf,groundAt,layout.riverEdge,randomSequence(97146));
  const clock=addHydrology(scene,layout,sun,useBakedMaterials,naturalLighting,contacts);
  onProgress(.83,'排列房屋、地標與林木');
  const blocks=populateRegionalWorld(scene,layout,assets,32671+Number(id)*3721);
  if (naturalLighting) extendRoofOverhangs(scene);
  contacts?.bake(scene);
  const wind=physicalSurfaces ? createVegetationWind() : undefined;
  if (wind) {
    applyAssetSurfaces(scene,groundDetail,Boolean(layout.canal));
    scene.traverse(mesh=>wind.register(mesh,mesh.userData.surfaceAsset));
    addSurfaceDetailGeometry(scene,{
      groundAt, center:spec.spawn, seed:24118+Number(id)*3721,
      vergeDistance:layout.canal ? (x,z)=>routeBlend(x,z)[0]-terracePathHalfWidth : undefined,
      canPlace:(x,z)=>canWalk(x,z) && !blocks(x,z) && routeBlend(x,z)[0]<4.25 &&
        groundAt(x,z)>waterAt(x,z)+.1 && Math.abs(surfaceAt(x,z)-groundAt(x,z))<.1,
    });
  }
  const steam=addSteam(scene,spec.pool);
  steam(0,false);
  const [x,z]=spec.spawn;
  const spawn={position:[x,surfaceAt(x,z)+1.65,z],target:spec.look};
  const views={trail:spawn,overview:spec.overview,landmark:spec.featured,overlook:spec.overlook};
  const viewLabels={trail:trailLabels[id],overview:'地形全景',landmark:spec.landmarkLabel,overlook:'山腰遠望'};
  if (spec.grove) {
    views.approach=spec.grove;
    viewLabels.approach='竹徑參道';
  }
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
    scene, spawn, views, viewLabels, initialView:'trail', landmarks:layout.landmarks, routes:layout.routes,
    surfaceAt, canWalk:(x,z)=>canWalk(x,z)&&!blocks(x,z),
    update(elapsed,_delta,reducedMotion) {
      clock.value=reducedMotion?0:elapsed;
      wind?.update(elapsed,reducedMotion);
      steam(elapsed,reducedMotion);
    }
  };
}
