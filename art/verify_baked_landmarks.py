"""Compare baked GLB geometry and materials against the shipped baseline."""

import argparse
from collections import Counter
from itertools import chain
from math import isfinite
from pathlib import Path
from struct import Struct, unpack_from
import sys
from tempfile import TemporaryDirectory
from zlib import crc32

sys.path.insert(0, str(Path(__file__).resolve().parent))
from baked_landmark_catalog import LANDMARKS
from verify_sakura import MODELS, read_model, values


def attribute(doc, data, index):
    accessor = doc["accessors"][index]
    if accessor["type"] != "VEC2":
        return values(doc, data, index)
    view = doc["bufferViews"][accessor["bufferView"]]
    offset = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", 8)
    assert accessor["componentType"] == 5126
    assert offset + (accessor["count"] - 1) * stride + 8 <= view.get("byteOffset", 0) + view["byteLength"] <= len(data)
    pair = Struct("<2f")
    return [pair.unpack_from(data, offset + i * stride) for i in range(accessor["count"])]


def triangles(doc, data, primitive, attributes):
    vertices = list(zip(*(attribute(doc, data, primitive["attributes"][key]) for key in attributes)))
    indices = [i for (i,) in values(doc, data, primitive["indices"])]
    assert primitive.get("mode", 4) == 4 and len(indices) % 3 == 0 and max(indices) < len(vertices)
    faces = []
    for offset in range(0, len(indices), 3):
        face = tuple(vertices[i] for i in indices[offset:offset + 3])
        faces.append(min(face, face[1:] + face[:1], face[2:] + face[:2]))
    return Counter(faces)


def image_data(doc, data, texture):
    image_index = doc["textures"][texture["index"]]["source"]
    image = doc["images"][image_index]
    assert image["mimeType"] == "image/png" and "uri" not in image
    view = doc["bufferViews"][image["bufferView"]]
    offset = view.get("byteOffset", 0)
    length = view["byteLength"]
    assert view["buffer"] == 0 and offset % 4 == 0 and 0 <= offset < offset + length <= len(data)
    return data[offset:offset + length]


def png_dimensions(data):
    assert data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR"
    assert unpack_from(">I", data, 8)[0] == 13
    width, height = unpack_from(">II", data, 16)
    assert 0 < width <= 1024 and 0 < height <= 1024
    cursor = 8
    image_data_bytes = 0
    while cursor < len(data):
        length, kind = unpack_from(">I4s", data, cursor)
        stop = cursor + 8 + length
        assert stop + 4 <= len(data)
        assert crc32(data[cursor + 4:stop]) == unpack_from(">I", data, stop)[0], kind
        cursor = stop + 4
        if kind == b"IDAT":
            image_data_bytes += length
        if kind == b"IEND":
            assert length == 0 and cursor == len(data) and image_data_bytes > 0
            return width, height
    raise AssertionError("Embedded PNG missing IEND")


def pixels_of(data, path, bpy, np):
    path.write_bytes(data)
    image = bpy.data.images.load(str(path), check_existing=False)
    image.colorspace_settings.name = "Non-Color"
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    bpy.data.images.remove(image)
    return pixels.reshape(-1, 4)


