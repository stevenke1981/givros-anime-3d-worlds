"""Build an inspection sheet from the final regional GLBs in Blender."""

from pathlib import Path

import bpy
from mathutils import Vector


ART = Path(__file__).resolve().parent
MODELS = ART.parent / "public" / "models"
ROWS = (
    ("snow-inn", "temple", "festival-stall", "teahouse"),
    ("dock", "plank-bridge", "fishing-boat", "fishing-rack"),
    ("onsen-pool", "sluice", "retaining-wall", "festival-lantern"),
    ("maple", "maple-lod", "shrub", "water-basin"),
)


def preview():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    camera_data = bpy.data.cameras.new("Regional asset sheet")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 16
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    scene.collection.objects.link(camera)
    angle = Vector((10, -16, 9.3))
    rotation = (-angle).to_track_quat("-Z", "Y")
    camera.location = angle
    camera.rotation_euler = rotation.to_euler()
    scene.camera = camera
    inverse = rotation.inverted()
    for row, names in enumerate(ROWS):
        for col, name in enumerate(names):
            bpy.ops.import_scene.gltf(filepath=str(MODELS / f"{name}.glb"))
            objects = tuple(bpy.context.selected_objects)
            coords = [inverse @ (obj.matrix_world @ Vector(corner)) for obj in objects
                      for corner in obj.bound_box]
            low = Vector(tuple(min(axis) for axis in zip(*coords)))
            high = Vector(tuple(max(axis) for axis in zip(*coords)))
            center = (high + low) / 2
            span = high - low
            stride = 15.50 / len(names)
            scale = min((stride - 0.39) / span.x, 3.01 / span.y)
            target = Vector(((col - (len(names) - 1) / 2) * stride, (1.5 - row) * 3.72 + 0.06, 0.0))
            for obj in objects:
                obj.scale *= scale
                obj.location = obj.location * scale + rotation @ (target - center * scale)
                obj.data.color_attributes.active_color = obj.data.color_attributes[0]
            label_data = bpy.data.curves.new(f"{name} label", "FONT")
            label_data.body = name.upper().replace("-", " ")
            label_data.size = 0.19
            label_data.align_x = "CENTER"
            label = bpy.data.objects.new(label_data.name, label_data)
            scene.collection.objects.link(label)
            label.rotation_euler = camera.rotation_euler
            label.location = rotation @ Vector((target.x, target.y - 1.65, 0.3))
    scene.render.engine = "BLENDER_WORKBENCH"
    shading = scene.display.shading
    shading.light = "STUDIO"
    shading.color_type = "VERTEX"
    shading.background_type = "WORLD"
    shading.show_shadows = False
    shading.show_cavity = True
    shading.cavity_type = "BOTH"
    shading.curvature_ridge_factor = 0.56
    shading.curvature_valley_factor = 0.33
    shading.cavity_ridge_factor = 0.23
    shading.cavity_valley_factor = 0.39
    scene.world.color = (0.052, 0.066, 0.080)
    scene.view_settings.view_transform = "Standard"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 1530
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(ART / "region-assets.png")
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    preview()
