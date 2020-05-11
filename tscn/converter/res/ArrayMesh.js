const { add_binary_resource, get_binary_packs } = require('../../resource_record');

/**
 * @param {any} data
 * @param {string} key
 */
function parse_as_array(data, key) {
    const key_s = `${key}/`;

    let result = [];

    for (let k in data) {
        if (k.indexOf(key_s) >= 0) {
            let index_str = k.substr(k.indexOf(key_s) + key_s.length);
            let index = parseInt(index_str);
            if (Number.isFinite(index)) {
                result[index] = data[k];
            }
        }
    }

    return result;
}

const compress_list = [
    2, // tangent
    3, // color
]

const normalize_list = [
    3,
]

module.exports = (data) => {
    let surfaces = parse_as_array(data.prop, 'surfaces');
    for (let s of surfaces) {
        let arrays = s.arrays.map((arr, i) => arr ? ({
            compressed: compress_list.indexOf(i) >= 0,
            normalized: normalize_list.indexOf(i) >= 0,
            array: arr,
        }) : null)
        let meta = s.arrays[0].__meta__;
        if (meta && meta.func) {
            s.is_2d = (meta.func != "Vector3Array");
        }
        s.arrays = pack_as_binary(arrays, s.is_2d);
    }
    return {
        id: data.attr.id,
        type: 'ArrayMesh',

        surfaces,
    }
};

module.exports.is_tres = true;

const ARRAY_VERTEX = 0;
const ARRAY_NORMAL = 1;
const ARRAY_TANGENT = 2;
const ARRAY_COLOR = 3;
const ARRAY_TEX_UV = 4;
const ARRAY_TEX_UV2 = 5;
const ARRAY_BONES = 6;
const ARRAY_WEIGHTS = 7;
const ARRAY_INDEX = 8;
const ARRAY_MAX = 9;

/**
 * @param {{ compressed: boolean, normalized: boolean, array: number[] }[]} p_arrays
 * @param {boolean} is_2d
 */
function pack_as_binary(p_arrays, is_2d) {
    /** @type {number[]} */
    let offsets = Array(ARRAY_MAX);
    /** @type {number[]} */
    let sizes = Array(ARRAY_MAX);

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
            case ARRAY_WEIGHTS:
            case ARRAY_BONES: {
                // TODO: merge weight and bone vertices
                sizes[i] = 0;
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

    let vertex_bin = add_binary_resource(new Uint8Array(vertex_array));
    let index_bin = add_binary_resource(new Uint8Array(index_array.buffer));

    return {
        is_2d,
        aabb: is_2d ? null : get_aabb(p_arrays[ARRAY_VERTEX].array),
        vertex: vertex_bin,
        index: index_bin,
        array_len,
        index_array_len,
        attribs: offsets.slice(0, ARRAY_INDEX)
            .map((offset, i) => p_arrays[i] ? ({
                type: p_arrays[i].compressed ? 5121 : 5126,
                size: sizes[i],
                stride: total_elem_size,
                offset: offset,
                normalized: !!p_arrays[i].normalized,
            }) : null)
            .filter((v) => !!v),
    }
}

/**
 * @typedef {{ x: number, y: number, z: number }} Vector3
 * @typedef {{ position: Vector3, size: Vector3 }} AABB
 */

/**
 * @param {Vector3} vec
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
function vec3_set(vec, x, y, z) {
    vec.x = x;
    vec.y = y;
    vec.z = z;
    return vec;
}

/**
 * @param {Vector3} a
 * @param {Vector3} b
 */
function vec3_add(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z,
    }
}

/**
 * @param {Vector3} a
 * @param {Vector3} b
 */
function vec3_sub(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z,
    }
}

/**
 * @param {AABB} aabb
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
function aabb_expand(aabb, x, y, z) {
    let begin = aabb.position;
    let end = vec3_add(aabb.position, aabb.size);

    if (x < begin.x) {
        begin.x = x;
    }
    if (y < begin.y) {
        begin.y = y;
    }
    if (z < begin.z) {
        begin.z = z;
    }

    if (x > end.x) {
        end.x = x;
    }
    if (y > end.y) {
        end.y = y;
    }
    if (z > end.z) {
        end.z = z;
    }

    aabb.size = vec3_sub(end, begin);
}

/**
 * @param {number[]} vertices
 */
function get_aabb(vertices) {
    let aabb = {
        position: { x: 0, y: 0, z: 0 },
        size: { x: 0, y: 0, z: 0 },
    };

    for (let i = 0, len = Math.floor(vertices.length / 3); i < len; i += 3) {
        if (i === 0) {
            vec3_set(aabb.position, vertices[i + 0], vertices[i + 1], vertices[i + 2]);
        } else {
            aabb_expand(aabb, vertices[i + 0], vertices[i + 1], vertices[i + 2]);
        }
    }

    return aabb;
}
