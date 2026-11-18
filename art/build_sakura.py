"""Build original Sakura village scenery in Blender 5.2.

Blender authoring uses Z up and -Y forward. GLB scenes use Y up and +Z forward.
"""

from math import cos, pi, sin
from pathlib import Path
from random import Random

import bmesh
import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "models"
OUTPUT.mkdir(parents=True, exist_ok=True)
RNG = Random(170114)


def color(hex_value):
    encoded = [int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c < 0.04045 else ((c + 0.055) / 1.055) ** 2.4
                 for c in encoded) + (1.0,)


def palette(values):
    return [color(value) for value in values.split()]


WOOD = palette("634337 785344 89614b a4785c 533a36")
CEDAR_WOOD = palette("513c37 634941 755348 816153")
PAPER = palette("d7bc8c f2dfb5 e8cea1 cfaf83")
TILES = palette("394352 485467 515e72 5a677b 454e60")
STONE = palette("68706e 828780 9c9c90 777a78 586466")
RIVER = palette("465e61 607170 75817a 526668 8f9587")
IRON = palette("2c3135 555958")
LACQUER = palette("903c32 a84332 bd4b36 cf5c43 d4684b")
FLOWERS = palette("c56c88 db8ca5 ecadc0 f4c2cc f9d5da ffe3df")
PINE = palette("273f3b 37584b 436951 507b5c 5e8967 6b9270")
BAMBOO = palette("446344 658554 869e65 53754e 9aac73")
RICE = palette("619055 83aa62 a0bc67 b0c775 759850")
GOLD = color("bd9259")


def material(name, roughness, double_sided=False):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    result.roughness = roughness
    result.diffuse_color = (0.5, 0.5, 0.5, 1)
    result.use_backface_culling = not double_sided
    nodes = result.node_tree.nodes
    attribute = nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = "Paint"
    shader = nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = roughness
    result.node_tree.links.new(attribute.outputs["Color"], shader.inputs["Base Color"])
    return result


SATIN = material("Paint | satin lacquer", 0.36)
MATTE = material("Paint | timber, tile and plaster", 0.84)
FOLIAGE = material("Paint | leaves and blossoms", 0.92)
MASONRY = material("Paint | stone", 0.91)
LEAVES = material("Paint | thin, two-sided leaves", 0.92, double_sided=True)
RITUAL_PAPER = material("Paint | thin, two-sided paper", 0.86, double_sided=True)


