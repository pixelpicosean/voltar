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
import { Color } from "engine/core/color";

/**
 * @param {number} value
 */
function is_pow2(value) {
    return (value & (value - 1)) === 0;
}


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

export class Texture_t {
    constructor() {
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

        /** @type {Shader_t} */
        this.shader = null;

        /** @type {Object<string, number[]>} */
        this.params = {};
    }
}

export class RasterizerStorage {
    constructor() {
        /** @type {WebGLRenderingContext} */
        this.gl = null;

        this.frame = {
            clear_request: true,
            clear_request_color: new Color(0,0,0,1),
            /** @type {RenderTarget_t} */
            current_rt: null,
            time: [0,0,0,0],
            count: 0,
            delta: 0,
        };

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
                -1,-1,  0,0,
                -1,+1,  0,1,
                +1,+1,  1,1,
                +1,-1,  1,0,
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
                black_texdata[i+0] = 0;
                black_texdata[i+1] = 0;
                black_texdata[i+2] = 0;
                black_texdata[i+3] = 255;
            }
            this.resources.black_tex = create_texture(black_texdata, '_black_');
            // - normal
            const normal_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                normal_texdata[i+0] = 128;
                normal_texdata[i+1] = 128;
                normal_texdata[i+2] = 255;
                normal_texdata[i+3] = 255;
            }
            this.resources.normal_tex = create_texture(normal_texdata, '_normal_');
            // - aniso
            const aniso_texdata = new Uint8Array(8 * 8 * 4);
            for (let i = 0; i < 8 * 8 * 4; i += 4) {
                aniso_texdata[i+0] = 255;
                aniso_texdata[i+1] = 128;
                aniso_texdata[i+2] = 0;
                aniso_texdata[i+3] = 255;
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
    }
    update_dirty_shaders() { }
    update_dirty_materials() { }
    update_dirty_skeletons() { }
    update_dirty_multimeshes() { }

    /* Texture API */

    texture_2d_create() {
        return new Texture_t;
    }
    /**
     * @param {Texture_t} rid
     * @param {number} p_width
     * @param {number} p_height
     * @param {{ min_filter?: number, mag_filter?: number, wrap_u?: number, wrap_v?: number }} [p_flags]
     */
    texture_allocate(rid, p_width, p_height, p_flags = {}) {
        const gl = this.gl;

        rid.width = p_width;
        rid.height = p_height;

        rid.min_filter = p_flags.min_filter || FILTER_NEAREST;
        rid.mag_filter = p_flags.mag_filter || FILTER_NEAREST;
        const po2 = is_pow2(p_width) && is_pow2(p_height);
        rid.wrap_u = p_flags.wrap_u || (po2 ? WRAP_REPEAT : WRAP_CLAMP_TO_EDGE);
        rid.wrap_v = p_flags.wrap_v || (po2 ? WRAP_REPEAT : WRAP_CLAMP_TO_EDGE);

        rid.gl_tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, rid.gl_tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, rid.min_filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, rid.mag_filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, rid.wrap_u);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, rid.wrap_v);
        gl.texImage2D(gl.TEXTURE_2D, 0, get_gl_internal_format(rid.pixel_format), rid.width, rid.height, 0, get_gl_pixel_format(rid.pixel_format), get_gl_texture_type(rid.pixel_format), null);

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
            console.error(`Failed to link shader program!`);
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
                case '2f': mt.params[k] = param[k] || [0,0]; break;
                case '3f': mt.params[k] = param[k] || [0,0,0]; break;
                case '4f': mt.params[k] = param[k] || [0,0,0,0]; break;
                case 'mat3': mt.params[k] = param[k] || [1,0,0, 0,1,0, 0,0,1]; break;
                case 'mat4': mt.params[k] = param[k] || [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; break;
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
}
