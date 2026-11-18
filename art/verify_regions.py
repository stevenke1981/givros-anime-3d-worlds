"""Verify GLB buffer integrity and the regional placement interfaces."""

from math import isfinite

from verify_sakura import MODELS, assert_close, read_model, values


# X/Y/Z spans in metres, ground allowance and triangle budgets.
CONTRACT = {
    "dock": ((2.90, 3.90, 9.00), -2.91, 4200),
    "plank-bridge": ((6.00, 0.95, 1.60), 0.0, 2200),
    "fishing-boat": ((1.96, 1.01, 5.20), -0.29, 3000),
    "retaining-wall": ((2.50, 1.00, 0.55), 0.0, 2000),
    "onsen-pool": ((5.37, 0.43, 5.30), 0.0, 2700),
    "snow-inn": ((9.31, 5.68, 7.44), 0.0, 25000),
    "temple": ((9.65, 7.26, 8.05), 0.0, 40000),
    "sluice": ((3.84, 3.03, 1.36), 0.0, 1800),
    "festival-stall": ((3.00, 2.62, 2.10), 0.0, 3600),
    "festival-lantern": ((0.55, 0.90, 0.55), 0.0, 2500),
    "maple": ((6.64, 7.44, 6.28), 0.0, 23000),
    "shrub": ((1.98, 0.95, 1.96), 0.0, 2600),
    "fishing-rack": ((2.18, 1.63, 0.49), 0.0, 2500),
    "teahouse": ((9.31, 5.61, 7.35), 0.0, 26000),
    "water-basin": ((1.83, 1.26, 1.16), 0.0, 1400),
    "maple-lod": ((6.54, 7.30, 6.38), 0.0, 7000),
    "woodland-fern": ((0.79, 0.53, 0.77), 0.0, 850),
    "seasonal-forbs": ((0.45, 0.60, 0.37), 0.0, 500),
    "shore-reeds": ((0.56, 1.13, 0.60), 0.0, 500),
    "coastal-pine": ((5.20, 4.67, 4.57), 0.0, 8700),
    "coastal-pine-lod": ((5.14, 4.68, 4.43), 0.0, 3800),
    "ridge-cedar": ((4.66, 8.92, 4.22), 0.0, 15000),
    "ridge-cedar-lod": ((4.46, 8.92, 4.10), 0.0, 4000),
}

BOTANY_PARTS = {
    "woodland-fern": {"Fern Leaf pinnate fronds", "Fern rachises"},
    "seasonal-forbs": {"Forb Flower petals", "Forb Leaf blades", "Forb golden seed disks", "Forb stems"},
    "shore-reeds": {"Reed Leaf folded straps", "Reed culms", "Reed seed heads"},
    "coastal-pine": {"Pine Leaf needle sprays", "Pine scaffold Branches", "Pine Trunk and exposed roots"},
    "coastal-pine-lod": {"Pine Leaf needle sprays", "Pine scaffold Branches", "Pine Trunk and exposed roots"},
    "ridge-cedar": {"Ridge Cedar Leaf pendant sprays", "Ridge Cedar Branch scaffolds", "Ridge Cedar Trunk and buttresses"},
    "ridge-cedar-lod": {"Ridge Cedar Leaf pendant sprays", "Ridge Cedar Branch scaffolds", "Ridge Cedar Trunk and buttresses"},
}


def check_teahouse_opening(vertices, indices):
    rays = [(x, y) for x in (-1.60, -1.17, -0.64, -0.19, 0.20, 0.67, 1.14, 1.59)
            for y in (1.37, 1.54, 1.82, 1.95)]
    for i in range(0, len(indices), 3):
        a, b, c = (vertices[j] for j in indices[i:i + 3])
        if max(a[2], b[2], c[2]) < 2.84 or min(a[2], b[2], c[2]) > 3.26:
            continue
        ux, uy = b[0] - a[0], b[1] - a[1]
        vx, vy = c[0] - a[0], c[1] - a[1]
        denominator = ux * vy - uy * vx
        if abs(denominator) > 1e-8:
            for x, y in rays:
                m = ((x - a[0]) * vy - (y - a[1]) * vx) / denominator
                n = (ux * (y - a[1]) - uy * (x - a[0])) / denominator
                if m >= 0 and n >= 0 and m + n <= 1:
                    z = a[2] + m * (b[2] - a[2]) + n * (c[2] - a[2])
                    assert not 2.84 <= z <= 3.26, f"Blocked tea counter sightline at {x=}, {y=}"


