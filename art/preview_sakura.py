"""Render the complete GLB library and a textured shrine approach inspection frame."""

from pathlib import Path

import bpy
from mathutils import Vector


ART = Path(__file__).resolve().parent
MODELS = ART.parent / "public" / "models"
ROWS = (
    ("house", "bridge", "torii", "shrine"),
    ("sakura", "cedar", "cedar-lod", "bamboo"),
    ("stone-lantern", "rock", "rice", "fence", "grass"),
    ("river-sedge", "stair-tread", "stair-tread-b", "stair-tread-c"),
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
            stride = 15.72 / len(names)
            scale *= min(1, stride / 3.93)
            target = Vector(((col - (len(names) - 1) / 2) * stride, (1.5 - row) * 3.44 + 0.09, 0))
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
    scene.render.resolution_y = 1410
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(ART / "sakura-assets.png")
    bpy.ops.render.render(write_still=True)


def shrine_approach():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=str(MODELS / "shrine.glb"))
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    heights = (3.33, 3.47, 3.61, 3.74)
    for x in (-2.67, -2.15, -1.47, -0.86, -0.43, 0.15, 0.68, 1.21, 1.94, 2.62):
        for height in heights:
            hit, _, _, _, _, _ = scene.ray_cast(depsgraph, (x, -2.43, height), (0, 1, 0), distance=0.96)
            assert hit, f"Open shrine transom at {x:.2f}, {height:.2f}"
    print("PASS: 40 sampled lines of sight blocked across the shrine transom")

    landmark_set = [("stone-lantern", (-1.98, -4.09, 0.21)),
                    ("stone-lantern", (1.98, -4.09, 0.21)),
                    ("sakura", (-4.81, -0.42, 0.02)),
                    ("sakura", (5.26, 1.40, 0.02)),
                    ("cedar", (-5.23, 2.94, 0.01)),
                    ("cedar", (4.36, 2.97, 0.01))]
    stairs = ("stair-tread", "stair-tread-b", "stair-tread-c")
    for i in range(11):
        landmark_set.append((stairs[i % 3], (0, -3.64 - i * 0.346, 0.15 - i * 0.17)))
    for asset, position in landmark_set:
        bpy.ops.import_scene.gltf(filepath=str(MODELS / f"{asset}.glb"))
        for obj in bpy.context.selected_objects:
            obj.location += Vector(position)

    base = bpy.data.meshes.new("Inspection-stage ground and two lantern pads")
    vertices = [(-9, -9, -1.89), (9, -9, -1.89), (9, -3.0, -0.02),
                (-9, -3.0, -0.02), (9, 7, -0.02), (-9, 7, -0.02)]
    faces = [(0, 1, 2, 3), (3, 2, 4, 5)]
    for x in (-1.98, 1.98):
        count = len(vertices)
        corners = ((x - 0.47, -4.55), (x + 0.47, -4.55), (x + 0.47, -3.63), (x - 0.47, -3.63))
        vertices.extend((u, v, z) for z in (-0.65, 0.21) for u, v in corners)
        faces.append(tuple(count + j for j in (4, 5, 6, 7)))
        for j in range(4):
            k = (j + 1) % 4
            faces.append((count + j, count + k, count + k + 4, count + j + 4))
    base.from_pydata(vertices, [], faces)
    ground = bpy.data.objects.new(base.name, base)
    scene.collection.objects.link(ground)
    ground_material = bpy.data.materials.new("Inspection-stage putty")
    ground_material.use_nodes = True
    ground_shader = ground_material.node_tree.nodes.get("Principled BSDF")
    ground_shader.inputs["Base Color"].default_value = (0.145, 0.181, 0.132, 1)
    ground_shader.inputs["Roughness"].default_value = 0.96
    base.materials.append(ground_material)

    camera_data = bpy.data.cameras.new("Shrine approach at eye height")
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0.38, -9.65, 0.50)
    camera.rotation_euler = (Vector((-0.08, -1.77, 1.75)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 29
    scene.camera = camera

    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.43, 0.65, 0.84, 1)
    background.inputs["Strength"].default_value = 0.42
    sunlight = bpy.data.lights.new("Warm spring sun", "SUN")
    sun = bpy.data.objects.new(sunlight.name, sunlight)
    sunlight.energy = 2.8
    sunlight.angle = 0.062
    sunlight.color = (1, 0.89, 0.74)
    sun.rotation_euler = Vector((0.38, 0.46, -0.75)).to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(sun)

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 20
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 940
    scene.render.filepath = str(ART / "sakura-shrine-detail.png")
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    preview()
    shrine_approach()
