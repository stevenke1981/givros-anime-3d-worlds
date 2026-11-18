"""Render a vertex-painted asset contact sheet from the actual shipped GLBs."""

from pathlib import Path

import bpy
from mathutils import Vector


ART = Path(__file__).resolve().parent
MODELS = ART.parent / "public" / "models"
ROWS = (
    ("house", "bridge", "torii", "shrine"),
    ("sakura", "cedar", "bamboo", "stone-lantern"),
    ("rock", "rice", "fence", "stair-tread"),
)


def preview():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("Asset sheet")
    camera = bpy.data.objects.new("Asset sheet", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    angle = Vector((8.5, -14.0, 8.2))
    rotation = (-angle).to_track_quat("-Z", "Y")
    camera.location = angle
    camera.rotation_euler = rotation.to_euler()
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 16

    for row, names in enumerate(ROWS):
        for col, name in enumerate(names):
            before = set(scene.objects)
            bpy.ops.import_scene.gltf(filepath=str(MODELS / f"{name}.glb"))
            objects = set(scene.objects) - before
            projected = [rotation.inverted() @ (obj.matrix_world @ Vector(corner))
                         for obj in objects for corner in obj.bound_box]
            lo = Vector(tuple(min(axis) for axis in zip(*projected)))
            hi = Vector(tuple(max(axis) for axis in zip(*projected)))
            size = hi - lo
            scale = min(3.55 / size.x, 2.90 / size.y)
            center = (hi + lo) / 2
            target = Vector(((col - 1.5) * 3.93, (1 - row) * 3.52 + 0.09, 0))
            for obj in objects:
                obj.scale *= scale
                obj.location = obj.location * scale + rotation @ (target - center * scale)
                obj.data.color_attributes.active_color = obj.data.color_attributes[0]

            label_data = bpy.data.curves.new(f"{name} name", "FONT")
            label_data.body = name.upper().replace("-", " ")
            label_data.size = 0.17
            label_data.align_x = "CENTER"
            label = bpy.data.objects.new(f"{name} name", label_data)
            scene.collection.objects.link(label)
            label.rotation_euler = camera.rotation_euler
            label.location = rotation @ Vector((target.x, target.y - 1.63, 0.18))

    scene.render.engine = "BLENDER_WORKBENCH"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.studiolight_rotate_z = 0.3
    shading.color_type = "VERTEX"
    shading.background_type = "WORLD"
    scene.world.color = (0.055, 0.071, 0.087)
    shading.show_shadows = False
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    shading.curvature_ridge_factor = 0.62
    shading.curvature_valley_factor = 0.34
    shading.cavity_ridge_factor = 0.26
    shading.cavity_valley_factor = 0.40
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1100
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(ART / "sakura-assets.png")
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    preview()
