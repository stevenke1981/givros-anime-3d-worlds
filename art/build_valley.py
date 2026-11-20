"""Build the original meadow library and export its assemblies as individual GLBs."""

from math import cos, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sakura import LEAVES, Mesh, OUTPUT, RNG, ROOT, WOOD, blade, palette


def meadow_grass():
    green = palette("4e5d36 667843 819052 939f64 b4ae71")
    stalk = palette("7a744b a8965f bfb382 d2c697")
    leaves = Mesh("Curved meadow grass leaves", LEAVES)
    heads = Mesh("Fine stems and individual oat seeds", LEAVES)
    for i in range(18):
        angle = i * 2.39996 + RNG.uniform(-0.3, 0.3)
        dx, dy = cos(angle), sin(angle)
        base = (dx * RNG.uniform(0.018, 0.075), dy * RNG.uniform(0.02, 0.065), 0)
        tint = RNG.randrange(len(green) - 1)
        blade(leaves, base, (dx, dy), RNG.uniform(0.12, 0.38), RNG.uniform(0.06, 0.21),
              RNG.uniform(0.004, 0.010), green[tint:tint + 2])
    for i in range(4):
        angle = i * 2.39996
        top = Vector((cos(angle) * 0.11, sin(angle) * 0.11, RNG.uniform(0.32, 0.47)))
        heads.stem([(0, 0, 0), top * 0.64, top], [0.0032, 0.0024, 0.0011], stalk, sides=3)
        for seed in range(4):
            side = (-1) ** seed
            offset = Vector((sin(angle) * 0.009 * side, -cos(angle) * 0.009 * side, 0))
            center = top * (0.88 + seed * 0.04) + offset
            heads.volume(center, (0.005, 0.005, 0.013), stalk[seed], sides=4, strata=1)
    return [leaves, heads]


def leaf(mesh, root, forward, length, width, colors):
    tangent = Vector((forward.y, -forward.x, 0)).normalized()
    middle, tip = root + forward * length * 0.51, root + forward * length
    mesh.add([root, middle - tangent * width, middle + Vector((0, 0, width * 0.45)),
              middle + tangent * width, tip],
             [(0, 1, 2), (0, 2, 3), (1, 4, 2), (2, 4, 3)], [colors[0], colors[1]] * 2)


def wild_azalea():
    wood = Mesh("Azalea forks", smooth=True)
    greens = Mesh("Azalea whorled leaves", LEAVES)
    flowers = Mesh("Five-petal azalea flowers", LEAVES)
    leaf_colors = palette("405333 53693c 607749 78894b 939d65")
    petal_colors = palette("862842 b54262 cd627a e691a7 f5b7c2")
    centers = palette("dbb268 f3d3a2")
    for i in range(13):
        angle = i * 2.39996 + RNG.uniform(-0.22, 0.22)
        reach = RNG.uniform(0.19, 0.57)
        tip = Vector((cos(angle) * reach, sin(angle) * reach, RNG.uniform(0.25, 0.55)))
        wood.stem([(0, 0, 0), tip * 0.46, tip], [0.019, 0.010, 0.003], WOOD, sides=5)
        for j in range(12):
            a = angle + j * 2.39996
            tint = RNG.randrange(len(leaf_colors) - 1)
            leaf(greens, tip * (0.58 + j * 0.034), Vector((cos(a), sin(a), RNG.uniform(-0.5, 0.45))),
                 RNG.uniform(0.085, 0.14), RNG.uniform(0.021, 0.037), leaf_colors[tint:tint + 2])
        if i % 4 == 0:
            continue
        for j in range(2 + (i % 3)):
            a = angle + j * 2.39996
            center = tip + Vector((0.092 * cos(a), 0.092 * sin(a), RNG.uniform(0, 0.07)))
            size = RNG.uniform(0.031, 0.048)
            for petal in range(5):
                p = a + petal * 2 * pi / 5
                leaf(flowers, center, Vector((cos(p), sin(p), RNG.uniform(0.15, 0.6))),
                     size, size * 0.48, petal_colors[petal % 3:petal % 3 + 2])
            flowers.volume(center + Vector((0, 0, 0.009)), (0.006, 0.006, 0.009),
                           centers[i % 2], sides=4, strata=1)
    return [wood, greens, flowers]


