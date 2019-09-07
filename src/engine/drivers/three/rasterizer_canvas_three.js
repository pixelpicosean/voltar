import { Color } from 'engine/core/color';
import { Transform2D } from 'engine/core/math/transform_2d';


export class RasterizerCanvasThree {
    constructor() {
        /** @type {import('./rasterizer_scene_three').RasterizerSceneThree} */
        this.scene_render = null;

        /** @type {import('./rasterizer_storage_three').RasterizerStorageThree} */
        this.storage = null;
    }

    initialize() { }

    draw_window_margins(black_margin, black_image) { }

    update() { }

    canvas_begin() {
        // TODO: bind canvas shader, maybe prepare batch for 2D  rendering?
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
