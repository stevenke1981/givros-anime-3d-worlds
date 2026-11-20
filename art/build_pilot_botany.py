"""Build the editable plant variants used by the creek and terrace pilots."""

import sys
from math import cos, pi, sin
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sakura import LEAVES, OUTPUT, RNG, ROOT, Mesh, palette, sakura
from build_valley import broadleaf


def rice():
    leaves = Mesh("Arching rice seedlings with folded leaf blades", LEAVES, smooth=True)
    greens = palette("54783e 698d48 7a9c49 86a653 91ad58 9eb65f")
    for tiller in range(7):
        phase = tiller * 2.39996
        root = Vector((cos(phase), sin(phase), 0)) * RNG.uniform(0.019, 0.064)
        for blade in range(3):
            angle = phase + (blade - 1) * 1.16 + RNG.uniform(-0.27, 0.27)
            peak = RNG.uniform(0.52, 0.71) - 0.062 * blade
            reach = RNG.uniform(0.21, 0.37) + 0.02 * blade
            droop = RNG.uniform(0.14, 0.24)
            width = RNG.uniform(0.010, 0.015)
            points = []
            for t in (0, 0.23, 0.49, 0.72, 0.87, 1):
                sweep = angle + 0.21 * sin(pi * t)
                radial = Vector((cos(sweep), sin(sweep), 0))
                across = Vector((-sin(sweep), cos(sweep), 0.26 * sin(3.2 * t + phase)))
                outward = reach * t ** 1.85
                height = peak * sin(t / 0.70 * pi / 2) - droop * max(0, (t - 0.72) / 0.28) ** 1.42
                middle = root + radial * outward + Vector((0, 0, height))
                if t == 1:
                    points.append(middle)
                    continue
                spread = width * (0.4 + 0.6 * sin(pi * t)) * (1 - 0.60 * t ** 2)
                points.extend((middle - across * spread, middle + radial * spread * 0.43,
                               middle + across * spread))
            faces = [(i + j, i + j + 3, i + j + 4, i + j + 1)
                     for i in range(0, 12, 3) for j in range(2)]
            faces += [(12, 15, 13), (13, 15, 14)]
            base = (tiller + blade) % 3
            paint = [greens[base + segment // 2 + side] for segment in range(5) for side in range(2)]
            leaves.add(points, faces, paint)
    return [leaves]


def duckweed():
    leaves = Mesh("Floating duckweed fronds with cupped margins", LEAVES, smooth=True)
    greens = palette("5f783f 718742 81984b 899b50 9fa456")
    for i in range(17):
        angle = i * 2.39996
        distance = 0.013 + 0.014 * i ** 0.75
        center = Vector((cos(angle) * distance, sin(angle) * distance, 0.004 + 0.001 * (i % 3)))
        length, width = RNG.uniform(0.012, 0.025), RNG.uniform(0.009, 0.016)
        vertices = [center]
        for j in range(8):
            a = 2 * pi * j / 8
            notch = 0.72 if j == 0 else 1
            u, v = length * cos(a) * notch, width * sin(a)
            vertices.append(center + Vector((u * cos(angle) - v * sin(angle),
                                             u * sin(angle) + v * cos(angle), -0.0015)))
        leaves.add(vertices, [(0, j + 1, (j + 1) % 8 + 1) for j in range(8)],
                   greens[i % len(greens)])
    return [leaves]


def build():
    initial = bpy.context.scene
    bpy.context.preferences.filepaths.save_version = 0
    for name, design, seed in (
        ("rice-arching", rice, 78146),
        ("duckweed", duckweed, 78147),
        ("sakura-canopy", lambda: sakura(transfer_normals=True), 170118),
        ("valley-broadleaf-canopy", lambda: broadleaf(transfer_normals=True), 64139),
    ):
        RNG.seed(seed)
        scene = bpy.data.scenes.new(name)
        scene.unit_settings.system = "METRIC"
        scene.view_settings.view_transform = "AgX"
        scene["asset_id"] = name
        scene["source"] = "art/build_pilot_botany.py"
        bpy.context.window.scene = scene
        for assembly in design():
            assembly.object(scene).select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                                  use_active_scene=True, use_selection=True, export_yup=True,
                                  export_cameras=False, export_lights=False)
    bpy.context.window.scene = bpy.data.scenes["rice-arching"]
    bpy.data.scenes.remove(initial)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "art" / "pilot-botany.blend"), compress=True)


if __name__ == "__main__":
    build()
