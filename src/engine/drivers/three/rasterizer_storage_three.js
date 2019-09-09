import { Color } from "engine/core/color";
import {
    Image,
    FORMAT_RGBA8,
    FORMAT_RGB8,
} from "engine/core/image";

import {
    RGBFormat,
    RGBAFormat,
} from 'three/src/constants';
import { Texture } from 'three/src/textures/Texture';
import { WebGLRenderTarget } from 'three/src/renderers/WebGLRenderTarget';
import { WebGLRenderer } from "three/src/renderers/WebGLRenderer";


/**
 * @param {number} format
 */
function image_format_to_three(format) {
    switch (format) {
        case FORMAT_RGB8: return RGBFormat;
        case FORMAT_RGBA8: return RGBAFormat;
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

export class RasterizerStorageThree {
    constructor() {
        this.frame = {
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

        /** @type {import('./rasterizer_canvas_three').RasterizerCanvasThree} */
        this.canvas = null;
        /** @type {import('./rasterizer_scene_three').RasterizerSceneThree} */
        this.scene = null;

        // private
        this.renderer = null;
    }

    /**
     * @param {WebGLRenderer} renderer
     */
    initialize(renderer) {
        this.renderer = renderer;
    }

    /**
     * @param {any} rid
     */
    free_rid(rid) {
        if (rid instanceof Texture) {
            return true;
        }
    }

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
