# Landmark material bake

The creek and rice-terrace pilot covers the house, bridge, retaining wall and sluice. After pilot acceptance, eleven more landmarks received the same bake. Baked variants are in [`public/models/baked/`](../public/models/baked/). Each uses the matching source scene, retaining the original origin, geometry, vertex paint and existing texture coordinates. The sibling GLBs in `public/models/` are the baseline.

| Asset | Source scene | Cycles AO resolution | Triangles |
| --- | --- | ---: | ---: |
| `retaining-wall.glb` | `region-library.blend` → `retaining-wall` | 512 × 512 | 1,620 |
| `bridge.glb` | `sakura-library.blend` → `bridge` | 1024 × 1024 | 12,352 |
| `sluice.glb` | `region-library.blend` → `sluice` | 512 × 512 | 1,304 |
| `house.glb` | `sakura-library.blend` → `house` | 1024 × 1024 | 22,420 |
| `torii.glb` | `sakura-library.blend` → `torii` | 512 × 512 | 2,324 |
| `shrine.glb` | `sakura-library.blend` → `shrine` | 1024 × 1024 | 23,118 |
| `stone-lantern.glb` | `sakura-library.blend` → `stone-lantern` | 512 × 512 | 2,118 |
| `water-basin.glb` | `region-library.blend` → `water-basin` | 512 × 512 | 1,320 |
| `teahouse.glb` | `region-library.blend` → `teahouse` | 1024 × 1024 | 25,162 |
| `temple.glb` | `region-library.blend` → `temple` | 1024 × 1024 | 38,646 |
| `snow-inn.glb` | `region-library.blend` → `snow-inn` | 1024 × 1024 | 23,852 |
| `onsen-pool.glb` | `region-library.blend` → `onsen-pool` | 512 × 512 | 2,308 |
| `dock.glb` | `region-library.blend` → `dock` | 1024 × 1024 | 3,928 |
| `festival-stall.glb` | `region-library.blend` → `festival-stall` | 1024 × 1024 | 3,354 |
| `festival-lantern.glb` | `region-library.blend` → `festival-lantern` | 512 × 512 | 2,278 |

Cycles bakes ambient occlusion at 24 CPU samples per texel. One atlas covers each landmark so neighboring assemblies cast occlusion on one another. A disposable joined mesh receives the bake, and the named source assemblies are exported. The grayscale result is stored in the red channel as glTF `occlusionTexture`, using `TEXCOORD_1` (`BakedOcclusion`). Blender's Smart UV Project packs that layer with resolution-scaled spacing and three texels of dilation.

The base-color and normal maps retain their original UV0 bindings and embedded bytes. The green channel of glTF `metallicRoughnessTexture` stores linear roughness on the same `Weathering` UV0. Stone, wood and fired clay derive it from the existing project weathering signal with material-specific contrast around the original nominal roughness. The original painted bridge deck gains a surface-local UV0 for roughness and keeps its vertex color. Paint-only props retain their constant roughness. The festival lantern also retains the original washi emission and material alpha settings.

The bake script adapts the project's earlier `release/lighting-proof/bake.py` experiment on the retaining wall. Source geometry and color or relief maps come from the checked-in Blender libraries and their procedural builders in this repository.

## Rebuild and verify

Run from the repository root. Standard Python checks geometry and texture structure without external packages.

```console
python art/verify_baked_landmarks.py
```

Use Blender 5.2.1 to rebuild the assets and decode the actual pixels. Pass asset names after `--` for a subset.

```powershell
$blender = 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe'
& $blender --background --factory-startup --python-exit-code 1 --python art/bake_landmark_materials.py
& $blender --background --factory-startup --python-exit-code 1 --python art/verify_baked_landmarks.py -- --pixels
```

The structural check compares each triangle's positions, normals, vertex paint and existing UV0, plus node names, transforms, alpha and emissive parameters, new UVs, PNG dimensions, chunk CRCs and original texture bytes. The Blender pixel check also measures decoded grayscale AO contrast and green-channel roughness variation.
