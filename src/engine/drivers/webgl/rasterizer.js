import { Rect2 } from "engine/core/math/rect2";
import { Color } from "engine/core/color";
import { OS } from "engine/core/os/os";

import { RasterizerStorage } from "./rasterizer_storage";
import { RasterizerCanvas } from "./rasterizer_canvas";
import { RasterizerScene } from "./rasterizer_scene";
import { resource_map } from "engine/registry";


export class Rasterizer {
    constructor() {
        this.time_total = 0;

        this.storage = new RasterizerStorage();
        this.canvas = new RasterizerCanvas();
        this.scene = new RasterizerScene();
        this.canvas.storage = this.storage;
        this.canvas.scene_render = this.scene;
        this.storage.canvas = this.canvas;
        this.storage.scene = this.scene;
        this.scene.storage = this.storage;

        this.render_canvas = null;
        this.gl = null;

        this.context = null;
    }

    initialize() {
        this.render_canvas = OS.get_singleton().canvas;
        this.gl = OS.get_singleton().gl;

        this.storage.initialize(this.gl);
        this.canvas.initialize(this.gl);
        this.scene.initialize(this.gl);
    }

    /**
     * @param {number} frame_step
     */
    begin_frame(frame_step) {
        this.time_total += frame_step;

        if (frame_step === 0) {
            frame_step = 0.001;
        }

        this.storage.frame.time[0] = this.time_total;
        this.storage.frame.time[1] = this.time_total % 3600;
        this.storage.frame.time[2] = this.time_total % 900;
        this.storage.frame.time[3] = this.time_total % 60;
        this.storage.frame.count++;
        this.storage.frame.delta = frame_step;

        this.storage.update_dirty_resources();

        this.scene.iteration();
    }

    /**
     * @param {import('./rasterizer_storage').RenderTarget_t} p_render_target
     * @param {Rect2} p_screen_rect
     * @param {number} p_screen
     */
    blit_render_targets_to_screen(p_render_target, p_screen_rect, p_screen) {
        // TODO: support non-fullscreen blit (for picture-in-picturga viewports)
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.disable(gl.BLEND);
        gl.useProgram(this.canvas.copy_shader.gl_prog);

        const texunit = this.storage.config.max_texture_image_units - 1;
        gl.activeTexture(gl.TEXTURE0 + texunit);
        gl.uniform1i(this.canvas.copy_shader.tex_uniform_loc["TEXTURE"], texunit);
        gl.bindTexture(gl.TEXTURE_2D, p_render_target.texture.gl_tex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.storage.resources.quadie);

        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
        gl.enableVertexAttribArray(1);

        gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    }

    /**
     * @param {Color} p_color
     */
    clear_render_target(p_color) {
        this.storage.frame.clear_request = true;
        this.storage.frame.clear_request_color.copy(p_color);
    }
    /**
     * @param {import('./rasterizer_storage').RenderTarget_t} p_render_target
     */
    set_current_render_target(p_render_target) {
        const gl = this.gl;

        if (!p_render_target && this.storage.frame.current_rt && this.storage.frame.clear_request) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.storage.frame.current_rt.gl_fbo);
            gl.clearColor(
                this.storage.frame.clear_request_color.r,
                this.storage.frame.clear_request_color.g,
                this.storage.frame.clear_request_color.b,
                this.storage.frame.clear_request_color.a
            );
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        if (p_render_target) {
            this.storage.frame.current_rt = p_render_target;
            this.storage.frame.clear_request = false;

            gl.viewport(0, 0, p_render_target.width, p_render_target.height);
        } else {
            this.storage.frame.current_rt = null;
            this.storage.frame.clear_request = false;
            const window_size = OS.get_singleton().get_window_size();
            gl.viewport(0, 0, window_size.width, window_size.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
    }
    restore_render_target() {
        const gl = this.gl;

        const rt = this.storage.frame.current_rt;
        if (rt) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, rt.gl_fbo);
            gl.viewport(0, 0, rt.width, rt.height);
        }
    }

    end_frame() {
        const gl = this.gl;

        gl.colorMask(false, false, false, true);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.colorMask(true, true, true, true);
    }
    finalize() { }

    get_storage() { return this.storage }
    get_canvas() { return this.canvas }
    get_scene() { return this.scene }
}
