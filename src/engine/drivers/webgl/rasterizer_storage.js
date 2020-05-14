import { SelfList, List } from "engine/core/self_list";
import { is_po2, nearest_po2, deg2rad } from "engine/core/math/math_funcs";
import { Vector2 } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { Color, ColorLike } from "engine/core/color";
import { AABB } from "engine/core/math/aabb";

import {
    TEXTURE_TYPE_2D,
    USAGE_IMMUTABLE,
    FILTER_NEAREST,
    WRAP_REPEAT,
    WRAP_CLAMP_TO_EDGE,
    MULTIMESH_TRANSFORM_2D,
    MULTIMESH_COLOR_NONE,
    MULTIMESH_CUSTOM_DATA_NONE,
    MULTIMESH_COLOR_8BIT,
    MULTIMESH_COLOR_FLOAT,
    MULTIMESH_CUSTOM_DATA_8BIT,
    MULTIMESH_CUSTOM_DATA_FLOAT,
    INSTANCE_TYPE_NONE,
    INSTANCE_TYPE_MESH,
    INSTANCE_TYPE_LIGHT,
    LIGHT_SPOT,
    LIGHT_OMNI,
    LIGHT_DIRECTIONAL,
    LIGHT_PARAM_RANGE,
    LIGHT_PARAM_SPOT_ANGLE,
    TEXTURE_TYPE_CUBEMAP,
} from "engine/servers/visual_server";
import {
    Instance_t,
} from "engine/servers/visual/visual_server_scene";
import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    PIXEL_FORMAT_L8,
    PIXEL_FORMAT_LA8,
    PIXEL_FORMAT_RGB8,
    PIXEL_FORMAT_RGBA8,
    PIXEL_FORMAT_RGBA4,
    PIXEL_FORMAT_RGBA5551,
    ImageTexture,
    PIXEL_FORMAT_R8,
    PIXEL_FORMAT_DXT1,
    PIXEL_FORMAT_DXT3,
    PIXEL_FORMAT_DXT5,
    PIXEL_FORMAT_PVRTC2,
    PIXEL_FORMAT_PVRTC2A,
    PIXEL_FORMAT_PVRTC4,
    PIXEL_FORMAT_PVRTC4A,
    PIXEL_FORMAT_ETC,
} from "engine/scene/resources/texture";
import { OS } from "engine/core/os/os";
import { ARRAY_MAX } from "engine/scene/const";

const SMALL_VEC2 = new Vector2(0.00001, 0.00001);
const SMALL_VEC3 = new Vector3(0.00001, 0.00001, 0.00001);

/**
 * @param {number} format
 */
function get_gl_texture_type(format) {
    switch (format) {
        case PIXEL_FORMAT_RGBA8:
            return WebGLRenderingContext.UNSIGNED_BYTE;
        default: return 0;
    }
}

/**
 * @param {number} format
 */
function get_gl_pixel_format(format) {
    switch (format) {
        case PIXEL_FORMAT_L8: return WebGLRenderingContext.LUMINANCE;
        case PIXEL_FORMAT_LA8: return WebGLRenderingContext.LUMINANCE_ALPHA;
        case PIXEL_FORMAT_RGB8: return WebGLRenderingContext.RGB;
        case PIXEL_FORMAT_RGBA8: return WebGLRenderingContext.RGBA;
        case PIXEL_FORMAT_RGBA4: return WebGLRenderingContext.RGBA4;
        case PIXEL_FORMAT_RGBA5551: return WebGLRenderingContext.RGB5_A1;
        default: return 0;
    }
}

/**
 * @param {number} format
 */
function get_gl_internal_format(format) {
    switch (format) {
        case PIXEL_FORMAT_L8:
        case PIXEL_FORMAT_LA8:
            return WebGLRenderingContext.LUMINANCE;
        case PIXEL_FORMAT_RGBA8:
            return WebGLRenderingContext.RGBA;
    }
    return 0;
}

let tex_uid = 0;
export class Texture_t {
    constructor() {
        this.uid = tex_uid++;
        this.name = '';

        /** @type {Texture_t} */
        this.proxy = null;

        this.type = TEXTURE_TYPE_2D;
        /** @type {RenderTarget_t} */
        this.render_target = null;
        /** @type {(HTMLImageElement | HTMLCanvasElement)[]} */
        this.images = [];
        this.width = 0;
        this.height = 0;
        this.depth = 0;
        this.alloc_width = 0;
        this.alloc_height = 0;
        this.usage = USAGE_IMMUTABLE;
        this.format = PIXEL_FORMAT_L8;
        this.min_filter = FILTER_NEAREST;
        this.mag_filter = FILTER_NEAREST;
        this.wrap_u = WRAP_REPEAT;
        this.wrap_v = WRAP_REPEAT;
        this.has_mipmap = false;

        this.target = 0;
        this.gl_format_cache = 0;
        this.gl_internal_format_cache = 0;
        this.gl_type_cache = 0;

        this.compressed = false;

        this.srgb = false;

        this.mipmaps = 0;

        this.resize_to_po2 = false;

        this.active = false;

        this.redraw_if_visible = false;

        /** @type {WebGLRenderbuffer} */
        this.gl_depth_render_buffer = null;
        /** @type {WebGLTexture} */
        this.gl_tex = null;

        this.path = "";
        this.flags = {
            FILTER: false,
            REPEAT: false,
            MIPMAPS: false,
        };
    }
    self() {
        if (this.proxy) return this.proxy;
        return this;
    }
}

let inst_uid = 0;
export class Instantiable_t {
    get i_type() { return INSTANCE_TYPE_NONE }

    constructor() {
        this.uid = inst_uid++;

        /** @type {List<Instance_t>} */
        this.instance_list = new List;
    }

