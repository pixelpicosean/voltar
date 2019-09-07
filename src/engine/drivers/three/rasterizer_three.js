import { Color } from "engine/core/color";

import { RasterizerStorageThree } from "./rasterizer_storage_three";
import { RasterizerCanvasThree } from "./rasterizer_canvas_three";
import { RasterizerSceneThree } from "./rasterizer_scene_three";


export class RasterizerThree {
    constructor() {
        this.time_total = 0;

        this.storage = new RasterizerStorageThree();
        this.canvas = new RasterizerCanvasThree();
        this.scene = new RasterizerSceneThree();
        this.canvas.storage = this.storage;
        this.canvas.scene_render = this.scene;
        this.storage.canvas = this.canvas;
        this.storage.scene = this.scene;
        this.scene.storage = this.storage;
    }

    initialize() {
        console.log('Using Three.js rendering backend');

        this.storage.initialize();
        this.canvas.initialize();
        this.scene.initialize();
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

        this.storage.info.render_final.copy(this.storage.info.render);
        this.storage.info.render.reset();

        this.scene.iteration();
    }

    prepare_for_blitting_render_targets() { }
    blit_render_targets_to_screen(p_render_targets) { }
    /**
     * @param {Color} p_color
     */
    clear_render_target(p_color) {
        this.storage.frame.clear_request = true;
        this.storage.frame.clear_request_color.copy(p_color);
    }
    /**
     * @param {boolean} p_3d_was_drawn
     */
    restore_render_target(p_3d_was_drawn) {
        // TODO: reset viewport, camera?
    }

    end_frame() { }
    finalize() { }

    get_storage() { return this.storage }
    get_canvas() { return this.canvas }
    get_scene() { return this.scene }
}