def broadleaf(transfer_normals=False):
    wood = Mesh("Broadleaf flared roots and curved limbs", smooth=True)
    leaves = Mesh("Layered broadleaf foliage sprays", LEAVES, smooth=transfer_normals)
    if transfer_normals:
        leaves.name += " with canopy normals"
    bark = palette("443e32 555044 635d4e 736956 837862")
    green = palette("415534 52683f 64804b 7c9058 98a769")
    trunk = [Vector(p) for p in [(0, 0, 0), (0.04, 0.02, 0.31), (0.19, -0.04, 1.58),
                               (0.07, -0.17, 3.17), (-0.25, -0.29, 4.76)]]
    wood.stem(trunk, [0.34, 0.24, 0.18, 0.115, 0.025], bark, sides=11)
    for i in range(5):
        a = i * 2.39996
        wood.stem([trunk[1], (0.33 * cos(a), 0.33 * sin(a), 0.12),
                   (0.62 * cos(a), 0.62 * sin(a), 0.015)], [0.14, 0.09, 0.021], bark, sides=6)
    for i in range(15):
        a = i * 2.39996 + RNG.uniform(-0.27, 0.27)
        root = trunk[2].lerp(trunk[4], i / 19)
        reach = RNG.uniform(1.15, 2.16) * (1.08 - i * 0.030)
        extent = Vector((cos(a) * reach, sin(a) * reach, RNG.uniform(0.79, 1.7)))
        fork = root + extent * 0.52 + Vector((0, 0, -0.16))
        wood.stem([root, fork, root + extent], [0.088, 0.046, 0.009], bark, sides=6)
        for j in range(5):
            b = a + (j - 2) * 0.61
            bud = fork.lerp(root + extent, j / 5)
            tip = bud + Vector((cos(b) * RNG.uniform(0.36, 0.84), sin(b) * RNG.uniform(0.36, 0.84),
                                RNG.uniform(0.26, 0.69)))
            wood.stem([bud, bud.lerp(tip, 0.47), tip], [0.025, 0.014, 0.004], bark, sides=4)
            for k in range(19):
                azimuth = b + k * 2.39996
                spread = RNG.uniform(0.04, 0.43)
                center = bud.lerp(tip, RNG.uniform(0.43, 1.15)) + Vector(
                    (spread * cos(azimuth), spread * sin(azimuth), RNG.uniform(-0.24, 0.28)))
                tint = RNG.randrange(len(green) - 1)
                leaf(leaves, center, Vector((cos(azimuth), sin(azimuth), RNG.uniform(-0.53, 0.52))),
                     RNG.uniform(0.14, 0.36), RNG.uniform(0.037, 0.095), green[tint:tint + 2])
            if transfer_normals:
                leaves.transfer_canopy_normals(bud.lerp(tip, 0.85), (0.64, 0.64, 0.43))
    return [wood, leaves]


def build():
    initial = bpy.context.scene
    bpy.context.preferences.filepaths.save_version = 0
    scenes = []
    for index, (name, design) in enumerate([
        ("meadow-grass", meadow_grass), ("wild-azalea", wild_azalea), ("valley-broadleaf", broadleaf),
    ]):
        RNG.seed(64137 + index)
        scene = bpy.data.scenes.new(name)
        scene.unit_settings.system = "METRIC"
        scene.view_settings.view_transform = "AgX"
        scene["asset_id"] = name
        scene["source"] = "Original geometry and palette authored in art/build_valley.py"
        bpy.context.window.scene = scene
        for part in design():
            part.object(scene).select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                                  use_active_scene=True, use_selection=True, export_yup=True,
                                  export_cameras=False, export_lights=False)
        scenes.append(scene)
    bpy.context.window.scene = scenes[0]
    bpy.data.scenes.remove(initial)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "art" / "valley-library.blend"), compress=True)


if __name__ == "__main__":
    build()