    /**
     * @param {boolean} p_aabb
     * @param {boolean} p_materials
     */
    instance_change_notify(p_aabb, p_materials) {
        let instances = this.instance_list.first();
        while (instances) {
            instances.self().base_changed(p_aabb, p_materials);
            instances = instances.next();
        }
    }

    instance_remove_deps() {
        let instances = this.instance_list.first();
        while (instances) {
            instances.self().base_removed();
            instances = instances.next();
        }
    }
}

export const GEOMETRY_INVALID = 0;
export const GEOMETRY_SURFACE = 1;
export const GEOMETRY_IMMEDIATE = 2;
export const GEOMETRY_MULTISURFACE = 3;

export class Geometry_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_MESH }

    constructor() {
        super();

        this.type = GEOMETRY_INVALID;

        /** @type {Material_t} */
        this.material = null;

        this.last_pass = 0;
        this.index = 0;
    }
}

export class Light_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_LIGHT }

    constructor() {
        super();

        this.type = LIGHT_DIRECTIONAL;

        this.param = [
            1.0, // energy
            1.0, // indirect energy
            0.5, // specular
            1.0, // range
            45,  // spot angle
        ];

        this.color = new Color(1, 1, 1, 1);
        this.shadow_color = new Color(0, 0, 0, 1);

        this.projector = null;

        this.shadow = false;
        this.negative = false;
        this.reverse_cull = false;

        this.cull_mask = 0xFFFFFFFF;

        this.directional_shadow_mode = 0;
        this.directional_range_mode = 0;

        this.version = 0;
    }
}

class Effect_t {
    constructor() {
        this.width = 0;
        this.height = 0;

        /** @type {WebGLTexture} */
        this.gl_color = null;
        /** @type {WebGLTexture} */
        this.gl_depth = null;

        /** @type {WebGLFramebuffer} */
        this.gl_fbo = null;
    }
}

export class RenderTarget_t {
    constructor() {
        this.name = '';

        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;

        this.flags = {
            DIRECT_TO_SCREEN: false,
            TRANSPARENT: false,
            NO_SAMPLING: false,
            VFLIP: false,
        };

        this.used_in_frame = false;

        /** @type {Texture_t} */
        this.texture = null;

        this.copy_screen_effect = new Effect_t;

        /** @type {WebGLFramebuffer} */
        this.gl_fbo = null;
        /** @type {WebGLTexture} */
        this.gl_color = null;
        /** @type {WebGLTexture} */
        this.gl_depth = null;
    }
}

/**
 * @typedef {'1i' | '1f' | '2f' | '3f' | '4f' | 'mat3' | 'mat4'} UniformTypes
 */

export const BLEND_MODE_MIX = 0;
export const BLEND_MODE_ADD = 1;
export const BLEND_MODE_SUB = 2;
export const BLEND_MODE_MUL = 3;

export const DEPTH_DRAW_OPAQUE = 0;
export const DEPTH_DRAW_ALWAYS = 1;
export const DEPTH_DRAW_NEVER = 2;
export const DEPTH_DRAW_ALPHA_PREPASS = 3;

export const CULL_MODE_FRONT = 0;
export const CULL_MODE_BACK = 1;
export const CULL_MODE_DISABLED = 2;

let shader_uid = 0;
export class Shader_t {
    constructor() {
        this.id = shader_uid++;

        this.name = '';

        this.last_pass = 0;
        this.index = 0;

        /** @type {WebGLProgram} */
        this.gl_prog = null;

        /** @type {Object<string, { type: UniformTypes, gl_loc: WebGLUniformLocation }>} */
        this.uniforms = {};

        this.canvas_item = {
            blend_mode: BLEND_MODE_MIX,

            uses_screen_texture: false,
            uses_time: false,
        };

        this.spatial = {
            blend_mode: BLEND_MODE_MIX,
            depth_draw_mode: DEPTH_DRAW_OPAQUE,
            cull_mode: CULL_MODE_FRONT,

            uses_alpha: false,
            unshaded: false,
            no_depth_test: false,
            uses_screen_texture: false,
            uses_depth_texture: false,
            uses_time: false,
        };
    }
}

/** @type {{ [name: string]: number }} */
let mat_clone_record = {};
export class Material_t {
    constructor() {
        this.name = '';

        this.batchable = false;

        this.render_priority = 0;

        /** @type {Material_t} */
        this.next_pass = null;

        this.index = 0;
        this.last_pass = 0;

        /** @type {Shader_t} */
        this.shader = null;

        /** @type {Object<string, number[]>} */
        this.params = {};

        /** @type {Object<string, Texture_t>} */
        this.textures = {};

        /**
         * Original material if this is cloned
         * @type {Material_t}
         */
        this.origin = null;
    }

    clone() {
        let m = new Material_t;

        m.origin = this;

        if (!mat_clone_record[this.name]) {
            mat_clone_record[this.name] = 1;
        } else {
            mat_clone_record[this.name] += 1;
        }
        m.name = `${this.name}_${mat_clone_record[this.name]}`;

        m.batchable = this.batchable;
        m.render_priority = this.render_priority;
        m.next_pass = this.next_pass;

        m.shader = this.shader;

        for (let k in this.params) {
            m.params[k] = this.params[k].slice();
        }
        for (let k in this.textures) {
            m.textures[k] = this.textures[k];
        }

        return m;
    }
}

/**
 * @typedef VertAttrib
 * @property {boolean} enabled
 * @property {number} index
 * @property {number} type
 * @property {number} size
 * @property {boolean} normalized
 * @property {number} stride
 * @property {number} offset
 *
 * @typedef VertAttribDef
 * @property {number} index
 * @property {number} type
 * @property {number} size
 * @property {boolean} [normalized]
 * @property {number} stride
 * @property {number} offset
 */

