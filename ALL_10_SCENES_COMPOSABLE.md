# GIVROS ANIME ENVIRONMENT PROMPTS — 10 SCENES / COMPOSABLE VERSION

Use the shared master below plus ONE scene brief. Standalone complete files are in `prompts/`.

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


# SCENE BRIEF 01 — SPRING SAKURA MOUNTAIN VILLAGE

**Core identity:** The original concept reborn as premium Japanese anime background art in a complete playable 3D world. A small traditional rural village nestles beneath a dominating broad, rocky, forested mountain. A turquoise river curves through the lower settlement; a glossy vermilion arched bridge crosses it; a distinct torii opens a side route into bamboo and up to a raised shrine. Cherry blossom trees appear as carefully composed accents rather than carpeting every slope.

**Reference discipline:** If the provided image is the source village, protect the same mountain silhouette, bridge location, torii approach, distribution of roofs and rice paddies, river bend and viewing angle. Reinterpret textures into soft painterly anime materials without changing map logic. Create an exact/near reference camera as an anchor but allow 360-degree exploration.

**Landscape zones:** Foreground river stones, reeds and narrow floodplain; compact settlement of roughly 10–18 meaningful timber buildings with real charcoal tile roofs, rear yards, wells and vegetable gardens; irrigated rice paddies to the right; layered bamboo slopes to the left; shrine courtyard and individually modeled stone stairs above; cedar/pine/broadleaf forest transitioning to a broad gray-green mountain. Use terraces and retaining walls only where landform demands them.

**Hero objects:** Fully authored traditional arched lacquer-red bridge, vermilion torii, elevated small wooden shrine with roof/eave detail, stone lanterns, rice basins with instanced clumps emerging from water, one hero cherry beside the bridge, detailed riverbank boulders. All houses are full assets including backside and real eaves; all crops are meshes.

**Exploration loop:** Village entrance → torii lane → cluster of houses → river path → red bridge → rice footpaths → hillside stone steps → shrine courtyard → bamboo forest loop → upper mountain overlook → connected return path. Include an upper hamlet backyard, secondary irrigation inlet and forest clearing beyond the original camera frame.

**Fixed look:** Bright, clear spring daylight, blue sky with sculpted pale clouds, warm sun, crisp-but-soft blue-violet shadows, vivid green with restrained pink blossoms, turquoise water, charcoal roofs. No rain, night lighting cycle, magical glow, or heavy haze. Gentle petal drift and subtle ripples only.

**Scene-specific verification:** Bridge traversal; rice field berm connections; water flowing downhill and feeding paddies; meaningful mountain framing from entrance and shrine; no facade-only houses; no dummy bridge beams or simple geometry; unobstructed photo-matched source composition and complete unseen areas.

---

# SCENE BRIEF 02 — SUMMER RIVERSIDE VALLEY

**Core identity:** A lively yet peaceful Japanese countryside hamlet in a narrow midsummer mountain valley. A large S-curved freshwater river is the principal geographical organizer. A red timber footbridge marks the village heart; a pale gravel ford and a smaller secondary bridge link footpaths. Dark wooden farmhouses and pitched charcoal roofs follow river terraces under enormous verdant mountains.

**Visual composition:** Anime-background painterliness with bright emerald slopes, deep forest greens, blue-green water and sunlit ocher dirt. The dramatic mountain ridge remains visible in the axial valley view; ordinary scale, no oversized castles. Limit cherry blossoms; use summer flowering shrubs and grasses instead.

**Physical world zones:** Lower riverside approach and pools, compact 10–15-building village, red bridge market-side landing with only a few rural shopfronts, riverside vegetable gardens, downstream reeds and sandbar, forest-side narrow road, uphill small shrine with torii, irrigation channels and a tiny rice-field cluster across the water. Populate upstream and downstream beyond both ends of the reference frame.

