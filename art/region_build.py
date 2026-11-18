"""Author the regional village kits with Blender 5.2.1.

Source geometry uses metres, Z up and -Y forward. Runtime exports use Y up and +Z forward.
"""

from math import cos, pi, sin
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_sakura import (
    CEDAR_WOOD, FIRED_TILE, GOLD, IRON, LACQUER, LEAVES, MASONRY, MATTE, OUTPUT,
    RNG, SATIN, TIMBER, WOOD, Mesh, building, cedar_bough,
    chipped_ashlar, color, kawara, material, palette, roof_height,
)


SALT_TIMBER = palette("746557 827262 948274 9d8873 b29a7d 655445")
RUSTIC = palette("51443b 655448 7f6951 917659")
SNOW = palette("bccdd4 d9e4e7 eff3f3 d8e4ea e8eef1")
STONE_MOSS = palette("6a7567 838779 a2a092 6e797e 8d9181")
FESTIVAL = palette("a5443b b34c40 db6051 f0dcb1 f4e6c8 486575")
MAPLE = palette("843e32 9e4837 b65c41 bf7448 cd774e d89556 dfaa67")
SHRUB = palette("465238 5d6e46 71804c 84935a 929c62")
BOAT = palette("475963 335260 57727b c0b6a0 dbccb0 746555")


def plank(mesh, a, b, z, width, thickness, paint):
    x0, y0 = a
    x1, y1 = b
    mesh.beam((x0, y0, z - thickness / 2), (x1, y1, z - thickness / 2),
              width, thickness, paint, 0.012)


def railing(mesh, positions, bottom, top, paint, size=0.15):
    for x, y in positions:
        mesh.box((x, y, (bottom + top) / 2), (size, size, top - bottom), paint)
        mesh.box((x, y, top), (size * 1.15, size * 1.15, 0.067), RUSTIC[0], 0.016)
    for (x0, y0), (x1, y1) in zip(positions, positions[1:]):
        mesh.beam((x0, y0, top - 0.13), (x1, y1, top - 0.13),
                  0.11, 0.13, paint, 0.017)
        mesh.beam((x0, y0, top - 0.54), (x1, y1, top - 0.54),
                  0.064, 0.09, paint, 0.012)


def dock():
    deck = Mesh("Salt-weathered pier boards and pegged cantilevers", TIMBER)
    piles = Mesh("Driven timber piles, diagonal braces, rails and ladder", TIMBER)
    iron = Mesh("Forged dock rings and bolt heads", SATIN)
    for i in range(34):
        y = -4.5 + (i + 0.5) * 9 / 34
        plank(deck, (-1.45, y), (1.45, y), 0, 9 / 34 - 0.009,
              0.125, RNG.choice(SALT_TIMBER))
    for x in (-1.025, 1.025):
        deck.beam((x, -4.47, -0.21), (x, 4.45, -0.21), 0.19, 0.23, RUSTIC[1])
    for i, y in enumerate((-3.85, -1.24, 1.31, 3.86)):
        deck.beam((-1.38, y, -0.30), (1.38, y, -0.30), 0.21, 0.24, SALT_TIMBER[0])
        for side in (-1, 1):
            x = 1.10 * side
            piles.stem([(x + 0.07 * side, y, -2.9), (x, y, -1.28), (x, y, 0.28)],
                       [0.173, 0.157, 0.143], RUSTIC[(i + 1) % 3], 10)
            piles.beam((x, y, -1.42), (x, y + (0.85 if i < 3 else -0.85), -0.31),
                       0.12, 0.14, RUSTIC[1], 0.017)
            piles.stem([(x, y, -0.80), (x, y, -0.66)], [0.164, 0.162], SALT_TIMBER[5], 10)
    for side in (-1, 1):
        x = 1.32 * side
        railing(piles, [(x, y) for y in (-3.93, -1.69, 0.50, 2.63, 4.34)],
                -0.25, 0.96, SALT_TIMBER[1])
        for y in (-3.05, 3.07):
            deck.box((x * 0.83, y, 0.095), (0.17, 0.18, 0.19), RUSTIC[1])
            iron.beam((x * 0.83 - 0.16, y, 0.18), (x * 0.83 + 0.16, y, 0.18),
                      0.07, 0.07, IRON[0], 0.015)
    railing(piles, [(-1.32, -4.36), (-0.36, -4.36)], -0.22, 0.95, SALT_TIMBER[1])
    railing(piles, [(0.36, -4.36), (1.32, -4.36)], -0.22, 0.95, SALT_TIMBER[1])
    for x in (-0.37, 0.37):
        piles.beam((x, -4.45, -1.97), (x, -4.38, 0.74), 0.09, 0.105, SALT_TIMBER[4], 0.014)
    for i in range(8):
        z = -1.80 + i * 0.28
        piles.beam((-0.36, -4.45 + (z + 1.9) * 0.026, z),
                   (0.36, -4.45 + (z + 1.9) * 0.026, z), 0.08, 0.085, SALT_TIMBER[3], 0.01)
    return [deck, piles, iron]