export class Surface_t extends Geometry_t {
    constructor() {
        super();

        /** @type {VertAttrib[]} */
        this.attribs = [];

        /** @type {Mesh_t} */
        this.mesh = null;

        /** @type {WebGLBuffer} */
        this.vertex_id = null;
        /** @type {WebGLBuffer} */
        this.index_id = null;

        this.aabb = new AABB;

        this.array_len = 0;
        this.index_array_len = 0;

        this.array_byte_size = 0;
        this.index_array_byte_size = 0;

        this.primitive = WebGLRenderingContext.TRIANGLES;

        this.active = false;

        /** @type {ArrayBuffer | Float32Array} */
        this.data = null;
        /** @type {ArrayBuffer | Uint16Array} */
        this.index_data = null;
    }
}

export class Mesh_t extends Instantiable_t {
    get i_type() { return INSTANCE_TYPE_MESH }

    constructor() {
        super();

        this.active = false;

        /** @type {List<MultiMesh_t>} */
        this.multimeshes = new List;

        /** @type {Surface_t[]} */
        this.surfaces = [];
    }
    update_multimeshes() { }
}

/** @type {{ [length: string]: Float32Array[] }} */
const Float32ArrayPool = { }
/**
 * @param {number} size
 */
function new_float32array(size) {
    const length = nearest_po2(size);
    let pool = Float32ArrayPool[length];
    if (!pool) {
        pool = Float32ArrayPool[length] = [];
    }
    let array = pool.pop();
    if (!array) {
        return new Float32Array(length);
    }
    return array;
}
/**
 * @param {Float32Array} array
 */
function free_float32array(array) {
    const length = array.length;
    let pool = Float32ArrayPool[length];
    if (!pool) {
        pool = Float32ArrayPool[length] = [];
    }
    pool.push(array);
}

export class MultiMesh_t {
    constructor() {
        /** @type {Mesh_t} */
        this.mesh = null;
        this.size = 0;

        this.transform_format = MULTIMESH_TRANSFORM_2D;
        this.color_format = MULTIMESH_COLOR_NONE;
        this.custom_data_format = MULTIMESH_CUSTOM_DATA_NONE;

        this.xform_floats = 0;
        this.color_floats = 0;
        this.custom_data_floats = 0;

        /** @type {SelfList<MultiMesh_t>} */
        this.update_list = new SelfList(this);
        /** @type {SelfList<MultiMesh_t>} */
        this.mesh_list = new SelfList(this);

        /** @type {WebGLBuffer} */
        this.buffer = null;

        /** @type {Float32Array} */
        this.data = null;

        this.aabb = null;

        this.dirty_aabb = true;
        this.dirty_data = true;

        this.visible_instances = 0;
    }
}

