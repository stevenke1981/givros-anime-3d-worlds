"""Bake two far-forest silhouettes from the editable regional cedar's GLB export."""
from pathlib import Path
from math import radians

import bpy
from mathutils import Matrix, Vector

root = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root / "public/models/ridge-cedar-lod.glb"))
trees = list(bpy.context.selected_objects)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.use_denoising = False
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = 512, 256
scene.render.resolution_percentage = 100
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.world = bpy.data.worlds.new("Open sky")
scene.world.use_nodes = True
scene.world.node_tree.nodes.get("Background").inputs["Color"].default_value = (.70, .81, .89, 1)
scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .9

for obj in trees:
    if obj.type != "MESH":
        continue
    rotated = obj.copy()
    scene.collection.objects.link(rotated)
    rotated.matrix_world = (Matrix.Translation((4.8, 0, 0)) @
                            Matrix.Rotation(radians(88), 4, "Z") @ obj.matrix_world)
    obj.location.x -= 4.8

bpy.ops.object.light_add(type="SUN", location=(-8, -12, 16))
light = bpy.context.object
light.rotation_euler = Vector((.43, .64, -.63)).to_track_quat("-Z", "Y").to_euler()
light.data.energy = 1.9
light.data.angle = radians(8)
bpy.ops.object.camera_add(location=(0, -30, 4.56), rotation=(radians(90), 0, 0))
scene.camera = bpy.context.object
scene.camera.data.type = "ORTHO"
scene.camera.data.ortho_scale = 19.2
scene.render.filepath = str(root / "public/models/hillside-cedars.png")
bpy.ops.render.render(write_still=True)