**Hero assets:** Physically constructed red bridge, 2–3 carefully differentiated farmhouse types with deep eaves and exposed rafters, handmade wooden riverside dock/landing, modelled water-worn boulders, carved stone drainage culverts, modest torii and lanterns, separate bridge/field retaining modules. Make riverbank geometry, steps and path-to-deck transitions traversable.

**Playable route:** Entrance by the downstream road → riverside lane → bridge → farmhouse yard → rice/vegetable embankments → shaded upstream trail → small hill shrine → lookout over river S-curve → opposite-bank woodland → return. Add discoverable out-of-frame upstream stream junction and a forest clearing with a bench.

**Fixed light:** Single bright summer afternoon; white cumulus clouds; bright warm upper surfaces with cool leafy shade. Anime water reflections, dynamic current around real rocks, reeds and shallow ripple zones. No seasonal swap or time-of-day transition.

**Proof targets:** Water direction and drainage, both riverbanks completed, no floating farm plots, actual bridge construction and railings, distant village continuity, species-appropriate trees, readable main navigation even under dense greenery.

---

# SCENE BRIEF 03 — BAMBOO FOREST SHRINE PATH

**Core identity:** A hidden, quiet Japanese mountain sanctuary approached through a deep bamboo grove. This is an intimate explorable woodland map, not an empty tunnel decorated with cylinders. A vermilion torii introduces a sequence of natural stone paths, mossy retaining walls, flowing water channels, detailed stone lanterns and a small elegant shrine on an elevated ledge. The mountain rises behind a transition to cedar forest.

**Zone plan:** Small rural trailhead with 4–7 authentic service buildings and houses; low-density bamboo at the outer edge; dense varied segmented bamboo deeper in, branching canopy and authentic leafy silhouettes; a winding approach that opens to miniature clearings; stepped ascent with stone rail edges; modest shrine courtyard and a lateral escape trail; forest stream and simple real footbridge. The bamboo canopy must not become a repeating wall and must permit upward views and directional cues.

**Hero assets:** Distinct proper torii, two traditional lantern families, complete compact shrine with detailed roof/ridge/door joinery, stone steps with individual irregular treads, carved trough/basin, water channel, mossy fieldstone walls, authentic bamboo with visible nodes/branches/leaves and multiple age/diameter variants. A few small maples provide color contrast.

**Depth beyond main shot:** Model rear shrine walls, caretaker utility shed, backside path to a cedar clearing, upper rock viewpoint, downstream connection to the rural hamlet and a small alternate looping descent. Preserve complete walkable paths without hidden drops.

**Navigation:** Rural entrance → first torii → lightly wooded approach → lantern bend → narrow stream crossing → shrine stairs → courtyard → upper cedar overlook → secondary bamboo loop → village entrance. Navigation may feel contemplative but never maze-like.

**Fixed light:** Clear late-morning sunlight piercing bamboo foliage as carefully placed graphic shafts, warm golden patches, cool turquoise-green shade, mild localized mist on far ridges only. No dense white fog, horror styling, magic runes or fantasy mega-temple.

**Verify:** Each bamboo remains an authored mesh (no green cylinders); stems and leaf branches legible at player height; lantern apertures and treads real geometry; sightline rhythm alternates enclosed and open; shrine seen correctly front, side and rear; mountain visible at viewpoint.

---

# SCENE BRIEF 04 — RICE TERRACE FARMING HAMLET

**Core identity:** An anime-style Japanese mountain farming hamlet whose living landscape is a cascading network of irrigated rice terraces. A sloping green valley is shaped by carefully constructed earthen embankments, real stone retaining walls, connecting narrow farm footpaths and precise gravity-fed channels. The terraces are the protagonist — not just green rectangles seen from above.

**Composition and land use:** A few well-spaced farmhouses (roughly 7–12 fully modelled buildings) occupy the stable hillside, with small vegetable gardens and drying racks close to homes. Several distinct paddy levels descend toward a small rocky stream. A vermilion pedestrian bridge crosses the water near the lower entrance; a small torii marks a quiet upper forest-edge shrine. Maintain a dramatic distant green mountain behind the terraced valley. Use orchards, bamboo stands and mixed cedar woods sparingly to frame the fields.