def plank_bridge():
    deck = Mesh("Split cedar plank bridge and raked braces", TIMBER)
    stone = Mesh("Four dressed granite landing blocks", MASONRY)
    for i in range(26):
        x = -3 + (i + 0.5) * 6 / 26
        plank(deck, (x, -0.80), (x, 0.80), 0.18, 6 / 26 - 0.008,
              0.093, RNG.choice(SALT_TIMBER[:4]))
    for y in (-0.52, 0.52):
        deck.beam((-2.98, y, 0.075), (2.98, y, 0.075), 0.13, 0.13, RUSTIC[1])
    for x in (-2.78, 2.78):
        for y in (-0.55, 0.55):
            chipped_ashlar(stone, ((x - 0.208, x + 0.208), (y - 0.17, y + 0.17)),
                           ((0, 0.018), (0.034, 0), (0.114, 0.01)), STONE_MOSS[1], RNG)
    for side in (-1, 1):
        y = side * 0.73
        railing(deck, [(x, y) for x in (-2.80, -0.93, 0.93, 2.80)], 0.02, 0.92, RUSTIC[2], 0.12)
    return [deck, stone]


def fishing_boat():
    exterior = Mesh("Lapstrake hull, white sheer and curved mahogany gunwales", TIMBER)
    interior = Mesh("Bilge boards, frames, thwarts, rub rail and rowing gear", TIMBER)
    rig = Mesh("Tied mooring rope and galvanized cleats", MATTE)
    # Watertight hull section dimensions from the blunt stern to the rising tapered bow.
    sections = [(2.55, 0.49, 0.39, -0.08), (2.25, 0.74, 0.38, -0.25),
                (1.48, 0.88, 0.37, -0.27), (0.52, 0.93, 0.37, -0.29),
                (-0.40, 0.92, 0.39, -0.29), (-1.18, 0.79, 0.44, -0.25),
                (-1.82, 0.53, 0.54, -0.15), (-2.32, 0.25, 0.61, -0.02),
                (-2.59, 0.051, 0.67, 0.16)]
    profiles = [(-1.00, 1.0), (-0.93, 0.80), (-0.78, 0.55), (-0.54, 0.22),
                (-0.27, 0.064), (0, 0), (0.27, 0.064), (0.54, 0.22),
                (0.78, 0.55), (0.93, 0.80), (1.0, 1.0)]
    hull = [[(a * w, y, low + frac * (high - low)) for a, frac in profiles] for y, w, high, low in sections]
    for i, (a, b) in enumerate(zip(hull, hull[1:])):
        for k in range(len(profiles) - 1):
            coat = BOAT[3] if k in (0, 9) else BOAT[[2, 1, 0, 1][(k + 1) % 4]]
            exterior.add([a[k], a[k + 1], b[k + 1], b[k]], [(0, 1, 2, 3)], coat)
    for side in (-1, 1):
        sheer = [(side * w, y, z) for y, w, z, _ in sections]
        exterior.stem(sheer, [0.051] * len(sections), BOAT[4], 8)
        for index in (1, 3):
            points = [row[index if side < 0 else 10 - index] for row in hull]
            exterior.stem(points, [0.015] * len(points), BOAT[0], 6)
    for end in (hull[0], hull[-1]):
        exterior.add(end, [tuple(range(len(end)))], BOAT[2])
    inset = [[(x * 0.916, y * 0.989, z * 0.944 + 0.059) for x, y, z in row] for row in hull]
    for k in (0, 10):
        rim = [[outer[k], inner[k]] for outer, inner in zip(hull, inset)]
        if k == 0:
            rim = [row[::-1] for row in rim]
        interior.rings(rim, BOAT[5], caps=False, wrap=False)
    for a, b in zip(inset, inset[1:]):
        for k in range(len(a) - 1):
            interior.add([a[k], b[k], b[k + 1], a[k + 1]], [(0, 1, 2, 3)],
                         SALT_TIMBER[3 if k in (0, 9) else 2])
    for row in inset[1:-1]:
        interior.stem(row, [0.025] * len(row), SALT_TIMBER[0], 6)
    for lo, hi, w in ((-1.20, -0.89, 1.28), (0.07, 0.40, 1.66), (1.43, 1.74, 1.47)):
        interior.box((0, (lo + hi) / 2, 0.29), (w, hi - lo, 0.075), SALT_TIMBER[4], 0.025)
    for i in range(-2, 3):
        interior.box((i * 0.12, 0.10, -0.053), (0.106, 3.69 - abs(i) * 0.45, 0.066),
                     SALT_TIMBER[1 + (i % 3)], 0.013)
    interior.beam((-0.35, -1.79, 0.40), (0.32, 0.52, 0.36), 0.039, 0.046, WOOD[2], 0.008)
    interior.beam((0.30, 0.46, 0.36), (0.53, 1.17, 0.39), 0.17, 0.044, WOOD[3], 0.019)
    rope = [(0.075 + 0.26 * (1 - i / 42) * cos(i * 0.65),
             -1.89 + 0.15 * cos(i * 0.65 + pi / 2), 0.263 + i * 0.00095) for i in range(43)]
    rig.stem(rope, [0.014] * len(rope), color("ab8a5b"), 6)
    rig.box((0, -2.24, 0.56), (0.25, 0.084, 0.072), IRON[1], 0.01)
    return [exterior, interior, rig]