def verify(name):
    source, source_data = read_model(MODELS / f"{name}.glb")
    baked, baked_data = read_model(MODELS / "baked" / f"{name}.glb")
    assert source["nodes"] == baked["nodes"] and source["scenes"] == baked["scenes"], name
    assert len(source["meshes"]) == len(baked["meshes"]), name
    ao_atlases = set()
    roughness_images = {}
    triangle_count = 0
    for old_mesh, new_mesh in zip(source["meshes"], baked["meshes"]):
        assert old_mesh["name"] == new_mesh["name"], name
        assert len(old_mesh["primitives"]) == len(new_mesh["primitives"]), name
        for old, new in zip(old_mesh["primitives"], new_mesh["primitives"]):
            old_attrs = tuple(old["attributes"])
            assert set(old_attrs) <= new["attributes"].keys() and "TEXCOORD_1" in new["attributes"], name
            actual = triangles(baked, baked_data, new, old_attrs)
            assert triangles(source, source_data, old, old_attrs) == actual, (name, old_mesh["name"])
            triangle_count += actual.total()
            uv1 = attribute(baked, baked_data, new["attributes"]["TEXCOORD_1"])
            assert len(uv1) == baked["accessors"][new["attributes"]["POSITION"]]["count"], name
            assert all(0 <= value <= 1 for value in chain.from_iterable(uv1)), name
            assert all(max(axis) - min(axis) > 0.001 for axis in zip(*uv1)), (name, old_mesh["name"])
            old_mat, new_mat = source["materials"][old["material"]], baked["materials"][new["material"]]
            old_pbr, new_pbr = old_mat["pbrMetallicRoughness"], new_mat["pbrMetallicRoughness"]
            for key, default in (("doubleSided", False), ("alphaMode", "OPAQUE"), ("alphaCutoff", 0.5),
                                 ("emissiveFactor", [0, 0, 0]), ("extensions", {})):
                assert old_mat.get(key, default) == new_mat.get(key, default), (name, key)
            for key, default in (("metallicFactor", 1), ("baseColorFactor", [1, 1, 1, 1])):
                assert old_pbr.get(key, default) == new_pbr.get(key, default), (name, key)
            occlusion = new_mat["occlusionTexture"]
            assert occlusion["texCoord"] == 1 and occlusion.get("strength", 1) == 1, name
            ao = image_data(baked, baked_data, occlusion)
            ao_atlases.add(bytes(ao))
            for before, after, key in ((old_pbr, new_pbr, "baseColorTexture"), (old_mat, new_mat, "normalTexture"),
                                       (old_mat, new_mat, "emissiveTexture")):
                if key in before:
                    assert after[key].get("texCoord", 0) == before[key].get("texCoord", 0) == 0, name
                    assert before[key].get("scale", 1) == after[key].get("scale", 1), name
                    assert image_data(source, source_data, before[key]) == image_data(baked, baked_data, after[key]), name
            if "baseColorTexture" in old_pbr or (name == "bridge" and old_mesh["name"].startswith("Scored cedar deck")):
                roughness = new_pbr["metallicRoughnessTexture"]
                assert roughness.get("texCoord", 0) == 0 and new_pbr.get("metallicFactor", 1) == 0, name
                uv0 = attribute(baked, baked_data, new["attributes"]["TEXCOORD_0"])
                assert len(uv0) == len(uv1) and all(isfinite(value) for value in chain.from_iterable(uv0)), name
                assert all(max(axis) - min(axis) > 0.001 for axis in zip(*uv0)), name
                image = image_data(baked, baked_data, roughness)
                assert image != ao and png_dimensions(image) == (128, 128), name
                roughness_images[new_mat["name"]] = image
            else:
                assert old_pbr.get("roughnessFactor", 1) == new_pbr.get("roughnessFactor", 1), name

    assert len(ao_atlases) == 1, name
    ao = ao_atlases.pop()
    expected = LANDMARKS[name][1]
    assert png_dimensions(ao) == (expected, expected), name
    print(f"{name}: {triangle_count:,} matching triangles, {expected}² AO atlas, "
          f"{len(roughness_images)} roughness textures", flush=True)
    return ao, roughness_images


def verify_pixels(landmarks):
    import bpy
    import numpy as np

    with TemporaryDirectory() as folder:
        temp = Path(folder) / "embedded.png"
        for name, (ao, roughness) in landmarks.items():
            ao_pixels = pixels_of(ao, temp, bpy, np)
            red = ao_pixels[:, 0]
            assert np.ptp(red) > 0.1 and np.count_nonzero(red < 0.90) > 100, name
            assert np.array_equal(red, ao_pixels[:, 1]) and np.array_equal(red, ao_pixels[:, 2]), name
            for material, image in roughness.items():
                mr = pixels_of(image, temp, bpy, np)
                assert np.ptp(mr[:, 1]) >= 0.07, (name, material)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", nargs="*", metavar="ASSET")
    parser.add_argument("--pixels", action="store_true", help="Decode and validate pixel values using Blender")
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    args = parser.parse_args(argv)
    if args.pixels and "bpy" not in sys.modules:
        parser.error("--pixels requires Blender's Python runtime")
    landmarks = {name: verify(name) for name in args.assets or LANDMARKS}
    print(f"PASS: {len(landmarks)} baked GLBs preserve geometry and original maps with valid glTF texture packing")
    if args.pixels:
        verify_pixels(landmarks)
        print(f"PASS: {len(landmarks)} baked GLBs contain non-flat grayscale AO and linear roughness pixels")