**Hero assets:** Sculpted multi-level paddy beds with shallow reflective water, muddy planting floors, irregular yet engineered retaining walls and risers, real 3D rice clump variants with small wind movement and instanced rows, tiny controllable irrigation gates, covered water intake, real culverts, farmhouse deep eaves and tiled ridges, handmade timber farming tools and carts. Berms have physical width sufficient for walking.

**Water logic:** Identify stream upstream elevation, source intake, primary lateral ditch, secondary distribution channels, sluices, individual field inlets, spillways and downslope return drainage. No visually disconnected water lines and no water that runs uphill. Avoid simultaneous flooding of all dry vegetable plots.

**Exploration route:** Lower bridge → working farmhouse courtyard → narrow terrace berm → water-gate junction → sequential upper paddies → hillside vegetable patch → modest shrine → ridgeline overlook → forest trail returning to entrance. Include rear barns, tool shed and an unseen upper irrigation reservoir/feeder channel beyond any given reference image.

**Fixed look:** High clear late-spring / early-summer midday daylight; lush lime-to-deep-green crops, luminous sky blue, white cloud shadows, warm earth, gently reflective water, cream-plaster timber farmhouses. Use pink blossoms very sparingly or not at all.

**Verify:** Inspect terraces side-on and at player height, not only from overhead; real water depth and soil interface; each rice plant is mesh-based; truly traversable field edges; no farm machinery or large modern greenhouse; finite believable settlement and working drainage network.

---

# SCENE BRIEF 05 — AUTUMN MAPLE MOUNTAIN POST VILLAGE

**Core identity:** A tiny old Japanese mountain-road settlement in late autumn, connected by a meandering foot-and-pack route through scarlet maple and golden ginkgo woodland. A rugged gray mountain towers behind the forest. Historic low wooden inns, farmhouses, a small teahouse and storehouse follow a natural slope; not a crowded Edo metropolis.

**Landscape topology:** A winding stone-and-dirt main lane with 10–16 detailed traditional buildings; drainage gutters and weathered stone foundations; a narrow stream and fully built small red arched bridge near the lower entrance; torii and a modest hill shrine above the upper houses; short switchback mountain trail; terraced vegetable plots now mostly harvested; a deeper mixed cedar/maple forest beyond the vista. Forest density falls toward the town core.

**Hero assets:** Fine timber facade and deep-eave roof variations, irregular stone stair segments, vermilion bridge with visible underside/supports, autumn maples modelled with full trunk/branch/crown geometry, stone walls with individual protruding rocks, shop shutters, aged wood handrails, clay pots and carried baskets. Villager props should imply daily life without crowding.

**Visual style:** Hand-painted anime backgrounds with saturated but disciplined crimson/orange/gold leaf hierarchy, charcoal roofs and warm brown wood as stabilizers, cyan-gray mountain rock, clear pale blue autumn sky. Scatter a few grounded fallen leaves along paths; never fill all branches with identical flat disks. Atmospheric depth emphasizes distant mountain ridges, not smoke or heavy fog.

**Walkthrough:** Lower trailhead → bridge and stream → curved main lane → teahouse nook → rear garden alley → torii path → hillside shrine → forest overlook → mountain switchback and separate downhill return trail. Extend behind buildings to woodshed and watercourse, complete both ends of the old road, and show plausible continuation beyond camera edges.

**Fixed light:** Clear afternoon autumn sunshine, longer but stable shadows and warmer highlights; NO sunset, time cycle, rain or spooky glow.

**Checks:** Buildings follow gradient and human-scale road width; traversable steps and bridge; tree silhouette variations, no tree cylinders/cones; complete unseen rears of inns; calm negative space and no large urban infrastructure.

