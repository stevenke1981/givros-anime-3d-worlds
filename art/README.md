# Sakura Mountain Village asset library

Open [sakura-library.blend](sakura-library.blend) in Blender 5.2.1 and choose an asset from the scene picker. Each scene contains one asset at real scale, organized into editable mesh assemblies. Use solid viewport shading with the **Vertex** color option or switch to **Material Preview**.

The runtime loads the matching file from [public/models](../public/models). Positions are in meters. Placement anchors are at the ground origin with **Y up in GLB** and **Z up in Blender**. Buildings and the torii face **+Z in GLB** and **−Y in Blender**. Vertex paint travels as COLOR_0. Selected materials multiply it by a seamless 128 × 128 weathering map and use a matching relief normal map. Maps are packed into the .blend and embedded in each applicable GLB. Thin blades, flowers and folded paper are double-sided.

| Asset | X × Y × Z (m) | Triangles | Placement |
| --- | ---: | ---: | --- |
| house.glb | 9.31 × 5.61 × 7.35 | 22,420 | Rural timber house with an 8 × 6 m foundation footprint. |
| bridge.glb | 14 × 2.91 × 3.60 | 12,352 | Cross along X from −7 to +7 m. Tread height follows 0.20 + 1.35 × (1 − (x / 7)²) and tread width is 3.22 m. |
| torii.glb | 4.84 × 4.44 × 0.70 | 2,324 | Pass along Z. Guaranteed center clearance spans X ±1.31 m through Y 2.88 m. |
| shrine.glb | 7.31 × 5.25 × 6.82 | 23,118 | Raised porch and filled transom under a closed plank soffit. |
| sakura.glb | 7.11 × 7.63 × 6.20 | 39,072 | Upright anchor at the trunk root. 1,536 cupped flowers on branching sprays. |
| cedar.glb | 4.66 × 9.10 × 4.46 | 14,622 | Upright anchor at the trunk root. Overlapping boughs and toothed needle sprays. |
| cedar-lod.glb | 4.66 × 9.10 × 4.44 | 2,314 | Distant cedar with a matching envelope and overlapping closed boughs. |
| stone-lantern.glb | 0.88 × 2.08 × 0.88 | 2,118 | Chipped plinth, contoured shaft and open firebox. |
| rock.glb | 2.50 × 1.14 × 1.64 | 238 | Bank boulder and companion stones on a shared ground anchor. |
| bamboo.glb | 2.92 × 6.72 × 2.85 | 5,544 | Seven culms with joint collars, lateral branches and bent leaves. |
| rice.glb | 0.65 × 0.62 × 0.64 | 280 | Place the root at the paddy soil level or slightly below water. |
| fence.glb | 2.40 × 1.04 × 0.20 | 176 | Split wood module extends along X. |
| stair-tread.glb, stair-tread-b.glb, stair-tread-c.glb | 3.00 × 0.32 × 0.38 | 436 each | Three blocks with staggered mortar joints. Walkable crown is Y = 0, base Y = −0.32, nosing +Z. |
| grass.glb | 0.24 × 0.24 × 0.27 | 90 | Fine splayed grass at a surface anchor. |
| river-sedge.glb | 0.52 × 0.56 × 0.56 | 146 | Streamside tussock with three tawny seed heads. |

The app supplies colliders. The files are static meshes.

The editable [valley-library.blend](valley-library.blend) adds three original assemblies for the creekside trail. `meadow-grass` has curved blades and separate oat-like seed heads, `wild-azalea` has forks, whorled leaves and five-petal blooms, and `valley-broadleaf` has flared roots, curved limbs and layered leaf sprays. The footprints use the same ground anchor and metric scale.

## Reusable components

- In [build_sakura.py](build_sakura.py), `roof_tile` lays tapered clay pans along the calculated roof pitch. `kawara` assembles the courses, eave bars, exposed rafters, closed sheathing and ridge caps. `building` shares that roof system between the shrine and timber houses.
- `chipped_ashlar` cuts irregular arrises around a prescribed stone profile. Steps use three blocks over recessed mortar. Lanterns use the component in plinths, trays and firebox posts.
- `cherry_blossom` folds five cleft petals around a central cup. The Sakura builder batches blooms, branchlets and young leaves into three editable assemblies. `cedar_bough` and `cedar_spray` compose three-dimensional hanging plumes and toothed tip foliage around staggered branch nodes.
- `detail_material` authors repeatable stone, wood and fired-clay weathering and relief. `Mesh.object` projects them onto the appropriate faces and aligns grain to the long axis of timber faces.

## Rebuild and check

From the repository root, use PowerShell and adjust the Blender path for your installation.

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/build_sakura.py
    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/build_valley.py
    python art/verify_sakura.py
    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/preview_sakura.py

The build rewrites the editable library and GLBs. For direct edits in Blender, export only the selected scene's mesh assemblies with **+Y Up** enabled. The verifier checks GLB paint, normals, triangulation, origins, packed maps, bridge profile, gate clearance and stair placement. The preview reimports the exported GLBs, tests 40 rays across the shrine transom and renders both images.

[GLB inspection contact sheet](sakura-assets.png) · [Textured shrine approach](sakura-shrine-detail.png)

## Provenance

All assets were authored for this project on 2026-11-18 using the Blender Python API in [build_sakura.py](build_sakura.py) and [build_valley.py](build_valley.py), with the [scene brief](../prompts/01_sakura_mountain_village.md) guiding shape, scale and palette. The source, GLBs and preview use original project geometry and vertex paint. No external asset, image, texture, font download or paid generation service was used. The preview labels use Blender’s built-in font. No third-party model license or attribution applies.
