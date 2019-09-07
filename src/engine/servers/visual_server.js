import { VObject, GDCLASS } from "engine/core/v_object";
import { Color } from "engine/core/color";

import {
    MARGIN_LEFT,
    MARGIN_TOP,
    MARGIN_RIGHT,
    MARGIN_BOTTOM,
} from "engine/scene/controls/const";

import { VSG } from "./visual/visual_server_globals";
import { VisualServerCanvas } from "./visual/visual_server_canvas";
import { VisualServerScene } from "./visual/visual_server_scene";
import { VisualServerViewport } from "./visual/visual_server_viewport";

import { RasterizerThree } from "engine/drivers/three/rasterizer_three";


export const NO_INDEX_ARRAY = -1;
export const ARRAY_WEIGHTS_SIZE = 4;
export const CANVAS_ITEM_Z_MIN = -4096;
export const CANVAS_ITEM_Z_MAX = 4096;
export const MAX_GLOW_LEVELS = 7;

export const MAX_CURSORS = 8;

export const TEXTURE_FLAG_MIPMAPS = 1;
export const TEXTURE_FLAG_REPEAT = 2;
export const TEXTURE_FLAG_FILTER = 4;
export const TEXTURE_FLAG_ANISOTROPIC_FILTER = 8;
export const TEXTURE_FLAG_CONVERT_TO_LINEAR = 16;
export const TEXTURE_FLAG_MIRRORED_REPEAT = 32;
export const TEXTURE_FLAGS_DEFAULT = TEXTURE_FLAG_REPEAT | TEXTURE_FLAG_MIPMAPS | TEXTURE_FLAG_FILTER;

export const TEXTURE_TYPE_2D = 0;
export const TEXTURE_TYPE_CUBEMAP = 1;
export const TEXTURE_TYPE_2D_ARRAY = 2;
export const TEXTURE_TYPE_3D = 3;


/**
 * @typedef FrameDrawnCallbacks
 * @property {any} object
 * @property {string} method
 * @property {any} param
 */

export class VisualServer extends VObject {
    static get_singleton() { return singleton }
    static create() { }

    constructor() {
        super();

        if (!singleton) singleton = this;

        this.class = 'VisualServer';

        this.black_margin = [0, 0, 0, 0];
        this.black_image = [null, null, null, null];

        /** @type {FrameDrawnCallbacks[]} */
        this.frame_drawn_callbacks = [];

        this.changes = 0;

        VSG.canvas = new VisualServerCanvas();
        VSG.viewport = new VisualServerViewport();
        VSG.scene = new VisualServerScene();
        VSG.rasterizer = new RasterizerThree();
        VSG.storage = VSG.rasterizer.get_storage();
        VSG.canvas_render = VSG.rasterizer.get_canvas();
        VSG.scene_render = VSG.rasterizer.get_scene();
    }
    free() {
        VSG.canvas = null;
        VSG.viewport = null;
        VSG.rasterizer = null;
        VSG.scene = null;

        return super.free();
    }

    /* black bars */

    /**
     * @param {number} p_left
     * @param {number} p_top
     * @param {number} p_right
     * @param {number} p_bottom
     */
    black_bars_set_margins(p_left, p_top, p_right, p_bottom) {
        this.black_margin[MARGIN_LEFT] = p_left;
        this.black_margin[MARGIN_TOP] = p_top;
        this.black_margin[MARGIN_RIGHT] = p_right;
        this.black_margin[MARGIN_BOTTOM] = p_bottom;
    }

    /**
     * @param {any} p_left
     * @param {any} p_top
     * @param {any} p_right
     * @param {any} p_bottom
     */
    black_bars_set_images(p_left, p_top, p_right, p_bottom) {
        this.black_image[MARGIN_LEFT] = p_left;
        this.black_image[MARGIN_TOP] = p_top;
        this.black_image[MARGIN_RIGHT] = p_right;
        this.black_image[MARGIN_BOTTOM] = p_bottom;
    }

    /* Event queuing */

    /**
     * @param {number} frame_step
     */
    draw(frame_step) {
        this.emit_signal('frame_pre_draw');

        this.changes = 0;

        VSG.rasterizer.begin_frame(frame_step);

        VSG.scene_render.update();

        VSG.viewport.draw_viewports();
        VSG.scene.render_probes();
        VSG.canvas_render.update();

        this._draw_margins();
        VSG.rasterizer.end_frame();

        for (const c of this.frame_drawn_callbacks) {
            c.object[c.method].call(c.object, c.param);
        }

        this.emit_signal('frame_post_draw');
    }
    sync() { }
    has_changed() {
        return this.changes > 0;
    }
    init() {
        VSG.rasterizer.initialize();
    }
    finish() {
        VSG.rasterizer.finalize();
    }

    /**
     * @param {any} p_where
     * @param {string} p_method
     * @param {any} p_userdata
     */
    request_frame_drawn_callback(p_where, p_method, p_userdata) {
        this.frame_drawn_callbacks.push({
            object: p_where,
            method: p_method,
            param: p_userdata,
        })
    }

    /**
     * @param {Color} p_color
     */
    set_default_clear_color(p_color) {
        VSG.viewport.set_default_clear_color(p_color);
    }

    free_rid(p_rid) {
        if (VSG.storage.free_rid(p_rid))
            return;
        if (VSG.canvas.free_rid(p_rid))
            return;
        if (VSG.viewport.free_rid(p_rid))
            return;
        if (VSG.scene.free_rid(p_rid))
            return;
        if (VSG.scene_render.free_rid(p_rid))
            return;
    }

    /* private */

    _draw_margins() {
        VSG.canvas_render.draw_window_margins(this.black_margin, this.black_image);
    }
}
GDCLASS(VisualServer, VObject)

VisualServer.changes = 0;

/** @type {VisualServer} */
let singleton = null;