def retaining_wall():
    stone = Mesh("Dry-stacked ashlar with staggered seams and mossy capstones", MASONRY)
    for course in range(3):
        levels = [(0, 0.23), (0.23, 0.56), (0.56, 0.80)][course]
        start, stop = levels
        subdivisions = ((-1.25, -0.82, -0.09, 0.53, 1.25), (-1.25, -0.57, 0.24, 0.89, 1.25),
                        (-1.25, -0.94, -0.30, 0.49, 1.25))[course]
        for i, (lo, hi) in enumerate(zip(subdivisions, subdivisions[1:])):
            front = -0.275 + course * 0.043 + RNG.uniform(0, 0.017)
            chipped_ashlar(stone, ((lo, hi - 0.005), (front, 0.267)),
                           ((start, 0.023), (start + 0.055, 0.003),
                            (stop - 0.035, 0.004), (stop, 0.028)),
                           STONE_MOSS[(i + course) % 5], RNG, 0.026)
    for a, b in ((-1.25, -0.44), (-0.44, 0.28), (0.28, 1.25)):
        chipped_ashlar(stone, ((a + 0.009, b - 0.009), (-0.253, 0.275)),
                       ((0.791, 0.023), (0.84, 0.002), (0.95, 0.005), (1, 0.029)),
                       STONE_MOSS[0], RNG, 0.022)
    return [stone]


def onsen_pool():
    stone = Mesh("Hewn granite coping, bonded outer rim and paved basin", MASONRY)
    # The 36-degree opening faces +Z at the runtime origin.
    start = -pi / 2 + pi / 10
    arc = 2 * pi - pi / 5
    for course in range(2):
        count = 18 if not course else 17
        for i in range(count):
            a0 = start + arc * i / count
            a1 = start + arc * (i + 1) / count
            gap = 0.007 + 0.002 * (i % 3)
            radius = 2.058 + RNG.uniform(-0.013, 0.039)
            outer = 2.67 + RNG.uniform(-0.043, 0.029)
            bottom, top = (0, 0.24) if not course else (0.22, 0.413 + RNG.uniform(-0.009, 0.014))
            outline = ((a0 + 2 * gap, radius + 0.057), (a0 + gap, outer - 0.065),
                       (a0 + 2 * gap, outer), ((a0 + a1) / 2, outer + 0.012),
                       (a1 - 2 * gap, outer), (a1 - gap, outer - 0.064),
                       (a1 - 2 * gap, radius + 0.050), ((a0 + a1) / 2, radius))
            rows = []
            for z, inset in ((bottom, 0.035), (bottom + 0.046, 0), (top - 0.038, 0.005), (top, 0.039)):
                rows.append([(cos(a) * (r + inset * (1 if r < 2.31 else -1)),
                              sin(a) * (r + inset * (1 if r < 2.31 else -1)), z)
                             for a, r in outline])
            stone.rings(rows, RNG.choice(STONE_MOSS[:4]))
    paving_radius = 2.27
    vertices = [(0, 0, 0)]
    vertices.extend((paving_radius * cos(i * pi / 24), paving_radius * sin(i * pi / 24), 0)
                    for i in range(48))
    stone.add(vertices, [(0, i + 1, (i + 1) % 48 + 1) for i in range(48)], STONE_MOSS[1])
    for x0, x1 in ((-0.74, 0.005), (0.016, 0.74)):
        chipped_ashlar(stone, ((x0, x1), (-2.61, -2.08)),
                       ((0, 0.036), (0.035, 0), (0.086, 0.018)), STONE_MOSS[2], RNG)
    return [stone]


