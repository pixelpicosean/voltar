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
export const INSTANCE_GEOMETRY_MASK = (1 << INSTANCE_TYPE_MESH) | (1 << INSTANCE_TYPE_MULTIMESH) | (1 << INSTANCE_TYPE_IMMEDIATE) | (1 << INSTANCE_TYPE_PARTICLES);

export const LIGHT_DIRECTIONAL = 0;
export const LIGHT_OMNI = 1;
export const LIGHT_SPOT = 2;

export const LIGHT_PARAM_ENERGY = 0;
export const LIGHT_PARAM_INDIRECT_ENERGY = 1;
export const LIGHT_PARAM_SPECULAR = 2;
export const LIGHT_PARAM_RANGE = 3;
export const LIGHT_PARAM_ATTENUATION = 4;
export const LIGHT_PARAM_SPOT_ANGLE = 5;
export const LIGHT_PARAM_SPOT_ATTENUATION = 6;
export const LIGHT_PARAM_CONTACT_SHADOW_SIZE = 7;
export const LIGHT_PARAM_SHADOW_MAX_DISTANCE = 8;
export const LIGHT_PARAM_SHADOW_SPLIT_1_OFFSET = 9;
export const LIGHT_PARAM_SHADOW_SPLIT_2_OFFSET = 10;
export const LIGHT_PARAM_SHADOW_SPLIT_3_OFFSET = 11;
export const LIGHT_PARAM_SHADOW_NORMAL_BIAS = 12;
export const LIGHT_PARAM_SHADOW_BIAS = 13;
export const LIGHT_PARAM_SHADOW_BIAS_SPLIT_SCALE = 14;

export const SHADOW_CASTING_SETTING_OFF = 0;
export const SHADOW_CASTING_SETTING_ON = 1;
export const SHADOW_CASTING_SETTING_DOUBLE_SIDED = 2;
export const SHADOW_CASTING_SETTING_SHADOWS_ONLY = 3;

export const LIGHT_DIRECTIONAL_SHADOW_ORTHOGONAL = 0;
export const LIGHT_DIRECTIONAL_SHADOW_PARALLEL_2_SPLITS = 1;
export const LIGHT_DIRECTIONAL_SHADOW_PARALLEL_4_SPLITS = 2;

export const LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_STABLE = 0;
export const LIGHT_DIRECTIONAL_SHADOW_DEPTH_RANGE_OPTIMIZED = 1;

export const LIGHT_OMNI_SHADOW_DUAL_PARABOLOID = 0;
export const LIGHT_OMNI_SHADOW_CUBE = 1;

export const LIGHT_OMNI_SHADOW_DETAIL_VERTICAL = 0;
export const LIGHT_OMNI_SHADOW_DETAIL_HORIZONTAL = 1;

interface FrameDrawnCallbacks {
    object: any;
    method: string;
    param: any;
}

export class VisualServer extends VObject {
    get class() { return 'VisualServer' }

    static get_singleton() { return singleton }

    black_margin = [0, 0, 0, 0];
    frame_drawn_callbacks: FrameDrawnCallbacks[] = [];

    changes = 0;

    constructor() {
        super();

        if (!singleton) singleton = this;

        VSG.canvas = new VisualServerCanvas;
        VSG.viewport = new VisualServerViewport;
        VSG.scene = new VisualServerScene;
        VSG.rasterizer = new Rasterizer;
        VSG.storage = VSG.rasterizer.get_storage();
        VSG.canvas_render = VSG.rasterizer.get_canvas();
        VSG.scene_render = VSG.rasterizer.get_scene();
    }

    _free() {
        VSG.canvas = null;
        VSG.viewport = null;
        VSG.rasterizer = null;
        VSG.scene = null;

        super._free();
    }

    /* black bars */

    /**
     * @param {number} p_left
     * @param {number} p_top
     * @param {number} p_right
     * @param {number} p_bottom
     */
    black_bars_set_margins(p_left: number, p_top: number, p_right: number, p_bottom: number) {
        this.black_margin[MARGIN_LEFT] = p_left;
        this.black_margin[MARGIN_TOP] = p_top;
        this.black_margin[MARGIN_RIGHT] = p_right;
        this.black_margin[MARGIN_BOTTOM] = p_bottom;
    }

    /* Event queuing */

    /**
     * @param {number} frame_step
     */
    draw(frame_step: number) {
        this.emit_signal('frame_pre_draw');

        this.changes = 0;

        VSG.rasterizer.begin_frame(frame_step);

        VSG.scene.update_dirty_instances();

        VSG.viewport.draw_viewports();
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
    request_frame_drawn_callback(p_where: any, p_method: string, p_userdata: any) {
        this.frame_drawn_callbacks.push({
            object: p_where,
            method: p_method,
            param: p_userdata,
        })
    }

    /**
     * @param {Color} p_color
     */
    set_default_clear_color(p_color: Color) {
        VSG.viewport.set_default_clear_color(p_color);
    }

    redraw_request() {
        this.changes++;
    }

    static changes = 0;
}
GDCLASS(VisualServer, VObject)

/** @type {VisualServer} */
let singleton: VisualServer = null;
