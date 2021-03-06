import {
    res_class_map,
    get_binary_pack,
} from "engine/registry";
import { VObject } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { AABB } from "engine/core/math/aabb";

import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    BLEND_SHAPE_MODE_RELATIVE,
    ARRAY_MAX,
    ARRAY_VERTEX,
    ARRAY_NORMAL,
    ARRAY_TANGENT,
    ARRAY_COLOR,
    ARRAY_TEX_UV,
    ARRAY_TEX_UV2,
    ARRAY_WEIGHTS,
    ARRAY_BONES,
    ARRAY_INDEX,
} from "../const";
import { Material } from "./material";

type Mesh_t = import("engine/drivers/webgl/rasterizer_storage").Mesh_t
type VertAttribDef = import("engine/drivers/webgl/rasterizer_storage").VertAttribDef

interface ArrayDesc {
    compressed?: boolean;
    normalized?: boolean;
    array: number[];
}

interface PackedInfo {
    index: number;
    offset: number;
    length: number;
}
interface PackedArrayDesc {
    attribs: VertAttribDef[];
    vertex: PackedInfo;
    index: PackedInfo;
    array_len: number;
    index_array_len: number;
    aabb: AABB;
}

export class Mesh extends VObject {
    get class() { return "Mesh" }

    lightmap_size_hint = new Vector2;

    mesh: Mesh_t = null;

    _load_data(data: any) { return this }

    get_surface_count() { return 0 }

    surface_get_material(idx: number): Material { return null }

    surface_set_material(idx: number, material: Material) { }
}
res_class_map["Mesh"] = Mesh;

class Surface {
    name = "";
    aabb = new AABB;
    material: Material = null;
    is_2d = false;
}

export class ArrayMesh extends Mesh {
    get class() { return "ArrayMesh" }

    surfaces: Surface[] = [];
    aabb = new AABB;
    blend_shape_mode = BLEND_SHAPE_MODE_RELATIVE;
    custom_aabb = new AABB;

    mesh = VSG.storage.mesh_create();

    /**
     * @param {any} data
     */
    _load_data(data: any) {
        for (let i = 0; i < data.surfaces.length; i++) {
            let surface = data.surfaces[i];
            if (surface.arrays.__type__ === "b") {
                /* interleaved data from binary files */
                this.add_surface_from_packed_arrays(surface.primitive, surface.arrays, surface.is_2d);
            } else {
                this.add_surface_from_arrays(surface.primitive, surface.arrays, surface.is_2d);
            }

            this.surfaces[i] = new Surface;
            this.surface_set_material(i, surface.material);
        }

        return this;
    }

    get_surface_count() { return this.surfaces.length }

    /**
     * @param {number} idx
     * @returns {Material}
     */
    surface_get_material(idx: number): Material {
        return this.surfaces[idx].material;
    }

    surface_set_material(idx: number, material: Material) {
        if (this.surfaces[idx].material === material) {
            return;
        }
        this.surfaces[idx].material = material;
        VSG.storage.mesh_surface_set_material(this.mesh, idx, material ? material.material : null);
    }

    /**
     * @param {number} p_primitive
     * @param {ArrayDesc[]} p_arrays
     * @param {boolean} is_2d
     */
    add_surface_from_arrays(p_primitive: number, p_arrays: ArrayDesc[], is_2d: boolean) {
        let s = new Surface;
        s.is_2d = is_2d;

        // AABB
        if (!is_2d) {
            let vertices = p_arrays[ARRAY_VERTEX].array;
            let vec = _i_add_surface_from_arrays_vec3.set(0, 0, 0);
            for (let i = 0, len = Math.floor(vertices.length / 3); i < len; i += 3) {
                if (i === 0) {
                    s.aabb.position.set(vertices[i+0], vertices[i+1], vertices[i+2]);
                } else {
                    s.aabb.expand_to(vec.set(vertices[i+0], vertices[i+1], vertices[i+2]));
                }
            }
        }
        this.surfaces.push(s);

        let data = this._create_mesh_data_from_arrays(p_arrays, is_2d);
        VSG.storage.mesh_add_surface_from_data(this.mesh, p_primitive, data.attribs, data.vertices, data.indices, data.array_len, data.index_array_len, !is_2d, s.aabb);

        this._recompute_aabb();
    }

