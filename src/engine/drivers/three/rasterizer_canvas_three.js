import { Vector2 } from 'engine/core/math/vector2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color } from 'engine/core/color';
import { OS } from 'engine/core/os/os';

import { WebGLRenderer } from "three/src/renderers/WebGLRenderer";
import {
    OrthographicCamera,
} from 'three/src/cameras/OrthographicCamera';
import { Color as T_COLOR } from 'three/src/math/Color';
import { Matrix4 } from 'three/src/math/Matrix4';


const clear_color = new T_COLOR(0, 0, 0);

export class RasterizerCanvasThree {
    constructor() {
        /** @type {import('./rasterizer_scene_three').RasterizerSceneThree} */
        this.scene_render = null;

        /** @type {import('./rasterizer_storage_three').RasterizerStorageThree} */
        this.storage = null;

        this.state = {
            canvas_shader: null,
            canvas_shadow_shader: null,

            using_texture_rect: false,
            using_ninepatch: false,
            using_skeleton: false,

            skeleton_transform: new Transform2D(),
            skeleton_transform_inverse: new Transform2D(),
            skeleton_texture_size: new Vector2(),

            current_tex: null,
            current_normal: null,

            vp: new Matrix4(),
            using_shadow: false,
            using_transparent_rt: false,
        }

        // private

        /** @type {OrthographicCamera} */
        this.camera = null;
        this.renderer = null;
    }

    /**
     * @param {WebGLRenderer} renderer
     */
    initialize(renderer) {
        this.renderer = renderer;

        this.camera = new OrthographicCamera(0, 1, 0, 1, 0.1, 1);
    }

    draw_window_margins(black_margin, black_image) { }

    update() { }

    canvas_begin() {
        const gl = this.renderer.getContext();
        // TODO: bind canvas shader

        const frame = this.storage.frame;
        let viewport_x = 0, viewport_y = 0, viewport_width = 0, viewport_height = 0;

        if (frame.current_rt) {
            this.renderer.setRenderTarget(frame.current_rt.fbo);

            // if (frame.current_rt.flags[])
            viewport_width = frame.current_rt.width;
            viewport_height = frame.current_rt.height;
            viewport_x = frame.current_rt.x;
            viewport_y = OS.get_singleton().window_size.height - viewport_height - frame.current_rt.y;
            this.renderer.setScissor(viewport_x, viewport_y, viewport_width, viewport_height);
            this.renderer.setViewport(viewport_x, viewport_y, viewport_width, viewport_height);
            gl.enable(gl.SCISSOR_TEST);
        }

        if (frame.clear_request) {
            clear_color.r = frame.clear_request_color.r;
            clear_color.g = frame.clear_request_color.g;
            clear_color.b = frame.clear_request_color.b;
            this.renderer.setClearColor(clear_color, this.state.using_transparent_rt ? frame.clear_request_color.a : 1.0);
            this.renderer.clearColor();
            frame.clear_request = false;
        }

        this.reset_canvas();

        // TODO: bind default white texture

        // TODO: upload projection_matrix uniform
        // TODO: upload final_modulate uniform
        // TODO: upload identity modelview_matrix uniform
        // TODO: upload identity extra_matrix uniform

        // TODO: bind batch buffer
    }

    canvas_end() {
        // TODO: reset viewport to full window size while drawing to screen?

        this.state.using_texture_rect = false;
        this.state.using_skeleton = false;
        this.state.using_ninepatch = false;
        this.state.using_transparent_rt = false;
    }

    reset_canvas() {
        const gl = this.renderer.getContext();
        gl.disable(gl.DEPTH_TEST);
    }

    /* API */

    /**
     * @param {import('engine/servers/visual/visual_server_canvas').Item} p_item_list
     * @param {number} p_z
     * @param {Color} p_modulate
     * @param {any} p_light
     * @param {Transform2D} p_base_transform
     */
    canvas_render_items(p_item_list, p_z, p_modulate, p_light, p_base_transform) {

    }
}
