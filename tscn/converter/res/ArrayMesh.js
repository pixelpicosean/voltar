const {
    add_binary_resource,
} = require('../../registry');
const {
    get_function_params,
} = require('../../parser/type_converters');


/* config */
const pack_array_to_binary = true;


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

const ARRAY_COMPRESS_BASE = (ARRAY_INDEX + 1);
const ARRAY_COMPRESS_VERTEX = 1 << (ARRAY_VERTEX + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_NORMAL = 1 << (ARRAY_NORMAL + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_TANGENT = 1 << (ARRAY_TANGENT + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_COLOR = 1 << (ARRAY_COLOR + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_TEX_UV = 1 << (ARRAY_TEX_UV + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_TEX_UV2 = 1 << (ARRAY_TEX_UV2 + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_BONES = 1 << (ARRAY_BONES + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_WEIGHTS = 1 << (ARRAY_WEIGHTS + ARRAY_COMPRESS_BASE);
const ARRAY_COMPRESS_INDEX = 1 << (ARRAY_INDEX + ARRAY_COMPRESS_BASE);

const ARRAY_FLAG_USE_2D_VERTICES = ARRAY_COMPRESS_INDEX << 1;
const ARRAY_FLAG_USE_16_BIT_BONES = ARRAY_COMPRESS_INDEX << 2;
const ARRAY_USE_DYNAMIC_UPDATE = ARRAY_COMPRESS_INDEX << 3;

const ARRAY_COMPRESS_DEFAULT = ARRAY_COMPRESS_NORMAL | ARRAY_COMPRESS_TANGENT | ARRAY_COMPRESS_COLOR | ARRAY_COMPRESS_TEX_UV | ARRAY_COMPRESS_TEX_UV2 | ARRAY_COMPRESS_WEIGHTS;


const compress_list = [
    // ARRAY_NORMAL,
    // ARRAY_TANGENT,
    // ARRAY_COLOR,
    ARRAY_BONES,
]

const GL_BYTE = 5120;
const GL_UNSIGNED_BYTE = 5121;
const GL_UNSIGNED_SHORT = 5123;
const GL_UNSIGNED_INT = 5125;
const GL_FLOAT = 5126;

module.exports = (data) => {
    let surfaces = data.prop.surfaces;
    for (let s of surfaces) {
        if (s.arrays) {
            let arrays = s.arrays.map((arr, i) => arr ? ({
                compressed: compress_list.indexOf(i) >= 0,
                array: arr,
            }) : null)
            let meta = s.arrays[0].__meta__;
            if (meta && meta.func) {
                s.is_2d = (meta.func != "Vector3Array");
            }
            if (pack_array_to_binary) {
                s.arrays = pack_as_binary(arrays, s.is_2d);
            } else {
                s.arrays = arrays;
            }
        } else {
            /* array_data and array_index_data as PoolByteArray */

            let vertex = new Uint8Array(get_function_params(s.array_data).map(v => parseInt(v, 10)));
            let index = new Uint8Array(get_function_params(s.array_index_data).map(v => parseInt(v, 10)));

            let v_info = add_binary_resource(vertex);
            let i_info = add_binary_resource(index);

            let attribs = [];
            let format = s.format;
            let stride = 0;
            for (let i = 0; i < ARRAY_MAX - 1; i++) {
                attribs[i] = {
                    enabled: true,
                    index: i,
                    type: 0,
                    size: 0,
                    stride: 0,
                    offset: 0,
                    normalized: false,
                    integer: false,
                };

                if (!(format & (1 << i))) {
                    attribs[i] = null;
                    continue;
                }

                attribs[i].offset = stride;

                switch (i) {
                    case ARRAY_VERTEX: {
                        if (format & ARRAY_FLAG_USE_2D_VERTICES) {
                            attribs[i].size = 2;
                        } else {
                            attribs[i].size = 3;
                        }

                        if (format & ARRAY_COMPRESS_VERTEX) {
                            console.log(`Warn: mesh with compressed VERTEX is not supported!`);
                        } else {
                            attribs[i].type = GL_FLOAT;
                            stride += attribs[i].size * 4;
                        }
                    } break;
                    case ARRAY_NORMAL: {
                        attribs[i].size = 3;

                        if (format & ARRAY_COMPRESS_NORMAL) {
                            attribs[i].type = GL_BYTE;
                            stride += 4;
                            attribs[i].normalized = true;
                        } else {
                            attribs[i].type = GL_FLOAT;
                            stride += 12;
                        }
                    } break;
                    case ARRAY_TANGENT: {
                        attribs[i].size = 4;

                        if (format & ARRAY_COMPRESS_TANGENT) {
                            attribs[i].type = GL_BYTE;
                            stride += 4;
                            attribs[i].normalized = true;
                        } else {
                            attribs[i].type = GL_FLOAT;
                            stride += 16;
                        }
                    } break;
                    case ARRAY_COLOR: {
                        attribs[i].size = 4;

                        if (format & ARRAY_COMPRESS_COLOR) {
                            attribs[i].type = GL_BYTE;
                            stride += 4;
                            attribs[i].normalized = true;
                        } else {
                            attribs[i].type = GL_FLOAT;
                            stride += 16;
                        }
                    } break;
                    case ARRAY_TEX_UV: {
                        attribs[i].size = 2;

                        if (format & ARRAY_COMPRESS_TEX_UV) {
                            console.log(`Warn: mesh with compressed UV is not supported!`);
                        }
                        attribs[i].type = GL_FLOAT;
                        stride += 8;
                    } break;
                    case ARRAY_TEX_UV2: {
                        attribs[i].size = 2;

                        if (format & ARRAY_COMPRESS_TEX_UV2) {
                            console.log(`Warn: mesh with compressed UV2 is not supported!`);
                        } else {
                            attribs[i].type = GL_FLOAT;
                            stride += 8;
                        }
                    } break;
                    case ARRAY_BONES: {
                        attribs[i].size = 4;

                        if (format & ARRAY_FLAG_USE_16_BIT_BONES) {
                            attribs[i].type = GL_UNSIGNED_SHORT;
                            stride += 8;
                        } else {
                            attribs[i].type = GL_UNSIGNED_BYTE;
                            stride += 4;
                        }
                        attribs[i].integer = true;
                    } break;
                    case ARRAY_WEIGHTS: {
                        attribs[i].size = 4;

                        if (format & ARRAY_COMPRESS_WEIGHTS) {
                            attribs[i].type = GL_UNSIGNED_SHORT;
                            stride += 8;
                            attribs[i].normalized = true;
                        } else {
                            attribs[i].type = GL_FLOAT;
                            stride += 16;
                        }
                    } break;
                }
            }

            for (let i = 0; i < ARRAY_MAX - 1; i++) {
                if (!attribs[i]) continue;
                attribs[i].stride = stride;
            }

            let aabb_params = get_function_params(s.aabb).map(parseFloat);

            s.is_2d = false;
            s.arrays = {
                __type__: 'b',

                is_2d: false,
                aabb: {
                    position: {
                        x: aabb_params[0],
                        y: aabb_params[1],
                        z: aabb_params[2],
                    },
                    size: {
                        x: aabb_params[3],
                        y: aabb_params[4],
                        z: aabb_params[5],
                    },
                },
                vertex: v_info,
                index: i_info,
                array_len: s.vertex_count,
                index_array_len: s.index_count,
                attribs: attribs.filter(v => !!v),
            };

            s.aabb = undefined;
            s.array_data = undefined;
            s.array_index_data = undefined;
        }
    }
    return {
        id: data.attr.id,
        type: 'ArrayMesh',

        surfaces,
    }
};

module.exports.is_tres = true;


/**
 * @param {{ compressed: boolean, array: number[] }[]} p_arrays
 * @param {boolean} is_2d
 */
function pack_as_binary(p_arrays, is_2d) {
    /** @type {number[]} */
    let offsets = Array(ARRAY_MAX);
    /** @type {number[]} */
    let sizes = Array(ARRAY_MAX);
    /** @type {boolean[]} */
    let normalized = Array(ARRAY_MAX);
    /** @type {(GL_BYTE | GL_UNSIGNED_BYTE | GL_UNSIGNED_SHORT | GL_UNSIGNED_INT | GL_FLOAT)[]} */
    let types = Array(ARRAY_MAX);

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
                if (is_2d) {
                    elem_size = 4 * 2;
                } else {
                    elem_size = 4 * 3;
                }
                sizes[i] = is_2d ? 2 : 3;
                types[i] = GL_FLOAT;
                // compress requires half float support

                normalized[i] = false;
            } break;
            case ARRAY_NORMAL: {
                if (p_arrays[i].compressed) {
                    elem_size = 4;
                    normalized[i] = true;
                    types[i] = GL_BYTE;
                } else {
                    elem_size = 4 * 3;
                    normalized[i] = false;
                    types[i] = GL_FLOAT;
                }
                sizes[i] = 3;
            } break;
            case ARRAY_TANGENT: {
                if (p_arrays[i].compressed) {
                    elem_size = 4;
                    normalized[i] = true;
                    types[i] = GL_BYTE;
                } else {
                    elem_size = 4 * 4;
                    normalized[i] = false;
                    types[i] = GL_FLOAT;
                }
                sizes[i] = 4;
            } break;
            case ARRAY_COLOR: {
                if (p_arrays[i].compressed) {
                    elem_size = 4;
                    normalized[i] = true;
                    types[i] = GL_UNSIGNED_BYTE;
                } else {
                    elem_size = 4 * 4;
                    normalized[i] = false;
                    types[i] = GL_FLOAT;
                }
                sizes[i] = 4;
            } break;
            case ARRAY_TEX_UV:
            case ARRAY_TEX_UV2: {
                elem_size = 4 * 2;
                sizes[i] = 2;
                types[i] = GL_FLOAT;
                // compress requires half float support
            } break;
            case ARRAY_WEIGHTS: {
                elem_size = 4 * 4;
                sizes[i] = 4;
                types[i] = GL_FLOAT;
            } break;
            case ARRAY_BONES: {
                elem_size = 4;
                sizes[i] = 4;
                types[i] = GL_UNSIGNED_BYTE;
            } break;
            case ARRAY_INDEX: {
                // TODO: support 32bit indices
                elem_size = 2;
                offsets[i] = elem_size;
                types[i] = GL_UNSIGNED_SHORT;
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
            let is_short = (types[v] == GL_UNSIGNED_SHORT);
            let offset = offsets[v];

            for (let s = 0; s < sizes[v]; s++) {
                if (compressed) {
                    view.setUint8(start + offset + s, array[i * sizes[v] + s]);
                } else if (is_short) {
                    view.setUint16(start + offset + s * 4, array[i * sizes[v] + s], little_endian);
                } else {
                    view.setFloat32(start + offset + s * 4, array[i * sizes[v] + s], little_endian);
                }
            }
        }
    }

    let vertex_bin = add_binary_resource(new Uint8Array(vertex_array));
    let index_bin = add_binary_resource(new Uint8Array(index_array.buffer));

    return {
        __type__: 'b',

        is_2d,
        aabb: is_2d ? null : get_aabb(p_arrays[ARRAY_VERTEX].array),
        vertex: vertex_bin,
        index: index_bin,
        array_len,
        index_array_len,
        attribs: offsets.slice(0, ARRAY_INDEX)
            .map((offset, i) => p_arrays[i] ? ({
                index: i,
                type: types[i],
                size: sizes[i],
                stride: total_elem_size,
                offset: offset,
                normalized: !!normalized[i],
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
