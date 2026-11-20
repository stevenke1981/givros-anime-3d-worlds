import {
  Color, DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, SRGBColorSpace, TextureLoader,
} from 'three';
import { smooth } from './layout.js';
import { applyHeightFog } from '../lighting/height-fog.js';

// Knees of the spurs are visible from the valley floor. Cut gullies beyond the last
// existing tree placements so the walk mesh and the closer modelled groves stay grounded.
function erosion(x, z) {
  const outer = smooth(78, 106, Math.abs(x)) + smooth(47, 83, z) + smooth(109, 136, -z);
  if (!outer) return 0;
  const fold = x * .064 + z * .047 + 1.1 * Math.sin(z * .071) + .55 * Math.sin(x * .041);
  const rib = .5 + .5 * Math.cos(fold * 1.7);
  const apron = .65 + .35 * Math.sin(x * .053 - z * .069);
  return Math.min(1, outer) * (1.9 + apron * (5.4 * rib + .76 * Math.sin(fold * 2.2)));
}

export async function addWoodedFoothills(scene, terrain, groundAt, riverEdge, random) {
  const map = await new TextureLoader().loadAsync(import.meta.env.BASE_URL + 'models/hillside-cedars.png');
  map.colorSpace = SRGBColorSpace;
  const geometry = terrain.geometry;
  const { position, color, landCover } = geometry.attributes;
  const heath = new Color('#50674c'), shale = new Color('#898c7d'), tint = new Color();
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    const verge = smooth(47, 75, Math.max(Math.abs(x), -z - 12, z + 3));
    if (!verge) continue;
    const inland = smooth(4, 14, riverEdge(x, z));
    const cover = verge * inland;
    if (!cover) continue;
    const cut = erosion(x, z) * inland;
    position.setY(i, position.getY(i) + cut);
    const rock = smooth(4, 7.4, cut + 1.1 * Math.sin(z * .31 + x * .18));
    const scrub = .5 + .25 * Math.cos(.36 * x + .19 * z) + .25 * Math.sin(.18 * z - .29 * x);
    tint.fromBufferAttribute(color, i).lerp(heath, cover * (.28 + .50 * scrub)).lerp(shale, rock * .83);
    color.setXYZ(i, tint.r, tint.g, tint.b);
    landCover.setY(i, Math.max(landCover.getY(i), rock));
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;

  // The two entry views face west. Continue the valley beyond the old terrain edge
  // with a second watershed; its skyline remains visible through gaps in the trees.
  const mountains = new PlaneGeometry(160, 390, 56, 112).rotateX(-Math.PI / 2);
  const vertices = mountains.attributes.position;
  const stone = new Color('#8897a0'), forest = new Color('#546f72'), colors = [];
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i) - 196, z = vertices.getZ(i);
    const fold = Math.sin(z * .046 + .7) * 9 + Math.sin(z * .094) * 2.8;
    const shoulder = Math.abs((x + 197 - fold * .71) / 73);
    const spur = .5 + .5 * Math.cos(z * .105 + x * .075 + Math.sin(z * .064));
    const rise = smooth(1, 0, shoulder) * smooth(195, 145, Math.abs(z));
    const y = -4 + rise * (46 + fold + 5.3 * spur + 2.7 * Math.sin(z * .18 + x * .026));
    vertices.setXYZ(i,x,y,z);
    tint.copy(forest).lerp(stone, .14 + rise * (.17 + .39 * spur));
    colors.push(tint.r,tint.g,tint.b);
  }
  mountains.setAttribute('color', new Float32BufferAttribute(colors, 3));
  mountains.computeVertexNormals();
  const ridgeMaterial = new MeshLambertMaterial({ vertexColors: true });
  ridgeMaterial.onBeforeCompile = applyHeightFog;
  const ridge = new Mesh(mountains,ridgeMaterial);
  ridge.name = 'Western watershed';
  ridge.userData.gaussianKind = 'mountain';
  scene.add(ridge);

  const sites = [];
  for (let i = 0; i < 6200; i++) {
    const x = min.x + 3 + random() * (max.x - min.x - 6);
    const z = min.z + 3 + random() * (max.z - min.z - 6);
    const distance = Math.max(Math.abs(x), -z - 12, z + 3);
    if (distance < 55 || riverEdge(x, z) < 7) continue;
    const grove = Math.sin(x * .14 + z * .083 + Math.sin(z * .15)) + .82 * Math.cos(z * .19 - x * .068);
    const cut = erosion(x, z);
    if (grove < -.4 + 1.2 * smooth(5, 10, cut) || random() > smooth(55, 80, distance)) continue;
    const height = 3.1 + random() * 4.8 + grove * .8;
    sites.push([x, groundAt(x,z) + cut * smooth(4, 14, riverEdge(x,z)) - .28, z, height]);
  }
  const crown = new PlaneGeometry(1, 1);
  // The image contains two orthographic views. Face each stand inward toward the
  // walkable valley, retaining stable silhouettes when the visitor pans the camera.
  crown.translate(0, .5, 0);
  crown.setAttribute('atlasSide', new InstancedBufferAttribute(
    Float32Array.from(sites, () => random() < .5 ? 0 : .5), 1));
  const material = new MeshBasicMaterial({ map, alphaTest: .32, side: DoubleSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float atlasSide;\n' + shader.vertexShader.replace('#include <uv_vertex>',
      '#include <uv_vertex>\nvMapUv.x = vMapUv.x * .5 + atlasSide;');
    applyHeightFog(shader);
  };
  const grove = new InstancedMesh(crown, material, sites.length);
  grove.name = 'Woodland on eroded valley spurs';
  const tree = new Object3D();
  sites.forEach(([x,y,z,h], i) => {
    tree.position.set(x, y, z);
    tree.rotation.y = Math.atan2(-x, -z) + (random() - .5) * .55;
    tree.scale.set(h * (.9 + random() * .32), h, 1);
    tree.updateMatrix();
    grove.setMatrixAt(i, tree.matrix);
    grove.setColorAt(i, tint.setRGB(.80 + random() * .17, .86 + random() * .13, .85 + random() * .14));
  });
  grove.computeBoundingSphere();
  scene.add(grove);
}
