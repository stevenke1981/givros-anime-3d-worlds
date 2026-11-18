# 春櫻山村｜Spring Sakura Mountain Village

> Standalone execution prompt. Paste the entire file into your agent with the reference image and invoke `$givros-environment-builder`.

# GIVROS ANIME WORLD BUILDER — SHARED MASTER DIRECTIVE (V2.0)

## MISSION
Invoke and follow `$givros-environment-builder` as the PRIMARY technical construction, asset-production, and world-building authority. Convert the attached visual reference (if supplied) and the selected SCENE BRIEF into a **complete, coherent, fully traversable, production-grade 3D environment** with the look and color design of a premium hand-painted Japanese 2D anime background — but with genuine geometry, parallax, collision, and free camera movement. This is an explorable world, NOT a static illustration, screenshot reconstruction, shallow facade, or single-shot diorama. Work toward actual saved artifacts, not an implementation plan alone.

## ACTIVATION / TRUTHFULNESS
1. Inspect the available `$givros-environment-builder` skill instructions and project/tool environment before building. Use its workflow, correct invocation, naming, scale, performance targets, asset pipeline, and world technical decisions. If the skill is not installed or cannot be accessed, say so explicitly in the delivery report; do not claim to have followed it or fabricated output files.
2. If `$blender-low-poly-character` is available and the brief includes characters, it owns the character asset workflow. Do not let this override environmental asset standards.
3. Input may include one or more reference images. If the main reference exists, repeatedly review it at layout, asset, color, and final-camera gates. If no reference was actually provided, design from the SCENE BRIEF and record that no reference comparison was possible; never imply pixel-exact replication.
4. Do not invent downloads, screenshots, paths, tool executions, benchmarks, asset licenses, or completion status. Record actual results and blockers.

## NON-OVERRIDABLE FINAL-ASSET RULE
**Never use Three.js-generated basic primitive objects as the final visible substitute for an identifiable environmental object.** This rule takes precedence over convenience and over conflicting skill shortcuts. Three.js is the runtime renderer/assembler, not a shortcut environment-modeling tool.

Forbidden visible final substitutes include: box houses; simple triangular-prism roofs; cylinder-and-sphere trees; green cylinders called bamboo; flat green rectangles called paddies; a red curved line or a few beams called a bridge; generic beam-only torii; planes standing in for windows, doors, stairs, bridges, crops, fencing, lanterns, rocks, or real-world props; unmodeled texture-only architecture; billboards that represent entire nearby trees; sphere rocks; block shrines; boxes with wheels called carts.

Every recognizable object must be represented by a **genuine authored/imported 3D asset**, assembled from believable parts with meaningful silhouette, depth, thickness, structure and silhouette detail. Use Blender, the skill's legitimate asset tools, or properly licensed external meshes. A wooden plank can be rectangular *within a fully designed, authored asset*; the ban is on crude proxy objects being passed off as completed recognizable assets, not on the mathematics of every mesh component. Import finalized GLB/glTF objects in Three.js.

Allowed Three.js procedural systems: render orchestration, camera, lighting, character control, animation, physics, collision proxies, terrain mesh generation with properly sculpted final appearance, water shaders, leaf/particle effects, instancing and placement of genuine asset variations, culling, streaming, LOD switching, debug objects excluded from shipping. Avoid simplistic procedural visible props. Distinctive **stylized geometry is allowed**; symbolic placeholder geometry is not. Close-up anime foliage must still read as a full tree with trunk, limbs and layered leaf masses; blade/leaf cards may form authored foliage on a proper tree but may never masquerade as the entire tree.

No distance loophole: identifiable distant houses, shrines, bridges, or trees still require legitimate lower-LOD *assets*, not symbolic shapes. Keep recognizable silhouettes and essential architecture in every LOD. Optimize through authored LODs, mesh compression, instancing, atlases, draw-call control, visibility/occlusion and chunk streaming, not by changing houses into boxes.

## VISUAL ART DIRECTION — JAPANESE ANIME ENVIRONMENT, NOT PHOTOREALISM
Target a 3D translation of a carefully art-directed, hand-painted anime film background: warm and readable silhouettes; refined Japanese rural architecture; illustrative grass and foliage; graphic yet believable light/shadow design; hand-painted color variation on physically modeled roofs, walls and stones; layered mountain shapes; atmospheric depth; restrained anime edge treatment. Maintain pleasing 2D-style compositions from important views while remaining correct from every direction.

