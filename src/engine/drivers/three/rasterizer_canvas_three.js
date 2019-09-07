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
}
