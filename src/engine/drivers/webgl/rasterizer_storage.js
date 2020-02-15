import { SelfList, List } from "engine/core/self_list";
import { is_po2, nearest_po2 } from "engine/core/math/math_funcs";
import { Color } from "engine/core/color";

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
} from "engine/servers/visual_server";


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
        this.render_target = false;
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

export class RenderTarget_t {
    constructor() {
        this.name = '';

        this.width = 0;
        this.height = 0;

        /** @type {Texture_t} */
        this.texture = null;

        /** @type {WebGLFramebuffer} */
        this.gl_fbo = null;
    }
}

/**
 * @typedef {'1f' | '2f' | '3f' | '4f' | 'mat3' | 'mat4'} UniformTypes
 */

export class Shader_t {
    constructor() {
        this.name = '';

        /** @type {WebGLProgram} */
        this.gl_prog = null;

        /** @type {Object<string, { type: UniformTypes, gl_loc: WebGLUniformLocation }>} */
        this.uniforms = {};
    }
}

export class Material_t {
    constructor() {
        this.name = '';

        this.batchable = false;

        /** @type {Shader_t} */
        this.shader = null;

        /** @type {Object<string, number[]>} */
        this.params = {};
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

class Surface_t {
    constructor() {
        /** @type {Material_t} */
        this.material = null;

        /** @type {VertAttrib[]} */
        this.attribs = [];

        /** @type {Mesh_t} */
        this.mesh = null;

        /** @type {WebGLBuffer} */
        this.vertex_id = null;
        /** @type {WebGLBuffer} */
        this.index_id = null;

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

export class Mesh_t {
    constructor() {
        this.active = false;

        /** @type {List<MultiMesh_t>} */
        this.multimeshes = new List;

        /** @type {Surface_t[]} */
        this.surfaces = [];
    }
    update_multimeshes() { }
}

export class MultiMesh_t {
    constructor() {
        /** @type {Mesh_t} */
        this.mesh = null;
        this.size = 0;

        /** @type {SelfList<MultiMesh_t>} */
        this.update_list = new SelfList(this);
        /** @type {SelfList<MultiMesh_t>} */
        this.mesh_list = new SelfList(this);

        /** @type {number[]} */
        this.data = [];

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

        // get extensions

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
    update_dirty_multimeshes() { }
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
        rt.texture.render_target = true;
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
     */
    material_create(shader, param = {}) {
        const mt = new Material_t;
        mt.shader = shader;

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
     */
    mesh_add_surface_from_data(mesh, primitive, attribs, vertices, indices) {
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
        for (let i = 0; i < attribs.length; i++) {
            const a = attribs[i];

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

    multimesh_create() {
        return new MultiMesh_t;
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

        for (let i = 0; i < dsize; i++) {
            multimesh.data[i] = p_array[i];
        }

        multimesh.dirty_data = true;
        multimesh.dirty_aabb = true;

        if (!multimesh.update_list.in_list()) {
            this.multimesh_update_list.add(multimesh.update_list);
        }
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