---

# SCENE BRIEF 06 — CEDAR MOUNTAIN TEMPLE TRAIL

**Core identity:** A tranquil, small Japanese mountain temple/shrine approach carved into a cedar-clad granite valley. Focus on spiritual architecture at a modest human scale, rugged but traversable terrain, graceful Japanese forest composition and the sensation of climbing above an isolated cluster of mountain dwellings.

**Space hierarchy:** At the lower trailhead are 4–8 compact wooden homes and one visitors' rest shelter, crossed by a natural stream and carefully built short bridge. Mid-slope stone stairways, winding packed-earth paths, moss-covered boulders and real retaining walls connect several landings with lanterns. High on a safe ledge stands one moderately sized timber temple or shrine complex — a main hall, a little side shelter and courtyard, not a huge golden palace. Above it the mountain rock face rises, with visible upper scenic trail and controlled boundaries.

**Hero assets:** Intricate timber hall with bracket/eave structure, carved but believable decorative ridge elements, paper-panel doors modeled with thickness/recess, railings and raised deck; torii at the lower branch where appropriate; actual stone lanterns; cedar tree variants with strong tiered branch silhouette; layered rock buttresses and safety drainage; a realistic constructed water basin.

**Visual continuity:** Traditional anime-film matte-painting color language — layered blue-green cedar masses, deep soft shadows, warm pale-stone steps, desaturated rock and a mountain summit catching sunshine. Limited deciduous accent trees. Light mist only in *distant* ravines, not obscuring walkable steps.

**Path graph:** Village trailhead → stream bridge → torii or approach gate → cedar path → stone staircase → landing with basin → temple courtyard → rear grove → mountain overlook → side descent through boulder garden → reconnect below. Finish the mountain-facing back walls and service path of all built assets.

**Fixed light:** Quiet bright morning with sun positioned high enough for clear gameplay visibility, stable shadows, subtle directional sun rays through canopy. No night cycle and no magical atmospheric effects.

**Checks:** Individual stair treads and handrails are real, no dangerous impassable paths on the critical route, no copied billboard cedars, temple is genuinely modeled in 360 degrees, the major mountain landmark remains readable from both low and high vantage points.

---

# SCENE BRIEF 07 — WINTER SNOW ONSEN HAMLET

**Core identity:** A compact traditional Japanese hot-spring mountain hamlet in clear winter daylight, in the foothills beneath a dramatic forested-and-snow-dusted mountain. The scene is stylized high-end anime, peaceful and lived-in rather than an oversized fantasy spa resort.

**Spatial composition:** 8–14 intimate timber inns, homes and one public bath building along a terraced winter lane; snow on modelled tile and wood roofs, eaves, rocks and dormant shrubs; a narrow unfrozen river fed by mountain springwater; a robust vermilion bridge crossing it; a small shrine with torii up a snow-cleared stone path; sparse bamboo in protected low areas and conifers on the slopes. Select one or two outdoor geothermal pools behind privacy screens, constructed with real stone boundaries and safe walkway surfaces.

**Hero geometry:** Heavy snowcaps conform to authored rooftops and railings, not white flat planes; roofs retain visible eave/ridge design; red bridge fully modeled with load-bearing structure; proper hot-spring stone pools and water drainage; timber inn exterior galleries, shoji-style openings with physical thickness, wooden fences, lanterns and modest steam chimneys. Water has consistent temperature cues without unrealistic boiling river everywhere.

**Environment behavior:** Gentle drifting thermal steam in defined hot-water areas, very subtle winter wind in branches, slow water flow; no blizzard. Footpaths are visibly kept clear, with footbridges and stairs safe to traverse. Snow texture doesn't hide structural silhouettes.

**Navigation loop:** Lower snowy trail → red river bridge → inn lane → courtyard and bath exterior → torii → small shrine → conifer forest overlook → stream-side return path. Complete rear lanes, supply route, lower field in winter dormancy and hot spring source area beyond the original frame.