def snow_inn():
    pieces = building()
    snow = Mesh("Thick snowpack with scalloped overhang, uneven surface and broken icicles",
                MATTE, smooth=True)
    for side in (-1, 1):
        span = 30
        us = [2 * i / span - 1 for i in range(span + 1)]
        overhangs = [0.025 + 0.012 * sin(43 * u) + 0.013 * cos(17 * u + side) for u in us]
        crest = [0.030 * cos(13 * u + side) + 0.010 * sin(21 * u) for u in us]
        rows = []
        for t in (0, 0.15, 0.32, 0.52, 0.71, 0.87, 0.97, 1):
            row = []
            for col, u in enumerate(us):
                y = side * 3.55 * (t + overhangs[col] * t ** 5)
                x = u * (4.54 + 0.085 * sin(pi * t))
                packed_height = 0.17 + 0.125 * (1 - t) ** 6 + crest[col] + (
                    0.031 * sin(pi * t * 4 + u * 3) + 0.045 * sin(pi * t))
                z = roof_height(3.44, 1.91, t, u) + packed_height
                row.append((x, y, z))
            rows.append(row)
        if side < 0:
            rows = [row[::-1] for row in rows]
        snow.rings(rows, SNOW[2], caps=False, wrap=False)
        for edge in (0, -1):
            sheathing_edge = [[row[edge], (row[edge][0] * 0.995,
                                           row[edge][1], row[edge][2] - 0.13)] for row in rows]
            if edge == 0:
                sheathing_edge.reverse()
            snow.rings(sheathing_edge, SNOW[3], caps=False, wrap=False)
        drip = rows[-1]
        bottom = [(x, y - side * 0.051, z - 0.105 - 0.033 * sin(11 * x)) for x, y, z in drip]
        snow.rings([drip, bottom], SNOW[3], caps=False, wrap=False)
        for i in (3, 5, 6, 10, 16, 22, 23, 27):
            x, y, z = bottom[i]
            length = RNG.uniform(0.09, 0.26)
            snow.stem([(x, y - side * 0.021, z + 0.04), (x + 0.009, y, z - length * 0.77),
                       (x + 0.011, y, z - length)], [0.024, 0.011, 0.002], SNOW[1], 5)
    pieces.append(snow)
    return pieces


def temple():
    pieces = building(shrine=True)
    for group in pieces:
        group.vertices = [(x * 1.32, y * 1.18, z) for x, y, z in group.vertices]
    support = Mesh("Upper carved bracket tower, painted louvres and prayer balcony", TIMBER)
    roof = Mesh("Raised clerestory wing and copper finial", FIRED_TILE)
    for i in range(15):
        x = -2.27 + (i + 0.5) * 4.54 / 15
        for y in (-0.84, 0.84):
            support.box((x, y, 5.08), (0.29, 0.105, 1.24), WOOD[2 if i % 2 else 1], 0.016)
            if i % 2 == 0:
                support.box((x, y * 1.11, 5.28), (0.07, 0.08, 0.77), WOOD[0], 0.014)
    for x in (-2.30, 2.30):
        support.box((x, 0, 5.10), (0.14, 1.70, 1.22), WOOD[0])
        for y in (-0.88, 0.88):
            support.box((x, y, 5.18), (0.20, 0.23, 1.51), WOOD[1])
            support.beam((x, y, 5.60), (x * 1.15, y * 1.27, 5.88),
                         0.15, 0.14, WOOD[2], 0.024)
    for y in (-0.93, 0.93):
        support.beam((-2.35, y, 4.88), (2.35, y, 4.88), 0.17, 0.13, LACQUER[0])
        support.beam((-2.36, y, 5.64), (2.36, y, 5.64), 0.13, 0.23, WOOD[1])
    kawara(roof, support, 2.76, 1.60, 5.77, 1.23)
    support.stem([(0, 0, 6.91), (0, 0, 7.06), (0, 0, 7.20), (0, 0, 7.26)],
                 [0.13, 0.09, 0.063, 0.016], GOLD, 9)
    return [*pieces, support, roof]


