"""Validate the binary geometry, vertex paint, and placement contract of the Sakura GLBs."""

import json
import math
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "public" / "models"
EXPECTED = {
    "house": (9.17, 5.61, 7.27),
    "bridge": (14.0, 2.91, 3.60),
    "torii": (4.84, 4.44, 0.74),
    "shrine": (7.16, 5.21, 6.55),
    "sakura": (9.3, 7.9, 7.3),
    "cedar": (4.7, 9.1, 4.7),
    "stone-lantern": (0.88, 2.075, 0.88),
    "rock": (2.5, 1.14, 1.65),
    "bamboo": (2.7, 6.8, 2.7),
    "rice": (0.60, 0.62, 0.60),
    "fence": (2.4, 1.04, 0.20),
    "stair-tread": (3.0, 0.32, 0.38),
}


def assert_close(actual, expected, tolerance=1e-5):
    assert abs(actual - expected) <= tolerance, f"{actual:.5f} outside {expected:.5f} +/- {tolerance}"


def read_model(path):
    data = path.read_bytes()
    magic, version, byte_length = struct.unpack_from("<4s2I", data)
    assert magic == b"glTF" and version == 2 and byte_length == len(data), path
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    bin_length, bin_type = struct.unpack_from("<I4s", data, 20 + json_length)
    assert json_type == b"JSON" and bin_type == b"BIN\0", path
    document = json.loads(data[20:20 + json_length])
    payload = memoryview(data)[28 + json_length:]
    assert len(payload) == bin_length, path
    return document, payload


def values(document, payload, index):
    accessor = document["accessors"][index]
    view = document["bufferViews"][accessor["bufferView"]]
    start = accessor.get("byteOffset", 0) + view.get("byteOffset", 0)
    kind = {5121: "B", 5123: "H", 5125: "I", 5126: "f"}[accessor["componentType"]]
    width = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[accessor["type"]]
    scalar = struct.Struct("<" + kind * width)
    stride = view.get("byteStride", scalar.size)
    assert start + (accessor["count"] - 1) * stride + scalar.size <= len(payload)
    return [scalar.unpack_from(payload, start + i * stride) for i in range(accessor["count"])]


def verify():
    print(f"{'asset':16s} {'prims':>5s} {'tris':>7s} {'dimensions X/Y/Z (m)':>22s}   {'KiB':>7s}")
    for name, expected in EXPECTED.items():
        path = MODELS / f"{name}.glb"
        doc, payload = read_model(path)
        assert len(doc["scenes"]) == 1
        roots = doc["scenes"][0]["nodes"]
        assert len(roots) <= 6
        positions = []
        triangles = 0
        primitive_count = 0
        for index in roots:
            node = doc["nodes"][index]
            assert all(key not in node for key in ("matrix", "translation", "rotation", "scale", "children"))
            for prim in doc["meshes"][node["mesh"]]["primitives"]:
                primitive_count += 1
                assert prim.get("mode", 4) == 4 and "material" in prim
                attributes = prim["attributes"]
                vertices = values(doc, payload, attributes["POSITION"])
                normals = values(doc, payload, attributes["NORMAL"])
                rgb = values(doc, payload, attributes["COLOR_0"])
                indices = [value for (value,) in values(doc, payload, prim["indices"])]
                assert len(vertices) == len(normals) == len(rgb) and len(indices) % 3 == 0
                assert all(math.isfinite(value) for vertex in vertices for value in vertex)
                assert all(abs(sum(c * c for c in normal) - 1) < 1e-4 for normal in normals)
                assert min(indices) == 0 and max(indices) < len(vertices)
                assert min(i for i in rgb[0][:3]) >= 0, path
                if name in {"rice", "bamboo"} and any(word in node["name"] for word in ("leaf", "Leaf")):
                    assert doc["materials"][prim["material"]]["doubleSided"], node
                if name == "bridge" and node["name"].startswith("Scored"):
                    for x in (-7.0, 0.0, 7.0):
                        height = max(y for a, y, z in vertices if abs(a - x) <= 0.003 and abs(z) < 1.6)
                        assert_close(height, 0.20 + 1.35 * (1 - (x / 7) ** 2))
                    for x, y, z in vertices:
                        if abs(z) < 0.9:
                            top = 0.20 + 1.35 * (1 - (x / 7) ** 2)
                            assert min(abs(y - top), abs(y - top + 0.105)) < 0.006, (x, y, z)
                if name == "torii":
                    assert all(abs(x) > 1.31 or y >= 2.88 for x, y, _ in vertices), node
                positions.extend(vertices)
                triangles += len(indices) // 3
        minimum = tuple(min(axis) for axis in zip(*positions))
        maximum = tuple(max(axis) for axis in zip(*positions))
        size = tuple(hi - lo for lo, hi in zip(minimum, maximum))
        assert_close(minimum[1], -0.32 if name == "stair-tread" else 0, tolerance=0.003)
        for actual, target in zip(size, expected):
            assert_close(actual, target, max(0.09, target * 0.18))
        if name == "bridge":
            for actual, exact in zip((minimum[0], maximum[0], minimum[2], maximum[2]), (-7, 7, -1.8, 1.8)):
                assert_close(actual, exact)
        if name == "stair-tread":
            assert_close(maximum[1], 0)
        assert 0 < triangles < 18000, (name, triangles)
        print(f"{name:16s} {primitive_count:5d} {triangles:7d} {str(tuple(round(x, 2) for x in size)):>22s} "
              f"  {path.stat().st_size / 1024:7.1f}")
    print(f"PASS: {len(EXPECTED)} GLBs have valid triangle buffers, origin placement, and vertex paint")


if __name__ == "__main__":
    verify()
