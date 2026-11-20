import * as THREE from 'three';
import { createGroundDetail, groundMaterial } from '../ground-material.js';
import { mix, paddyShape, smooth } from '../layout.js';
import { randomSequence } from '../landscape.js';
import { waterEnvironmentGLSL } from '../../lighting/water-environment.js';
import { daylightDirection, shapeDaylightShadows } from '../../lighting/daylight.js';
import { cloudLayerGLSL } from '../../lighting/sky-clouds.js';
import { createWaterMaterial, setWaterDepth } from '../water-material.js';

function grid(w, h, sample, material) {
  const positions = [], colors = [], covers = [], edges = [], gaussianWeights = [], wetness = [], indices = [];
  for (let j=0;j<=h;j++) {
    for (let i=0;i<=w;i++) {
      const [x,y,z,color,cover,edge,gaussianWeight,soilWetness] = sample(i/w,j/h);
      positions.push(x,y,z);
      if (color) {
        colors.push(color.r,color.g,color.b);
        covers.push(...cover);
      }
      if (edge !== undefined) edges.push(edge);
      if (gaussianWeight !== undefined) gaussianWeights.push(gaussianWeight);
      if (soilWetness !== undefined) wetness.push(soilWetness);
      if (i===w || j===h) continue;
      const a=j*(w+1)+i,b=a+w+1;
      indices.push(a,b,a+1,a+1,b,b+1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  if (colors.length) {
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    geometry.setAttribute('landCover',new THREE.Float32BufferAttribute(covers,3));
  }
  if (edges.length) geometry.setAttribute('wetEdge',new THREE.Float32BufferAttribute(edges,1));
  if (gaussianWeights.length) geometry.setAttribute('gaussianWeight',new THREE.Float32BufferAttribute(gaussianWeights,1));
  if (wetness.length) geometry.setAttribute('landWetness',new THREE.Float32BufferAttribute(wetness,1));
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry,material);
}

function field(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const u = smooth(0, 1, x - ix), v = smooth(0, 1, z - iz);
  const point = (a, b) => {
    const hash = Math.imul(a + seed, 1597334677) ^ Math.imul(b - seed, 3812015801);
    return (Math.imul(hash ^ (hash >>> 16), 2246822519) >>> 0) / 4294967295;
  };
  return mix(mix(point(ix, iz), point(ix + 1, iz), u), mix(point(ix, iz + 1), point(ix + 1, iz + 1), u), v);
}

// [crest center, ridge width, gully depth, exposed rock height, distance haze]
const ridgeProfiles = {
  '02': [.39, .54, 4.1, 28, .18], // Wet dissected foothills
  '03': [.45, .55, 3.1, 35, .21], // Soft, wooded saddles
  '04': [.43, .64, 3.8, 34, .20], // Broad agricultural valley
  '05': [.35, .56, 7.0, 29, .20], // Valleys carved into the autumn ridge
  '06': [.36, .44, 12.5, 13, .17], // Exposed rock ribs above the temple
  '07': [.34, .48, 9.7, 19, .22], // Steep snowfields with windswept spurs
  '08': [.33, .63, 8.7, 18, .28], // A long shoulder falling into sea haze
  '09': [.42, .67, 5.3, 31, .25], // Wide glacial basin
  '10': [.39, .61, 5.0, 35, .24], // Blue-hour silhouette
};

const cloudNoise = `
float hash(vec2 p) {return fract(sin(dot(p,vec2(139.47,243.43)))*41877.93);}
float noise(vec2 p) {
  vec2 a=floor(p),b=fract(p); b=b*b*(3.-2.*b);
  return mix(mix(hash(a),hash(a+vec2(1.,0.)),b.x),mix(hash(a+vec2(0.,1.)),hash(a+vec2(1.,1.)),b.x),b.y);
}
`;

export function addAtmosphere(scene, layout, physicalSurfaces = false, naturalLighting = false, coarse = false) {
  const { spec, id } = layout;
  const [, , , , skyColor, ambient, warm] = spec.colors;
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(skyColor,spec.night ? .0062 : spec.snow ? .0056 : .0046);
  scene.add(naturalLighting ? new THREE.HemisphereLight('#acccff','#5d6547',.99) :
    new THREE.HemisphereLight(ambient,spec.snow ? '#929bb0' : '#797365',spec.sun[4]));
  const sunDirection = naturalLighting ? daylightDirection(id) : new THREE.Vector3(...spec.sun.slice(0,3)).normalize();
  const sun = new THREE.DirectionalLight(naturalLighting ? '#fff1d6' : warm,naturalLighting ? 3.45 : spec.sun[3]);
  sun.target.position.set(0,0,-5);
  sun.position.copy(sunDirection).multiplyScalar(110).add(sun.target.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.normalBias=.048;
  sun.shadow.bias=-.00015;
  Object.assign(sun.shadow.camera,{left:-48,right:48,top:56,bottom:-56,near:3,far:193});
  sun.shadow.camera.updateProjectionMatrix();
  if (naturalLighting) shapeDaylightShadows(sun,coarse);
  scene.add(sun,sun.target);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(480,32,18),new THREE.ShaderMaterial({
    depthWrite:false,side:THREE.BackSide,
    uniforms:{
      horizon:{value:new THREE.Color(skyColor)},
      zenith:{value:new THREE.Color(spec.night?'#244477':spec.snow?'#509ac3':spec.coast?'#408bcb':'#548fc2')},
      light:{value:new THREE.Color(warm)}, solar:{value:sunDirection},
      dusk:{value:spec.night?1:0}, clouds:{value:spec.snow?.45:spec.night?.48:.90}
    },
    vertexShader:`varying vec3 ray;
      void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform vec3 horizon,zenith,light,solar;
      uniform float dusk,clouds; varying vec3 ray;
      ${cloudNoise}
      ${naturalLighting ? cloudLayerGLSL : ''}
      void main(){
        vec3 r=normalize(ray); float rise=max(0.,r.y);
        vec3 color=mix(horizon,zenith,smoothstep(-.07,.52,rise));
        float facing=max(dot(r,solar),0.); color+=light*.095*pow(facing,8.);
        color+=light*exp(-rise*26.)*dusk*.29;
        // Intersect the view ray with a horizontal cloud layer to keep the full sky continuous.
        vec2 p=${physicalSurfaces
          ? 'r.xz * (5.2 / max(.20, rise + .22)) + vec2(4.6, -3.2)'
          : 'vec2(atan(r.x,-r.z)*7.7,r.y*27.)'};
        float m=noise(p)*.60+noise(p*2.21)*.25+noise(p*4.04)*.15;
        float cloud=${naturalLighting ? 'skyCloudCoverage(r) * clouds' :
          'smoothstep(.545,.70,m)*smoothstep(.025,.115,rise)*(1.-smoothstep(.45,.79,rise))*clouds'};
        color=mix(color,mix(${naturalLighting ? 'vec3(1.16,1.14,1.08)' : 'vec3(.77,.83,.87)'},
          vec3(.42,.47,.61),dusk),cloud);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  sky.name='Regional daylight dome';
  sky.renderOrder=-100;
  sky.frustumCulled=false;
  scene.add(sky);
  return sunDirection;
}

export function addTerrain(scene, layout, physicalSurfaces = false, contactOcclusion) {
  const {id,spec,paddies,canal,groundAt,routeBlend,riverEdge,seaEdge,waterAt} = layout;
  const seed = 619 + Number(id) * 37;
  const tuple = spec.colors.map(color => new THREE.Color(color));
  const [grass,shade,dry,path] = tuple;
  const rock = new THREE.Color(spec.snow ? '#a2adb8' : spec.coast ? '#929385' : '#858981');
  const soil = new THREE.Color(spec.snow ? '#87958f' : '#716348');
  const wetMud = new THREE.Color('#59432d');
  const turfDetail = createGroundDetail(physicalSurfaces,contactOcclusion);
  function map(n,min,max) {
    if (n < .118) return min - 58 * (1 - n/.118) ** 1.68;
    if (n > .882) return max + 58 * ((n-.882)/.118) ** 1.68;
    return mix(min,max,(n-.118)/.764);
  }
  let rows=Array.from({length:251},(_,i)=>map(i/250,-62,45));
  if (canal) {
    // Sample both exposed slopes and the waterline within the narrow ditch.
    const fineRows=Array.from({length:43},(_,i)=>mix(-11.7,-5.4,i/42));
    rows=[...rows.filter(z=>z<-11.7),...fineRows,...rows.filter(z=>z>-5.4)];
  }
  const turf = grid(274,rows.length-1,(u,v)=>{
    const x=map(u,-54,54),z=rows[Math.round(v*(rows.length-1))],y=groundAt(x,z);
    const [lane] = routeBlend(x,z);
    const canopy = field(x * .14, z * .14, seed);
    const litter = field(x * .46 + canopy, z * .42, seed + 11);
    const variation = canopy * .67 + litter * .33;
    const color=shade.clone().lerp(grass,smooth(.14,.68,variation)).lerp(dry,.49*smooth(.56,.94,variation));
    const bankDistance = Math.min(riverEdge(x,z),seaEdge(x,z));
    const banks=smooth(2.75,.7,bankDistance+.29*(litter-.5));
    color.lerp(rock,banks*.84);
    const wear=smooth(1.34,.66,lane+.10*Math.sin(x*1.79-z*2.14))*(1-banks*.65);
    color.lerp(path.clone().lerp(soil,.20+(1-variation)*.18),wear);
    let bare=Math.max(wear,banks*.85), stones=banks*.74, wetness=0;
    for (const [px,pz,rx,rz] of paddies) {
      if (Math.abs(x-px)>rx+1 || Math.abs(z-pz)>rz+1) continue;
      const p=paddyShape(x-px,z-pz,rx,rz);
      const mud=smooth(1.09,.78,p), berm=smooth(.89,1.02,p)*smooth(1.19,1.005,p);
      color.lerp(soil,mud).lerp(grass,berm*.36);
      bare=Math.max(bare,mud*.98);
      if (canal) wetness=Math.max(wetness,smooth(1.055,.915,p)*.82);
    }
    if (canal) {
      const bank = canal.edgeAt(x,z);
      const shore = smooth(.56,.06,bank+.12*(litter-.5)) * canal.fadeAt(x);
      if (shore > 0) {
        color.lerp(soil,shore).lerp(wetMud,shore*.83);
        bare=Math.max(bare,shore*.985);
        stones=Math.max(stones,shore*.22);
        wetness=Math.max(wetness,smooth(.45,-.05,bank+.14*(litter-.5))*shore);
      }
    }
    const court=Math.hypot(x-spec.sanctuary.x,z-spec.sanctuary.z);
    const paved=smooth(5.7,4.6,court);
    color.lerp(rock,paved*.73);
    bare=Math.max(bare,paved*.82);
    stones=Math.max(stones,paved*.54);
    if (spec.snow) {
      // Wind and foot traffic expose gravel in small irregular patches below the snow.
      const exposed = (.14 + .86 * bare) * smooth(.48,.79,canopy * .42 + litter * .58);
      color.lerp(rock,exposed * .85);
      stones=Math.max(stones, exposed);
    }
    const dryLand = smooth(-.05,.40,bankDistance) * smooth(0,.16,y-waterAt(x,z));
    const groundCover = (1 - bare) ** 1.7 * dryLand * (.62 + litter * .36);
    return [x,y,z,color,[bare,stones,stones*.16],undefined,groundCover,canal ? wetness : undefined];
  },groundMaterial(turfDetail,{}, { wetSoil: Boolean(canal), receiveContacts: Boolean(contactOcclusion) }));
  turf.name='Continuous regional landforms and paths';
  turf.receiveShadow=true;
  turf.castShadow=Boolean(contactOcclusion);
  if (contactOcclusion) turf.material.shadowSide=THREE.FrontSide;
  turf.userData.gaussianKind='turf';
  scene.add(turf);

  const [height,width,z0] = spec.ridge;
  const [ridgeCenter,ridgeWidth,gullyDepth,rockHeight,haze] = ridgeProfiles[id];
  for (let k=0;k<3;k++) {
    const near=k===0, layerSeed=seed+k*23;
    const crestColor=rock.clone().lerp(tuple[4],haze+k*.14);
    const forest=shade.clone().lerp(tuple[4],haze+k*.16);
    const massif=grid(115,76,(u,v)=>{
      const x=(u-.5)*(width+k*56) + Math.sin(layerSeed)*21;
      const z=z0+(v-.5)*(96+k*18)-k*53;
      const fold = field(u * 7, .5, layerSeed);
      const crest = ridgeCenter + (fold - .5) * .13;
      const flank = smooth(ridgeWidth,.018,Math.abs(v-crest) * (v<crest ? 1.24 : .81));
      const saddle = field(u*13,.75,layerSeed+5);
      const channels = field(x*.10+z*.064,z*.036,layerSeed+11);
      const stone = field(x*.29+channels,z*.23,layerSeed+19);
      const gullies = smooth(.57,.86,channels) * smooth(0,.45,Math.abs(v-crest));
      const silhouette = Math.sin(Math.PI*u)**.66 * (.62+.27*fold+.17*saddle);
      const y = -8 + flank * ((height+k*9)*silhouette - gullyDepth*gullies + (stone-.5)*2.6);
      const exposed=smooth(rockHeight,rockHeight+30,y) * (.33+.67*channels);
      const color=forest.clone().lerp(crestColor,exposed*.96);
      color.multiplyScalar(.81 + .23 * channels + .14 * stone);
      if (spec.snow) color.lerp(dry,smooth(16+channels*25,38+channels*24,y)*.92);
      const detail = flank * smooth(2,26,y) * (.34 + exposed*.37 + gullies*.36) * (1-k*.18);
      return [x,y,z,color,[exposed*.79,exposed,.78],undefined,detail];
    },groundMaterial(turfDetail,{roughness:1,emissive:tuple[4],emissiveIntensity:near?.065:.14}));
    massif.name='Weathered regional ridge '+k;
    massif.userData.gaussianKind='mountain';
    scene.add(massif);
  }
  return turfDetail;
}

function surfaceMaterial(clock, sun, spec, kind, floodedSoil, realisticWater) {
  if (realisticWater) {
    const deep = kind === 'paddy' ? '#688675' : kind === 'pool' ? '#557d82' : spec.colors[7];
    return createWaterMaterial({ clock, sun, kind, deep, sky: spec.colors[4] });
  }
  const still = kind==='sea' || kind==='lake';
  const drained = kind==='paddy' || kind==='pool';
  const colors = kind==='paddy' ? ['#5f785e','#92a276'] :
    kind==='pool' ? ['#557d82','#9fbaae'] : [spec.colors[7],spec.colors[8]];
  return new THREE.ShaderMaterial({
    defines: floodedSoil ? { FLOODED_SOIL: 1 } : {},
    side:THREE.DoubleSide,
    userData:{waterEnvironment:true},
    uniforms:{clock:{value:clock.value},sun:{value:sun},deep:{value:new THREE.Color(colors[0])},
      shallows:{value:new THREE.Color(colors[1])},skyTint:{value:new THREE.Color(spec.colors[4])},
      flow:{value:still?(kind==='lake'?.07:.18):drained?.04:.37},
      reflection:{value:kind==='lake'?.77:still?.55:drained?.28:.38},
      surf:{value:kind==='sea'?1:0},pond:{value:drained?1:0}},
    vertexShader:`attribute float wetEdge;
      varying vec3 pos; varying float edge;
      void main(){pos=position;edge=wetEdge;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform float clock,flow,reflection,surf,pond;
      uniform vec3 sun,deep,shallows,skyTint;
      varying vec3 pos; varying float edge;
      ${cloudNoise}
      ${waterEnvironmentGLSL}
      void main(){
        vec2 uv=pos.xz-vec2(0.,clock*flow);
        float m=noise(uv*vec2(.32,.66)), ripples=noise(uv*vec2(.88,2.9)+m*.76);
        float grit=noise(uv*vec2(2.25,6.3)+m*.32);
        vec3 n=normalize(vec3(.11*(ripples-.5),1.,.125*(grit-.5)));
        vec3 eye=normalize(cameraPosition-pos);
        float littoral=smoothstep(.38,1.,edge);
        vec3 body=mix(deep,shallows,.075+littoral*.67+m*.18);
        #ifndef USE_WATER_ENVIRONMENT
          float glass=pow(1.-clamp(dot(n,eye),0.,1.),3.);
          float shadowBank=smoothstep(.50,1.02,edge)*noise(uv*vec2(.25,.53)+n.xz*11.);
          vec3 tint=mix(skyTint*.77,skyTint,clamp(.24+glass*.70,0.,1.));
          tint=mix(tint,deep*.61,shadowBank*.82);
          body=mix(body,tint,min(.82,reflection*(.16+glass*.93)));
        #endif
        #ifdef FLOODED_SOIL
          float shelf=smoothstep(.62,1.,edge+.095*(grit-.5));
          vec3 mud=mix(vec3(.085,.101,.058),vec3(.24,.197,.106),.20+m*.24+shelf*.48);
          #ifdef USE_WATER_ENVIRONMENT
            body=mud;
          #else
            vec3 reflected=reflect(-eye,n);
            float openSky=smoothstep(.015,.30,reflected.y);
            float haze=smoothstep(.35,.74,noise(reflected.xz*6.+uv*.12));
            vec3 sky=mix(vec3(.11,.17,.11),skyTint,openSky);
            sky=mix(sky,vec3(.68,.74,.77),openSky*haze*.34);
            body=mix(mud,sky,(.28+glass*.56)*(1.-shelf*.57));
          #endif
        #endif
        #ifdef USE_WATER_ENVIRONMENT
          body=reflectWater(body,n,eye,.055+.075*ripples+.05*surf+.025*littoral);
        #endif
        float sunlight=pow(max(0.,dot(reflect(-sun,n),eye)),117.)*(.30+m*.58);
        float glints=smoothstep(.86,.985,grit)*smoothstep(.19,.75,m);
        float foam=surf*smoothstep(.92,.998,edge)*smoothstep(.41,.73,m+cos(uv.y*1.8+uv.x*.22)*.16);
        body+=vec3(.51,.51,.44)*(sunlight*.50+glints*.045+foam*.24)*(1.-pond*.6);
        gl_FragColor=vec4(body,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

export function addHydrology(scene, layout, sun, realisticMaterials = false, realisticWater = false) {
  const { spec,paddies,baseWaterAt,centerAt,spanAt,seaEdge }=layout;
  const clock={value:0};
  function add(kind,w,h,point,floodedSoil=false) {
    const material=surfaceMaterial(clock,sun,spec,kind,realisticMaterials && floodedSoil,realisticWater);
    material.uniforms.clock=clock;
    const water=grid(w,h,point,material);
    water.name='Watershed '+kind;
    if (realisticWater) setWaterDepth(water, layout.groundAt);
    scene.add(water);
  }
  const start=spec.lake?10:-120,end=spec.coast?30:78;
  add('river',13,180,(u,v)=>{
    const z=mix(start,end,v),x=centerAt(z)+(u*2-1)*(spanAt(z)+.26);
    let y=baseWaterAt(z);
    if (spec.coast) y=mix(y,spec.coast.level-.05,smooth(.35,-.8,seaEdge(x,z)));
    if (spec.lake) y=Math.min(y,spec.lake.level-.008);
    return [x,y,z,null,null,Math.abs(2*u-1)];
  });
  if (spec.coast) add('sea',96,90,(u,v)=>{
    const x=mix(-148,148,u), shoreline=seaEdge(x,0);
    return [x,spec.coast.level,mix(shoreline,156,v),null,null,1-Math.min(1,v*29)];
  });
  if (spec.lake) {
    add('lake',76,76,(u,v)=>{
      const du=2*u-1,dv=2*v-1,edge=Math.max(Math.abs(du),Math.abs(dv));
      const [x,z]=layout.lakeBoundary(Math.atan2(dv,du),edge);
      return [x,spec.lake.level,z,null,null,edge];
    });
  }
  for (const [x,z,rx,rz,y] of paddies) add('paddy',16,16,(u,v)=>{
    const du=2*u-1,dv=2*v-1,edge=Math.max(Math.abs(du),Math.abs(dv));
    const scale=edge/(paddyShape(du,dv,1,1)||1)*.969;
    return [x+du*rx*scale,y,z+dv*rz*scale,null,null,edge];
  },true);
  if (spec.pool) {
    const [x,z,y]=spec.pool;
    add('pool',22,22,(u,v)=>{
      const du=2*u-1,dv=2*v-1,edge=Math.max(Math.abs(du),Math.abs(dv));
      const scale=edge/(Math.hypot(du,dv)||1);
      return [x+du*2.02*scale,y+.18,z+dv*2.02*scale,null,null,edge];
    });
  }
  if (layout.canal) {
    const { start, end, widthAt, waterAt, centerAt: canalCenterAt } = layout.canal;
    add(realisticWater ? 'canal' : 'paddy',12,152,(u,v)=>{
      const x=mix(start,end,v);
      const z=canalCenterAt(x)+(2*u-1)*(widthAt(x)+.14);
      return [x,waterAt(x),z,null,null,Math.abs(2*u-1)];
    });
  } else if (spec.sluice) {
    const [cx,cz] = spec.sluice;
    add(realisticWater ? 'canal' : 'paddy',4,65,(u,v)=>{
      const x=mix(cx-12,cx+24,v),z=cz-(x-cx)*.112+(u-.5)*.35;
      return [x,layout.groundAt(x,z)+.015,z,null,null,Math.abs(u*2-1)];
    });
  }
  return clock;
}

export function addSteam(scene, pool) {
  if (!pool) return ()=>{};
  const [x,z,y]=pool;
  const rand=randomSequence(4413);
  const motes=Array.from({length:52},()=>[rand(),rand(),rand(),rand()]);
  const geometry=new THREE.BufferGeometry();
  const position=new THREE.BufferAttribute(new Float32Array(motes.length*3),3);
  const age=new THREE.BufferAttribute(new Float32Array(motes.length),1);
  geometry.setAttribute('position',position);
  geometry.setAttribute('age',age);
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,
    vertexShader:`attribute float age; varying float fade;
      void main(){vec4 p=modelViewMatrix*vec4(position,1.);fade=sin(age*3.14159);
      gl_PointSize=clamp(175.*(1.+age)/max(1.,-p.z),8.,115.);
      gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying float fade;
      void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.86,.92,.95,exp(-d*d*4.)*(1.-smoothstep(.69,1.,d))*fade*.17);}`
  });
  const steam=new THREE.Points(geometry,material);
  steam.frustumCulled=false;
  steam.name='Localized hot spring steam';
  scene.add(steam);
  return (t,reduced)=>{
    const time=reduced?0:t;
    for (let i=0;i<motes.length;i++) {
      const [p,a,b,c]=motes[i],life=(p+time*(.075+c*.05))%1;
      position.setXYZ(i,x+(a-.5)*2.6+life*1.55,y+.22+life*2.35,z+(b-.5)*2.5+life*.44);
      age.setX(i,life);
    }
    position.needsUpdate=true;
    age.needsUpdate=true;
  };
}