**Fixed art direction:** Single crisp late-winter midday; icy sky blue, bright white snow, cool cerulean shade, amber-warm wooden interiors visible through windows, careful vermilion accents, mountain haze only in distance. NO sunset/night transition, magical snow glow or modern city decor.

**Acceptance:** Walkable snow-cleared paths, believable bath and source geography, all structures genuine assets, no invisible white-box substitutes, water does not freeze where geothermal heat is shown, no disjointed steam generators, minimal NPC population and culturally respectful architecture.

---

# SCENE BRIEF 08 — SEASIDE JAPANESE FISHING HAMLET

**Core identity:** A small sunlit rural Japanese fishing settlement squeezed between a calm blue bay and a steep forested coastal mountain. Build an explorable 3D village with the warmth of a polished anime coastal background: salt-worn timber, traditional tiled roofs, narrow alleys, real fishing docks and stepped stone lanes. It must be distinct from a modern port city.

**Map zones:** Rock-lined beach and irregular shoreline; 10–17 wooden dwellings and modest fish sheds on safe terraces; 1–2 proper timber wharves with supports, ladders, ropes and planks; small beach boats modelled with hull/keel/seat detail; nets, drying racks and crates as actual props; a small hillside shrine with torii overlooking the bay; a stream descending from the back mountain to the ocean; tiny terraced vegetable plots, coastal pines and bamboo pockets inland. Build the route around the back of the hill for unseen area exploration.

**Hero assets:** Fully constructed fishing houses with eaves and seaworn siding, weathered dock geometry with safe walkable decking, moored boats as complete meshes (no box hulls), rope and fish traps with real 3D shape, shoreline rocks that break waves, a small vermilion footbridge over stream mouth, modelled shrine stairs, detailed retaining walls supporting the upper houses. Use materials with gentle hand-painted color variation and salt exposure.

**Water system:** Bay water with authored shore transitions and restrained foam against real rocks; stream visually flows downhill into the bay. Gentle animated surface and moored-boat movement are acceptable. No giant simulated ocean storm, no flat azure plane with abrupt coastline.

**Playable path:** Coastal footpath entrance → fish-drying court → dock → stepped back alley → hillside vegetable patch → torii → ocean overlook shrine → coastal pine trail → narrow stream bridge → beach return. Fully build the landward backs of houses and the upstream wooded gorge beyond the main coast viewpoint.

**Fixed lighting:** Bright clear summer coastal late morning, turquoise ocean, cobalt sky, white clouds, sandy/gray rocks, soft warm highlights and shaded dark timber. No day/night cycle, no tropical palm resort, no skyscraper harbor, no generic Chinese palace roofs.

**Verify:** Complete dock supports and boat hulls, player cannot walk off unresolved edges unintentionally, all fishing props genuine modeled assets, safe route between terraces, mountain remains the orienting landform, water/stream connection is continuous.

---

# SCENE BRIEF 09 — MOUNTAIN LAKE VILLAGE

**Core identity:** A serene rural Japanese village surrounding one end of a clear mountain lake with a broad green-gray peak behind it. The environment evokes a hand-painted anime lake panorama transformed into a fully volumetric playable place. The mountain reflection is a supporting visual motif; the buildings, docks, waterline and path network are physically coherent, not a single-shot canvas.

**Layout:** 8–14 traditional lake-edge cottages, a small waterside storehouse and farmhouse group; a real timber boardwalk or small pier and a narrow red footbridge crossing a *stream outlet* (not a nonsensical huge arch across the entire lake); a torii at a dry lakeshore shrine approach, above normal water level; terraced vegetable patch, small rice area by the stream inlet if irrigation permits, reed beds, full tree assets including pine/maple/cedar and sparse hero cherry accents. Above are a looping hillside path, forest shelter and mountain-facing overlook.

