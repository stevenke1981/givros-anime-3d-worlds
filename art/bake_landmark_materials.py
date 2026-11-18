"""Bake static landmark occlusion into a second UV set and export isolated GLBs."""

import argparse
from pathlib import Path
import sys

import bpy
import numpy as np


ART = Path(__file__).resolve().parent
sys.path.insert(0, str(ART))
from baked_landmark_catalog import LANDMARKS

OUTPUT = ART.parent / "public" / "models" / "baked"
OCCLUSION_UV = "BakedOcclusion"


def add_roughness(material, shader, weathered=None):
    source = weathered or material
    pattern = source.get("surface_pattern")
    if not pattern:
        return
    tree = material.node_tree
    weathering = next(node for node in source.node_tree.nodes if node.type == "TEX_IMAGE"
                      and "weathering" in node.image.name)
    width, height = weathering.image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    weathering.image.pixels.foreach_get(pixels)
    pixels = pixels.reshape(-1, 4)
    luminance = pixels[:, :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # Use the same underlying weathering signal as the color map. Darker grain and mineral
    # pits scatter more strongly than their smoother, lighter neighbors.
    contrast = {"wood": 1.75, "stone": 1.20, "tile": 1.80}[pattern]
    nominal = shader.inputs["Roughness"].default_value
    roughness = np.clip(nominal + contrast * (np.mean(luminance) - luminance), 0.48, 0.99)
    pixels[:, :3] = roughness[:, None]
    pixels[:, 3] = 1
    image = bpy.data.images.new(f"{material.name} | linear roughness", width, height, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    image.pixels.foreach_set(pixels.ravel())
    image.pack()
    texture = tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    tree.links.new(texture.outputs["Color"], shader.inputs["Roughness"])


def bake(name, output, samples):
    library, resolution = LANDMARKS[name]
    with bpy.data.libraries.load(str(ART / library)) as (source, destination):
        if name not in source.scenes:
            raise ValueError(f"{name} scene missing from {library}")
        destination.scenes = [name]
    scene, = destination.scenes
    bpy.context.window.scene = scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.world = bpy.data.worlds.new("Landmark occlusion bake")
    scene.world.light_settings.distance = 1.0

    objects = [obj for obj in scene.objects if obj.type == "MESH"]
    bridge_deck = None
    wood_template = None
    if name == "bridge":
        deck = next(obj for obj in objects if obj.name.startswith("Scored cedar deck"))
        bridge_deck = deck.active_material.copy()
        bridge_deck.name = "Bridge cedar deck | painted grain"
        deck.active_material = bridge_deck
        with bpy.data.libraries.load(str(ART / library)) as (_, material_data):
            material_data.materials = ["Cedar | split grain and rubbed fibers"]
        wood_template, = material_data.materials
        layer = deck.data.uv_layers.new(name="Weathering", do_init=False)
        for face in deck.data.polygons:
            axes = sorted(range(3), key=lambda axis: abs(face.normal[axis]))[:2]
            points = [deck.data.vertices[i].co for i in face.vertices]
            cross, grain = sorted(axes, key=lambda axis: max(p[axis] for p in points) - min(p[axis] for p in points))
            for loop, point in zip(face.loop_indices, points):
                layer.uv[loop].vector = point[cross] * 2.5, point[grain] * 0.79
    for obj in scene.objects:
        obj.select_set(obj.type == "MESH")
    bpy.context.view_layer.objects.active = objects[0]
    for obj in objects:
        uv = obj.data.uv_layers
        if not uv:
            uv.new(name="Weathering", do_init=False)
        uv.active = uv.new(name=OCCLUSION_UV, do_init=False)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15192, island_margin=4 / resolution, margin_method="FRACTION")
    bpy.ops.object.mode_set(mode="OBJECT")

    image = bpy.data.images.new(f"{name} | Cycles ambient occlusion", resolution, resolution, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    image.generated_color = (1, 1, 1, 1)
    image.file_format = "PNG"
    # A single bake target keeps all assemblies in the same Cycles ray scene and prevents
    # an object later in Blender's bake queue from replacing another object's atlas pixels.
    for obj in objects:
        proxy_part = obj.copy()
        proxy_part.data = obj.data.copy()
        scene.collection.objects.link(proxy_part)
        obj.select_set(False)
        obj.hide_render = True
        proxy_part.select_set(True)
    bpy.context.view_layer.objects.active = proxy_part
    if len(objects) > 1:
        bpy.ops.object.join()
    proxy_material = bpy.data.materials.new("Landmark bake target")
    proxy_part.data.materials.clear()
    proxy_part.data.materials.append(proxy_material)
    proxy_part.data.polygons.foreach_set("material_index", np.zeros(len(proxy_part.data.polygons), dtype=np.int32))
    nodes = proxy_material.node_tree.nodes
    bake_target = nodes.new("ShaderNodeTexImage")
    bake_target.image = image
    nodes.active = bake_target
    bpy.ops.object.bake(type="AO", uv_layer=OCCLUSION_UV, margin=3, margin_type="EXTEND", use_clear=False)
    bpy.data.objects.remove(proxy_part, do_unlink=True)

    group_tree = bpy.data.node_groups.get("glTF Material Output")
    if group_tree is None:
        group_tree = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        group_tree.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        group_tree.nodes.new("NodeGroupInput")
    materials = {material for obj in objects for material in obj.data.materials}
    for material in materials:
        tree = material.node_tree
        shader = next(node for node in tree.nodes if node.type == "BSDF_PRINCIPLED")
        add_roughness(material, shader, wood_template if material == bridge_deck else None)
        node = tree.nodes.new("ShaderNodeTexImage")
        node.image = image
        uv = tree.nodes.new("ShaderNodeUVMap")
        uv.uv_map = OCCLUSION_UV
        tree.links.new(uv.outputs["UV"], node.inputs["Vector"])
        group = tree.nodes.new("ShaderNodeGroup")
        group.node_tree = group_tree
        tree.links.new(node.outputs["Color"], group.inputs["Occlusion"])
        tree.nodes.active = node

    pixels = np.empty(resolution * resolution * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    red = pixels[::4]
    dark = np.count_nonzero(red < 0.90)
    assert np.nanmax(red) - np.nanmin(red) > 0.1 and dark > 100, (
        f"Insufficient Cycles AO in {name}: min={np.nanmin(red)}, max={np.nanmax(red)}, shaded={dark}"
    )
    image.pack()
    for obj in objects:
        obj.hide_render = False
        obj.select_set(True)
        obj.data.uv_layers.active_index = 0
        obj.data.uv_layers[0].active_render = True
    bpy.context.view_layer.objects.active = objects[0]
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(output / f"{name}.glb"), export_format="GLB", use_active_scene=True,
                              use_selection=True, export_yup=True, export_cameras=False, export_lights=False)
    print(f"{name}: {resolution}×{resolution} Cycles AO with {dark:,} shaded texels", flush=True)
    # Each scene owns its own materials. Purge temporary data so shared materials retain stable names.
    bpy.data.scenes.remove(scene)
    bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", nargs="*", metavar="ASSET")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--samples", type=int, default=24)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    for name in args.assets or LANDMARKS:
        bake(name, args.output, args.samples)