def sluice():
    beam = Mesh("Watergate frame, raised grooved leaf and winch", TIMBER)
    base = Mesh("Granite wing walls and stream notch", MASONRY)
    fittings = Mesh("Gate guide rails, tie bands and lead screw", SATIN)
    for side in (-1, 1):
        x = side * 1.38
        for i in range(2):
            chipped_ashlar(base, ((x - 0.54, x + 0.54), (-0.67, 0.69)),
                           ((i * 0.28, 0.028), (i * 0.28 + 0.05, 0),
                            (i * 0.28 + 0.24, 0.014), (i * 0.28 + 0.28, 0.029)),
                           STONE_MOSS[i], RNG, 0.038)
        beam.box((x * 0.92, 0, 1.73), (0.23, 0.28, 2.44), RUSTIC[0])
        beam.beam((x, 0.49, 0.60), (x * 0.92, 0.034, 1.54), 0.13, 0.15, RUSTIC[2])
        beam.beam((x, -0.48, 0.60), (x * 0.92, -0.032, 1.54), 0.14, 0.13, RUSTIC[2])
        fittings.box((x * 0.86, -0.11, 1.85), (0.071, 0.056, 2.17), IRON[0], 0.009)
    beam.beam((-1.76, 0, 2.84), (1.76, 0, 2.84), 0.28, 0.22, RUSTIC[0])
    for i in range(10):
        x = -1.06 + (i + 0.5) * 2.12 / 10
        beam.box((x, 0.015, 1.975), (0.204, 0.146, 0.97), SALT_TIMBER[1 + (i % 3)], 0.012)
    for z in (1.57, 2.36):
        beam.beam((-1.10, -0.089, z), (1.10, -0.089, z), 0.10, 0.118, RUSTIC[1])
        for x in (-0.91, -0.40, 0.40, 0.91):
            fittings.box((x, -0.152, z), (0.066, 0.023, 0.067), IRON[1], 0.01)
    fittings.stem([(0, 0, 2.36), (0, 0, 3.01)], [0.048, 0.040], IRON[0], 9)
    fittings.beam((-0.39, 0, 3.013), (0.39, 0, 3.013), 0.031, 0.037, IRON[1], 0.007)
    return [base, beam, fittings]


def festival_stall():
    booth = Mesh("Mortised stall framing, display shelves and counter", TIMBER)
    cloth = Mesh("Stitched two-tone canopy and hanging noren", LEAVES)
    dishes = Mesh("Glazed plates, skewered dumplings and wares", SATIN)
    for x in (-1.39, 1.39):
        for y in (-0.89, 0.91):
            booth.box((x, y, 1.20), (0.115, 0.116, 2.40), WOOD[1], 0.016)
            booth.beam((x, y, 1.77), (x, y * 0.72, 2.25), 0.078, 0.07, WOOD[2], 0.012)
    for x in (-1.43, 1.43):
        booth.beam((x, -1.03, 2.36), (x, 0.98, 2.36), 0.09, 0.086, WOOD[0])
    for y in (-0.91, 0, 0.88):
        booth.beam((-1.41, y, 2.47 if y == 0 else 2.35), (1.41, y, 2.47 if y == 0 else 2.35),
                   0.065, 0.072, WOOD[0], 0.01)
    for i in range(12):
        x = -1.50 + (i + 0.5) * 3 / 12
        booth.box((x, -0.62, 0.99), (0.246, 0.76, 0.09), WOOD[(i % 3) + 1], 0.015)
        booth.box((x, -0.896, 0.51), (0.245, 0.10, 0.88), WOOD[(i + 1) % 3], 0.018)
    booth.box((0, 0.59, 0.81), (2.67, 0.53, 0.082), WOOD[2])
    booth.box((0, 0.83, 0.435), (2.66, 0.08, 0.74), WOOD[3])
    for x in (-1.32, 1.32):
        booth.beam((x, -0.63, 0.17), (x, 0.87, 0.17), 0.079, 0.079, WOOD[0])
    for i in range(16):
        a, b = -1.49 + i * 2.98 / 16, -1.49 + (i + 1) * 2.98 / 16
        canopy = []
        for y in (-1.048, -0.81, -0.53, 0, 0.43, 0.84, 1.025):
            z = 2.613 - 0.20 * abs(y) ** 1.3
            canopy.append([(x, y, z + (0.007 if k == 1 else 0.0))
                           for k, x in enumerate((a, (a + b) / 2, b))])
        cloth.rings(canopy, FESTIVAL[3 if i % 4 < 2 else 0], caps=False, wrap=False)
    for band in range(7):
        x0 = -1.415 + band * 0.405
        rows = []
        for z in (2.409, 2.259, 2.104, 1.936):
            rows.append([(x0 + t * 0.383, -1.032 - (2.41 - z) * sin(t * pi * 3 + band) * 0.10,
                          z - (2.41 - z) * 0.074 * sin(t * pi))
                         for t in (0, 0.25, 0.5, 0.75, 1)])
        cloth.rings(rows, FESTIVAL[0 if band < 6 else 5], caps=False, wrap=False)
        for turn in range(13):
            a = 2 * pi * turn / 13
            b = 2 * pi * (turn + 1) / 13
            cx = x0 + 0.19
            cloth.add([(cx + cos(t) * r, -1.079, 2.17 + sin(t) * r)
                       for t, r in ((a, 0.058), (b, 0.058), (b, 0.075), (a, 0.075))],
                      [(0, 1, 2, 3)], FESTIVAL[4])
    for x, depth in ((-0.93, -0.68), (-0.34, -0.65), (0.26, -0.70), (0.89, -0.65)):
        dishes.stem([(x, depth, 1.035), (x, depth, 1.064), (x, depth, 1.089)],
                    [0.126, 0.176, 0.186], FESTIVAL[5 if x < 0 else 4], 12)
        for i in range(3):
            y = depth - 0.086 + i * 0.070
            dishes.beam((x - 0.138, y, 1.104), (x + 0.157, y, 1.104), 0.009, 0.009, GOLD, 0.001)
            for j in range(3):
                dishes.volume((x + 0.077 - j * 0.063, y, 1.116), (0.035, 0.031, 0.025),
                              FESTIVAL[(j % 2) + 3] if i < 2 else FESTIVAL[2], 6, 2, 0.07)
    return [booth, cloth, dishes]


