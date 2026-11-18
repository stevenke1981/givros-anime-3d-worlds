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
}


def verify():
    print(f"{'Asset':17s} {'Meshes':>6s} {'Tris':>7s}    {'X/Y/Z (m)':20s}  {'KiB':>5s}")
    for name, (span, floor, budget) in CONTRACT.items():
        path = MODELS / f"{name}.glb"
        doc, payload = read_model(path)
        assert len(doc["scenes"]) == 1
        assert all("bufferView" in image and "uri" not in image for image in doc.get("images", [])), name
        positions = []
        triangles = 0
        assemblies = doc["scenes"][0]["nodes"]
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
        print(f"{name:17s} {len(assemblies):6d} {triangles:7d}    {str(tuple(round(x, 2) for x in extent)):20s}"
              f"  {path.stat().st_size / 1024:5.0f}")
    print(f"PASS: {len(CONTRACT)} regional GLBs validated")


if __name__ == "__main__":
    verify()
