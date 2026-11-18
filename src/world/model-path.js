const bakedModels = new Set([
  'bridge', 'dock', 'festival-lantern', 'festival-stall', 'house', 'onsen-pool',
  'retaining-wall', 'shrine', 'sluice', 'snow-inn', 'stone-lantern', 'teahouse',
  'temple', 'torii', 'water-basin',
]);

export function modelPath(name, useBakedMaterials) {
  const folder = useBakedMaterials && bakedModels.has(name) ? 'models/baked' : 'models';
  return `${import.meta.env.BASE_URL}${folder}/${name}.glb`;
}
