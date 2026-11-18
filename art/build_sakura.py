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


def detail_material(name, roughness, pattern):
    result = material(name, roughness)
    nodes = result.node_tree.nodes
    links = result.node_tree.links
    rng = Random(2944)
    size = 128
    grid = {(cols, rows): [rng.random() for _ in range(cols * rows)]
            for cols, rows in ((4, 4), (12, 12), (32, 32), (64, 5), (48, 3), (8, 4))}

    def noise(x, y, cols, rows):
        x, y = x * cols % cols, y * rows % rows
        ix, iy = int(x), int(y)
        sx, sy = x - ix, y - iy
        sx, sy = sx * sx * (3 - 2 * sx), sy * sy * (3 - 2 * sy)
        field = grid[cols, rows]
        a, b = iy * cols, ((iy + 1) % rows) * cols
        j = (ix + 1) % cols
        return (field[a + ix] * (1 - sx) + field[a + j] * sx) * (1 - sy) + (
            field[b + ix] * (1 - sx) + field[b + j] * sx) * sy

    colors, heights = [], []
    for row in range(size):
        y = row / size
        for col in range(size):
            x = col / size
            grain = noise(x, y, 32, 32)
            grit = rng.random()
            stains = noise(x, y, 4, 4)
            if pattern == "stone":
                moss = max(0, (stains * 0.74 + noise(x, y, 12, 12) * 0.26 - 0.62)) * 2.1
                m = 0.78 + 0.18 * grain + 0.10 * grit - 0.12 * moss
                colors.extend((m * (1 - 0.12 * moss), m, m * (1 - 0.24 * moss), 1.0))
                heights.append((0.50 * grain + 0.25 * grit + 0.25 * stains) * 0.87)
            elif pattern == "wood":
                bend = 0.041 * noise(x, y, 8, 4) + 0.009 * sin(2 * pi * y)
                streak = noise(x + bend, y, 64, 5)
                wide = noise(x + bend, y, 48, 3)
                m = 0.76 + 0.17 * wide + 0.14 * streak - 0.15 * max(0, 0.26 - streak)
                colors.extend((m, m * (0.98 - 0.05 * wide), m * (0.95 - 0.06 * wide), 1.0))
                heights.append((0.65 * streak + 0.21 * wide + 0.14 * grit) * 0.70)
            else:
                m = 0.78 + 0.13 * stains + 0.07 * grain + 0.07 * grit
                colors.extend((m * 0.985, m, m, 1.0))
                heights.append((0.16 * stains + 0.36 * grit + 0.48 * grain) * 0.46)

    normal_pixels = []
    for row in range(size):
        for col in range(size):
            dx = heights[row * size + (col + 1) % size] - heights[row * size + (col - 1) % size]
            dy = heights[((row + 1) % size) * size + col] - heights[((row - 1) % size) * size + col]
            normal = Vector((-dx * 1.6, -dy * 1.6, 1)).normalized()
            normal_pixels.extend((*((channel + 1) / 2 for channel in normal), 1.0))

    image_nodes = []
    for suffix, pixels, colorspace in (("weathering", colors, "sRGB"), ("relief", normal_pixels, "Non-Color")):
        image = bpy.data.images.new(f"Sakura {pattern} {suffix}", size, size, alpha=False)
        image.colorspace_settings.name = colorspace
        image.pixels.foreach_set(pixels)
        image.pack()
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        image_nodes.append(node)
    vertex = next(node for node in nodes if node.type == "VERTEX_COLOR")
    shader = nodes.get("Principled BSDF")
    multiply = nodes.new("ShaderNodeMix")
    multiply.data_type = "RGBA"
    multiply.blend_type = "MULTIPLY"
    multiply.inputs[0].default_value = 1.0
    links.new(image_nodes[0].outputs["Color"], multiply.inputs[6])
    links.new(vertex.outputs["Color"], multiply.inputs[7])
    links.new(multiply.outputs[2], shader.inputs["Base Color"])
    normal_node = nodes.new("ShaderNodeNormalMap")
    normal_node.inputs["Strength"].default_value = 0.72 if pattern == "stone" else 0.56
    links.new(image_nodes[1].outputs["Color"], normal_node.inputs["Color"])
    links.new(normal_node.outputs["Normal"], shader.inputs["Normal"])
    result["surface_pattern"] = pattern
    return result