export class RasterizerStorage {
    constructor() {
        /** @type {WebGLRenderingContext} */
        this.gl = null;

        this.frame = {
            clear_request: true,
            clear_request_color: new Color(0, 0, 0, 1),
            /** @type {RenderTarget_t} */
            current_rt: null,
            time: [0, 0, 0, 0],
            count: 0,
            delta: 0,
        };

        /** @type {List<MultiMesh_t>} */
        this.multimesh_update_list = new List;

        this.resources = {
            /** @type {ImageTexture} */
            white_tex: null,
            /** @type {ImageTexture} */
            black_tex: null,
            /** @type {ImageTexture} */
            normal_tex: null,
            /** @type {ImageTexture} */
            aniso_tex: null,

            /** @type {WebGLFramebuffer} */
            mipmap_blur_fbo: null,
            /** @type {WebGLTexture} */
            mipmap_blur_color: null,

            /** @type {WebGLBuffer} */
            quadie: null,
        };

        /**
         * @typedef BufferPack
         * @property {number} size
         * @property {WebGLBuffer} gl_buf
         */
        /** @type {Object<number, BufferPack[]>} */
        this.buffers = {};
        /** @type {BufferPack[]} */
        this.used_buffers = [];

        /** @type {import('./rasterizer_canvas').RasterizerCanvas} */
        this.canvas = null;
        /** @type {import('./rasterizer_scene').RasterizerScene} */
        this.scene = null;
    }

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl) {
        this.gl = gl;

        // quad for copying stuff
        {
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1, -1, 0, 0,
                -1, +1, 0, 1,
                +1, +1, 1, 1,
                +1, -1, 1, 0,
            ]), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);

            this.resources.quadie = buf;
        }

        // default textures
        {
            const create_texture = (/** @type {Uint8Array} */texdata, /** @type {string} */name) => {
                const tex = new ImageTexture;
                tex.create_from_data(texdata, 8, 8);
                tex.texture.name = name;
                return tex;
            }
            // - white
            const white_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i++) {
                white_texdata[i] = 255;
            }
            this.resources.white_tex = create_texture(white_texdata, '_white_');
            // - black
            const black_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                black_texdata[i + 0] = 0;
                black_texdata[i + 1] = 0;
                black_texdata[i + 2] = 0;
                black_texdata[i + 3] = 255;
            }
            this.resources.black_tex = create_texture(black_texdata, '_black_');
            // - normal
            const normal_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                normal_texdata[i + 0] = 128;
                normal_texdata[i + 1] = 128;
                normal_texdata[i + 2] = 255;
                normal_texdata[i + 3] = 255;
            }
            this.resources.normal_tex = create_texture(normal_texdata, '_normal_');
            // - aniso
            const aniso_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                aniso_texdata[i + 0] = 255;
                aniso_texdata[i + 1] = 128;
                aniso_texdata[i + 2] = 0;
                aniso_texdata[i + 3] = 255;
            }
            this.resources.aniso_tex = create_texture(aniso_texdata, '_aniso_');
        }
    }

    /**
     * @param {any} rid
     */
    free_rid(rid) { return false }

    bind_copy_shader() {
        const gl = this.gl;

        gl.useProgram(this.canvas.copy_shader.gl_prog);
    }

    bind_quad_array() {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.quadie);

        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
        gl.enableVertexAttribArray(1);
    }

    update_dirty_resources() {
        this.update_dirty_shaders();
        this.update_dirty_materials();
        this.update_dirty_skeletons();
        this.update_dirty_multimeshes();
        this.update_dirty_buffers();
    }
    update_dirty_shaders() { }
    update_dirty_materials() { }
    update_dirty_skeletons() { }
    update_dirty_multimeshes() {
        const gl = this.gl;

        while (this.multimesh_update_list.first()) {
            const multimesh = this.multimesh_update_list.first().self();

            if (multimesh.size && multimesh.dirty_data) {
                if (!multimesh.buffer) {
                    multimesh.buffer = gl.createBuffer();
                }

                gl.bindBuffer(gl.ARRAY_BUFFER, multimesh.buffer);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, multimesh.data);
                gl.bindBuffer(gl.ARRAY_BUFFER, null);
            }
            multimesh.dirty_data = false;

            // TODO: update AABB of dirty multi-mesh
            multimesh.dirty_aabb = false;

            this.multimesh_update_list.remove(this.multimesh_update_list.first());
        }
    }
    update_dirty_buffers() {
        // recycle used buffers to
        for (const b of this.used_buffers) {
            this.buffers[b.size].push(b);
        }
        this.used_buffers.length = 0;
    }

    /* Texture API */

    texture_create() {
        let texture = new Texture_t;
        texture.gl_tex = this.gl.createTexture();
        texture.active = false;
        return texture;
    }
    /**
     * @param {Texture_t} texture
     * @param {number} p_width
     * @param {number} p_height
     * @param {number} p_depth
     * @param {number} p_format
     * @param {number} p_type
     * @param {{ FILTER?: boolean, REPEAT?: boolean, MIPMAP?: boolean }} [p_flags]
     */
    texture_allocate(texture, p_width, p_height, p_depth, p_format, p_type, p_flags = {}) {
        const gl = this.gl;

        texture.width = p_width;
        texture.height = p_height;
        texture.format = p_format;
        texture.type = p_type;

        switch (p_type) {
            case TEXTURE_TYPE_2D: {
                texture.target = gl.TEXTURE_2D;
                texture.images.length = 1;
            } break;
            case TEXTURE_TYPE_CUBEMAP: {
                texture.target = gl.TEXTURE_CUBE_MAP;
                texture.images.length = 6;
            } break;
            default: {
                console.error("Unknown texture type!");
                return;
            }
        }

        texture.alloc_width = texture.width;
        texture.alloc_height = texture.alloc_height;
        texture.resize_to_po2 = false;

        this._get_gl_image_and_format(texture);

        texture.mipmaps = 1;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(texture.target, texture.gl_tex);

        texture.active = true;
    }

    /**
     * @param {Texture_t} texture
     */
    texture_free(texture) {
        const gl = this.gl;
        gl.deleteTexture(texture.gl_tex);
        texture.active = false;
    }

    /**
     * @param {Texture_t} p_texture
     */
    _get_gl_image_and_format(p_texture) {
        const gl = this.gl;
        const ext = OS.get_singleton().gl_ext;

        let texture = p_texture.self();

        switch (texture.format) {
            case PIXEL_FORMAT_L8: {
                texture.gl_internal_format_cache = gl.LUMINANCE;
                texture.gl_format_cache = gl.LUMINANCE;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_LA8: {
                texture.gl_internal_format_cache = gl.LUMINANCE_ALPHA;
                texture.gl_format_cache = gl.LUMINANCE_ALPHA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_R8: {
                texture.gl_internal_format_cache = gl.ALPHA;
                texture.gl_format_cache = gl.ALPHA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_RGB8: {
                texture.gl_internal_format_cache = gl.RGB;
                texture.gl_format_cache = gl.RGB;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_RGBA8: {
                texture.gl_internal_format_cache = gl.RGBA;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
            } break;
            case PIXEL_FORMAT_RGBA4: {
                texture.gl_internal_format_cache = gl.RGBA;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_SHORT_4_4_4_4;
            } break;
            case PIXEL_FORMAT_DXT1: {
                if (!VSG.config.s3tc_supported) {
                    console.error("DXT1 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_S3TC_DXT1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_DXT3: {
                if (!VSG.config.s3tc_supported) {
                    console.error("DXT3 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_S3TC_DXT3;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_DXT5: {
                if (!VSG.config.s3tc_supported) {
                    console.error("DXT5 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_S3TC_DXT5;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_ETC: {
                if (!VSG.config.etc1_supported) {
                    console.error("ETC texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGB_ETC1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC2: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC2 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGB_PVRTC_2BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC2A: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC2A texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_PVRTC_2BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC4: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC4 texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGB_PVRTC_4BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
            case PIXEL_FORMAT_PVRTC4A: {
                if (!VSG.config.pvrtc_supported) {
                    console.error("PVRTC4A texture not supported!");
                }
                texture.gl_internal_format_cache = ext.COMPRESSED_RGBA_PVRTC_4BPPV1;
                texture.gl_format_cache = gl.RGBA;
                texture.gl_type_cache = gl.UNSIGNED_BYTE;
                texture.compressed = true;
            } break;
        }
    }

    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").DOMImageData} p_data
     */
    texture_set_image(rid, p_data) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);

        if (rid.flags.FILTER) {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        if (rid.flags.REPEAT) {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.format), get_gl_pixel_format(rid.format), get_gl_texture_type(rid.format), p_data);

        if (rid.flags.MIPMAPS) {
            gl.generateMipmap(rid.target);
        }
    }
    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").RawImageData} p_data
     */
    texture_set_data(rid, p_data) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);

        if (rid.flags.FILTER) {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        if (rid.flags.REPEAT) {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        if (rid.compressed) {
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
            gl.compressedTexImage2D(gl.TEXTURE_2D, 0, rid.gl_internal_format_cache, rid.width, rid.height, 0, p_data);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.format), rid.width, rid.height, 0, get_gl_pixel_format(rid.format), get_gl_texture_type(rid.format), p_data);
        }

        if (rid.flags.MIPMAPS) {
            gl.generateMipmap(rid.target);
        }
    }

    /**
     * @param {Texture_t} rid
     * @param {Texture_t} p_proxy
     */
    texture_set_proxy(rid, p_proxy) {
        rid.proxy = null;

        if (p_proxy) {
            rid.proxy = p_proxy;
        }
    }

    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").ImageFlags} flags
     */
    texture_set_flags(rid, flags) {
        const gl = this.gl;

        Object.assign(rid.flags, flags);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(rid.target, rid.gl_tex);

        if (rid.flags.REPEAT && rid.target !== gl.TEXTURE_CUBE_MAP) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }

        if (rid.flags.MIPMAPS) {
            if (rid.mipmaps === 1) {
                gl.generateMipmap(rid.target);
            }
            gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            if (rid.flags.FILTER) {
                gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            } else {
                gl.texParameteri(rid.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            }
        }

        if (rid.flags.FILTER) {
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        } else {
            gl.texParameteri(rid.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
    }

    /* RenderTarget API */

    render_target_create() {
        const rt = new RenderTarget_t;
        rt.texture = new Texture_t;
        rt.texture.render_target = rt;
        return rt;
    }
    /**
     * @param {RenderTarget_t} rt
     */
    render_target_free(rt) {
        this._render_target_clear(rt);
        this.texture_free(rt.texture);
    }
    /**
     * @param {RenderTarget_t} rt
     * @param {number} p_width
     * @param {number} p_height
     */
    render_target_set_size(rt, p_width, p_height) {
        if (rt.width === p_width && rt.height === p_height) {
            return;
        }

        this._render_target_clear(rt);

        rt.width = p_width;
        rt.height = p_height;

        this._render_target_allocate(rt);
    }

    /**
     * @param {RenderTarget_t} rt
     * @param {number} p_x
     * @param {number} p_y
     */
    render_target_set_position(rt, p_x, p_y) {
        rt.x = p_x;
        rt.y = p_y;
    }

    /**
     * @param {RenderTarget_t} rt
     */
    render_target_was_used(rt) {
        return rt.used_in_frame;
    }

    /**
     * @param {RenderTarget_t} rt
     */
    render_target_clear_used(rt) {
        rt.used_in_frame = false;
    }

    /**
     * @param {RenderTarget_t} rt
     * @param {string} flag
     * @param {boolean} p_enable
     */
    render_target_set_flag(rt, flag, p_enable) {
        if (flag === "DIRECT_TO_SCREEN") {
            this._render_target_clear(rt);
            rt.flags[flag] = p_enable;
            this._render_target_allocate(rt);
        }

        rt.flags[flag] = p_enable;

        if (flag === "TRANSPARENT") {
            this._render_target_clear(rt);
            this._render_target_allocate(rt);
        }
    }

    /**
     * @param {RenderTarget_t} rt
     */
    _render_target_clear(rt) {
        if (rt.flags.DIRECT_TO_SCREEN) {
            return;
        }

        const gl = this.gl;

        if (rt.gl_fbo) {
            gl.deleteFramebuffer(rt.gl_fbo);
            gl.deleteTexture(rt.gl_color);
            rt.gl_fbo = null;
        }

        if (rt.gl_depth) {
            if (false) { // depth texture
            } else {
                gl.deleteRenderbuffer(rt.gl_depth);
            }
            rt.gl_depth = null;
        }

        let tex = rt.texture;
        tex.width = tex.height = 0;

        if (rt.copy_screen_effect.gl_color) {
            gl.deleteFramebuffer(rt.copy_screen_effect.gl_fbo);
            rt.copy_screen_effect.gl_fbo = null;

            gl.deleteTexture(rt.copy_screen_effect.gl_color);
            rt.copy_screen_effect.gl_color = null;
        }
    }

    /**
     * @param {RenderTarget_t} rt
     */
    _render_target_allocate(rt) {
        if (rt.width <= 0 || rt.height <= 0) {
            return;
        }

        if (rt.flags.DIRECT_TO_SCREEN) {
            rt.gl_fbo = null;
            return;
        }

        const gl = this.gl;

        let color_internal_format = -1;
        let color_format = -1;
        let color_type = gl.UNSIGNED_BYTE;
        let image_format = -1;

        if (rt.flags.TRANSPARENT) {
            color_internal_format = gl.RGBA;
            color_format = gl.RGBA;
            image_format = PIXEL_FORMAT_RGBA8;
        } else {
            color_internal_format = gl.RGB;
            color_format = gl.RGB;
            image_format = PIXEL_FORMAT_RGB8;
        }

        {
            /* front FBO */

            let texture = rt.texture;

            // framebuffer
            rt.gl_fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, rt.gl_fbo);

            // color
            rt.gl_color = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, rt.gl_color);

            if (texture.flags.FILTER) {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            } else {
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            gl.texImage2D(gl.TEXTURE_2D, 0, color_internal_format, rt.width, rt.height, 0, color_format, color_type, null);

            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt.gl_color, 0);

            // depth
            if (VSG.config.support_depth_texture) {
                rt.gl_depth = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, rt.gl_depth);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                gl.texImage2D(gl.TEXTURE_2D, 0, VSG.config.depth_internalformat, rt.width, rt.height, 0, gl.DEPTH_COMPONENT, VSG.config.depth_type, null);

                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, rt.gl_depth, 0);
            } else {
                rt.gl_depth = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, rt.gl_depth);
                gl.renderbufferStorage(gl.RENDERBUFFER, VSG.config.depth_buffer_internalformat, rt.width, rt.height);
                gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rt.gl_depth);
            }

            texture.format = image_format;
            texture.gl_tex = rt.gl_color;
            texture.width = rt.width;
            texture.height = rt.height;

            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                console.error("Framebuffer not complete");
            }
        }

        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        if (!rt.flags.NO_SAMPLING) {
            rt.copy_screen_effect.gl_color = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, rt.copy_screen_effect.gl_color);

            if (rt.flags.TRANSPARENT) {
                gl.texImage2D(gl.TEXTURE_2D, 0,  gl.RGBA, rt.width, rt.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            } else {
                gl.texImage2D(gl.TEXTURE_2D, 0,  gl.RGB, rt.width, rt.height, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
            }

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            rt.copy_screen_effect.gl_fbo = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, rt.copy_screen_effect.gl_fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt.copy_screen_effect.gl_color, 0);

            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* Material API */

    /**
     * @param {string} vs
     * @param {string} fs
     * @param {string[]} attrs
     * @param {{ name: string, type: UniformTypes }[]} uniforms
     */
    shader_create(vs, fs, attrs, uniforms) {
        const gl = this.gl;

        const shd = new Shader_t;

        const gl_vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(gl_vs, vs);
        gl.compileShader(gl_vs);
        if (!gl.getShaderParameter(gl_vs, gl.COMPILE_STATUS)) {
            console.error(`Failed to compile vertex shader: ${gl.getShaderInfoLog(gl_vs)}`)
            return null;
        }

        const gl_fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(gl_fs, fs);
        gl.compileShader(gl_fs);
        if (!gl.getShaderParameter(gl_fs, gl.COMPILE_STATUS)) {
            console.error(`Failed to compile fragment shader: ${gl.getShaderInfoLog(gl_fs)}`)
            return null;
        }

        const gl_prog = gl.createProgram();
        gl.attachShader(gl_prog, gl_vs);
        gl.attachShader(gl_prog, gl_fs);

        for (let i = 0; i < attrs.length; i++) {
            gl.bindAttribLocation(gl_prog, i, attrs[i]);
        }

        gl.linkProgram(gl_prog);

        gl.deleteShader(gl_vs);
        gl.deleteShader(gl_fs);

        if (!gl.getProgramParameter(gl_prog, gl.LINK_STATUS)) {
            console.error(`Failed to link shader program: ${gl.getProgramInfoLog(gl_prog)}`);
            gl.deleteProgram(gl_prog);
            return null;
        }

        shd.gl_prog = gl_prog;

        for (let i = 0; i < uniforms.length; i++) {
            const u = uniforms[i]
            shd.uniforms[u.name] = {
                type: u.type,
                gl_loc: gl.getUniformLocation(gl_prog, u.name),
            }
        }

        return shd;
    }

    /**
     * @param {Shader_t} shader
     * @param {Object<string, number[]>} [param]
     * @param {boolean} [uses_screen_texture]
     */
    material_create(shader, param = {}, uses_screen_texture = false) {
        const mt = new Material_t;
        mt.shader = shader;
        mt.shader.canvas_item.uses_screen_texture = uses_screen_texture;

        for (const k in shader.uniforms) {
            const u = shader.uniforms[k];
            switch (u.type) {
                case '1f': mt.params[k] = param[k] || [0]; break;
                case '2f': mt.params[k] = param[k] || [0, 0]; break;
                case '3f': mt.params[k] = param[k] || [0, 0, 0]; break;
                case '4f': mt.params[k] = param[k] || [0, 0, 0, 0]; break;
                case 'mat3': mt.params[k] = param[k] || [1, 0, 0, 0, 1, 0, 0, 0, 1]; break;
                case 'mat4': mt.params[k] = param[k] || [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; break;

                // texture
                case '1i': {
                    mt.textures[k] = null;
                } break;
            }
        }

        return mt;
    }

    /**
     * @param {Material_t} mt
     * @param {Object<string, number[]>} param
     */
    material_set_param(mt, param) {
        for (const k in param) {
            for (let i = 0; i < mt.params[k].length; i++) {
                mt.params[k][i] = param[k][i];
            }
        }
    }

    /* Mesh API */

    mesh_create() {
        return new Mesh_t;
    }
    /**
     * @param {Mesh_t} mesh
     */
    mesh_free(mesh) {
        this.mesh_clear(mesh);
    }
    /**
     * @param {Mesh_t} mesh
     * @param {number} surf_index
     */
    mesh_remove_surface(mesh, surf_index) {
        const gl = this.gl;

        const surface = mesh.surfaces[surf_index];

        if (surface.material) {
            // TODO: this._material_remove_geometry(surface.material, surface);
        }

        gl.deleteBuffer(surface.vertex_id);
        if (surface.index_id) {
            gl.deleteBuffer(surface.index_id);
        }

        mesh.surfaces.splice(surf_index, 1);
    }
    /**
     * @param {Mesh_t} mesh
     */
    mesh_clear(mesh) {
        while (mesh.surfaces.length > 0) {
            this.mesh_remove_surface(mesh, 0);
        }
    }
    /**
     * @param {Mesh_t} mesh
     * @param {number} primitive
     * @param {VertAttribDef[]} attribs
     * @param {ArrayBuffer | Float32Array} vertices
     * @param {ArrayBuffer | Uint16Array} [indices]
     * @param {number} array_len
     * @param {number} index_array_len
     * @param {boolean} [use_3d_vertices]
     */
    mesh_add_surface_from_data(mesh, primitive, attribs, vertices, indices, array_len, index_array_len, use_3d_vertices = false) {
        const gl = this.gl;

        const surface = new Surface_t;
        surface.active = true;
        surface.data = vertices;
        surface.array_len = array_len;
        surface.array_byte_size = vertices.byteLength;
        if (indices) {
            surface.index_data = indices;
            surface.index_array_len = index_array_len;
            surface.index_array_byte_size = indices.byteLength;
        }
        surface.primitive = primitive;
        surface.mesh = mesh;

        let stride = 0;
        for (let i = 0; i < ARRAY_MAX; i++) {
            /** @type {VertAttribDef} */
            let def = null;
            loop_attr: for (let j = 0; j < attribs.length; j++) {
                let a = attribs[j];
                if (a.index === i) {
                    def = a;
                    break loop_attr;
                }
            }

            if (!def) {
                surface.attribs[i] = {
                    enabled: false,
                    index: i,

                    type: 0,
                    size: 0,
                    normalized: false,
                    stride: 0,
                    offset: 0,
                }
            } else {
                /** @type {VertAttrib} */
                surface.attribs[i] = {
                    enabled: true,
                    index: i,

                    type: def.type,
                    size: def.size,
                    normalized: def.normalized || false,
                    stride: def.stride,
                    offset: def.offset,
                };

                if (stride === 0) stride = def.stride;
            }
        }

        // calculate AABB
        if (use_3d_vertices) {
            let aabb = surface.aabb;
            let vec = Vector3.new();
            aabb.set(0, 0, 0, 0, 0, 0);
            let vert_length = Math.floor(stride / 4);
            for (let i = 0; i < array_len; i++) {
                if (i === 0) {
                    aabb.set(
                        vertices[0],
                        vertices[1],
                        vertices[2],
                        SMALL_VEC3.x,
                        SMALL_VEC3.y,
                        SMALL_VEC3.z
                    );
                } else {
                    aabb.expand_to(vec.set(
                        vertices[i * vert_length + 0],
                        vertices[i * vert_length + 1],
                        vertices[i * vert_length + 2]
                    ))
                }
            }
            Vector3.free(vec);
        } else {
            // TODO: calculate 2D AABB (Rect2)
        }

        surface.vertex_id = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, surface.vertex_id);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        if (indices) {
            surface.index_id = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surface.index_id);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }

        mesh.surfaces.push(surface);
    }

    /**
     * @param {Mesh_t} mesh
     * @param {number} surface
     * @param {Material_t} material
     */
    mesh_surface_set_material(mesh, surface, material) {
        if (mesh.surfaces[surface].material === material) return;

        mesh.surfaces[surface].material = material;
    }

    /**
     * @param {Mesh_t} mesh
     */
    mesh_get_aabb(mesh) {
        let aabb = AABB.new();
        for (let i = 0; i < mesh.surfaces.length; i++) {
            if (i === 0) {
                return aabb.copy(mesh.surfaces[i].aabb);
            } else {
                return aabb.merge_with(mesh.surfaces[i].aabb);
            }
        }
        return aabb;
    }

    /**
     * @param {Mesh_t} mesh
     */
    mesh_get_surface_count(mesh) {
        return mesh.surfaces.length;
    }

    multimesh_create() {
        return new MultiMesh_t;
    }
    /**
     * @param {MultiMesh_t} multimesh
     */
    multimesh_free(multimesh) {
        const gl = this.gl;

        if (multimesh.buffer) {
            gl.deleteBuffer(multimesh.buffer);
            if (multimesh.data) {
                free_float32array(multimesh.data);
            }
            multimesh.buffer = null;
            multimesh.data = null;
        }

        multimesh.mesh = null;

        if (multimesh.update_list.in_list()) {
            this.multimesh_update_list.remove(multimesh.update_list);
        }
    }
    /**
     * @param {MultiMesh_t} multimesh
     * @param {number} instances
     * @param {number} transform_format
     * @param {number} color_format
     * @param {number} data_format
     */
    multimesh_allocate(multimesh, instances, transform_format, color_format, data_format) {
        if (
            multimesh.size === instances
            &&
            multimesh.transform_format === transform_format
            &&
            multimesh.color_format === color_format
            &&
            multimesh.custom_data_format === data_format
        ) {
            return;
        }

        const gl = this.gl;

        if (multimesh.buffer) {
            gl.deleteBuffer(multimesh.buffer);
            if (multimesh.data) {
                free_float32array(multimesh.data);
            }
            multimesh.buffer = null;
            multimesh.data = null;
        }

        multimesh.size = instances;
        multimesh.transform_format = transform_format;
        multimesh.color_format = color_format;
        multimesh.custom_data_format = data_format;

        if (multimesh.size) {
            if (multimesh.transform_format === MULTIMESH_TRANSFORM_2D) {
                multimesh.xform_floats = 8;
            } else {
                multimesh.xform_floats = 12;
            }

            if (multimesh.color_format === MULTIMESH_COLOR_8BIT) {
                multimesh.color_floats = 1;
            } else if (multimesh.color_format === MULTIMESH_COLOR_FLOAT) {
                multimesh.color_floats = 4;
            } else {
                multimesh.color_floats = 0;
            }

            if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_8BIT) {
                multimesh.custom_data_floats = 1;
            } else if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_FLOAT) {
                multimesh.custom_data_floats = 4;
            } else {
                multimesh.custom_data_floats = 0;
            }

            const format_floats = multimesh.color_floats + multimesh.xform_floats + multimesh.custom_data_floats;

            multimesh.data = new_float32array(format_floats * instances);
            const data = multimesh.data;

            const c = Color.new();
            const c_8bit = c.set(1, 1, 1, 1).as_rgba8();
            const d_8bit = c.set(0, 0, 0, 0).as_rgba8();
            Color.free(c);

            for (let i = 0, len = instances * format_floats; i < len; i += format_floats) {
                let color_from = 0;
                let custom_data_from = 0;

                if (multimesh.transform_format === MULTIMESH_TRANSFORM_2D) {
                    data[i + 0] = 1.0;
                    data[i + 1] = 0.0;
                    data[i + 2] = 0.0;
                    data[i + 3] = 0.0;
                    data[i + 4] = 0.0;
                    data[i + 5] = 1.0;
                    data[i + 6] = 0.0;
                    data[i + 7] = 0.0;
                    color_from = 8;
                    custom_data_from = 8;
                } else {
                    data[i + 0] = 1.0;
                    data[i + 1] = 0.0;
                    data[i + 2] = 0.0;
                    data[i + 3] = 0.0;
                    data[i + 4] = 0.0;
                    data[i + 5] = 1.0;
                    data[i + 6] = 0.0;
                    data[i + 7] = 0.0;
                    data[i + 8] = 0.0;
                    data[i + 9] = 0.0;
                    data[i + 10] = 1.0;
                    data[i + 11] = 0.0;
                    color_from = 12;
                    custom_data_from = 12;
                }

                if (multimesh.color_format === MULTIMESH_COLOR_8BIT) {
                    data[i + color_from + 0] = c_8bit;
                    custom_data_from = color_from + 1;
                } else if (multimesh.color_format === MULTIMESH_COLOR_FLOAT) {
                    data[i + color_from + 0] = 1.0;
                    data[i + color_from + 1] = 1.0;
                    data[i + color_from + 2] = 1.0;
                    data[i + color_from + 3] = 1.0;
                    custom_data_from = color_from + 1;
                }

                if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_8BIT) {
                    data[i + custom_data_from + 0] = d_8bit;
                } else if (multimesh.custom_data_format === MULTIMESH_CUSTOM_DATA_FLOAT) {
                    data[i + custom_data_from + 0] = 0.0;
                    data[i + custom_data_from + 1] = 0.0;
                    data[i + custom_data_from + 2] = 0.0;
                    data[i + custom_data_from + 3] = 0.0;
                }
            }

            multimesh.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, multimesh.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, multimesh.data, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
        }

        multimesh.dirty_data = true;
        multimesh.dirty_aabb = true;

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
    }
    /**
     * @param {MultiMesh_t} multimesh
     * @param {Mesh_t} mesh
     */
    multimesh_set_mesh(multimesh, mesh) {
        if (multimesh.mesh) {
            multimesh.mesh.multimeshes.remove(multimesh.mesh_list);
        }

        multimesh.mesh = mesh;

        if (multimesh.mesh && mesh) {
            mesh.multimeshes.add(multimesh.mesh_list);
        }

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
    }
    /**
     * @param {MultiMesh_t} multimesh
     * @param {number[]} p_array
     */
    multimesh_set_as_bulk_array(multimesh, p_array) {
        const dsize = multimesh.data.length;
        const data = multimesh.data;

        for (let i = 0; i < dsize; i++) {
            data[i] = p_array[i];
        }

        multimesh.dirty_data = true;
        multimesh.dirty_aabb = true;

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
    }

    /* Light API */

    /**
     * @param {number} p_type
     */
    light_create(p_type) {
        let light = new Light_t;
        light.type = p_type;
        return light;
    }

    /**
     * @param {Light_t} p_light
     * @param {ColorLike} p_color
     */
    light_set_color(p_light, p_color) {
        p_light.color.copy(p_color);
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_param
     * @param {number} p_value
     */
    light_set_param(p_light, p_param, p_value) {
        switch (p_param) {
            case LIGHT_PARAM_RANGE:
            case LIGHT_PARAM_SPOT_ANGLE: {
                p_light.version++;
                p_light.instance_change_notify(true, false);
            } break;
        }
        p_light.param[p_param] = p_value;
    }

    /**
     * @param {Light_t} p_light
     * @param {Texture_t} p_texture
     */
    light_set_projector(p_light, p_texture) {
        p_light.projector = p_texture;
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enable
     */
    light_set_negative(p_light, p_enable) {
        p_light.negative = p_enable;
    }

    /**
     * @param {Light_t} p_light
     * @param {number} p_mask
     */
    light_set_cull_mask(p_light, p_mask) {
        p_light.cull_mask = p_mask;

        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enabled
     */
    light_set_reverse_cull_face_mode(p_light, p_enabled) {
        p_light.reverse_cull = p_enabled;

        p_light.version++;
        p_light.instance_change_notify(true, false);
    }

    /**
     * @param {Light_t} p_light
     * @param {boolean} p_enable
     */
    light_set_shadow(p_light, p_enable) {
        p_light.shadow = p_enable;
        p_light.version++;
    }

    /**
     * @param {Light_t} p_light
     * @param {ColorLike} p_color
     */
    light_set_shadow_color(p_light, p_color) {
        p_light.color.copy(p_color);
    }

    /**
     * @param {Light_t} p_light
     */
    light_get_aabb(p_light) {
        switch (p_light.type) {
            case LIGHT_SPOT: {
                let len = p_light.param[LIGHT_PARAM_RANGE];
                let size = Math.tan(deg2rad(p_light.param[LIGHT_PARAM_SPOT_ANGLE])) * len;
                let aabb = AABB.new();
                aabb.set(-size, -size, -len, size * 2, size * 2, len);
                return aabb;
            };
            case LIGHT_OMNI: {
                let r = p_light.param[LIGHT_PARAM_RANGE];
                let aabb = AABB.new();
                aabb.set(-r, -r, -r, r*2, r*2, r*2);
                return aabb;
            };
            case LIGHT_DIRECTIONAL: {
                return AABB.new();
            };
        }

        return AABB.new();
    }

    /**
     * @param {Instantiable_t} p_base
     * @param {Instance_t} p_instance
     */
    instance_add_dependency(p_base, p_instance) {
        p_base.instance_list.add(p_instance.dependency_item);
    }

    /**
     * @param {number} type
     * @param {number} size
     * @param {number} [usage]
     */
    buffer_create(type, size, usage = WebGLRenderingContext.STREAM_DRAW) {
        const gl = this.gl;

        const size_po2 = nearest_po2(size);
        const buffers = this.buffers[size_po2] = this.buffers[size_po2] || [];
        const buffer = buffers.pop() || {
            size: size_po2,
            gl_buf: gl.createBuffer(),
        }
        gl.bindBuffer(type, buffer.gl_buf);
        gl.bufferData(type, buffer.size, usage);
        return buffer;
    }
}