**Hero assets:** Distinct lake cottages with fully modeled roof tiles and wrap-around/veranda components; timber dock/handrails/piles; red footbridge with real supports over outflow; lakeside stone lanterns, discreet torii, little shrine, built steps, retaining stone edges, natural pebble shore, wooden canoe as a finished mesh only if included. All waterside geometry respects plausible fluctuating waterline.

**Environment:** Still-water shader with ripples, physically plausible reflection of mountain and sky, shallower transparent edges with lakebed stones and aquatic reeds; narrow inlet/outlet channels flow consistently. Keep water stable enough for mirror composition but not completely frozen. No floating houses or fake waterline texture strips.

**Main exploration:** Arrival from wooded trail → traditional lane → dock → lakeshore path → stream footbridge → rice/vegetable area → torii → small hillside shrine → upper mountain lake viewpoint → forest return trail; model unseen cove, rear house gardens and stream inlet outside the hero vista.

**Fixed light:** A single clear warm late-afternoon daylight setup, gently golden but NOT sunset. Clear clouded pale-blue sky, turquoise/deep-blue lake, lush greens, warm wood, charcoal roofs; soft static shadow direction. No lighting cycle or dreamlike magical lake effects.

**Checks:** Traversable lake edge, complete lake margins, fully formed dock and bridge assets, clear mountain/lake visual alignment from arrival and overlook, no simple primitives as houses or boats, meaningful water depth transition and ecological shoreline variety.

---

# SCENE BRIEF 10 — SUMMER FESTIVAL MOUNTAIN VILLAGE

**Core identity:** A small Japanese countryside village preparing for a summer matsuri, reimagined as an anime-environment game level. The festival adds signs of life to an already complete and coherent rural mountain settlement: proper timber houses, stone lanes, bridge, shrine approach, river, distant peak, garden spaces and quiet side paths. Festival stalls and lanterns are deliberately few and genuinely constructed, not rectangles draped in emissive textures.

**Map structure:** 10–16 rural buildings distributed around one modest open courtyard; stone path from entrance; natural river with one fully modeled vermilion arched pedestrian bridge; torii leading to a small elevated shrine and festival gathering area; bamboo cluster, cedar/maple forest, garden allotments, a few terraced rice fields at the outskirts and a steep mountain backdrop. Avoid huge city crowds and grand temple precincts. Preserve negative space and a quiet outer hiking loop beyond the festival.

**Hero assets:** Complete bridge railings and deck, quality torii, full shrine roof/eaves, beautifully built timber festival stalls with separate wooden frames, cloth awnings (fabric geometry/materials with depth), shelves, ceramic utensils and cooking implements as actual meshes; traditional cylindrical and rectangular paper lanterns with modeled frame/ribs and ties; real ropes/stands that carry decorations, no glowing floating sprites used as substitutes.

**Gameplay:** Village road → lantern-lined bend → small stall court → red bridge → riverside calm area → narrow rice path → torii → shrine courtyard → bamboo hillside trail → high mountain observation point → return through unlit-but-visible farm lane. Fill backside alleys, storage sheds, upper trail and garden behind houses as explorable, finished spaces.

**Fixed lighting:** ONE controlled blue-hour summer twilight scene with cobalt sky, a small remaining warm horizon, stable soft cool ambient light and modest warm lantern pools. This deliberately changes the daytime reference's *lighting scenario*, while preserving village geography if a reference image is supplied. No animated time transition, no growing darkness. Keep readability and terrain collision visible outside the lantern court.

**Ambient life:** Subtle cloth sway, low paper lantern motion, water sounds/flow, limited distant NPCs if the dedicated character skill and source assets exist. No flashing neon, fireworks spectacle, crowd spam or confusing night maze.

**Checks:** All lanterns are proper modeled assets, authored stalls are not boxes, all village houses have rear architecture, fixed twilight is consistent across every viewpoint, bridges and paths are walkable, outside festival there is a coherent working village rather than a stage set.