def festival_lantern():
    shell_material = material("Festival | warm paper with gentle emission", 0.89)
    shader = shell_material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Emission Color"].default_value = color("e59d5d")
    shader.inputs["Emission Strength"].default_value = 0.36
    skin = Mesh("Pleated washi shell", shell_material, smooth=True)
    ties = Mesh("Wire rings, lacquered caps and tied tassel")
    bands = 36
    rows = []
    for i in range(27):
        t = i / 26
        r = 0.131 + 0.142 * sin(pi * t) ** 0.79 + (0.007 if i % 2 else 0)
        rows.append([(cos(2 * pi * j / bands) * r, sin(2 * pi * j / bands) * r, 0.16 + 0.59 * t)
                     for j in range(bands)])
    faces = [(i * bands + j, i * bands + (j + 1) % bands, (i + 1) * bands + (j + 1) % bands,
              (i + 1) * bands + j) for i in range(len(rows) - 1) for j in range(bands)]
    skin.add([p for row in rows for p in row], faces,
             [FESTIVAL[3 if 6 <= j <= 10 or 24 <= j <= 28 else (2 if i % 2 else 1)]
              for i in range(len(rows) - 1) for j in range(bands)])
    for z in (0.147, 0.751):
        ties.stem([(0, 0, z - 0.019), (0, 0, z), (0, 0, z + 0.024)],
                  [0.121, 0.144, 0.136], WOOD[4], 18)
    loop = [(0.065 * cos(pi * i / 10), 0, 0.788 + 0.102 * sin(pi * i / 10)) for i in range(11)]
    ties.stem(loop, [0.011] * len(loop), IRON[0], 6)
    ties.stem([(0, 0, 0.02), (0.012, -0.017, 0.075), (0, 0, 0.136)], [0.009, 0.011, 0.012], GOLD, 6)
    ties.stem([(0, 0, 0), (0.01, 0, 0.035), (0.01, 0, 0.087)], [0.035, 0.022, 0.012], FESTIVAL[0], 7)
    return [skin, ties]


MAPLE_OUTLINE = ((-0.09, -0.76), (-0.37, -0.48), (-0.90, -0.42), (-0.69, -0.12),
                 (-1.07, 0.27), (-0.46, 0.21), (-0.57, 0.83), (-0.22, 0.54),
                 (0, 1.12), (0.20, 0.57), (0.50, 0.84), (0.47, 0.21),
                 (1.02, 0.26), (0.68, -0.13), (0.89, -0.45), (0.36, -0.47), (0.09, -0.76))
SHRUB_OUTLINE = ((0.0, -0.62), (-0.44, -0.26), (-0.51, 0.17), (-0.38, 0.59),
                 (0.01, 1.02), (0.34, 0.57), (0.48, 0.12), (0.40, -0.26))