- Use stylized PBR or anime NPR/toon materials with controlled, harmonized shadow ramps and restrained specular highlights. Support natural-looking water, wood, stone and ceramic. Avoid excessive cell-shading bands, thick comic outlines, flat-shaded low-poly faceting, plastic shine, voxels, chibi buildings, hyperreal textures, generic fantasy pagodas and random neon.
- Color hierarchy: attractive sky; rich but differentiated greens; warm timber and cream plaster; charcoal/slate/earth roof tones; natural stone; seasonal foliage where the scene specifies it; vermilion only at meaningful shrine/bridge accents. Color grading should preserve surface identity in sunlight AND shade.
- Anime foliage: species-driven authored asset variants, branching visible where needed, differentiated leaf masses and silhouettes, natural clustering by slope, water, soil and human use. Never distribute repeated tree models as a uniform grid.
- Geometry: intentional slight stylization of roof curves, eaves, lanterns, tree silhouettes and stone steps while preserving believable proportions, construction, clearance, gravity and human-scale access.
- Preserve reference identity where a reference exists: settlement/mountain proportions, vista, landmark positions, vegetation zones, surface palette and camera direction. The requested ANIME STYLE supersedes the source's *photoreal rendering style*, but not its spatial storytelling or distinctive shapes. If a scene brief intentionally requests a different setting or season from the image, keep shared composition motifs while applying the explicit new brief.
- NO day/night cycle and NO unrequested changing weather. Fix one carefully defined lighting setup for this scene; maintain stable sun direction, exposure, shadow softness, clouds, fog density and palette throughout the world and all gameplay viewpoints.

## COMPLETE WORLD, NOT A DIORAMA
- The reference is ONE viewpoint, not the map's boundary. Extend roads, water systems, fields, wooded margins, backyards and trails beyond all image edges. Complete backsides and interiors/exteriors only where meaningful; do not leave facades hanging in voids.
- Build a discoverable main walking loop with optional branches, scenic overlooks and a clear return route. Connect all walkable crossings, stairs, trails, courtyards and small bridges without gaps. Allow exploration on foot from entrance to main landmark and at least one additional destination beyond the original camera's sightline.
- Use natural spatial grammar: mountain or coastline governs drainage; river/stream follows slope; irrigation takes water from higher elevations and returns downslope; terraces follow contours; retaining walls support real grade changes; buildings sit on plausible foundations; roads track terrain; bridge abutments meet banks.
- Preserve negative space: fields, sky openings, river bends, quiet gardens, courtyards and visual corridors are deliberate. Do not fill everything with buildings and props. No generic large modern city, skyscrapers, modern roadworks, huge fantasy fortresses, incoherent mixed architectural eras, or random set dressing.
- Aim for distinct macro/mid/micro composition: recognizable big terrain silhouette, clear neighborhood zoning, detailed hero assets, contextual close-range storytelling. Walkability and sightlines must survive scenic density.

## BUILDING / PROP FIDELITY
- Fully construct major Japanese wooden buildings: foundations, timber frame, plaster or siding, articulated tiled/wooden/thatch roofs as appropriate to the scene, ridges, deep eaves, exposed rafters, gutters, shutters, doors, windows with recess/depth, thresholds, verandas, steps, drainage and meaningful rear facades. No generic cube houses with decorative texture.
- For torii, build correct upright columns, crosspieces, joinery, cap/lintel profile, material finish and foundations. For bridges, build load-bearing arches/frames, real deck boards or planks, supports, posts, railings, abutments and safe walking geometry. For stone lanterns, fully model base, shaft, firebox, roof/cap and opening. For stairs, model legible individual treads and supports, not a ramp disguised as stairs.
- Farms/paddies: sculpt real basins and embankments, retaining stones, muddy soil, shallow water, rice clump meshes (instanced and varied), irrigation inlets/outlets, traversable narrow berm paths; gardens need soil and actual produce/vegetation meshes.
- Mountain/forest: sculpt plausible geology; rocky faces need authored mesh complexity and proper material variation; trees/bamboo include articulated stems, branching and distinct leaf masses; rocks have irregular geometry; fences have actual rails/segments; props are contextually constructed and scale-accurate.
- Water: geometry integrated into riverbanks and channels, shader-based reflection/transparency/current, local foam or ripples around obstacles, shore transition, believable downstream direction. Do not paint a flat colored strip and call it a river.

