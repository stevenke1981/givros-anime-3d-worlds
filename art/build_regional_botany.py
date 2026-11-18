"""Author original regional plants and export Y-up, ground-anchored GLBs."""

from math import cos, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sakura import LEAVES, OUTPUT, ROOT, RNG, Mesh, blade, cedar_spray, detail_material, palette
from build_valley import leaf


def fern():
    stalks = Mesh("Fern rachises")
    leaves = Mesh("Fern Leaf pinnate fronds", LEAVES)
    stem = palette("56623d 788052")
    green = palette("506934 66823e 789647 8daa53 a3b763")
    up = Vector((0, 0, 1))
    for i in range(7):
        angle = i * 2.39996 + RNG.uniform(-0.18, 0.18)
        length = RNG.uniform(0.33, 0.51)
        height = RNG.uniform(0.37, 0.55)
        radial = Vector((cos(angle), sin(angle), 0))
        lateral = up.cross(radial)
        nodes = [radial * (length * t ** 1.26) + up * (height * sin(t * 2.30))
                 for t in (0, 0.16, 0.27, 0.38, 0.49, 0.60, 0.71, 0.82, 0.91, 1)]
        stalks.stem(nodes, [0.0048 - 0.0042 * j / 9 for j in range(10)], stem, sides=3)
        for j in range(2, 9):
            sweep = 0.30 + j * 0.064
            span = (0.110 - (j - 3) ** 2 * 0.0036) * RNG.uniform(0.86, 1.08)
            shade = min(j // 2 - 1, 3)
            for side in (-1, 1):
                leaf(leaves, nodes[j], (radial * sweep + lateral * side + up * 0.19).normalized(),
                     span, span * 0.24, green[shade:shade + 2])
        leaf(leaves, nodes[-2], (nodes[-1] - nodes[-2]).normalized(),
             (nodes[-1] - nodes[-2]).length * 1.23, 0.009, green[3:])
    return stalks, leaves


def forbs():
    stalks = Mesh("Forb stems")
    leaves = Mesh("Forb Leaf blades", LEAVES)
    flowers = Mesh("Forb Flower petals", LEAVES)
    disks = Mesh("Forb golden seed disks")
    greens = palette("526849 667955 82945c 96a975")
    cream = palette("ded9cf f8f5ec fefdf9")
    gold = palette("b79545 d5b953 e6cd71")
    up = Vector((0, 0, 1))
    for i in range(6):
        angle = i * 2.39996
        radius = RNG.uniform(0.13, 0.23)
        height = RNG.uniform(0.36, 0.59)
        base = Vector((cos(angle) * 0.018, sin(angle) * 0.018, 0))
        tip = Vector((cos(angle) * radius, sin(angle) * radius, height))
        elbow = base.lerp(tip, 0.51) - Vector((cos(angle) * 0.025, sin(angle) * 0.025, 0))
        stalks.stem([base, elbow, tip], [0.0051, 0.0036, 0.0021], greens[:-1], sides=4)
        for j in range(4):
            bearing = angle + j * 2.39996
            start = base.lerp(elbow, 0.49 + 0.25 * j) if j < 2 else elbow.lerp(tip, 0.18 + 0.19 * (j - 2))
            direction = Vector((cos(bearing), sin(bearing), RNG.uniform(0.23, 0.52))).normalized()
            leaf(leaves, start, direction, 0.115 - j * 0.018, 0.022 - j * 0.003, greens[j % 3:j % 3 + 2])
        # Tilt the flowers toward the light, leaving the golden disk independently tintable.
        normal = Vector((cos(angle) * 0.42, sin(angle) * 0.42, 1)).normalized()
        axis = normal.cross(up).normalized()
        cross = normal.cross(axis)
        radius = RNG.uniform(0.042, 0.060)
        for j in range(6):
            a = j * pi / 3 + angle
            along = cos(a) * axis + sin(a) * cross
            side = normal.cross(along) * (radius * 0.26)
            center = tip + along * (radius * 0.68)
            ridge = normal * (radius * 0.075)
            end = tip + along * radius + normal * (radius * 0.14)
            flowers.add([tip, center - side, center + ridge, center + side, end],
                        [(0, 1, 2), (0, 2, 3), (1, 4, 2), (2, 4, 3)], [cream[0], cream[1], cream[1], cream[2]])
        disks.volume(tip + normal * 0.004, (radius * 0.22, radius * 0.22, 0.008), gold, sides=7, strata=1)
    return stalks, leaves, flowers, disks


def reeds():
    leaves = Mesh("Reed Leaf folded straps", LEAVES)
    culms = Mesh("Reed culms")
    seeds = Mesh("Reed seed heads", smooth=True)
    greens = palette("596645 69794b 7e8e57 93a16b a4aa73")
    straws = palette("79714d 918758 a89c65")
    browns = palette("534134 695243 816649 9a7956")
    for i in range(5):
        angle = i * 2.39996
        radial = Vector((cos(angle), sin(angle), 0))
        height = RNG.uniform(0.78, 1.14)
        base = radial * RNG.uniform(0.034, 0.083)
        tip = base + radial * RNG.uniform(0.055, 0.15) + Vector((0, 0, height))
        culms.stem([base, base.lerp(tip, 0.53), tip], [0.0066, 0.0045, 0.0030], straws, sides=5)
        if i != 4:
            seeds.volume(tip, (0.018, 0.018, RNG.uniform(0.068, 0.103)), browns, sides=7, strata=3, wobble=0.05)
        for j in range(3):
            a = angle + 0.58 * (-1) ** j
            start = base.lerp(tip, 0.10 + 0.13 * j)
            shade = (i + j) % 4
            blade(leaves, start, (cos(a), sin(a)), RNG.uniform(0.32, 0.49), RNG.uniform(0.15, 0.26),
                  RNG.uniform(0.012, 0.021), greens[shade:shade + 2])
    return culms, leaves, seeds


def coastal_pine(distant=False):
    trunk = Mesh("Pine Trunk and exposed roots", smooth=True)
    branches = Mesh("Pine scaffold Branches", smooth=True)
    leaves = Mesh("Pine Leaf needle sprays", LEAVES)
    bark = palette("514538 625140 74624e 83715c 908068")
    green = palette("334936 435944 52684d 637c54 79905f 8e9e6c")
    up = Vector((0, 0, 1))
    # The trunk and wind-swept scaffold are shared at both distances.
    spine = [Vector(p) for p in [(0, 0, 0), (0.06, 0.01, 0.28), (0.36, -0.11, 1.34),
                                 (0.80, -0.16, 2.32), (1.28, -0.04, 3.28), (1.43, 0.24, 4.19)]]
    trunk.stem(spine, [0.28, 0.215, 0.165, 0.113, 0.068, 0.011], bark, sides=9)
    for i in range(5):
        a = i * 2.39996
        direction = Vector((cos(a), sin(a), 0))
        trunk.stem([spine[1] - up * 0.07, direction * 0.34 + up * 0.15,
                    direction * 0.55 + up * 0.036], [0.115, 0.085, 0.020], bark, sides=5)
    pads = []
    for i, (level, angle, reach, lift) in enumerate([
        (1.60, 2.83, 1.75, 0.48), (1.94, -0.68, 1.44, 0.51), (2.27, 1.25, 1.44, 0.42),
        (2.58, -1.35, 1.62, 0.42), (2.83, 3.58, 1.42, 0.47), (3.17, 0.49, 1.37, 0.32),
        (3.50, 2.18, 1.00, 0.32), (3.84, -0.25, 0.74, 0.31), (4.11, 0.82, 0.43, 0.18),
    ]):
        lower, upper = next((a, b) for a, b in zip(spine, spine[1:]) if a.z <= level <= b.z)
        start = lower.lerp(upper, (level - lower.z) / (upper.z - lower.z))
        reach_vector = Vector((cos(angle) * reach + 0.32, sin(angle) * reach, lift))
        joint = start + reach_vector * 0.55 - up * 0.12
        tip = start + reach_vector
        caliper = 0.080 - i * 0.006
        branches.stem([start, joint, tip], [caliper, caliper * 0.62, 0.009], bark, sides=5)
        for j in (-1, 0, 1):
            a = angle + j * 0.94
            fork = joint.lerp(tip, 0.28 if j else 0.72)
            forward = Vector((cos(a), sin(a), 0))
            outer = fork + forward * (0.39 if i < 7 else 0.26) + up * (0.17 + 0.05 * j)
            branches.stem([fork, outer], [caliper * 0.31, 0.004], bark, sides=4)
            pads.append((outer, forward, 0.39 if i < 7 else 0.27))
    for center, forward, radius in pads:
        lateral = up.cross(forward)
        for j in range(9):
            a = j * 2.39996
            spread = (j / 8) ** 0.5 * radius
            bud = (center + forward * (spread * cos(a)) + lateral * (spread * sin(a) * 0.84)
                   + up * (0.095 * cos(a / 2) + RNG.uniform(-0.045, 0.115)))
            size = radius * RNG.uniform(0.71, 0.99)
            shade = min(j // 3 + int(bud.z > 3.2), 4)
            if distant:
                for k in range(3):
                    bearing = a + k * 2 * pi / 3
                    travel = Vector((cos(bearing), sin(bearing), 0.26 + 0.13 * k)).normalized()
                    leaf(leaves, bud, travel, size * 0.93, size * 0.19, green[shade:shade + 2])
            else:
                for k in range(8):
                    bearing = a + k * 2.39996
                    travel = Vector((cos(bearing), sin(bearing), -0.27 + 0.092 * k)).normalized()
                    leaf(leaves, bud + travel * (size * 0.13), travel, size * (0.61 + 0.043 * k),
                         size * (0.088 + 0.009 * (k % 3)), green[shade:shade + 2])
    return trunk, branches, leaves


def ridge_cedar(distant=False):
    trunk = Mesh("Ridge Cedar Trunk and buttresses", detail_material("Ridge cedar furrowed bark", 0.96, "wood"),
                 smooth=True)
    branches = Mesh("Ridge Cedar Branch scaffolds", smooth=True)
    needles = Mesh("Ridge Cedar Leaf pendant sprays", LEAVES)
    bark = palette("524032 604b3c 6d5746 816958 907760")
    green = palette("3d5142 4e6550 5b7356 6a825d 7c9369 8d9f71")
    up = Vector((0, 0, 1))
    spine = [Vector(p) for p in [(0, 0, 0), (0.035, 0.03, 0.42), (0.08, -0.05, 1.81),
                                 (0.12, 0.02, 3.75), (0.22, 0.04, 5.76), (0.13, 0.13, 7.38),
                                 (0.32, 0.23, 8.79)]]
    radii = (0.36, 0.27, 0.20, 0.144, 0.084, 0.045, 0.006)
    # A continuous set of irregular bark ridges also shapes the cross-section of the root flare.
    rings = []
    for j, (center, radius) in enumerate(zip(spine, radii)):
        ring = []
        for k in range(18):
            angle = k * pi / 9 + 0.041 * j
            rib = (1.12 if k % 2 else 0.87) + 0.09 * sin(k * 2.39 + j * 0.48)
            ring.append(center + Vector((cos(angle), sin(angle), 0)) * radius * rib)
        rings.append(ring)
    trunk.rings(rings, bark)
    for i in range(5):
        angle = 2.39996 * i
        radial = Vector((cos(angle), sin(angle), 0))
        trunk.stem([spine[1], radial * 0.40 + up * 0.15, radial * 0.65 + up * 0.036],
                   [0.13, 0.10, 0.030], bark, sides=5)
    fans = []
    for i in range(26):
        level = 2.00 + i * 0.252 + RNG.uniform(-0.16, 0.17)
        angle = i * 2.39996 + RNG.uniform(-0.24, 0.29)
        radial = Vector((cos(angle), sin(angle), 0))
        lateral = up.cross(radial)
        t = (level - 1.85) / 6.77
        span = (2.48 * (1 - t) ** 0.90 + 0.045) * (0.88 + 0.11 * cos(angle - 0.8) + RNG.uniform(-0.075, 0.075))
        lower, upper = next((a, b) for a, b in zip(spine, spine[1:]) if a.z <= level <= b.z)
        base = lower.lerp(upper, (level - lower.z) / (upper.z - lower.z))
        elbow = base + radial * span * 0.50 + up * (0.13 - 0.23 * span)
        bend = base + radial * span * 0.78 - up * (0.21 + 0.15 * span)
        end = base + radial * span + lateral * RNG.uniform(-0.13, 0.15) + up * (0.19 - 0.11 * span)
        radius = 0.057 * (1 - 0.74 * t)
        branches.stem([base, elbow, bend, end], [radius, radius * 0.65, radius * 0.30, 0.0025], bark, sides=4)
        shade = 1 + (angle % (2 * pi) < pi)
        for sign in (-1, 1):
            inner = base.lerp(elbow, 0.28 + sign * 0.13)
            outward = elbow.lerp(bend, 0.32 + sign * 0.20) + lateral * (sign * (0.20 + 0.23 * span))
            outward -= up * (0.25 + 0.17 * span)
            cedar_spray(needles, inner, outward, 0.107 + span * 0.108,
                        green[shade:shade + 2], 2 if distant else 5)
        for j, sign in enumerate((-1, 1, 0)):
            fork = elbow.lerp(bend, 0.32 + j * 0.24)
            reach = end + lateral * (sign * (0.17 + 0.28 * span)) - radial * (0.08 + 0.09 * span) * abs(sign)
            reach -= up * (0.19 + 0.15 * span) * abs(sign)
            fans.append((fork, reach, radial, lateral, span, shade, j))
    for i in range(7):
        angle = i * 2.39996
        radial = Vector((cos(angle), sin(angle), 0))
        base = spine[-2].lerp(spine[-1], 0.65 + i * 0.045)
        fans.append((base, base + radial * (0.33 - i * 0.021) + up * 0.24, radial, up.cross(radial), 0.52, 3, i))
    for base, tip, radial, lateral, span, shade, index in fans:
        paint = green[shade - 1:shade + 1]
        lit = green[shade:shade + 2]
        width = 0.09 + span * 0.088
        cedar_spray(needles, base, tip, width, paint, 3 if distant else 6)
        for j, t in enumerate((0.30, 0.61) if distant else (0.19, 0.37, 0.54, 0.68, 0.81)):
            fork = base.lerp(tip, t)
            reach = (0.23 + span * 0.265) * (1 - t * 0.60)
            for sign in (-1, 1):
                flex = reach * (0.77 + 0.22 * cos(j * 2.31 + index + sign))
                end = fork + radial * (reach * 0.43) + lateral * (flex * sign) - up * (reach * (0.72 + 0.30 * sign))
                breadth = flex * (0.55 if distant else 0.36)
                cedar_spray(needles, fork, end, breadth, lit if sign > 0 else paint, 1 if distant else 3)
    return trunk, branches, needles


def build():
    initial = bpy.context.scene
    bpy.context.preferences.filepaths.save_version = 0
    scenes = []
    for name, design, args, seed in (
        ("woodland-fern", fern, (), 91234), ("seasonal-forbs", forbs, (), 91235), ("shore-reeds", reeds, (), 91236),
        ("coastal-pine", coastal_pine, (False,), 91237), ("coastal-pine-lod", coastal_pine, (True,), 91237),
        ("ridge-cedar", ridge_cedar, (False,), 91238), ("ridge-cedar-lod", ridge_cedar, (True,), 91238),
    ):
        RNG.seed(seed)
        scene = bpy.data.scenes.new(name)
        scene.unit_settings.system = "METRIC"
        scene.view_settings.view_transform = "AgX"
        scene["asset_id"] = name
        scene["source"] = "Original geometry and paint authored in art/build_regional_botany.py"
        bpy.context.window.scene = scene
        for part in design(*args):
            part.object(scene).select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                                  use_active_scene=True, use_selection=True, export_yup=True,
                                  export_cameras=False, export_lights=False)
        scenes.append(scene)
    bpy.context.window.scene = scenes[0]
    bpy.data.scenes.remove(initial)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "art" / "regional-botany.blend"), compress=True)


if __name__ == "__main__":
    build()
