import { Color } from "engine/core/color";
import {
    Image,
} from "engine/core/image";

import RenderTexture from "./renderTexture/RenderTexture";
import { RENDER_TARGET_FLAG_MAX } from "./constants";


class RenderTarget {
    constructor() {
        /** @type {RenderTexture} */
        this.fbo = null;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.flags = new Array(RENDER_TARGET_FLAG_MAX);

        this.used_in_frame = false;

        this.external = {
            /** @type {RenderTexture} */
            fbo: null,
            color: new Color(),
            texture: null,
        }
    }
}

class Render {
    constructor() {
        this.reset();
    }
    reset() {
        this.object_count = 0;
        this.draw_call_count = 0;
        this.material_switch_count = 0;
        this.surface_switch_count = 0;
        this.shader_rebind_count = 0;
        this.vertices_count = 0;
    }
    /**
     * @param {Render} r
     */
    copy(r) {
        this.object_count = r.object_count;
        this.draw_call_count = r.draw_call_count;
        this.material_switch_count = r.material_switch_count;
        this.surface_switch_count = r.surface_switch_count;
        this.shader_rebind_count = r.shader_rebind_count;
        this.vertices_count = r.vertices_count;
        return this;
    }
}

export class RasterizerStorage {
    constructor() {
        this.frame = {
            /** @type {RenderTarget} */
            current_rt: null,

            clear_request: false,
            clear_request_color: new Color(),
            canvas_draw_commands: 0,
            time: [0, 0, 0, 0],
            delta: 0,
            count: 0,
        };

        this.info = {
            texture_mem: 0,
            vertex_mem: 0,

            render: new Render(),
            render_final: new Render(),
            snap: new Render(),
        };

        this.resources = {
            /** @type {WebGLTexture} */
            white_tex: null,
            /** @type {WebGLTexture} */
            black_tex: null,
            /** @type {WebGLTexture} */
            normal_tex: null,
            /** @type {WebGLTexture} */
            aniso_tex: null,

            mipmap_blur_fbo: 0,
            mipmap_blur_color: 0,

            radical_inverse_vdc_cache_tex: 0,
            use_rgba_2d_shadows: 0,

            quadie: 0,

            skeleton_transform_buffer_size: 0,
            skeleton_transform_buffer: 0,
            skeleton_transform_cpu_buffer: [],
        };

        /** @type {import('./rasterizer_canvas').RasterizerCanvas} */
        this.canvas = null;
        /** @type {import('./rasterizer_scene').RasterizerScene} */
        this.scene = null;

        // private
        this.gl = null;
    }

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl) {
        this.gl = gl;

        // default textures
        const create_texture = (/** @type {Uint8Array} */texdata) => {
            // return new DataTexture(texdata, 8, 8, RGBFormat);
            let tex = gl.createTexture();
            return tex;
        }
        // - white
        const white_texdata = new Uint8Array(8 * 8 * 3);
        for (let i = 0; i < 8 * 8 * 3; i++) {
            white_texdata[i] = 255;
        }
        this.resources.white_tex = create_texture(white_texdata);
        // - black
        const black_texdata = new Uint8Array(8 * 8 * 3);
        for (let i = 0; i < 8 * 8 * 3; i++) {
            black_texdata[i] = 0;
        }
        this.resources.black_tex = create_texture(black_texdata);
        // - normal
        const normal_texdata = new Uint8Array(8 * 8 * 3);
        for (let i = 0; i < 8 * 8 * 3; i += 3) {
            normal_texdata[i+0] = 128;
            normal_texdata[i+1] = 128;
            normal_texdata[i+2] = 255;
        }
        this.resources.normal_tex = create_texture(normal_texdata);
        // - aniso
        const aniso_texdata = new Uint8Array(8 * 8 * 3);
        for (let i = 0; i < 8 * 8 * 3; i += 3) {
            aniso_texdata[i+0] = 255;
            aniso_texdata[i+1] = 128;
            aniso_texdata[i+2] = 0;
        }
        this.resources.aniso_tex = create_texture(aniso_texdata);
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

    /**
     * @param {any} p_texture
     * @param {number} p_width
     * @param {number} p_height
     * @param {number} p_depth
     * @param {number} p_format
     * @param {number} p_type
     * @param {number} [p_flags]
     */
    texture_allocate(p_texture, p_width, p_height, p_depth, p_format, p_type, p_flags) {
        const texture = new Texture();
        texture.format = image_format_to_three(p_format);
        return texture;
    }
    /**
     * @param {Image} p_image
     */
    texture_2d_create(p_image) {
        const texture = new Texture();
        if (p_image) {
            texture.image = p_image.data;
            texture.format = image_format_to_three(p_image.format);
            texture.needsUpdate = true;
        }
        return texture;
    }
    /**
     * @param {Texture} rid
     * @param {Image} p_image
     */
    texture_set_data(rid, p_image) {
        rid.image = p_image.data;
        rid.needsUpdate = true;
    }
    /**
     * @param {Texture} rid
     * @param {number} p_flags
     */
    texture_set_flags(rid, p_flags) { }

    /* RenderTarget API */

    render_target_create() {
        return new WebGLRenderTarget(0, 0);
    }
    /**
     * @param {WebGLRenderTarget} render_target
     * @param {number} x
     * @param {number} y
     */
    render_target_set_position(render_target, x, y) {
        render_target.viewport.x = x;
        render_target.viewport.y = y;
        render_target.scissor.x = x;
        render_target.scissor.y = y;
    }
    /**
     * @param {WebGLRenderTarget} render_target
     * @param {number} width
     * @param {number} height
     */
    render_target_set_size(render_target, width, height) {
        // keep x/y
        const x = render_target.viewport.x;
        const y = render_target.viewport.y;

        render_target.setSize(width, height);

        // reset x/y
        render_target.viewport.x = x;
        render_target.viewport.y = y;
        render_target.scissor.x = x;
        render_target.scissor.y = y;
    }
    /**
     * @param {WebGLRenderTarget} render_target
     */
    render_target_get_texture(render_target) {
        return render_target.texture;
    }
}