SATIN = material("Paint | satin lacquer", 0.36)
MATTE = material("Paint | timber, tile and plaster", 0.84)
FOLIAGE = material("Paint | leaves and blossoms", 0.92, double_sided=True)
MASONRY = detail_material("Granite | mineral grain and recessed weathering", 0.92, "stone")
TIMBER = detail_material("Cedar | split grain and rubbed fibers", 0.86, "wood")
FIRED_TILE = detail_material("Kawara | fired clay and ash mottling", 0.76, "tile")
LEAVES = material("Paint | thin, two-sided leaves", 0.92, double_sided=True)
RITUAL_PAPER = material("Paint | thin, two-sided paper", 0.86, double_sided=True)


class Mesh:
    def __init__(self, name, finish=MATTE, smooth=False):
        self.name = name
        self.finish = finish
        self.smooth = smooth
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
            if self.smooth:
                face_colors = [tuple(channel * 0.45 + middle * 0.55
                                     for channel, middle in zip(shade, paint[len(paint) // 2 - 1]))
                               for shade in face_colors]
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
        if self.smooth:
            mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
        mesh.update()
        surface = self.finish.get("surface_pattern")
        if surface:
            uv = mesh.uv_layers.new(name="Weathering")
            for poly in mesh.polygons:
                a, b = sorted(sorted(range(3), key=lambda axis: abs(poly.normal[axis]))[:2])
                coordinates = [mesh.vertices[i].co for i in poly.vertices]
                if surface == "wood":
                    spans = [max(p[i] for p in coordinates) - min(p[i] for p in coordinates) for i in (a, b)]
                    if spans[0] > spans[1]:
                        a, b = b, a
                    u_scale, v_scale = 2.5, 0.79
                else:
                    u_scale, v_scale = (1.8, 1.8) if surface == "stone" else (1.1, 1.1)
                for loop, p in zip(poly.loop_indices, coordinates):
                    uv.uv[loop].vector = p[a] * u_scale + p[b] * 0.029, p[b] * v_scale
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


def roof_height(eave, rise, t, u):
    return eave + rise * (1 - t) ** 1.30 + 0.14 * t ** 7 + 0.12 * abs(u) ** 10 * t ** 2


def roof_tile(mesh, height, side, half_width, half_depth, upper, lower, left, right, paint):
    # The molded concave pan sweeps into a rounded edge. Courses overlap downhill.
    vertices = []
    for along, lip in ((0, 0.0), (0.54, 0.012), (1, 0.040)):
        t = upper + (lower - upper) * along
        for across, crown in ((0, 0.069), (0.18, 0.030), (0.5, 0.017), (0.82, 0.027), (1, 0.067)):
            u = left + (right - left) * across
            vertices.append((u * half_width, side * half_depth * t, height(t, u) + crown + lip))
    vertices.extend((x, y, z - 0.047) for x, y, z in vertices[10:15])
    faces = [(i * 5 + k, i * 5 + k + 1, (i + 1) * 5 + k + 1, (i + 1) * 5 + k)
             for i in range(3) for k in range(4)]
    if side < 0:
        faces = [tuple(reversed(face)) for face in faces]
    mesh.add(vertices, faces, [paint] * 8 + [TILES[0]] * 4)


def kawara(roof, framing, half_width, half_depth, eave, rise):
    def height(t, u):
        return roof_height(eave, rise, t, u)

    for side in (-1, 1):
        for i in range(9):
            t0, t1 = i / 9, (i + 1) / 9
            for j in range(14):
                u0, u1 = 2 * j / 14 - 1, 2 * (j + 1) / 14 - 1
                paint = RNG.choices(TILES, (1, 12, 5, 1, 8))[0]
                t_lower = t1 + 0.017 if i < 8 else t1
                roof_tile(roof, height, side, half_width, half_depth, t0, t_lower, u0, u1, paint)
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
        # Solid tongue-and-groove sheathing remains visible beneath the exposed raised rafters.
        for i in range(34):
            u0, u1 = (i / 17 - 1) * 0.99, ((i + 1) / 17 - 1) * 0.99
            under = [[(u * half_width, side * half_depth * t, height(t, u) + z)
                      for u, z in ((u0, -0.118), (u1, -0.118), (u1, -0.065), (u0, -0.065))]
                     for t in (0, 0.20, 0.40, 0.60, 0.76, 0.88, 0.99)]
            framing.rings(under, WOOD[0 if i % 5 == 0 else 1])
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
    frame = Mesh("Timber frame, sill, tongue-and-groove soffit and rafters", TIMBER)
    roof = Mesh("Fired roof tiles and ridge caps", FIRED_TILE)
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
            transom = roof_height(wall_top + 0.20, 1.61 if shrine else 1.91, abs(y) / (d + 0.55), 0)
            high = transom - 0.07
            low = wall_top + 0.05
            walls.box((center, y, (high + low) / 2), (width / 4 + 0.010, 0.13, high - low), PAPER[3])
            for slat in range(4):
                x = panel_start + (slat + 0.5) * width / 16
                frame.box((x, y - 0.085, (high + low) / 2), (0.042, 0.072, high - low), WOOD[2], 0.006)
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


def cherry_blossom(mesh, center, direction, radius, phase, paint):
    """Folded five-petal flower with a central cup and cleft petal tips."""
    n = direction.normalized()
    u = n.cross(Vector((0, 1, 0))).normalized()
    v = n.cross(u)
    vertices = [center - n * radius * 0.08]
    faces = []
    for petal in range(5):
        angle = phase + petal * 2 * pi / 5
        start = len(vertices)
        for turn, length, cup in ((-0.46, 0.42, 0.12), (-0.36, 0.93, 0.26), (0, 0.87, 0.14),
                                  (0.35, 1, 0.31), (0.46, 0.44, 0.10)):
            edge = cos(angle + turn) * u + sin(angle + turn) * v
            vertices.append(center + radius * (edge * length + n * cup))
        faces.extend([(0, start, start + 1, start + 2), (0, start + 2, start + 3, start + 4)])
    mesh.add(vertices, faces, paint)


def sakura():
    wood = Mesh("Forked cherry trunk, exposed roots and swept branchlets", TIMBER, smooth=True)
    buds = Mesh("Five-lobed cupped sakura flowers", FOLIAGE, smooth=True)
    leaves = Mesh("Young serrate cherry leaves", LEAVES, smooth=True)
    trunk = [(0, 0, 0), (0.01, -0.07, 0.44), (-0.12, -0.02, 1.25),
             (-0.33, 0.14, 2.26), (-0.17, 0.25, 3.02), (0.12, 0.33, 3.78),
             (0.28, 0.55, 4.64), (0.69, 0.59, 5.19)]
    wood.stem(trunk, [0.59, 0.45, 0.35, 0.31, 0.27, 0.22, 0.13, 0.035], CEDAR_WOOD[1], 12)
    for angle in (0.1, 1.22, 2.20, 3.39, 4.55, 5.21):
        x, y = cos(angle), sin(angle)
        wood.stem([(0, 0, 0.37), (x * 0.42, y * 0.42, 0.18), (x * 0.92, y * 0.92, 0.08)],
                  [0.20, 0.14, 0.024], CEDAR_WOOD[1], 7)
    limbs = [
        (2, (-1.65, -0.20, 2.96), (-3.04, -0.60, 4.35)),
        (3, (0.66, -0.69, 3.42), (2.05, -1.80, 4.68)),
        (4, (-0.89, -1.07, 4.05), (-1.52, -2.36, 5.19)),
        (4, (-1.21, 0.87, 4.39), (-2.54, 1.76, 5.40)),
        (5, (0.75, 1.21, 4.82), (1.46, 2.44, 5.64)),
        (5, (1.31, 0.38, 4.73), (3.01, 0.13, 5.54)),
        (6, (0.20, 0.67, 5.33), (-0.67, 0.39, 6.57)),
        (6, (0.89, -0.18, 5.24), (1.44, -0.61, 6.30)),
    ]
    spring = palette("6d8050 8b9559 acaa72")
    for limb, (start, elbow, end) in enumerate(limbs):
        a, b, c = Vector(trunk[start]), Vector(elbow), Vector(end)
        mid = b.lerp(c, 0.64) + Vector((0.08, 0.04, -0.08))
        wood.stem([a, b, mid, c], [0.24 - start * 0.016, 0.129, 0.075, 0.020], CEDAR_WOOD[2], 9)
        for fork in range(6):
            root = b.lerp(c, 0.06 + fork * 0.175)
            theta = 2.39 * (fork + limb) + RNG.uniform(-0.4, 0.4)
            lateral = Vector((cos(theta), sin(theta), 0))
            tip = root + lateral * RNG.uniform(0.30, 0.62) + Vector((0, 0, RNG.uniform(0.52, 0.91)))
            elbow_point = root.lerp(tip, 0.55) + lateral * 0.13
            wood.stem([root, elbow_point, tip], [0.035, 0.024, 0.006], CEDAR_WOOD[2], 5)
            for spray in range(4):
                angle = theta + 1.87 * spray
                ray = Vector((cos(angle), sin(angle), 0))
                node = elbow_point.lerp(tip, 0.12 + spray * 0.27)
                end_point = node + ray * RNG.uniform(0.19, 0.43) + Vector((0, 0, RNG.uniform(-0.11, 0.18)))
                wood.stem([node, end_point], [0.008, 0.003], CEDAR_WOOD[3], 4)
                for j in range(7):
                    phase = angle + j * 2.40 + RNG.uniform(-0.35, 0.35)
                    rise = RNG.uniform(-0.12, 0.16)
                    radial = Vector((cos(phase), sin(phase), 0))
                    reach = RNG.uniform(0.045, 0.15)
                    center = node.lerp(end_point, 0.28 + j * 0.112) + radial * reach + Vector((0, 0, rise))
                    facing = radial * 0.68 + Vector((0, 0, RNG.uniform(-0.90, 1.10)))
                    radius = RNG.uniform(0.075, 0.144)
                    lightness = (2 + ((limb + spray) % 2)) if rise < -0.06 else 4
                    cherry_blossom(buds, center, facing, radius, phase, RNG.choice(FLOWERS[lightness:]))
                for offset in (0.38, 0.81):
                    blade(leaves, node.lerp(end_point, offset), (cos(angle), sin(angle)),
                          RNG.uniform(-0.05, 0.11), RNG.uniform(0.16, 0.25), 0.030, spring[1:])
    return [wood, buds, leaves]


def cedar_spray(mesh, root, tip, breadth, paint, teeth):
    """One folded, toothed cedar branchlet, placed in mirrored irregular fans."""
    axis = tip - root
    cross = Vector((-axis.y, axis.x, 0)).normalized()
    vertices = [root]
    for i in range(teeth):
        t = (i + 1) / (teeth + 1)
        mid = root.lerp(tip, t)
        width = breadth * sin(pi * t) ** 0.58 * (1 if i % 2 == 0 else 0.43)
        vertices.extend([mid - cross * width, mid + Vector((0, 0, 0.10 * width)), mid + cross * width])
    vertices.append(tip)
    faces = [(0, 1, 2), (0, 2, 3)]
    for i in range(teeth - 1):
        a = 1 + i * 3
        faces.extend([(a, a + 3, a + 4, a + 1), (a + 1, a + 4, a + 5, a + 2)])
    k = len(vertices) - 4
    faces.extend([(k, k + 3, k + 1), (k + 1, k + 3, k + 2)])
    mesh.add(vertices, faces, [paint[0], paint[1]] * (teeth + 1))


def cedar(distant=False):
    wood = Mesh("Swept cedar trunk and loaded branches", smooth=True)
    needles = Mesh("Interleaved pendent needle fans", LEAVES, smooth=True)
    trunk = [(0, 0, 0), (0.042, -0.025, 1.30), (-0.07, 0.055, 3.4),
             (-0.02, -0.09, 5.77), (0.11, 0.02, 7.68), (0.035, 0.00, 9.10)]
    wood.stem(trunk, [0.296, 0.224, 0.162, 0.104, 0.053, 0.008], CEDAR_WOOD[1], 9)
    branch_rng = Random(28223)
    for index in range(35):
        h = 1.92 + index * 0.200 + branch_rng.uniform(-0.18, 0.18)
        phase = index * 2.399963 + branch_rng.uniform(-0.33, 0.33)
        t = (h - 1.7) / 7.58
        span = (2.26 * (1 - t) ** 0.76 + 0.11) * branch_rng.uniform(0.78, 1.04)
        outward = Vector((cos(phase), sin(phase), 0))
        lateral = Vector((-outward.y, outward.x, 0))
        base = Vector((0.02, 0.0, h + 0.25))
        elbow = base + outward * span * 0.57 + Vector((0, 0, -0.32))
        tip = base + outward * span + Vector((0, 0, branch_rng.uniform(-0.33, 0.15)))
        if not distant or index < 5:
            wood.stem([base, elbow, tip], [0.040 * (1 - t) + 0.012, 0.027 * (1 - t) + 0.007, 0.004],
                      CEDAR_WOOD[2], 5)
        paint = PINE[1 + index % 3:3 + index % 3]
        for offset in ((0.43, 0.70, 0.88) if distant else (0.34, 0.55, 0.72, 0.88)):
            root = base.lerp(elbow, offset * 2) if offset <= 0.5 else elbow.lerp(tip, (offset - 0.5) * 2)
            for sign in (-1, 1):
                width = (0.38 + 0.35 * span) * (1 - 0.53 * offset)
                endpoint = root + sign * lateral * width + outward * width * 0.60
                endpoint.z -= 0.28 * (1 - offset) * width
                cedar_spray(needles, root, endpoint, width * (0.51 if distant else 0.37),
                            paint, 2 if distant else 5)
                if not distant:
                    for feather in range(2):
                        fork = root.lerp(endpoint, 0.29 + feather * 0.25)
                        tuft = fork + (sign * lateral * 0.31 + outward * 0.69) * width
                        tuft.z += (feather - 1) * 0.06
                        cedar_spray(needles, fork, tuft, width * 0.18, paint, 3)
        if not distant or index % 2 == 0:
            cedar_spray(needles, elbow, tip + outward * 0.10, span * 0.13, paint, 3 if distant else 6)
    for i in range(9):
        a = i * 2.40
        root = Vector((0.03, 0.02, 8.42 + i * 0.056))
        tip = root + Vector((cos(a) * 0.41, sin(a) * 0.41, 0.19))
        cedar_spray(needles, root, tip, 0.14, PINE[3:5], 3)
    # Both export variants carry the same footprint around the unchanged trunk anchor.
    x_scale, y_scale = (0.96, 1.04) if distant else (0.875, 0.94)
    for group in (wood, needles):
        group.vertices = [(x * x_scale, y * y_scale, z) for x, y, z in group.vertices]
    return [wood, needles]


def chipped_ashlar(mesh, bounds, levels, paint, rng, chips=0.021):
    """Stone cut with uneven edge arrises, chipped nosing and a deliberately level crown."""
    (left, right), (back, front) = bounds
    w, d = right - left, front - back
    jitter = [rng.uniform(0.11, 0.28), rng.uniform(0.39, 0.55), rng.uniform(0.71, 0.83)]
    rim = [(0.0, 0.18), (0.034, 0.052), *((t, 0) for t in jitter), (0.94, 0.026), (1.0, 0.16),
           (0.997, 0.81), (0.945, 0.96), *((t, 1) for t in reversed(jitter)), (0.059, 0.97), (0, 0.85)]
    faults = [rng.uniform(-0.70, 0.70) for _ in rim]
    center = Vector(((left + right) / 2, (back + front) / 2, 0))
    rows = []
    for level, (z, inset) in enumerate(levels):
        row = []
        for index, (x, y) in enumerate(rim):
            pt = Vector((left + x * w, back + y * d, z))
            direction = center - pt
            direction.z = 0
            offset = inset + chips * max(0, faults[index]) * (0.26 if level == 1 else 1.0)
            pt += direction.normalized() * offset
            if level == len(levels) - 1:
                pt.z -= chips * max(0, -faults[index]) * 0.52
            row.append(pt)
        rows.append(row)
    mesh.rings(rows, paint, caps=True)


def lantern():
    granite = Mesh("Weathered sotoba plinth, fluted column and lotus tray", MASONRY)
    chamber = Mesh("Chipped firebox corner posts and swept stone roof", MASONRY)
    chipped_ashlar(granite, ((-0.44, 0.44), (-0.42, 0.42)),
                  ((0, 0.022), (0.027, 0), (0.087, 0.004), (0.13, 0.036)), STONE[1], RNG, 0.027)
    for profile, paint in [
        (((0.120, 0.34), (0.148, 0.36), (0.198, 0.32), (0.225, 0.27)), STONE[1]),
        (((0.219, 0.267), (0.243, 0.258), (0.272, 0.202), (0.299, 0.185)), STONE[0]),
        (((0.293, 0.18), (0.349, 0.17), (0.4, 0.151), (0.58, 0.132), (0.80, 0.137),
          (0.91, 0.169), (0.943, 0.178), (0.963, 0.189)), STONE[1]),
        (((0.944, 0.19), (0.976, 0.196), (1.007, 0.214), (1.04, 0.263),
          (1.08, 0.269), (1.105, 0.24)), STONE[2]),
    ]:
        granite.stem([(0, 0, z) for z, r in profile], [r for z, r in profile], paint, 12)
    for z, r in ((1.10, 0.28), (1.17, 0.34), (1.46, 0.32)):
        chipped_ashlar(chamber, ((-r, r), (-r, r)),
                      ((z, 0.025), (z + 0.019, 0), (z + 0.054, 0.003), (z + 0.072, 0.016)),
                      STONE[2], RNG, 0.014)
    for x in (-0.24, 0.24):
        for y in (-0.24, 0.24):
            chipped_ashlar(chamber, ((x - 0.062, x + 0.062), (y - 0.062, y + 0.062)),
                          ((1.22, 0.003), (1.25, 0), (1.43, 0.008), (1.51, 0.001)),
                          STONE[1], RNG, 0.009)
    for side in range(4):
        dx, dy = cos(side * pi / 2), sin(side * pi / 2)
        # Roof cheeks turn upward at the four corners and meet beneath the lotus finial.
        for i in range(10):
            a, b = i / 5 - 1, (i + 1) / 5 - 1
            rows = []
            for r, z in ((0.40, 1.49), (0.44, 1.55), (0.415, 1.59), (0.347, 1.65),
                         (0.251, 1.71), (0.175, 1.77), (0.108, 1.88)):
                rows.append([(r * (dx - dy * s), r * (dy + dx * s),
                              z + 0.084 * abs(s) ** 5 * (r / 0.44) ** 3) for s in (a, b)])
            chamber.rings(rows, STONE[1], caps=False, wrap=False)
        chamber.beam((0.40 * dx, 0.40 * dy, 1.53),
                     (0.23 * dx, 0.23 * dy, 1.53), 0.28, 0.043, STONE[0])
    chamber.stem([(0, 0, 1.87), (0, 0, 1.901), (0, 0, 1.936), (0, 0, 1.984), (0, 0, 2.02),
                  (0, 0, 2.055), (0, 0, 2.075)],
                 [0.124, 0.121, 0.102, 0.075, 0.062, 0.040, 0.012], STONE[1], 11)
    return [granite, chamber]


def rock():
    river_stone = Mesh("Water-cut boulder with flaked wedge and companions", MASONRY, smooth=True)
    river_stone.volume((-0.13, 0.04, 0.57), (1.10, 0.84, 0.57), RIVER, 13, 5, 0.13)
    river_stone.volume((0.76, -0.24, 0.23), (0.52, 0.43, 0.23), RIVER, 9, 3, 0.20)
    river_stone.volume((-0.76, 0.45, 0.17), (0.47, 0.30, 0.17), RIVER, 9, 3, 0.18)
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


def stair_tread(variant=0):
    treads = Mesh("Hand-dressed granite nosing, three individual voussoirs and recessed mortar", MASONRY)
    joints = [(-0.39, 0.62), (-0.66, 0.34), (-0.23, 0.80)][variant]
    divisions = [-1.5, *joints, 1.5]
    for i, (a, b) in enumerate(zip(divisions, divisions[1:])):
        if i != 0:
            a += 0.007
        if i != 2:
            b -= 0.007
        chipped_ashlar(treads, ((a, b), (-0.19, 0.19)),
                      ((-0.32, 0.029), (-0.24, 0), (-0.071, 0.005), (-0.026, 0.003), (0, 0.022)),
                      STONE[(variant + (i % 2) + 1) % 3], RNG, 0.024)
    treads.box((0, 0.009, -0.17), (2.96, 0.327, 0.295), STONE[0], 0.022)
    return [treads]


def meadow_tuft(sedge=False):
    name = "Sedge leaves and tight golden panicles" if sedge else "Splayed meadow grass"
    mesh = Mesh(name, LEAVES)
    colors = palette("53683a 738650 849855 9aa66a")
    dry = palette("746743 9c8756 b89e67")
    for i in range(11 if sedge else 9):
        angle = i * 2.40 + RNG.uniform(-0.27, 0.27)
        dx, dy = cos(angle), sin(angle)
        base = (dx * 0.033, dy * 0.036, 0)
        length = RNG.uniform(0.23, 0.47) if sedge else RNG.uniform(0.13, 0.28)
        bow = RNG.uniform(0.13, 0.30) if sedge else RNG.uniform(0.065, 0.166)
        blade(mesh, base, (dx, dy), length, bow, RNG.uniform(0.012, 0.020), colors[i % 2:i % 2 + 2])
    if sedge:
        for i in range(3):
            a = i * 2.40
            x, y = cos(a) * 0.026, sin(a) * 0.026
            tip = (x + cos(a) * 0.14, y + sin(a) * 0.14, 0.43 + 0.037 * i)
            mesh.add([(x - 0.008, y, 0), (x + 0.008, y, 0),
                      (tip[0] + 0.007, tip[1], tip[2]), (tip[0] - 0.007, tip[1], tip[2])],
                     [(0, 1, 2, 3)], dry[i % 2])
            mesh.volume((tip[0], tip[1], tip[2] + 0.01), (0.017, 0.013, 0.047),
                        dry[i % 2 + 1], sides=5, strata=1, wobble=0.08)
    return [mesh]


def build():
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.preferences.filepaths.use_file_compression = True
    initial = bpy.context.scene
    scenes = []
    library = {
        "house": building, "bridge": bridge, "torii": torii, "shrine": lambda: building(shrine=True),
        "sakura": sakura, "cedar": cedar, "stone-lantern": lantern, "rock": rock,
        "bamboo": bamboo, "rice": rice, "fence": fence, "stair-tread": stair_tread,
        "cedar-lod": lambda: cedar(distant=True),
        "stair-tread-b": lambda: stair_tread(variant=1),
        "stair-tread-c": lambda: stair_tread(variant=2),
        "grass": meadow_tuft, "river-sedge": lambda: meadow_tuft(sedge=True),
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