def shaped_leaf(mesh, center, azimuth, size, outline, paint, accent, tilt):
    across = Vector((cos(azimuth), sin(azimuth), 0))
    forward = Vector((-sin(azimuth) * cos(tilt), cos(azimuth) * cos(tilt), sin(tilt)))
    normal = across.cross(forward)
    n = len(outline)
    edge = [center + size * (across * u + forward * v - normal * (0.14 * abs(u) + 0.11 * abs(v)))
            for u, v in outline]
    mesh.add([center, *edge], [(0, i + 1, (i + 1) % n + 1) for i in range(n)],
             [accent if i % 6 == 0 else paint for i in range(n)])


def maple():
    wood = Mesh("Flared maple trunk, exposed roots and fine palmate branches", TIMBER, smooth=True)
    leaf = Mesh("Palmatifid maple and mottled red-orange crown", LEAVES, smooth=True)
    trunk = [(0, 0, 0), (-0.05, 0.04, 0.35), (-0.13, 0.13, 1.16), (0.10, 0.06, 2.14),
             (0.32, -0.06, 3.10), (0.36, 0.06, 4.34), (-0.12, 0.27, 5.41)]
    wood.stem(trunk, [0.43, 0.35, 0.27, 0.23, 0.17, 0.10, 0.025], CEDAR_WOOD[1], 11)
    for i in range(7):
        a = i * 2.398
        x, y = cos(a), sin(a)
        wood.stem([(0, 0, 0.25), (x * 0.43, y * 0.39, 0.12), (x * 0.77, y * 0.85, 0.042)],
                  [0.142, 0.083, 0.016], CEDAR_WOOD[2], 7)
    for arm in range(12):
        level = arm / 11
        a = arm * 2.399963 + RNG.uniform(-0.25, 0.31)
        ray = Vector((cos(a), sin(a), 0))
        side = Vector((-ray.y, ray.x, 0))
        base = Vector(trunk[2 + min(4, arm // 3)])
        spread = 2.96 - 1.55 * level + RNG.uniform(-0.24, 0.32)
        mid = base + ray * spread * 0.49 + Vector((0, 0, 0.54))
        end = base + ray * spread + side * 0.18 + Vector((0, 0, 1.88 - 0.32 * level))
        wood.stem([base, mid, mid.lerp(end, 0.71), end],
                  [0.15 * (1 - level * 0.69), 0.064, 0.039, 0.007], CEDAR_WOOD[2], 7)
        for fork in range(6):
            a0 = a + (1 if fork % 2 else -1) * RNG.uniform(0.66, 1.33)
            tip_ray = Vector((cos(a0), sin(a0), 0))
            root = mid.lerp(end, 0.12 + 0.14 * fork)
            tip = root + tip_ray * RNG.uniform(0.52, 0.9) + Vector((0, 0, RNG.uniform(0.38, 0.62)))
            wood.stem([root, root.lerp(tip, 0.54), tip], [0.027, 0.016, 0.003],
                      CEDAR_WOOD[1 if fork % 2 else 3], 5)
            paint = MAPLE[1 + (arm + fork) % 4:3 + (arm + fork) % 4]
            cedar_bough(leaf, root - Vector((0, 0, 0.05)), tip, 0.38, 0.15, paint, simple=True)
            for i in range(14):
                angle = a0 + i * 2.40 + RNG.uniform(-0.25, 0.25)
                radius = RNG.uniform(0.08, 0.54)
                center = root.lerp(tip, RNG.uniform(0.30, 1.02)) + Vector(
                    (cos(angle) * radius, sin(angle) * radius, RNG.uniform(-0.11, 0.27)))
                tone = RNG.choice(MAPLE[2:6])
                shaped_leaf(leaf, center, angle, RNG.uniform(0.105, 0.209), MAPLE_OUTLINE,
                            tone, RNG.choice(paint), RNG.uniform(-1.15, 1.25))
    for assembly in (wood, leaf):
        assembly.vertices = [(1.06 * x, 1.06 * y, 1.13 * z) for x, y, z in assembly.vertices]
    return [wood, leaf]


def shrub():
    stem = Mesh("Shrub basal forks and secondary branchlets")
    leaf = Mesh("Creased glossy shrub leaves with shaded inner sprays", LEAVES)
    for arm in range(11):
        a = arm * 2.39996 + RNG.uniform(-0.2, 0.2)
        ray = Vector((cos(a), sin(a), 0))
        c = ray * RNG.uniform(0.53, 0.80) + Vector((0, 0, RNG.uniform(0.45, 0.89)))
        base = ray * 0.064
        base.z = 0.009
        mid = base.lerp(c, 0.53) + Vector((0, 0, 0.10))
        stem.stem([base, mid, c], [0.034, 0.019, 0.004], CEDAR_WOOD[2], 5)
        for j in range(3):
            z = (0.46, 0.70, 0.93)[j]
            point = mid.lerp(c, z)
            direction = a + (-1 if j % 2 else 1) * 1.05
            end = point + Vector((cos(direction) * 0.22, sin(direction) * 0.22, 0.045))
            cedar_bough(leaf, point, end + ray * 0.065, 0.13, 0.067, SHRUB[1:3], simple=True)
            for k in range(6):
                az = direction + k * 2.39996
                width = RNG.uniform(0.06, 0.19)
                ctr = point.lerp(end, RNG.uniform(0.16, 1.08)) + Vector(
                    (cos(az) * width, sin(az) * width, RNG.uniform(-0.06, 0.08)))
                shaped_leaf(leaf, ctr, az, RNG.uniform(0.063, 0.118), SHRUB_OUTLINE,
                            RNG.choice(SHRUB[2:]), SHRUB[1], RNG.uniform(-0.6, 1.08))
    stem.vertices = [(x, y, max(0.0, z)) for x, y, z in stem.vertices]
    return [stem, leaf]


def fishing_rack():
    wood = Mesh("Tied fishing gear rack with float trays and wrapped oars", TIMBER)
    net = Mesh("Laced rope net, buoy knots and coiled cord", MATTE)
    for x in (-0.92, 0.92):
        wood.stem([(x, 0.05, 0), (x * 0.93, 0, 0.82), (x * 0.91, 0.03, 1.63)],
                  [0.075, 0.054, 0.055], SALT_TIMBER[1], 8)
        wood.beam((x * 0.93, 0.01, 1.25), (x * 1.13, 0.32, 0.19),
                  0.088, 0.091, RUSTIC[2])
    for z in (0.40, 1.51):
        wood.beam((-0.96, 0, z), (0.96, 0, z), 0.079, 0.081, SALT_TIMBER[3])
    knots = 12
    for i in range(knots + 1):
        locations = [(-0.78 + i / knots * 1.56 + 0.026 * (j % 2 - 0.5),
                      -0.026 - 0.09 * sin(pi * i / knots) * sin(pi * j / 9),
                      1.50 - j / 9 * (0.99 + 0.084 * sin(pi * i / knots))) for j in range(10)]
        net.stem(locations, [0.008] * len(locations), color("ad9163"), 4)
    for j in range(1, 10):
        locations = [(-0.78 + i / knots * 1.56 + 0.026 * (j % 2 - 0.5),
                      -0.026 - 0.09 * sin(pi * i / knots) * sin(pi * j / 9),
                      1.50 - j / 9 * (0.99 + 0.084 * sin(pi * i / knots))) for i in range(knots + 1)]
        net.stem(locations, [0.0075] * len(locations), color("ae9873"), 4)
    for x in (-0.76, -0.50, -0.25, 0, 0.25, 0.50, 0.76):
        net.volume((x, -0.016, 1.53), (0.078, 0.045, 0.050), LACQUER[2], 8, 2, 0.08)
    return [wood, net]


DESIGNS = {
    "dock": dock,
    "plank-bridge": plank_bridge,
    "fishing-boat": fishing_boat,
    "retaining-wall": retaining_wall,
    "onsen-pool": onsen_pool,
    "snow-inn": snow_inn,
    "temple": temple,
    "sluice": sluice,
    "festival-stall": festival_stall,
    "festival-lantern": festival_lantern,
    "maple": maple,
    "shrub": shrub,
    "fishing-rack": fishing_rack,
}


def build():
    initial = bpy.context.scene
    scenes = []
    bpy.context.preferences.filepaths.save_version = 0
    for index, (name, design) in enumerate(DESIGNS.items()):
        RNG.seed(281102 + index)
        scene = bpy.data.scenes.new(name)
        scene.unit_settings.system = "METRIC"
        scene["asset_id"] = name
        scene["source"] = "Original regional geometry and palette authored in art/region_build.py"
        bpy.context.window.scene = scene
        for assembly in design():
            assembly.object(scene).select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                                  use_active_scene=True, use_selection=True,
                                  export_yup=True, export_cameras=False, export_lights=False)
        scenes.append(scene)
    bpy.context.window.scene = scenes[0]
    bpy.data.scenes.remove(initial)
    bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name("region-library.blend")), compress=True)


if __name__ == "__main__":
    build()