## BLENDER → GLB / GLTF → THREE.JS PIPELINE
Use the skill's exact pipeline if it differs, provided that the non-symbolic final asset rule remains intact.
1. **World blockout (temporary only):** analyze references, create terrain drainage/walkability plan, draft object inventory and top-down spatial graph, choose key player-height and overview cameras. Blockout can use primitive placeholders but mark each as non-shippable.
2. **Asset plan and production:** assign hero/medium/background priorities; create or source appropriate proper assets; verify licensing and source provenance; make authored variations; set origin/pivot/scale/UV/materials/collision/LOD; export correctly to GLB/glTF. Never mislabel downloaded or AI-generated geometry as handmade.
3. **Integrated world:** import genuine assets; build realistic terrain, water and vegetation systems; lay out roads, irrigation, terracing, signage-free environment details and navigation; reserve open space.
4. **Presentation:** implement fixed anime lighting, stable shadows, sky/clouds and tone mapping; add subtle permitted animated world elements (wind, water, petals, leaves, birds, lamps) without weather/time cycling.
5. **Gameplay:** first-/third-person exploration controls, proper ground-following and steps, colliders and nav meshes, bridge traversal, camera clipping prevention, reset/spawn points, clear routes and no falling off incomplete map edges. Optional points of interest with discoverable sightlines.
6. **Final release gate:** the only phase for exhaustive audit/testing; during early authoring use fast visual spot checks, not continuous full test suites and logs. If an approach fails repeatedly, diagnose the root cause and choose a different route rather than endless retries.

## SUPPORTING REFERENCES / REFERENCE CONTROL
Where the original image cannot establish an important area, produce consistent supporting concept references *if the skill has an approved image pipeline*; otherwise create clear layout sketches/specification boards and explicitly note limitations. Useful views: overhead map, backside of buildings, main hero object close-ups, shrine approach, riverbank, rice terraces, alternate angle of mountain, forest path. All derived references must obey the original image's visual DNA and this scene's anime art bible. Inspect source and derivatives repeatedly, not once.

## PERFORMANCE WITHOUT VISUAL CHEATING
Let Givros choose actual project/world scale and hardware budgets. Target a smooth desktop preview using scene chunking and visible-set management, instanced real meshes, authored LOD variants, compressed texture/material sets, batching, sensible shadow distance, terrain tessellation by importance and water optimization. Never claim an FPS number without measuring; report device, resolution, camera path, render settings and measured results if a benchmark actually ran. Use the reference visual requirements to decide where quality may be focused, not crude final primitives.

## QUALITY GATES / NON-NEGOTIABLE ACCEPTANCE TESTS
A. **Spatial:** everything requested in the SCENE BRIEF is present; all important walkable destinations connect; there is coherent space beyond the input frame; mountain, river, coast and drainage make geographic sense.
B. **Reference:** at least one locked comparison camera matches the reference's landmark layout and silhouette when reference exists, with documented deliberate anime-style deviations; compare throughout work.
C. **Visual:** fixed lighting matches this scene's defined time of day; roofs, trees, water, crop fields and distinctive Japanese structures meet authored asset fidelity; no glaring repetition or compositional overcrowding.
D. **Runtime:** complete runnable Three.js scene with actual imported/produced models, camera/player movement, collision, walkable stairs/bridges, intact terrain and optimized rendering.
E. **Primitive audit:** scan project sources for `BoxGeometry`, `SphereGeometry`, `CylinderGeometry`, `ConeGeometry`, `PlaneGeometry`, simple `ExtrudeGeometry`, line primitives and primitive mesh factories. For each visible occurrence, classify its use as permitted terrain/water/particles or nonvisible collider/debug, versus forbidden proxy. Replace forbidden recognizable visible objects and remove blockout. This code search alone is NOT sufficient: inspect actual imports visually for proxy-quality meshes.
F. **Asset audit:** scene-object manifest connects every recognizable hero/near-field object to source Blender file, proper GLB/glTF file or licensed authored asset; file exists; scale/pivot/LOD/colliders are correct.
G. **Coverage:** inspect the scene at player eye height in entrance, village, hero bridge/gate, farmland, shrine, forest, stream/bank and the furthest walkable point (adapt positions to scene). No missing backsides, dead ends without design intent, invisible barriers masquerading as finished terrain or placeholder gaps.
H. **Honesty:** no check marked complete without inspectable evidence. Fail closed at final handoff: unfinished features are explicitly listed as unfinished, not silently simplified.

