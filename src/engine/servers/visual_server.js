import { VObject, GDCLASS } from "engine/core/v_object";
import {
    MARGIN_LEFT,
    MARGIN_TOP,
    MARGIN_RIGHT,
    MARGIN_BOTTOM,
} from "engine/core/math/math_defs";
import { Color } from "engine/core/color";

import { VSG } from "./visual/visual_server_globals";
import { VisualServerCanvas } from "./visual/visual_server_canvas";
import { VisualServerScene } from "./visual/visual_server_scene";
import { VisualServerViewport } from "./visual/visual_server_viewport";

import { Rasterizer } from "engine/drivers/webgl/rasterizer";


export const NO_INDEX_ARRAY = -1;
export const ARRAY_WEIGHTS_SIZE = 4;
export const CANVAS_ITEM_Z_MIN = -4096;
export const CANVAS_ITEM_Z_MAX = 4096;
export const MAX_GLOW_LEVELS = 7;

export const MAX_CURSORS = 8;

export const USAGE_IMMUTABLE = WebGLRenderingContext.STATIC_DRAW;
export const USAGE_DYNAMIC = WebGLRenderingContext.DYNAMIC_DRAW;
export const USAGE_STREAM = WebGLRenderingContext.STREAM_DRAW;

export const INDEX_TYPE_NONE = WebGLRenderingContext.NONE;
export const INDEX_TYPE_UINT16 = WebGLRenderingContext.UNSIGNED_SHORT;
export const INDEX_TYPE_UINT32 = WebGLRenderingContext.UNSIGNED_INT;

export const PRIMITIVE_TYPE_INVALID = 0;
export const PRIMITIVE_TYPE_POINTS = WebGLRenderingContext.POINTS;
export const PRIMITIVE_TYPE_LINES = WebGLRenderingContext.LINES;
export const PRIMITIVE_TYPE_LINE_STRIP = WebGLRenderingContext.LINE_STRIP;
export const PRIMITIVE_TYPE_TRIANGLES = WebGLRenderingContext.TRIANGLES;
export const PRIMITIVE_TYPE_TRIANGLE_STRIP = WebGLRenderingContext.TRIANGLE_STRIP;
export const PRIMITIVE_TYPE_TRIANGLE_FAN = WebGLRenderingContext.TRIANGLE_FAN;

export const TEXTURE_TYPE_2D = WebGLRenderingContext.TEXTURE_2D;
export const TEXTURE_TYPE_CUBEMAP = WebGLRenderingContext.TEXTURE_CUBE_MAP;
// export const TEXTURE_TYPE_2D_ARRAY = WebGL2RenderingContext.TEXTURE_2D_ARRAY;
// export const TEXTURE_TYPE_3D = WebGL2RenderingContext.TEXTURE_3D;

export const FILTER_NEAREST = WebGLRenderingContext.NEAREST;
export const FILTER_LINEAR = WebGLRenderingContext.LINEAR;

export const WRAP_REPEAT = WebGLRenderingContext.REPEAT;
export const WRAP_MIRRORED_REPEAT = WebGLRenderingContext.MIRRORED_REPEAT;
export const WRAP_CLAMP_TO_EDGE = WebGLRenderingContext.CLAMP_TO_EDGE;

export const MULTIMESH_TRANSFORM_2D = 0;
export const MULTIMESH_TRANSFORM_3D = 1;

export const MULTIMESH_COLOR_NONE = 0;
export const MULTIMESH_COLOR_8BIT = 1;
export const MULTIMESH_COLOR_FLOAT = 2;

export const MULTIMESH_CUSTOM_DATA_NONE = 0;
export const MULTIMESH_CUSTOM_DATA_8BIT = 1;
export const MULTIMESH_CUSTOM_DATA_FLOAT = 2;

export const INSTANCE_TYPE_NONE = 0;
export const INSTANCE_TYPE_MESH = 1;
export const INSTANCE_TYPE_MULTIMESH = 2;
export const INSTANCE_TYPE_IMMEDIATE = 3;
export const INSTANCE_TYPE_PARTICLES = 4;
export const INSTANCE_TYPE_LIGHT = 5;
export const INSTANCE_TYPE_REFLECTION_PROBE = 6;
export const INSTANCE_TYPE_GI_PROBE = 7;
export const INSTANCE_TYPE_LIGHTMAP_CAPTURE = 8;

/**
 * @typedef FrameDrawnCallbacks
 * @property {any} object
 * @property {string} method
 * @property {any} param
 */

export class VisualServer extends VObject {
    get class() { return 'VisualServer' }

    static get_singleton() { return singleton }

    constructor() {
        super();

        if (!singleton) singleton = this;

        this.black_margin = [0, 0, 0, 0];
        this.black_image = [null, null, null, null];

        /** @type {FrameDrawnCallbacks[]} */
        this.frame_drawn_callbacks = [];

        this.changes = 0;

        VSG.canvas = new VisualServerCanvas();
        VSG.viewport = new VisualServerViewport();
        VSG.scene = new VisualServerScene();
        VSG.rasterizer = new Rasterizer();
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

        VSG.scene.update_dirty_instances();

        VSG.viewport.draw_viewports();
        this._draw_margins();
        VSG.rasterizer.end_frame();

        for (const c of this.frame_drawn_callbacks) {
            c.object[c.method].call(c.object, c.param);
        }
        this.frame_drawn_callbacks.length = 0;

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
