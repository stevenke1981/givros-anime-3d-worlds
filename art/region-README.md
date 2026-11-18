# Regional village asset library

Open [region-library.blend](region-library.blend) in Blender 5.2.1 and select a named scene from the scene picker. The geometry is separated into editable construction assemblies. Use Material Preview to see the embedded weathering maps and relief. The [contact sheet](region-assets.png) shows all thirteen shipped GLBs reimported into Blender.

The models use meters and exporter Y up. GLB fronts face +Z, corresponding to −Y in the Blender source. All anchors are (0, 0, 0). For the dock and fishing boat, the zero elevation represents the deck and waterline respectively.

| File in public/models | X × Y × Z span (m) | Triangles | Placement and construction |
| --- | --- | ---: | --- |
| dock.glb | 2.90 × 3.90 × 9.00 | 3,928 | Long axis Z. Enter from −Z. Cleated plank deck Y=0, with substructure to Y≈−2.91, rails, shore access and ladder at +Z. |
| plank-bridge.glb | 5.99 × 0.95 × 1.60 | 1,888 | Cross along X. Deck Y=0.18. Dressed granite seats touch Y=0. |
| fishing-boat.glb | 1.96 × 1.01 × 5.20 | 2,782 | Bow +Z, waterline Y=0, hull reaches Y=−0.29. Each boat contains a lapped shell, inner skin, thwarts, oar and mooring coil. |
| fishing-rack.glb | 2.18 × 1.63 × 0.49 | 2,312 | Shoreline net rack. Rope grid and tied floats face +Z. |
| retaining-wall.glb | 2.49 × 1.00 × 0.55 | 1,620 | Repeat horizontally along X. Weathered ashlar face +Z. |
| onsen-pool.glb | 5.37 × 0.43 × 5.30 | 2,308 | Outer radius about 2.70 m. Floor Y=0, beveled capstones around Y=0.42. Opening faces +Z. Clear inner radius is about 2.05 m. Place the runtime water surface at Y≈0.18. |
| snow-inn.glb | 9.31 × 5.71 × 7.44 | 23,852 | 8 × 6 m body. Thick continuous snow drapes over the clay roof profile, with broken icicles under the eaves. |
| temple.glb | 9.65 × 7.26 × 8.05 | 38,646 | 8 × 6 m body with raised porch and a second tiled roof over a bracketed lantern. |
| sluice.glb | 3.84 × 3.03 × 1.36 | 1,304 | Channel flows along Z. Clear aperture centered on X=0, extends at least X±0.82 and up to Y=1.48. |
| festival-stall.glb | 3.00 × 2.62 × 2.10 | 3,354 | Selling counter +Z. Timber base, folded two-tone canopy, hanging cloth panels, plates and skewer wares. |
| festival-lantern.glb | 0.56 × 0.90 × 0.56 | 2,278 | Anchor at the tassel base. Hanging loop near Y=0.90. Ribbed washi includes gentle emissive material. |
| maple.glb | 6.63 × 7.43 × 6.28 | 21,200 | Anchor at trunk root. Seeded branching and folded maple leaves over irregular underside sprays. |
| shrub.glb | 1.98 × 0.95 × 1.96 | 2,398 | Anchor at ground. Basal forks carry varied folded broadleaf sprays. |

The game supplies colliders and water. The model files contain no animation. Weathering maps are embedded and have no external image dependencies.

## Authoring and checks

Use Blender 5.2.1. From the repository root in PowerShell, substitute your Blender path if it differs.

    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/region_build.py
    python art/verify_regions.py
    & 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python art/region_preview.py

[region_build.py](region_build.py) uses separate construction functions per asset. Planks, peg rails and chipped ashlar are reused across waterfront and terrace assets. The winter inn reuses the proven house assembly and spans a modeled snow sheet along the common curved eave. The temple adds a second, compact kawara assembly above the shared hall frame. The vegetation builders place repeated leaf and branch forms through a deterministic seed.

The verifier reads the produced GLBs. It tests root transforms, bounds, triangle indices, vertex paint and normalized normals. It also checks dock and bridge deck elevations, pool and sluice opening clearances, lantern emission and the absence of external image references. The contact sheet renders the exported geometry and vertex paint through Workbench.

## Provenance

The original regional geometry and paint were authored for this project on 2026-11-18. The Blender authoring uses the existing project mesh helpers and embedded procedural room-scale weathering from [build_sakura.py](build_sakura.py). The individual [world briefs](../prompts/) guide layout intent and regional landmarks. No third-party model, downloaded map, font or paid asset service is included.