## DELIVERABLES — DO NOT STOP AT A DESCRIPTION
Return, as supported by tools and scope: (1) editable world source/project and Blender source files, (2) exported GLB/glTF environment asset library and manifests with provenance/license notes, (3) runnable Three.js explorer preview and concise launch instructions, (4) top-down map, player route and landmark list, (5) fixed lighting/art bible, (6) overview plus player-height screenshots and reference comparisons, (7) primitive/LOD/performance audit report, (8) list of what is truly finished, missing, or unverified. If running inside a prompt-only interface or lacking workspace tools, state plainly that these are *required future outputs*, not already-generated artifacts.

## FINAL PRIORITY & DECISION ORDER
1. **Absolute:** no Three.js primitive proxy is shipped as any recognizable final world object; complete real 3D traversability; honest verification.
2. **Primary:** Givros controls technical architecture, scale, Blender asset pipeline, terrain/nav/water/LOD/streaming and implementation decisions.
3. **Identity:** supplied reference governs composition/layout/mountain/landmarks; anime art direction governs the rendering reinterpretation. Explicit scene-brief seasonal/geographical changes take precedence over corresponding reference details.
4. **Quality:** important close assets over sheer quantity, coherent negative space over clutter, original characterful Japanese scene over generic fantasy.

Continue constructing until the requested scene is genuinely represented by inspectable assets. Never silently replace a requested finished asset with a placeholder to meet time pressure.


---

# SCENE BRIEF 01 — SPRING SAKURA MOUNTAIN VILLAGE

**Core identity:** The original concept reborn as premium Japanese anime background art in a complete playable 3D world. A small traditional rural village nestles beneath a dominating broad, rocky, forested mountain. A turquoise river curves through the lower settlement; a glossy vermilion arched bridge crosses it; a distinct torii opens a side route into bamboo and up to a raised shrine. Cherry blossom trees appear as carefully composed accents rather than carpeting every slope.

**Reference discipline:** If the provided image is the source village, protect the same mountain silhouette, bridge location, torii approach, distribution of roofs and rice paddies, river bend and viewing angle. Reinterpret textures into soft painterly anime materials without changing map logic. Create an exact/near reference camera as an anchor but allow 360-degree exploration.

**Landscape zones:** Foreground river stones, reeds and narrow floodplain; compact settlement of roughly 10–18 meaningful timber buildings with real charcoal tile roofs, rear yards, wells and vegetable gardens; irrigated rice paddies to the right; layered bamboo slopes to the left; shrine courtyard and individually modeled stone stairs above; cedar/pine/broadleaf forest transitioning to a broad gray-green mountain. Use terraces and retaining walls only where landform demands them.

**Hero objects:** Fully authored traditional arched lacquer-red bridge, vermilion torii, elevated small wooden shrine with roof/eave detail, stone lanterns, rice basins with instanced clumps emerging from water, one hero cherry beside the bridge, detailed riverbank boulders. All houses are full assets including backside and real eaves; all crops are meshes.

**Exploration loop:** Village entrance → torii lane → cluster of houses → river path → red bridge → rice footpaths → hillside stone steps → shrine courtyard → bamboo forest loop → upper mountain overlook → connected return path. Include an upper hamlet backyard, secondary irrigation inlet and forest clearing beyond the original camera frame.

**Fixed look:** Bright, clear spring daylight, blue sky with sculpted pale clouds, warm sun, crisp-but-soft blue-violet shadows, vivid green with restrained pink blossoms, turquoise water, charcoal roofs. No rain, night lighting cycle, magical glow, or heavy haze. Gentle petal drift and subtle ripples only.

**Scene-specific verification:** Bridge traversal; rice field berm connections; water flowing downhill and feeding paddies; meaningful mountain framing from entrance and shrine; no facade-only houses; no dummy bridge beams or simple geometry; unobstructed photo-matched source composition and complete unseen areas.

## EXECUTION COMMAND
Start with the available skill documentation and the provided reference image, then proceed from world layout to properly authored Blender/imported assets, a runnable playable Three.js map, and final asset/provenance/visual audit. Prioritize the scene-specific hero objects and playable route. Do not stop after planning or blockout. Report only verified outputs; identify any incomplete items explicitly.