    /**
     * @param {number} p_primitive
     * @param {PackedArrayDesc} p_arrays
     * @param {boolean} is_2d
     */
    add_surface_from_packed_arrays(p_primitive: number, p_arrays: PackedArrayDesc, is_2d: boolean) {
        let s = new Surface;
        s.is_2d = is_2d;

        s.aabb.copy(p_arrays.aabb);

        let vertex_pack = get_binary_pack(p_arrays.vertex.index);
        let vertices = vertex_pack.subarray(p_arrays.vertex.offset, p_arrays.vertex.offset + p_arrays.vertex.length);

        let index_pack = get_binary_pack(p_arrays.index.index);
        let indices = index_pack.subarray(p_arrays.index.offset, p_arrays.index.offset + p_arrays.index.length);

        VSG.storage.mesh_add_surface_from_data(this.mesh, p_primitive, p_arrays.attribs, vertices, indices, p_arrays.array_len, p_arrays.index_array_len, !is_2d, s.aabb);

        this._recompute_aabb();
    }

    /* private */

    _recompute_aabb() { }

    /**
     * @param {ArrayDesc[]} p_arrays
     * @param {boolean} is_2d
     */
    _create_mesh_data_from_arrays(p_arrays: ArrayDesc[], is_2d: boolean) {
        /** @type {number[]} */
        let offsets: number[] = Array(ARRAY_MAX);
        /** @type {number[]} */
        let sizes: number[] = Array(ARRAY_MAX);

        let array_len = Math.floor(p_arrays[ARRAY_VERTEX].array.length / (is_2d ? 2 : 3));
        let index_array_len = 0;
        if (p_arrays[ARRAY_INDEX]) {
            index_array_len = p_arrays[ARRAY_INDEX].array.length;
        }

        let total_elem_size = 0;

        for (let i = 0; i < ARRAY_MAX; i++) {
            offsets[i] = 0;

            if (!p_arrays[i]) continue;

            let elem_size = 0;

            switch (i) {
                case ARRAY_VERTEX: {
                    elem_size = is_2d ? 2 : 3;
                    sizes[i] = elem_size;
                    elem_size *= 4;
                    /* vertex cannot be compressed */
                } break;
                case ARRAY_NORMAL: {
                    if (p_arrays[i].compressed) {
                        elem_size = 4;
                    } else {
                        elem_size = 4 * 3;
                    }
                    sizes[i] = 3;
                } break;
                case ARRAY_TANGENT:
                case ARRAY_COLOR: {
                    if (p_arrays[i].compressed) {
                        elem_size = 4;
                    } else {
                        elem_size = 4 * 4;
                    }
                    sizes[i] = 4;
                } break;
                case ARRAY_TEX_UV:
                case ARRAY_TEX_UV2: {
                    if (p_arrays[i].compressed) {
                        elem_size = 4;
                    } else {
                        elem_size = 4 * 2;
                    }
                    sizes[i] = 2;
                } break;
                case ARRAY_WEIGHTS: {
                    elem_size = 4 * 4;
                    sizes[i] = 4;
                } break;
                case ARRAY_BONES: {
                    elem_size = 4;
                    sizes[i] = 4;
                } break;
                case ARRAY_INDEX: {
                    // TODO: support 32bit indices
                    elem_size = 2;
                    offsets[i] = elem_size;
                    continue;
                }
            }

            offsets[i] = total_elem_size;
            total_elem_size += elem_size;
        }

        let array_size = total_elem_size * array_len;

        let vertex_array = new ArrayBuffer(array_size);
        let index_array = index_array_len > 0 ? new Uint16Array(p_arrays[ARRAY_INDEX].array) : null;

        // create interleaved vertex array
        var little_endian = (function () {
            const buffer = new ArrayBuffer(2);
            new DataView(buffer).setInt16(0, 256, true);
            return new Int16Array(buffer)[0] === 256;
        })();
        let view = new DataView(vertex_array);
        for (let i = 0, start = 0; i < array_len; i++, start += total_elem_size) {
            for (let v = 0; v < ARRAY_INDEX; v++) {
                let array = p_arrays[v] ? p_arrays[v].array : null;
                if (!array) continue;

                let compressed = p_arrays[v].compressed;
                let offset = offsets[v];

                for (let s = 0; s < sizes[v]; s++) {
                    if (compressed) {
                        view.setUint8(start + offset + s, array[i * sizes[v] + s]);
                    } else {
                        view.setFloat32(start + offset + s * 4, array[i * sizes[v] + s], little_endian);
                    }
                }
            }
        }

        return {
            attribs: offsets.slice(0, ARRAY_INDEX)
                .map((offset, i) => p_arrays[i] ? ({
                    index: i,
                    type: p_arrays[i].compressed ? WebGLRenderingContext.UNSIGNED_BYTE : WebGLRenderingContext.FLOAT,
                    size: sizes[i],
                    stride: total_elem_size,
                    offset: offset,
                    normalized: !!p_arrays[i].normalized,
                }) : null)
                .filter((v) => !!v),
            vertices: vertex_array,
            array_len,
            index_array_len,
            indices: index_array,
        };
    }
}
res_class_map["ArrayMesh"] = ArrayMesh;

const _i_add_surface_from_arrays_vec3 = new Vector3;
