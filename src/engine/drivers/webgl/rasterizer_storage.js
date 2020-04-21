import { SelfList, List } from "engine/core/self_list";
import { is_po2, nearest_po2 } from "engine/core/math/math_funcs";
import { Vector2 } from "engine/core/math/vector2";
import { Vector3 } from "engine/core/math/vector3";
import { Color } from "engine/core/color";
import { AABB } from "engine/core/math/aabb";

import {
    PIXEL_FORMAT_L8,
    PIXEL_FORMAT_LA8,
    PIXEL_FORMAT_RGB8,
    PIXEL_FORMAT_RGBA8,
    PIXEL_FORMAT_RGBA4,
    PIXEL_FORMAT_RGBA5551,
    ImageTexture,
} from "engine/scene/resources/texture";

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
} from "engine/servers/visual_server";
import {
    Instance_t,
} from "engine/servers/visual/visual_server_scene";

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

        this.type = TEXTURE_TYPE_2D;
        /** @type {RenderTarget_t} */
        this.render_target = null;
        this.width = 0;
        this.height = 0;
        this.usage = USAGE_IMMUTABLE;
        this.pixel_format = PIXEL_FORMAT_RGBA8;
        this.min_filter = FILTER_NEAREST;
        this.mag_filter = FILTER_NEAREST;
        this.wrap_u = WRAP_REPEAT;
        this.wrap_v = WRAP_REPEAT;
        this.has_mipmap = false;

        /** @type {WebGLRenderbuffer} */
        this.gl_depth_render_buffer = null;
        /** @type {WebGLTexture} */
        this.gl_tex = null;

        this.initialized = false;
    }
}

let inst_uid = 0;
export class Instantiable_t {
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
    constructor() {
        super();

        this.type = GEOMETRY_INVALID;

        /** @type {Material_t} */
        this.material = null;

        this.last_pass = 0;
        this.index = 0;
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
            TRANSPARENT: true,
        };

        this.used_in_frame = false;

        /** @type {Texture_t} */
        this.texture = null;

        this.copy_screen_effect = new Effect_t;

        /** @type {WebGLFramebuffer} */
        this.gl_fbo = null;
    }
}

/**
 * @typedef {'1i' | '1f' | '2f' | '3f' | '4f' | 'mat3' | 'mat4'} UniformTypes
 */

const BLEND_MODE_MIX = 0;

const DEPTH_DRAW_OPAQUE = 0;

const CULL_MODE_FRONT = 0;

export class Shader_t {
    constructor() {
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

        /** @type {Float32Array} */
        this.data = null;
        /** @type {Uint16Array} */
        this.index_data = null;
    }
}

export class Mesh_t extends Instantiable_t {
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

        this.config = {
            max_vertex_texture_image_units: 0,
            max_texture_image_units: 0,
            max_texture_size: 0,
        };

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

        // fetch config values
        this.config.max_vertex_texture_image_units = gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
        this.config.max_texture_image_units = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
        this.config.max_texture_size = gl.getParameter(gl.MAX_TEXTURE_SIZE);

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

    texture_2d_create() {
        return new Texture_t;
    }
    /**
     * @param {Texture_t} rid
     * @param {number} p_width
     * @param {number} p_height
     * @param {{ min_filter?: number, mag_filter?: number, wrap_u?: number, wrap_v?: number, has_mipmap?: boolean }} [p_flags]
     */
    texture_allocate(rid, p_width, p_height, p_flags = {}) {
        const gl = this.gl;

        rid.width = p_width;
        rid.height = p_height;

        rid.min_filter = p_flags.min_filter || FILTER_NEAREST;
        rid.mag_filter = p_flags.mag_filter || FILTER_NEAREST;
        rid.wrap_u = p_flags.wrap_u || WRAP_CLAMP_TO_EDGE;
        rid.wrap_v = p_flags.wrap_v || WRAP_CLAMP_TO_EDGE;

        if (rid.gl_tex) {
            gl.deleteTexture(rid.gl_tex);
            rid.gl_tex = null;
        }

        rid.gl_tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, rid.min_filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, rid.mag_filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, rid.wrap_u);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rid.wrap_v);
        gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.pixel_format), rid.width, rid.height, 0, get_gl_pixel_format(rid.pixel_format), get_gl_texture_type(rid.pixel_format), null);

        if (p_flags.has_mipmap && is_po2(rid.width) && is_po2(rid.height)) {
            rid.has_mipmap = true;
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        rid.initialized = true;
    }
    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").DOMImageData} p_data
     */
    texture_set_image(rid, p_data) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);

        gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.pixel_format), get_gl_pixel_format(rid.pixel_format), get_gl_texture_type(rid.pixel_format), p_data);
    }
    /**
     * @param {Texture_t} rid
     * @param {import("engine/scene/resources/texture").RawImageData} p_data
     */
    texture_set_data(rid, p_data) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);

        gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.pixel_format), rid.width, rid.height, 0, get_gl_pixel_format(rid.pixel_format), get_gl_texture_type(rid.pixel_format), p_data);
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
     * @param {number} p_width
     * @param {number} p_height
     */
    render_target_set_size(rt, p_width, p_height) {
        if (rt.width === p_width && rt.height === p_height) {
            return;
        }

        const gl = this.gl;

        if (rt.gl_fbo) {
            gl.deleteFramebuffer(rt.gl_fbo);
            rt.gl_fbo = null;

            gl.deleteTexture(rt.texture.gl_tex)
            rt.texture.gl_tex = null;

            if (rt.texture.gl_depth_render_buffer) {
                gl.deleteRenderbuffer(rt.texture.gl_depth_render_buffer);
                rt.texture.gl_depth_render_buffer = null;
            }
        }

        rt.width = p_width;
        rt.height = p_height;

        rt.gl_fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt.gl_fbo);

        this.texture_allocate(rt.texture, p_width, p_height);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt.texture.gl_tex, 0);

        // TODO: depth

        // copy texscreen buffers
        rt.copy_screen_effect.gl_color = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, rt.copy_screen_effect.gl_color);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rt.width, rt.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);

        rt.copy_screen_effect.gl_fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt.copy_screen_effect.gl_fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, rt.copy_screen_effect.gl_color, 0);

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
     * @param {Float32Array} vertices
     * @param {Uint16Array} [indices]
     * @param {boolean} [use_3d_vertices]
     */
    mesh_add_surface_from_data(mesh, primitive, attribs, vertices, indices, use_3d_vertices = false) {
        const gl = this.gl;

        const surface = new Surface_t;
        surface.active = true;
        surface.data = vertices;
        surface.array_len = vertices.length;
        surface.array_byte_size = vertices.byteLength;
        if (indices) {
            surface.index_data = indices;
            surface.index_array_len = indices.length;
            surface.index_array_byte_size = indices.byteLength;
        }
        surface.primitive = primitive;
        surface.mesh = mesh;

        let stride = 0;
        for (let i = 0; i < attribs.length; i++) {
            const a = attribs[i];

            if (i === 0) stride = a.stride;

            surface.attribs[i] = {
                enabled: true,
                index: i,

                type: a.type,
                size: a.size,
                normalized: a.normalized || false,
                stride: a.stride,
                offset: a.offset,
            }
        }

        // calculate AABB
        if (use_3d_vertices) {
            let aabb = surface.aabb;
            let vec = Vector3.new();
            aabb.set(0, 0, 0, 0, 0, 0);
            let vert_length = Math.floor(stride / 4);
            let position_len = Math.floor(vertices.length / vert_length);
            for (let i = 0; i < position_len; i++) {
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

    /**
     * @param {Mesh_t} p_base
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