def verify():
    print(f"{'Asset':17s} {'Meshes':>6s} {'Tris':>7s}    {'X/Y/Z (m)':20s}  {'KiB':>5s}")
    tree_scaffolds = {}
    for name, (span, floor, budget) in CONTRACT.items():
        path = MODELS / f"{name}.glb"
        doc, payload = read_model(path)
        assert len(doc["scenes"]) == 1
        assert all("bufferView" in image and "uri" not in image for image in doc.get("images", [])), name
        positions = []
        triangles = 0
        assemblies = doc["scenes"][0]["nodes"]
        if name in BOTANY_PARTS:
            assert {doc["nodes"][i]["name"].removesuffix(".001") for i in assemblies} == BOTANY_PARTS[name], name
        deck = []
        for node_index in assemblies:
            node = doc["nodes"][node_index]
            assert all(key not in node for key in ("matrix", "translation", "rotation", "scale", "children"))
            for primitive in doc["meshes"][node["mesh"]]["primitives"]:
                assert primitive.get("mode", 4) == 4 and "material" in primitive, name
                attrs = primitive["attributes"]
                vertices = values(doc, payload, attrs["POSITION"])
                normals = values(doc, payload, attrs["NORMAL"])
                paint = values(doc, payload, attrs["COLOR_0"])
                indices = [idx for (idx,) in values(doc, payload, primitive["indices"])]
                assert len(vertices) == len(normals) == len(paint) and len(indices) % 3 == 0, name
                assert all(isfinite(c) for v in vertices for c in v), name
                assert all(abs(sum(c * c for c in normal) - 1) < 0.0002 for normal in normals), name
                assert min(indices) == 0 and max(indices) < len(vertices), name
                if name == "dock" and node["name"].startswith("Salt-weathered"):
                    deck.extend((x, y, z) for x, y, z in vertices if abs(y) < 0.001)
                if name == "plank-bridge" and node["name"].startswith("Split cedar"):
                    deck.extend((x, y, z) for x, y, z in vertices if abs(y - 0.18) < 0.001)
                if name == "water-basin" and node["name"].startswith("Trough surface"):
                    assert any(abs(y - 0.543) < 0.001 for x, y, z in vertices)
                    assert max(y for x, y, z in vertices) > 0.90
                if name == "teahouse":
                    check_teahouse_opening(vertices, indices)
                if name in BOTANY_PARTS and any(part in node["name"] for part in ("Leaf", "Flower")):
                    assert doc["materials"][primitive["material"]]["doubleSided"], node["name"]
                tree = name.removesuffix("-lod")
                if tree in ("coastal-pine", "ridge-cedar") and "Leaf" not in node["name"]:
                    part = (tree, node["name"].removesuffix(".001"))
                    scaffold = (set(vertices), {tuple(vertices[i] for i in indices[j:j + 3])
                                               for j in range(0, len(indices), 3)})
                    if name == tree:
                        tree_scaffolds[part] = scaffold
                    else:
                        assert scaffold == tree_scaffolds[part], part
                positions.extend(vertices)
                triangles += len(indices) // 3
        assert 1 <= len(assemblies) <= 8 and 0 < triangles <= budget, (name, triangles)
        lo = tuple(min(a) for a in zip(*positions))
        hi = tuple(max(a) for a in zip(*positions))
        extent = tuple(b - a for a, b in zip(lo, hi))
        for measured, target in zip(extent, span):
            assert_close(measured, target, tolerance=0.065)
        assert_close(lo[1], floor, tolerance=0.015)
        if name == "dock":
            assert_close(max(z for x, y, z in deck), 4.5, tolerance=0.02)
            assert_close(min(z for x, y, z in deck), -4.5, tolerance=0.02)
        elif name == "plank-bridge":
            assert_close(max(x for x, y, z in deck), 3.0, tolerance=0.02)
            assert_close(min(x for x, y, z in deck), -3.0, tolerance=0.02)
        elif name == "sluice":
            assert all(abs(x) > 0.82 or y >= 1.48 for x, y, z in positions)
        elif name == "onsen-pool":
            assert all(abs(x) > 0.60 or z <= 1.98 or y < 0.10 for x, y, z in positions)
        elif name == "festival-lantern":
            assert any(max(m.get("emissiveFactor", (0, 0, 0))) > 0.0 for m in doc["materials"])
        elif name.startswith("ridge-cedar"):
            assert max(x * x + z * z for x, y, z in positions) <= 2.75 ** 2, name
            assert any("baseColorTexture" in material.get("pbrMetallicRoughness", {}) for material in doc["materials"]), name
        print(f"{name:17s} {len(assemblies):6d} {triangles:7d}    {str(tuple(round(x, 2) for x in extent)):20s}"
              f"  {path.stat().st_size / 1024:5.0f}")
    print(f"PASS: {len(CONTRACT)} regional GLBs validated")


if __name__ == "__main__":
    verify()
