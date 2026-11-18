import * as THREE from 'three';
import { createGroundDetail, groundMaterial } from '../ground-material.js';
import { mix, paddyShape, smooth } from '../layout.js';
import { randomSequence } from '../landscape.js';

function grid(w, h, sample, material) {
  const positions = [], colors = [], covers = [], edges = [], indices = [];
  for (let j=0;j<=h;j++) {
    for (let i=0;i<=w;i++) {
      const [x,y,z,color,cover,edge] = sample(i/w,j/h);
      positions.push(x,y,z);
      if (color) {
        colors.push(color.r,color.g,color.b);
        covers.push(...cover);
      }
      if (edge !== undefined) edges.push(edge);
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
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry,material);
}

const cloudNoise = `
float hash(vec2 p) {return fract(sin(dot(p,vec2(139.47,243.43)))*41877.93);}
float noise(vec2 p) {
  vec2 a=floor(p),b=fract(p); b=b*b*(3.-2.*b);
  return mix(mix(hash(a),hash(a+vec2(1.,0.)),b.x),mix(hash(a+vec2(0.,1.)),hash(a+vec2(1.,1.)),b.x),b.y);
}
`;

export function addAtmosphere(scene, layout) {
  const { spec } = layout;
  const [, , , , skyColor, ambient, warm] = spec.colors;
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.FogExp2(skyColor,spec.night ? .0062 : spec.snow ? .0056 : .0046);
  scene.add(new THREE.HemisphereLight(ambient,spec.snow ? '#929bb0' : '#797365',spec.sun[4]));
  const sunDirection = new THREE.Vector3(...spec.sun.slice(0,3)).normalize();
  const sun = new THREE.DirectionalLight(warm,spec.sun[3]);
  sun.target.position.set(0,0,-5);
  sun.position.copy(sunDirection).multiplyScalar(110).add(sun.target.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.normalBias=.048;
  sun.shadow.bias=-.00015;
  Object.assign(sun.shadow.camera,{left:-48,right:48,top:56,bottom:-56,near:3,far:193});
  sun.shadow.camera.updateProjectionMatrix();
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
      void main(){
        vec3 r=normalize(ray); float rise=max(0.,r.y);
        vec3 color=mix(horizon,zenith,smoothstep(-.07,.52,rise));
        float facing=max(dot(r,solar),0.); color+=light*.095*pow(facing,8.);
        color+=light*exp(-rise*26.)*dusk*.29;
        vec2 p=vec2(atan(r.x,-r.z)*7.7,r.y*27.);
        float m=noise(p)*.60+noise(p*2.21)*.25+noise(p*4.04)*.15;
        float cloud=smoothstep(.545,.70,m)*smoothstep(.025,.115,rise)*(1.-smoothstep(.45,.79,rise))*clouds;
        color=mix(color,mix(vec3(.77,.83,.87),vec3(.42,.47,.61),dusk),cloud);
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

export function addTerrain(scene, layout) {
  const {spec,paddies,groundAt,routeBlend,riverEdge,seaEdge} = layout;
  const tuple = spec.colors.map(color => new THREE.Color(color));
  const [grass,shade,dry,path] = tuple;
  const rock = new THREE.Color(spec.snow ? '#a2adb8' : spec.coast ? '#929385' : '#858981');
  const soil = new THREE.Color(spec.snow ? '#87958f' : '#716348');
  const turfDetail = createGroundDetail();
  const turf = grid(274,250,(u,v)=>{
    function map(n,min,max) {
      if (n < .118) return min - 58 * (1 - n/.118) ** 1.68;
      if (n > .882) return max + 58 * ((n-.882)/.118) ** 1.68;
      return mix(min,max,(n-.118)/.764);
    }
    const x=map(u,-54,54),z=map(v,-62,45),y=groundAt(x,z);
    const [lane] = routeBlend(x,z);
    const variation = .54+.23*Math.sin(x*.17+z*.22)+.14*Math.sin(z*.55+Math.cos(x*.2))+.08*Math.sin(x*1.2-z*.83);
    const color=shade.clone().lerp(grass,smooth(.14,.68,variation)).lerp(dry,.49*smooth(.56,.94,variation));
    const banks=smooth(2.75,.7,Math.min(riverEdge(x,z),seaEdge(x,z))+.165*Math.sin(z*2.83+x*1.3));
    color.lerp(rock,banks*.84);
    const wear=smooth(1.34,.66,lane+.10*Math.sin(x*1.79-z*2.14))*(1-banks*.65);
    color.lerp(path.clone().lerp(soil,.20+(1-variation)*.18),wear);
    let bare=Math.max(wear,banks*.85), stones=banks*.74;
    for (const [px,pz,rx,rz] of paddies) {
      if (Math.abs(x-px)>rx+1 || Math.abs(z-pz)>rz+1) continue;
      const p=paddyShape(x-px,z-pz,rx,rz);
      const mud=smooth(1.09,.78,p), berm=smooth(.89,1.02,p)*smooth(1.19,1.005,p);
      color.lerp(soil,mud).lerp(grass,berm*.36);
      bare=Math.max(bare,mud*.98);
    }
    const court=Math.hypot(x-spec.sanctuary.x,z-spec.sanctuary.z);
    const paved=smooth(5.7,4.6,court);
    color.lerp(rock,paved*.73);
    bare=Math.max(bare,paved*.82);
    stones=Math.max(stones,paved*.54);
    return [x,y,z,color,[bare,stones,stones*.16]];
  },groundMaterial(turfDetail));
  turf.name='Continuous regional landforms and paths';
  turf.receiveShadow=true;
  turf.userData.gaussianKind='turf';
  scene.add(turf);

  const [height,width,z0] = spec.ridge;
  for (let k=0;k<3;k++) {
    const near=k===0, crestColor=rock.clone().lerp(tuple[4],near?.20:.54);
    const forest=shade.clone().lerp(tuple[4],near?.24:.56);
    const massif=grid(115,76,(u,v)=>{
      const shift=k*.49 + spec.stream[0]*.018;
      const x=(u-.5)*(width+k*56) + Math.sin(shift)*25;
      const z=z0+(v-.5)*(96+k*18)-k*53;
      const y=-8+(height+k*9)*Math.sin(Math.PI*u)**.62 *
        smooth(.59,.02,Math.abs(v-.40-.042*Math.sin(u*18+shift))) *
        (.76+.12*Math.sin(u*12+shift)+.05*Math.sin(u*49+shift)+.025*Math.sin(u*103));
      const striation=.50+.23*Math.sin(x*.41-z*.14)+.15*Math.sin(z*.73+x*.56);
      const exposed=smooth(13,54,y)*striation;
      const color=forest.clone().lerp(crestColor,exposed*.96);
      if (spec.snow) color.lerp(dry,smooth(18+striation*19,40+striation*26,y)*.94);
      return [x,y,z,color,[exposed*.79,exposed,.78]];
    },groundMaterial(turfDetail,{roughness:1,emissive:tuple[4],emissiveIntensity:near?.065:.14}));
    massif.name='Weathered regional ridge '+k;
    massif.userData.gaussianKind='mountain';
    scene.add(massif);
  }
}

function surfaceMaterial(clock, sun, spec, kind) {
  const still = kind==='sea' || kind==='lake';
  const drained = kind==='paddy' || kind==='pool';
  const colors = kind==='paddy' ? ['#5f785e','#92a276'] :
    kind==='pool' ? ['#557d82','#9fbaae'] : [spec.colors[7],spec.colors[8]];
  return new THREE.ShaderMaterial({
    side:THREE.DoubleSide,
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
      void main(){
        vec2 uv=pos.xz-vec2(0.,clock*flow);
        float m=noise(uv*vec2(.32,.66)), ripples=noise(uv*vec2(.88,2.9)+m*.76);
        float grit=noise(uv*vec2(2.25,6.3)+m*.32);
        vec3 n=normalize(vec3(.11*(ripples-.5),1.,.125*(grit-.5)));
        vec3 eye=normalize(cameraPosition-pos);
        float glass=pow(1.-clamp(dot(n,eye),0.,1.),3.);
        float littoral=smoothstep(.38,1.,edge);
        float shadowBank=smoothstep(.50,1.02,edge)*noise(uv*vec2(.25,.53)+n.xz*11.);
        vec3 tint=mix(skyTint*.77,skyTint,clamp(.24+glass*.70,0.,1.));
        tint=mix(tint,deep*.61,shadowBank*.82);
        vec3 body=mix(deep,shallows,.075+littoral*.67+m*.18);
        body=mix(body,tint,min(.82,reflection*(.16+glass*.93)));
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

export function addHydrology(scene, layout, sun) {
  const { spec,paddies,baseWaterAt,centerAt,spanAt,seaEdge }=layout;
  const clock={value:0};
  function add(kind,w,h,point) {
    const material=surfaceMaterial(clock,sun,spec,kind);
    material.uniforms.clock=clock;
    const water=grid(w,h,point,material);
    water.name='Watershed '+kind;
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
  });
  if (spec.pool) {
    const [x,z,y]=spec.pool;
    add('pool',22,22,(u,v)=>{
      const du=2*u-1,dv=2*v-1,edge=Math.max(Math.abs(du),Math.abs(dv));
      const scale=edge/(Math.hypot(du,dv)||1);
      return [x+du*2.02*scale,y+.18,z+dv*2.02*scale,null,null,edge];
    });
  }
  if (spec.sluice) {
    const [cx,cz] = spec.sluice;
    add('paddy',4,65,(u,v)=>{
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