class Mesh:
    def __init__(self, name, finish=MATTE):
        self.name = name
        self.finish = finish
        self.vertices = []
        self.faces = []
        self.colors = []

    def add(self, vertices, faces, paint):
        offset = len(self.vertices)
        self.vertices.extend(vertices)
        self.faces.extend(tuple(index + offset for index in face) for face in faces)
        self.colors.extend(paint if isinstance(paint, list) else [paint] * len(faces))

    def rings(self, rows, paint, caps=True, wrap=True):
        width = len(rows[0])
        faces = [(i * width + j, i * width + (j + 1) % width,
                  (i + 1) * width + (j + 1) % width, (i + 1) * width + j)
                 for i in range(len(rows) - 1) for j in range(width if wrap else width - 1)]
        if caps:
            end = (len(rows) - 1) * width
            faces.extend([tuple(reversed(range(width))), tuple(range(end, end + width))])
        if isinstance(paint, list):
            paint = [RNG.choice(paint) for _ in faces]
        self.add([vertex for row in rows for vertex in row], faces, paint)

    def beam(self, start, end, width, depth, paint, bevel=0.035):
        p, q = Vector(start), Vector(end)
        axis = (q - p).normalized()
        reference = Vector((0, 0, 1)) if abs(axis.z) < 0.97 else Vector((0, 1, 0))
        u = axis.cross(reference).normalized()
        v = axis.cross(u)
        w, d = width / 2, depth / 2
        clip = min(bevel, w * 0.45, d * 0.45)
        section = [
            (-w + clip, -d), (w - clip, -d), (w, -d + clip), (w, d - clip),
            (w - clip, d), (-w + clip, d), (-w, d - clip), (-w, -d + clip),
        ]
        self.rings([[point + x * u + y * v for x, y in section] for point in (p, q)], paint)

    def box(self, center, size, paint, bevel=0.025):
        x, y, z = center
        w, d, h = size
        self.beam((x, y, z - h / 2), (x, y, z + h / 2), w, d, paint, bevel)

    def stem(self, points, radii, paint, sides=7):
        points = [Vector(point) for point in points]
        rows = []
        for index, point in enumerate(points):
            axis = (points[min(index + 1, len(points) - 1)] - points[max(index - 1, 0)]).normalized()
            if index == 0 and abs(point.z) < 1e-8 and axis.z > 0.85:
                axis = Vector((0, 0, 1))
            ref = Vector((0, 1, 0)) if abs(axis.y) < 0.92 else Vector((1, 0, 0))
            u = axis.cross(ref).normalized()
            v = axis.cross(u)
            rows.append([point + radii[index] * (cos(i * 2 * pi / sides) * u + sin(i * 2 * pi / sides) * v)
                         for i in range(sides)])
        self.rings(rows, paint)

    def volume(self, center, scale, paint, sides=8, strata=3, wobble=0.13):
        x, y, z = center
        w, d, h = scale
        vertices = [(x, y, z - h)]
        phase = RNG.uniform(0, 2 * pi)
        for row in range(strata):
            phi = -pi / 2 + pi * (row + 1) / (strata + 1)
            for i in range(sides):
                angle = 2 * pi * (i + row * 0.5) / sides + phase
                jitter = 1 + RNG.uniform(-wobble, wobble)
                vertices.append((x + cos(angle) * cos(phi) * w * jitter,
                                 y + sin(angle) * cos(phi) * d * jitter,
                                 z + h * (sin(phi) + RNG.uniform(-wobble, wobble))))
        vertices.append((x, y, z + h))
        faces = []
        for i in range(sides):
            j = (i + 1) % sides
            faces.append((0, 1 + j, 1 + i))
            for row in range(strata - 1):
                a, b = 1 + row * sides + i, 1 + row * sides + j
                faces.extend([(a, b, a + sides), (b, b + sides, a + sides)])
            top = 1 + (strata - 1) * sides
            faces.append((len(vertices) - 1, top + i, top + j))
        if isinstance(paint, list):
            face_colors = [RNG.choice(paint[:max(2, len(paint) // 2)])
                           if sum(vertices[i][2] for i in face) / len(face) < z - h * 0.20
                           else RNG.choice(paint[max(0, len(paint) // 2 - 2):])
                           for face in faces]
        else:
            face_colors = paint
        self.add(vertices, faces, face_colors)

    def object(self, scene):
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.vertices, [], self.faces)
        if mesh.validate(verbose=True):
            raise ValueError(f"Invalid authoring geometry in {self.name}")
        paint = mesh.color_attributes.new(name="Paint", type="BYTE_COLOR", domain="CORNER")
        for poly, col in zip(mesh.polygons, self.colors):
            for loop in poly.loop_indices:
                paint.data[loop].color = col
        editable = bmesh.new()
        editable.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(editable, faces=editable.faces)
        editable.to_mesh(mesh)
        editable.free()
        mesh.update()
        mesh.materials.append(self.finish)
        obj = bpy.data.objects.new(self.name, mesh)
        scene.collection.objects.link(obj)
        return obj


def rectangle(points_x, points_y, z):
    a, b = points_x
    c, d = points_y
    return [(a, c, z), (b, c, z), (b, d, z), (a, d, z)]


def foundation(mesh, width, depth, floor, stone=STONE):
    columns = round(width / 0.67)
    rows = round(depth / 0.67)
    for direction in (-1, 1):
        for i in range(columns):
            x = (i + 0.5) * width / columns - width / 2
            mesh.box((x, direction * (depth / 2 - 0.15), floor / 2),
                     (width / columns - 0.016, 0.30, floor), RNG.choice(stone), 0.06)
        for j in range(1, rows - 1):
            y = (j + 0.5) * depth / rows - depth / 2
            mesh.box((direction * (width / 2 - 0.15), y, floor / 2),
                     (0.30, depth / rows - 0.013, floor), RNG.choice(stone), 0.06)


def kawara(roof, framing, half_width, half_depth, eave, rise):
    # Cross section sampled from ridge to the slightly upturned lower edge.
    def height(t, u):
        return eave + rise * (1 - t) ** 1.30 + 0.14 * t ** 7 + 0.12 * abs(u) ** 10 * t ** 2

    for side in (-1, 1):
        for i in range(9):
            t0, t1 = i / 9, (i + 1) / 9
            for j in range(14):
                u0, u1 = 2 * j / 14 - 1, 2 * (j + 1) / 14 - 1
                tile_color = RNG.choices((0, 1, 2, 3, 4), (1, 8, 5, 1, 5))[0]
                t_lower = t1 + 0.017 if i < 8 else t1
                vertices = []
                for t, lip in ((t0, 0), (t_lower, 0.025)):
                    for k in range(5):
                        u = u0 + (u1 - u0) * k / 4
                        bump = (0.055 if k in (0, 4) else 0.015)
                        vertices.append((u * half_width, side * half_depth * t, height(t, u) + bump + lip))
                for k in range(4):
                    roof.add([vertices[k], vertices[k + 1], vertices[k + 6], vertices[k + 5]],
                             [(0, 1, 2, 3)] if side > 0 else [(3, 2, 1, 0)],
                             TILES[min(tile_color + 1, 4)] if k == 1 and tile_color < 3 else TILES[tile_color])
                    e0, e1 = vertices[k + 5], vertices[k + 6]
                    roof.add([e0, e1, (e1[0], e1[1], e1[2] - 0.063), (e0[0], e0[1], e0[2] - 0.063)],
                             [(0, 1, 2, 3)] if side > 0 else [(3, 2, 1, 0)], TILES[0])
        for u in (-1, 1):
            points = [(u * half_width, side * half_depth * i / 10, height(i / 10, u) - 0.07)
                      for i in range(11)]
            roof.stem(points, [0.115] * 11, TILES[0], 8)
            for a, b in zip(points, points[1:]):
                framing.beam((a[0] * 0.982, a[1], a[2] - 0.10),
                             (b[0] * 0.982, b[1], b[2] - 0.10), 0.16, 0.12, WOOD[0])
        eave_points = [(half_width * u / 12, side * half_depth, height(1, u / 12) - 0.04)
                       for u in range(-12, 13)]
        roof.stem(eave_points, [0.085] * len(eave_points), TILES[0], 7)
        for i in range(-10, 11):
            u = i / 11
            x = u * half_width
            framing.beam((x, side * half_depth * 0.77, height(0.77, u) - 0.17),
                         (x, side * half_depth * 0.98, height(0.98, u) - 0.17),
                         0.087, 0.10, RNG.choice(WOOD), 0.012)
        # The underside closes the tile courses for low-angle views.
        under = [[(x * half_width * 0.992, side * half_depth * t,
                   height(t, x) - 0.105) for x in (-1, -0.75, 0, 0.75, 1)]
                 for t in (0, 0.25, 0.5, 0.75, 1)]
        if side < 0:
            under = [list(reversed(row)) for row in under]
        framing.rings(under, WOOD[0], caps=False, wrap=False)
    ridge_z = height(0, 0)
    for i in range(14):
        x0 = (2 * i / 14 - 1) * half_width
        x1 = (2 * (i + 1) / 14 - 1) * half_width + 0.01
        roof.stem([(x0, 0, ridge_z + 0.04), (x1, 0, ridge_z + 0.04)],
                  [0.145, 0.145], RNG.choice(TILES[:4]), 8)
    for x in (-half_width, half_width):
        roof.stem([(x - 0.035, 0, ridge_z + 0.04), (x + 0.035, 0, ridge_z + 0.04)],
                  [0.22, 0.22], TILES[0], 10)
        roof.stem([(x - 0.042, 0, ridge_z + 0.04), (x + 0.042, 0, ridge_z + 0.04)],
                  [0.092, 0.092], TILES[2], 8)


def building(shrine=False):
    width, depth = (6.0, 5.0) if shrine else (8.0, 6.0)
    floor, wall_top = (0.58, 3.18) if shrine else (0.32, 3.24)
    wall_base = floor + (0.23 if shrine else 0.07)
    w, d = width / 2, depth / 2
    front = -d + (0.83 if shrine else 0)
    walls = Mesh("Plaster, infill and lattice")
    frame = Mesh("Timber frame, sill and rafters")
    roof = Mesh("Fired roof tiles and ridge caps")
    rocks = Mesh("Cut stone foundations and steps", MASONRY)
    hardware = Mesh("Fittings, paper and plaque", SATIN)
    pieces = [rocks, walls, frame, roof, hardware]
    foundation(rocks, width, depth, floor)
    frame.box((0, 0, floor + 0.06), (width + 0.13, depth + 0.10, 0.13), WOOD[0])
    for y in (front, d):
        frame.beam((-w, y, wall_top), (w, y, wall_top), 0.24, 0.25, WOOD[0])
        frame.beam((-w, y, wall_base + 0.09), (w, y, wall_base + 0.09), 0.19, 0.19, WOOD[0])
        for col in range(4):
            panel_start = -w + col * width / 4
            panel_end = panel_start + width / 4
            for x in (panel_start, panel_end) if col == 3 else (panel_start,):
                frame.box((x, y, (wall_top + wall_base) / 2),
                          (0.17, 0.19, wall_top - wall_base + 0.13), WOOD[1])
            center = (panel_start + panel_end) / 2
            is_door = y < 0 and col in (1, 2)
            has_window = y < 0 or col in (1, 2)
            relief = (-0.12 if y < 0 else 0.12)
            if is_door:
                walls.box((center, y, wall_top - 0.29),
                          (width / 4 - 0.16, 0.16, 0.38), PAPER[0])
                walls.box((center, y + relief * 0.35, wall_base + 1.02),
                          (width / 4 - 0.17, 0.11, 1.95), WOOD[4] if shrine else WOOD[1])
                for i in range(1, 9):
                    x = panel_start + i * (panel_end - panel_start) / 9
                    frame.box((x, y + relief, wall_base + 1.02),
                              (0.048, 0.055, 1.92), WOOD[(i + col) % 3])
                for z in (wall_base + 0.19, wall_base + 0.78, wall_base + 1.94):
                    frame.box((center, y + relief, z), (width / 4 - 0.19, 0.072, 0.08), WOOD[2])
                handle = panel_end - 0.17 if col == 1 else panel_start + 0.17
                hardware.box((handle, y + relief * 1.45, wall_base + 1.04),
                             (0.045, 0.05, 0.155), GOLD if shrine else IRON[0])
            else:
                walls.box((center, y, (wall_top + wall_base) / 2),
                          (width / 4 - 0.16, 0.13, wall_top - wall_base - 0.1),
                          PAPER[(col + int(y > 0)) % 4])
                for i in range(1, 8):
                    x = panel_start + i * (panel_end - panel_start) / 8
                    walls.box((x, y + relief * 0.80, wall_base + 0.47),
                              (width / 29, 0.075, 0.65), WOOD[(col + i) % 3], 0.010)
                if has_window:
                    window = (center, y + relief, wall_base + 1.65)
                    window_w = width / 4 - 0.42
                    walls.box(window, (window_w, 0.12, 0.78), WOOD[4])
                    walls.box((center, y + relief * 1.56, window[2]),
                              (window_w - 0.17, 0.04, 0.62), PAPER[1])
                    for i in range(-4, 5):
                        frame.box((center + i * window_w / 9, y + relief * 1.86, window[2]),
                                  (0.046, 0.045, 0.68), WOOD[1], 0.008)
                    for z in (window[2] - 0.15, window[2] + 0.15):
                        frame.box((center, y + relief * 1.85, z),
                                  (window_w, 0.05, 0.047), WOOD[0], 0.007)
    for x in (-w, w):
        frame.beam((x, front, wall_top), (x, d, wall_top), 0.22, 0.23, WOOD[0])
        for col in range(3):
            y0 = front + col * (d - front) / 3
            y1 = y0 + (d - front) / 3
            cy = (y0 + y1) / 2
            frame.box((x, y0, (wall_top + wall_base) / 2),
                      (0.20, 0.17, wall_top - wall_base), WOOD[1])
            walls.box((x, cy, (wall_top + wall_base) / 2),
                      (0.15, y1 - y0 - 0.15, wall_top - wall_base - 0.14), PAPER[col])
            for row in range(5):
                frame.box((x * 1.022, cy, wall_base + 0.14 + row * 0.135),
                          (0.07, y1 - y0 - 0.14, 0.10), WOOD[(row + col) % 3])
            if col == 1:
                frame.box((x * 1.032, cy, wall_base + 1.67), (0.12, 1.04, 0.73), WOOD[4])
                walls.box((x * 1.045, cy, wall_base + 1.67), (0.05, 0.84, 0.55), PAPER[1])
                for i in range(-3, 4):
                    frame.box((x * 1.059, cy + i * 0.134, wall_base + 1.67),
                              (0.045, 0.043, 0.62), WOOD[1], 0.008)
        eave = wall_top + 0.20
        rise = 1.61 if shrine else 1.91
        spans = [front, -d * 0.52, 0, d * 0.52, d]
        upper = [eave + rise * (1 - abs(y) / (d + 0.55)) ** 1.30 - 0.11 for y in spans]
        # Rectangular strips and capped triangles create the closed gables.
        for y0, y1, z0, z1 in zip(spans, spans[1:], upper, upper[1:]):
            walls.beam((x, y0, wall_top + 0.13), (x, y1, wall_top + 0.13),
                       0.17, 0.21, WOOD[1])
            walls.add([(x * 0.99, y0, wall_top), (x * 0.99, y1, wall_top),
                       (x * 0.99, y1, z1), (x * 0.99, y0, z0)],
                      [(0, 1, 2, 3)] if x > 0 else [(3, 2, 1, 0)], PAPER[0])
            frame.beam((x * 1.008, y0, z0), (x * 1.008, y1, z1), 0.12, 0.11, WOOD[1])
        frame.box((x * 1.018, 0, (upper[2] + wall_top) / 2),
                  (0.13, 0.15, upper[2] - wall_top), WOOD[1])
    kawara(roof, frame, w + 0.54, d + 0.55, wall_top + 0.20, 1.61 if shrine else 1.91)
    if shrine:
        for x in (-2.45, -1.23, 1.23, 2.45):
            frame.box((x, -d - 0.05, floor + 1.31), (0.20, 0.20, 2.62), WOOD[1])
            frame.beam((x, -d - 0.08, wall_top - 0.50), (x, front, wall_top - 0.15),
                       0.13, 0.12, WOOD[2])
        for x in (-1.84, 1.84):
            for z in (floor + 0.36, floor + 0.73):
                frame.box((x, -d - 0.12, z), (1.24, 0.12, 0.12), WOOD[2])
        for i in range(19):
            x = -w + (i + 0.5) * width / 19
            frame.box((x, -d + 0.32, floor + 0.16), (width / 19 - 0.012, 0.9, 0.09),
                      WOOD[(i % 3) + 1], 0.013)
        for i in range(3):
            step_h = (i + 1) * 0.195
            rocks.box((0, -d - 0.91 + i * 0.28, step_h / 2),
                      (2.16 - i * 0.08, 0.55, step_h), STONE[i + 1], 0.06)
        hardware.box((0, front - 0.17, wall_top - 0.32), (0.44, 0.11, 0.61), GOLD)
        hardware.box((0, front - 0.239, wall_top - 0.32), (0.31, 0.04, 0.49), WOOD[0])
        # Braided rope and folded shide hang under the open porch eave.
        rope = [(x * 0.18, -d - 0.10, 2.73 + 0.016 * x ** 2) for x in range(-5, 6)]
        hardware.stem(rope, [0.044] * 11, GOLD, 7)
        paper = Mesh("Folded ritual paper", RITUAL_PAPER)
        pieces.append(paper)
        for i in (-3, -1, 1, 3):
            x, y, z = rope[i + 5]
            paper.add([(x - 0.045, y, z - 0.025), (x + 0.045, y, z - 0.025),
                       (x + 0.032, y - 0.025, z - 0.13), (x + 0.055, y - 0.055, z - 0.22),
                       (x - 0.045, y - 0.055, z - 0.22), (x - 0.058, y - 0.025, z - 0.13)],
                      [(0, 1, 2, 5), (5, 2, 3, 4)], PAPER[1])
    else:
        rocks.box((0, -d - 0.28, 0.10), (2.6, 0.67, 0.20), STONE[1], 0.055)
        rocks.box((0, -d - 0.10, 0.16), (2.25, 0.40, 0.32), STONE[2], 0.055)
        frame.box((-2.64, d + 0.42, 0.33), (1.51, 0.59, 0.13), WOOD[2])
        for x in (-3.20, -2.06):
            frame.box((x, d + 0.4, 0.16), (0.13, 0.14, 0.32), WOOD[0])
        for x in (-3.1, 3.1):
            frame.beam((x, -d - 0.12, 2.90), (x, -d - 0.55, 3.39),
                       0.12, 0.13, WOOD[1])
    return pieces


def bridge_height(x):
    return 0.20 + 1.35 * (1 - (x / 7) ** 2)


def bridge():
    deck = Mesh("Scored cedar deck and edge stringers")
    rails = Mesh("Vermilion handrails and pinned joinery", SATIN)
    fittings = Mesh("Post finials and metal fittings", SATIN)
    stones = Mesh("Wet stone springers and seats", MASONRY)
    xs = [i * 7 / 24 for i in range(-24, 25)]
    # The tread's triangulated top follows the same profile as the player collider.
    for i, (a, b) in enumerate(zip(xs, xs[1:])):
        left, right = -1.61, 1.61
        h0, h1 = bridge_height(a), bridge_height(b)
        gap = 0.012
        for y0, y1 in ((left, -0.81), (-0.80, 0.01), (0.02, 0.82), (0.83, right)):
            dl, dr = (-0.002 if i % 2 else 0.002), (0.002 if i % 2 else -0.002)
            x0, x1 = max(-7, a + dl), min(7, b + dr)
            deck.rings([[(x0, y0, h0 - 0.105), (x1, y0, h1 - 0.105),
                         (x1 - gap, y1, h1 - 0.105), (x0, y1, h0 - 0.105)],
                        [(x0, y0, h0), (x1, y0, h1),
                         (x1 - gap, y1, h1), (x0, y1, h0)]],
                       RNG.choice(WOOD[1:4]))
    for side in (-1, 1):
        for y, off, depth, paint in ((1.46, -0.23, 0.28, LACQUER[0]),
                                      (1.22, -0.40, 0.22, WOOD[0]),
                                      (1.68, -0.085, 0.13, LACQUER[1])):
            deck.rings([[(x, side * y + dx, bridge_height(x) + (off + dz) * min(1, bridge_height(x) / 0.53))
                         for dx, dz in ((-0.087, -depth / 2), (0.087, -depth / 2),
                                        (0.087, depth / 2), (-0.087, depth / 2))]
                        for x in xs], paint)
        y = side * 1.66
        handrail_profile = [(-0.10, -0.043), (0.10, -0.043), (0.14, -0.012),
                            (0.14, 0.021), (0.106, 0.065), (-0.106, 0.065),
                            (-0.14, 0.021), (-0.14, -0.012)]
        for height, scale in ((1.04, 1), (0.49, 0.67)):
            rails.rings([[(x, y + dx * scale, bridge_height(x) + height + dz * scale)
                          for dx, dz in handrail_profile] for x in xs], LACQUER[3 if scale == 1 else 1])
        for i in range(9):
            x = -6.84 + 1.71 * i
            z = bridge_height(x)
            rails.box((x, y, z + 0.51), (0.205, 0.205, 1.33), LACQUER[2])
            fittings.box((x, y, z + 1.16), (0.215, 0.22, 0.083), LACQUER[0])
            fittings.stem([(x, y, z + 1.19), (x, y, z + 1.22),
                           (x, y, z + 1.32), (x, y, z + 1.36)],
                          [0.095, 0.106, 0.072, 0.019], IRON[0], 8)
            for rail_z in (0.18, 0.73):
                fittings.stem([(x, y - 0.105, z + rail_z), (x, y + 0.107, z + rail_z)],
                              [0.022, 0.022], IRON[0], 6)
        for i in range(8):
            for j in (1, 2, 3):
                x = -6.84 + 1.71 * (i + j / 4)
                z = bridge_height(x)
                rails.box((x, y, z + 0.57), (0.061, 0.08, 0.94),
                          LACQUER[1 + (j + i) % 3], 0.011)
        for direction in (-1, 1):
            for i in range(4):
                x = direction * (5.98 + i * 0.246)
                h = 0.17 - i * 0.018
                stones.volume((x, side * (1.29 + 0.03 * (i % 2)), h),
                              (0.26, 0.41, h), RIVER, 7, 2, 0.10)
    return [deck, rails, fittings, stones]


def torii():
    post = Mesh("Splayed vermilion columns and tie beams", SATIN)
    crown = Mesh("Swept lintel, rain cap and carved plaque", SATIN)
    stone = Mesh("Stone shoes and dark post collars", MASONRY)
    for x in (-1.70, 1.70):
        stone.stem([(x, 0, 0), (x, 0, 0.12), (0.997 * x, 0, 0.25)],
                   [0.37, 0.37, 0.30], STONE[1], 10)
        stone.stem([(0.997 * x, 0, 0.23), (0.985 * x, 0, 0.57)],
                   [0.285, 0.258], IRON[0], 12)
        post.stem([(0.984 * x, 0, 0.52), (x * 0.958, 0, 1.50),
                   (x * 0.927, 0, 2.68), (0.89 * x, 0, 3.94)],
                  [0.258, 0.239, 0.225, 0.206], LACQUER[2], 12)
        post.box((1.085 * x, 0, 2.89), (0.12, 0.51, 0.17), LACQUER[0])
        crown.box((x * 0.911, 0, 3.74), (0.52, 0.52, 0.17), LACQUER[1])
    post.beam((-2.18, 0, 2.99), (2.18, 0, 2.99), 0.37, 0.21, LACQUER[3])
    post.beam((-1.79, 0, 3.10), (1.79, 0, 3.10), 0.29, 0.082, LACQUER[1])
    for w, d, base, h, paint in ((2.24, 0.23, 3.74, 0.22, LACQUER[1]),
                                 (2.35, 0.28, 3.90, 0.21, LACQUER[3]),
                                 (2.42, 0.34, 4.06, 0.15, TILES[0])):
        rows = []
        for i in range(-14, 15):
            s = i / 14
            z = base + 0.23 * abs(s) ** 4
            rows.append([(s * w, dx * d, z + dz * h)
                         for dx, dz in ((-0.86, 0), (0.86, 0), (1, 0.40), (1, 0.80),
                                        (0.83, 1), (-0.83, 1), (-1, 0.80), (-1, 0.40))])
        crown.rings(rows, paint)
    for y in (-0.21, 0.21):
        crown.box((0, y, 3.49), (0.43, 0.16, 0.65), LACQUER[1])
        crown.box((0, y * 1.42, 3.49), (0.32, 0.045, 0.52), GOLD)
        crown.box((0, y * 1.54, 3.49), (0.266, 0.035, 0.46), WOOD[4])
        for z, w in ((3.59, 0.11), (3.52, 0.08), (3.44, 0.104), (3.38, 0.064)):
            crown.box((0, y * 1.63, z), (w, 0.016, 0.019), GOLD, 0.005)
    return [stone, post, crown]


def sakura():
    wood = Mesh("Root flare, forked trunk and flowering limbs")
    buds = Mesh("Clouds of blossoms and individually swept petal sprays", FOLIAGE)
    trunk = [(0, 0, 0), (0.01, -0.07, 0.44), (-0.12, -0.02, 1.25),
             (-0.33, 0.14, 2.26), (-0.17, 0.25, 3.02), (0.12, 0.33, 3.78),
             (0.28, 0.55, 4.64), (0.69, 0.59, 5.19)]
    wood.stem(trunk, [0.62, 0.45, 0.35, 0.31, 0.27, 0.22, 0.13, 0.035], CEDAR_WOOD, 10)
    for angle in (0.1, 1.22, 2.20, 3.39, 4.55, 5.21):
        x, y = cos(angle), sin(angle)
        wood.stem([(0, 0, 0.37), (x * 0.42, y * 0.42, 0.18), (x * 0.92, y * 0.92, 0.08)],
                  [0.20, 0.14, 0.024], CEDAR_WOOD, 6)
    limbs = [
        (2, (-1.65, -0.20, 2.96), (-3.28, -0.35, 4.46)),
        (3, (0.66, -0.69, 3.42), (2.22, -1.72, 4.91)),
        (4, (-0.89, -1.07, 4.05), (-1.66, -2.47, 5.40)),
        (4, (-1.21, 0.87, 4.39), (-2.63, 1.91, 5.45)),
        (5, (0.75, 1.21, 4.82), (1.64, 2.45, 5.80)),
        (5, (1.31, 0.38, 4.73), (3.40, 0.13, 5.67)),
        (6, (0.20, 0.67, 5.33), (-0.67, 0.39, 6.60)),
        (6, (0.89, -0.18, 5.24), (1.44, -0.61, 6.37)),
    ]
    for start, elbow, end in limbs:
        a, b, c = Vector(trunk[start]), Vector(elbow), Vector(end)
        mid = b.lerp(c, 0.62) + Vector((0.09, 0, -0.09))
        wood.stem([a, b, mid, c], [0.25 - start * 0.017, 0.136, 0.086, 0.026], CEDAR_WOOD)
        for index in range(4):
            root = b.lerp(c, 0.17 + index * 0.24)
            angle = RNG.uniform(0, 2 * pi)
            tip = root + Vector((cos(angle) * 0.65, sin(angle) * 0.82, RNG.uniform(0.55, 0.96)))
            wood.stem([root, root.lerp(tip, 0.49), tip], [0.069, 0.043, 0.009], CEDAR_WOOD, 5)
            s = RNG.uniform(0.63, 0.95)
            buds.volume(tuple(tip), (s * 1.15, s, s * 0.48), FLOWERS, 8, 3, 0.19)
            for j in range(6):
                phase = j * pi / 3 + RNG.uniform(-0.4, 0.4)
                f = RNG.uniform(0.28, 0.72)
                center = tip + Vector((cos(phase) * f, sin(phase) * f, RNG.uniform(-0.21, 0.44)))
                p = RNG.uniform(0.22, 0.38)
                buds.volume(center, (p * 1.22, p, p * 0.66), FLOWERS, 6, 2, 0.17)
            # Five small folded petal lobes leave negative space around the coarse cluster edges.
            for j in range(3):
                phase = (j + RNG.random()) * 2 * pi / 3
                flower = tip + Vector((cos(phase) * s, sin(phase) * s, RNG.uniform(-0.20, 0.09)))
                for k in range(5):
                    angle = phase + k * 2 * pi / 5
                    petal = flower + Vector((cos(angle) * 0.080, sin(angle) * 0.080, -0.015))
                    buds.volume(petal, (0.086, 0.072, 0.037), FLOWERS[(j + k) % 3 + 3], 5, 1, 0.06)
    return [wood, buds]


def cedar():
    wood = Mesh("Cedar trunk, exposed roots and bent fans")
    needles = Mesh("Overlapping cedar sprays", FOLIAGE)
    wood.stem([(0, 0, 0), (0.027, -0.06, 1.23), (-0.06, 0.08, 3.85),
               (0.04, -0.02, 6.3), (0.03, 0, 8.82)],
              [0.30, 0.225, 0.155, 0.094, 0.017], CEDAR_WOOD, 9)
    for level in range(9):
        z = 1.99 + level * 0.79
        span = 2.03 - level * 0.192
        arms = 5 if level < 4 else 4
        for arm in range(arms):
            phase = 2 * pi * arm / arms + 1.31 * level
            dx, dy = cos(phase), sin(phase)
            tip = Vector((dx * span, dy * span, z - 0.24 + RNG.uniform(-0.13, 0.12)))
            wood.stem([(0, 0, z), (tip.x * 0.56, tip.y * 0.56, z - 0.32), tip],
                      [0.066, 0.045, 0.012], CEDAR_WOOD, 5)
            for offset, count in ((0.42, 2), (0.72, 2), (0.96, 1)):
                for sign in (-1, 1) if count > 1 else (0,):
                    cx = tip.x * offset + dy * sign * span * 0.15
                    cy = tip.y * offset - dx * sign * span * 0.15
                    scale = (1.0 - offset * 0.45) * (0.70 + span * 0.22)
                    needles.volume((cx, cy, z + 0.11 * sin(offset * pi)),
                                   (scale * 0.70, scale * 0.66, scale * 0.47), PINE, 7, 2, 0.15)
    needles.volume((0.027, -0.01, 8.47), (0.49, 0.46, 0.63), PINE, 7, 3, 0.19)
    return [wood, needles]


def lantern():
    granite = Mesh("Granite lantern plinth, gabled cap and open chamber", MASONRY)
    for radius, z0, z1 in ((0.44, 0, 0.10), (0.33, 0.10, 0.22),
                           (0.25, 0.22, 0.29), (0.27, 0.98, 1.08)):
        granite.stem([(0, 0, z0), (0, 0, z1)], [radius, radius * 0.96], STONE, 8)
    granite.stem([(0, 0, 0.28), (0, 0, 0.41), (0, 0, 0.86), (0, 0, 0.99)],
                 [0.20, 0.155, 0.135, 0.20], STONE[1], 8)
    for z, r in ((1.10, 0.28), (1.18, 0.34), (1.47, 0.32)):
        granite.rings([rectangle((-r, r), (-r, r), z), rectangle((-r, r), (-r, r), z + 0.07)],
                      STONE[2])
    for x in (-0.24, 0.24):
        for y in (-0.24, 0.24):
            granite.box((x, y, 1.36), (0.13, 0.13, 0.32), STONE[1])
    granite.rings([rectangle((-r, r), (-r, r), z)
                   for r, z in ((0.39, 1.49), (0.44, 1.55), (0.37, 1.64), (0.22, 1.75), (0.11, 1.88))],
                  STONE)
    granite.stem([(0, 0, 1.87), (0, 0, 1.92), (0, 0, 2.02), (0, 0, 2.075)],
                 [0.105, 0.112, 0.076, 0.020], STONE[1], 7)
    return [granite]


def rock():
    river_stone = Mesh("Water-cut boulder with flaked wedge and companions", MASONRY)
    river_stone.volume((-0.13, 0.04, 0.57), (1.10, 0.83, 0.57), RIVER, 9, 3, 0.22)
    river_stone.volume((0.76, -0.24, 0.23), (0.52, 0.43, 0.23), RIVER, 7, 2, 0.20)
    river_stone.volume((-0.76, 0.45, 0.17), (0.47, 0.30, 0.17), RIVER, 7, 2, 0.18)
    return [river_stone]


def blade(mesh, base, direction, length, bow, width, paint):
    x, y, z = base
    dx, dy = direction
    # A central crease gives each curved lance leaf two independently lit planes.
    vertices = []
    for t in (0.0, 0.33, 0.68):
        w = width * (0.32 + 0.68 * sin(pi * t))
        px, py = x + dx * bow * t ** 1.35, y + dy * bow * t ** 1.35
        pz = z + length * t - 0.10 * bow * t ** 2
        vertices.extend([(px - dy * w, py + dx * w, pz), (px, py, pz + 0.48 * w),
                         (px + dy * w, py - dx * w, pz)])
    vertices.append((x + dx * bow, y + dy * bow, z + length - 0.10 * bow))
    faces = [(0, 1, 4, 3), (1, 2, 5, 4), (3, 4, 7, 6), (4, 5, 8, 7), (6, 7, 9), (7, 8, 9)]
    mesh.add(vertices, faces, [paint[0], paint[1]] * 3)


def bamboo():
    poles = Mesh("Segmented bamboo culms and branch runners")
    leaves = Mesh("Lanceolate leaf sprays", LEAVES)
    for index in range(7):
        a = index * 2.40
        bx, by = cos(a) * 0.51, sin(a) * 0.46
        height = RNG.uniform(4.9, 6.65)
        bend = RNG.uniform(0.14, 0.43)
        rings = [(bx + cos(a) * bend * t ** 2, by + sin(a) * bend * t ** 2, height * t)
                 for t in (0, 0.18, 0.35, 0.52, 0.68, 0.82, 0.95, 1)]
        radii = [0.08, 0.074, 0.071, 0.061, 0.055, 0.045, 0.035, 0.016]
        for j, (p1, p2) in enumerate(zip(rings, rings[1:])):
            poles.stem([p1, p2], radii[j:j + 2], BAMBOO[(index + j) % 3], 7)
            if j:
                poles.stem([(p1[0], p1[1], p1[2] - 0.023),
                            (p1[0], p1[1], p1[2] + 0.036)],
                           [radii[j] + 0.009] * 2, BAMBOO[0], 7)
        for j in range(3, 8):
            anchor = Vector(rings[j])
            direction = a + (j % 2) * 2.0 - 0.9
            branch = Vector((cos(direction), sin(direction), 0))
            tip = anchor + branch * (0.79 - 0.047 * j) + Vector((0, 0, 0.23))
            poles.stem([anchor, anchor.lerp(tip, 0.58), tip], [0.025, 0.017, 0.006], BAMBOO[0], 5)
            for k in range(7):
                start = anchor.lerp(tip, 0.34 + k * 0.11)
                angle = direction + (-1 if k % 2 else 1) * RNG.uniform(0.26, 1.40)
                blade(leaves, start, (cos(angle), sin(angle)), RNG.uniform(0.00, 0.21),
                      RNG.uniform(0.26, 0.45), RNG.uniform(0.031, 0.052), BAMBOO[1:3])
    return [poles, leaves]


def rice():
    greens = Mesh("Seven rice seedlings with folded wet leaf blades", LEAVES)
    for i in range(7):
        phase = i * 2.4
        start = (0.065 * cos(phase), 0.065 * sin(phase), 0)
        for angle, height, reach in ((phase, 0.50, 0.25), (phase + 1, 0.39, 0.29),
                                     (phase - 0.48, 0.55, 0.15), (phase + 2.7, 0.60, 0.10)):
            blade(greens, start, (cos(angle), sin(angle)), height + RNG.random() * 0.03,
                  reach, 0.020, [RICE[i % 4], RICE[1 + (i % 3)]])
    return [greens]


def fence():
    timber = Mesh("Split cedar posts and pegged rails")
    for x in (-1.10, 1.10):
        timber.rings([rectangle((x - size, x + size), (-size, size), z)
                      for size, z in ((0.095, 0), (0.095, 0.97), (0.073, 1.04))], WOOD[1])
        for z in (0.37, 0.74):
            timber.stem([(x, -0.105, z), (x, -0.068, z)], [0.032, 0.029], WOOD[0], 6)
    for h in (0.37, 0.74):
        timber.rings([[(x, y, z + h + offset) for y, z in
                       ((-0.053, -0.056), (0.04, -0.047), (0.054, 0.032), (-0.041, 0.052))]
                      for x, offset in ((-1.2, 0.0), (-0.47, -0.023), (0.46, 0.013), (1.20, 0))],
                     WOOD[2])
    return [timber]


def stair_tread():
    treads = Mesh("Dressed granite riser with a level walkable surface", MASONRY)
    rim = [(-1.5, -0.117), (-1.40, -0.19), (-0.56, -0.183), (0.31, -0.188),
           (1.33, -0.182), (1.5, -0.12), (1.5, 0.137), (1.38, 0.19),
           (-0.42, 0.185), (-1.39, 0.19), (-1.48, 0.13)]
    treads.rings([[(x * scale, y * scale, z) for x, y in rim]
                  for scale, z in ((0.94, -0.32), (1.0, -0.26), (1.0, -0.065), (0.98, 0))],
                 STONE[1], caps=True)
    return [treads]


def build():
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.preferences.filepaths.use_file_compression = True
    initial = bpy.context.scene
    scenes = []
    library = {
        "house": building, "bridge": bridge, "torii": torii, "shrine": lambda: building(shrine=True),
        "sakura": sakura, "cedar": cedar, "stone-lantern": lantern, "rock": rock,
        "bamboo": bamboo, "rice": rice, "fence": fence, "stair-tread": stair_tread,
    }
    for index, (name, design) in enumerate(library.items()):
        RNG.seed(170114 + index)
        scene = bpy.data.scenes.new(name)
        scene.unit_settings.system = "METRIC"
        scene.view_settings.view_transform = "AgX"
        scene["asset_id"] = name
        scene["source"] = "Original geometry and palette authored in art/build_sakura.py"
        bpy.context.window.scene = scene
        for assembly in design():
            assembly.object(scene).select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{name}.glb"), export_format="GLB",
                                  use_active_scene=True, use_selection=True,
                                  export_yup=True, export_cameras=False, export_lights=False)
        scenes.append(scene)
    bpy.context.window.scene = scenes[0]
    bpy.data.scenes.remove(initial)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "art" / "sakura-library.blend"), compress=True)


if __name__ == "__main__":
    build()
