# Sakura Mountain Village asset library

Open [sakura-library.blend](sakura-library.blend) in Blender 5.2.1 and choose an asset from the scene picker. Each scene contains one asset at real scale, organized into editable mesh assemblies. Use solid viewport shading with the **Vertex** color option or switch to **Material Preview**.

The runtime loads the matching file from [public/models](../public/models). Positions are in meters. Placement anchors are at the ground origin with **Y up in GLB** and **Z up in Blender**. Buildings and the torii face **+Z in GLB** and **−Y in Blender**. The GLBs use triangles and COLOR_0 vertex paint. PBR materials supply lacquer, matte and masonry roughness. Thin blades and folded paper are double-sided.

| Asset | X × Y × Z (m) | Triangles | Placement |
| --- | ---: | ---: | --- |
| house.glb | 9.31 × 5.61 × 7.35 | 15,812 | Rural timber house with an 8 × 6 m foundation footprint. |
| bridge.glb | 14 × 2.91 × 3.60 | 12,352 | Cross along X from −7 to +7 m. Tread height follows 0.20 + 1.35 × (1 − (x / 7)²) and tread width is 3.22 m. |
| torii.glb | 4.84 × 4.44 × 0.70 | 2,324 | Pass along Z. Guaranteed center clearance spans X ±1.31 m through Y 2.88 m. |
| shrine.glb | 7.31 × 5.25 × 6.82 | 16,510 | Raised porch, steps and enclosed timber hall. |
| sakura.glb | 7.68 × 7.83 × 6.78 | 12,540 | Upright anchor at the trunk root. |
| cedar.glb | 4.35 × 9.10 × 4.48 | 6,768 | Upright anchor at the trunk root. |
| cedar-lod.glb | 4.36 × 9.10 × 4.57 | 1,988 | Distant cedar with the same height, anchor and branching profiles. |
| stone-lantern.glb | 0.88 × 2.08 × 0.88 | 408 | Grounded base with an open central chamber. |
| rock.glb | 2.40 × 1.14 × 1.85 | 110 | Bank boulder and companion stones on a shared ground anchor. |
| bamboo.glb | 2.92 × 6.72 × 2.85 | 5,544 | Seven culms with joint collars, lateral branches and bent leaves. |
| rice.glb | 0.65 × 0.62 × 0.64 | 280 | Place the root at the paddy soil level or slightly below water. |
| fence.glb | 2.40 × 1.04 × 0.20 | 176 | Split wood module extends along X. |
| stair-tread.glb | 3.00 × 0.32 × 0.38 | 84 | Walkable top is Y = 0. The underside reaches Y = −0.32. Step nosing faces +Z. |

The app supplies colliders. The files are static meshes.

## Rebuild and check

From the repository root, use PowerShell and adjust the Blender path for your installation.

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/build_sakura.py
    python art/verify_sakura.py
    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/preview_sakura.py

The build rewrites the editable library and GLBs. For direct edits in Blender, export only the selected scene's mesh assemblies with **+Y Up** enabled. The verifier reads the GLB buffers to check paint, normals, triangulation, origins, bridge profile, gate clearance and stair placement. The preview reimports the exported GLBs to render a contact sheet.

[GLB inspection contact sheet](sakura-assets.png)

## Provenance

All assets were authored for this project on 2026-11-18 using the Blender Python API in [build_sakura.py](build_sakura.py), with the [scene brief](../prompts/01_sakura_mountain_village.md) guiding shape, scale and palette. The source, GLBs and preview use original project geometry and vertex paint. No external asset, image, texture, font download or paid generation service was used. The preview labels use Blender’s built-in font. No third-party model license or attribution applies.
