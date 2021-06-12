import { remove_items } from "engine/dep/index";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";
import { Color, ColorLike } from "engine/core/color";

import { VSG } from "./visual_server_globals";
import { Canvas } from "./visual_server_canvas";
import { Scenario_t, Camera_t } from "./visual_server_scene";

type RenderTarget_t = import("engine/drivers/webgl/rasterizer_storage").RenderTarget_t;
type ShadowAtlas_t = import("engine/drivers/webgl/rasterizer_scene").ShadowAtlas_t;

const VIEWPORT_UPDATE_DISABLED = 0;
const VIEWPORT_UPDATE_ONCE = 1; //then goes to disabled, must be manually updated
const VIEWPORT_UPDATE_WHEN_VISIBLE = 2; // default
const VIEWPORT_UPDATE_ALWAYS = 3;

// const VIEWPORT_RENDER_INFO_OBJECTS_IN_FRAME = 0;
// const VIEWPORT_RENDER_INFO_VERTICES_IN_FRAME = 1;
// const VIEWPORT_RENDER_INFO_MATERIAL_CHANGES_IN_FRAME = 2;
// const VIEWPORT_RENDER_INFO_SHADER_CHANGES_IN_FRAME = 3;
// const VIEWPORT_RENDER_INFO_SURFACE_CHANGES_IN_FRAME = 4;
// const VIEWPORT_RENDER_INFO_DRAW_CALLS_IN_FRAME = 5;
const VIEWPORT_RENDER_INFO_MAX = 6;

const VIEWPORT_CLEAR_ALWAYS = 0;
const VIEWPORT_CLEAR_NEVER = 1;
const VIEWPORT_CLEAR_ONLY_NEXT_FRAME = 2;

const Black = new Color(0, 0, 0, 0);

const clip_rect = new Rect2;


class CanvasData {
    canvas: import('./visual_server_canvas').Canvas = null;
    transform = new Transform2D;
    layer = 0;
    sublayer = 0;
}

let uid = 0;

export class Viewport_t {
    _id = uid++;

    self: Viewport_t = null;
    parent: Viewport_t = null;

    size = new Vector2;
    camera: Camera_t = null;
    scenario: Scenario_t = null;

    render_target: RenderTarget_t = null;
    update_mode = VIEWPORT_UPDATE_WHEN_VISIBLE;

    viewport_to_screen = 0;
    viewport_to_screen_rect = new Rect2;
    viewport_render_direct_to_screen = false;

    hide_scenario = false;
    hide_canvas = false;
    disable_environment = false;
    disable_3d = false;
    disable_3d_by_usage = false;
    keep_3d_linear = false;

    shadow_atlas: ShadowAtlas_t = null;
    shadow_atlas_size = 0;

    render_info: number[] = Array(VIEWPORT_RENDER_INFO_MAX);

    clear_mode = VIEWPORT_CLEAR_ALWAYS;

    transparent_bg = false;

    global_transform = new Transform2D;
    canvas_map: Map<Canvas, CanvasData> = new Map;

    constructor() {
        for (let i = 0; i < VIEWPORT_RENDER_INFO_MAX; i++) this.render_info[i] = 0;
    }
    get_id() {
        return this._id;
    }
}

/**
 * @param {Viewport_t} p_left
 * @param {Viewport_t} p_right
 */
function viewport_sort(p_left: Viewport_t, p_right: Viewport_t) {
    const left_to_screen = !p_left.viewport_to_screen_rect.is_zero();
    const right_to_screen = !p_left.viewport_to_screen_rect.is_zero();

    if (left_to_screen === right_to_screen) {
        return (p_left.parent === p_right.self) ? -1 : 1;
    } else {
        return right_to_screen ? -1 : 1;
    }
}

export class VisualServerViewport {
    active_viewports: Viewport_t[] = [];

    clear_color = new Color;

    /**
     * @param {ColorLike} p_color
     */
    set_default_clear_color(p_color: ColorLike) {
        this.clear_color.copy(p_color);
    }

    viewport_create() {
        const viewport = new Viewport_t;
        viewport.self = viewport;
        viewport.hide_scenario = false;
        viewport.hide_canvas = false;
        viewport.render_target = VSG.storage.render_target_create();
        viewport.shadow_atlas = VSG.scene_render.shadow_atlas_create();
        viewport.viewport_render_direct_to_screen = false;
        return viewport;
    }
    /**
     * @param {Viewport_t} p_viewport
     */
    viewport_free(p_viewport: Viewport_t) {
        VSG.storage.render_target_free(p_viewport.render_target);

        for (let [c] of p_viewport.canvas_map) {
            this.viewport_remove_canvas(p_viewport, c);
        }

        this.viewport_set_scenario(p_viewport, null);
        this.active_viewports.splice(this.active_viewports.indexOf(p_viewport), 1);
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {number} p_width
     * @param {number} p_height
     */
    viewport_set_size(p_viewport: Viewport_t, p_width: number, p_height: number) {
        p_viewport.size.set(p_width, p_height);
        VSG.storage.render_target_set_size(p_viewport.render_target, p_width, p_height);
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {boolean} p_active
     */
    viewport_set_active(p_viewport: Viewport_t, p_active: boolean) {
        if (p_active) {
            if (this.active_viewports.indexOf(p_viewport) < 0) {
                this.active_viewports.push(p_viewport);
            }
        } else {
            remove_items(this.active_viewports, this.active_viewports.indexOf(p_viewport), 1);
        }
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {Viewport_t} p_parent_viewport
     */
    viewport_set_parent_viewport(p_viewport: Viewport_t, p_parent_viewport: Viewport_t) {
        p_viewport.parent = p_parent_viewport;
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {boolean} p_keep_linear
     */
    viewport_set_keep_3d_linear(p_viewport: Viewport_t, p_keep_linear: boolean) {
        p_viewport.keep_3d_linear = p_keep_linear;
        VSG.storage.render_target_set_flag(p_viewport.render_target, "KEEP_3D_LINEAR", p_keep_linear);
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {boolean} p_fxaa
     */
    viewport_set_use_fxaa(p_viewport: Viewport_t, p_fxaa: boolean) {
        p_viewport.render_target.use_fxaa = p_fxaa;
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {boolean} p_enabled
     */
    viewport_set_vflip(p_viewport: Viewport_t, p_enabled: boolean) {
        p_viewport.render_target.flags.VFLIP = p_enabled;
        VSG.storage.render_target_set_flag(p_viewport.render_target, "VFLIP", p_enabled);
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {Rect2} p_rect
     * @param {number} [p_screen]
     */
    viewport_attach_to_screen(p_viewport: Viewport_t, p_rect: Rect2, p_screen: number = 0) {
        if (p_viewport.viewport_render_direct_to_screen) {
            VSG.storage.render_target_set_size(p_viewport.render_target, p_rect.width, p_rect.height);
            VSG.storage.render_target_set_position(p_viewport.render_target, p_rect.x, p_rect.y);
        }

        p_viewport.viewport_to_screen_rect.copy(p_rect);
        p_viewport.viewport_to_screen = p_screen;
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {boolean} p_enable
     */
    viewport_set_render_direct_to_screen(p_viewport: Viewport_t, p_enable: boolean) {
        if (p_viewport.viewport_render_direct_to_screen == p_enable) {
            return;
        }

        if (!p_enable) {
            VSG.storage.render_target_set_position(p_viewport.render_target, 0, 0);
            VSG.storage.render_target_set_size(p_viewport.render_target, p_viewport.size.x, p_viewport.size.y);
        }

        p_viewport.viewport_render_direct_to_screen = p_enable;

        if (!p_viewport.viewport_to_screen_rect.is_zero() && p_enable) {
            VSG.storage.render_target_set_size(p_viewport.render_target, p_viewport.viewport_to_screen_rect.width, p_viewport.viewport_to_screen_rect.height);
            VSG.storage.render_target_set_position(p_viewport.render_target, p_viewport.viewport_to_screen_rect.x, p_viewport.viewport_to_screen_rect.y);
        }
    }
    /**
     * @param {Viewport_t} p_viewport
     */
    viewport_detach(p_viewport: Viewport_t) {
        if (p_viewport.viewport_render_direct_to_screen) {
            VSG.storage.render_target_set_position(p_viewport.render_target, 0, 0);
            VSG.storage.render_target_set_size(p_viewport.render_target, p_viewport.size.x, p_viewport.size.y);
        }

        p_viewport.viewport_to_screen_rect.set(0, 0, 0, 0);
        p_viewport.viewport_to_screen = 0;
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {number} p_mode
     */
    viewport_set_update_mode(p_viewport: Viewport_t, p_mode: number) {
        p_viewport.update_mode = p_mode;
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {number} p_clear_mode
     */
    viewport_set_clear_mode(p_viewport: Viewport_t, p_clear_mode: number) {
        p_viewport.clear_mode = p_clear_mode;
    }
    /**
     * @param {Viewport_t} p_viewport
     */
    viewport_get_texture(p_viewport: Viewport_t) {
        return p_viewport.render_target.texture;
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {Canvas} p_canvas
     */
    viewport_attach_canvas(p_viewport: Viewport_t, p_canvas: Canvas) {
        p_canvas.viewports.add(p_viewport);

        const canvas_data = new CanvasData();
        canvas_data.layer = 0;
        canvas_data.sublayer = 0;
        canvas_data.canvas = p_canvas;
        p_viewport.canvas_map.set(p_canvas, canvas_data);
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {Canvas} p_canvas
     */
    viewport_remove_canvas(p_viewport: Viewport_t, p_canvas: Canvas) {
        p_viewport.canvas_map.delete(p_canvas);
        p_canvas.viewports.delete(p_viewport);
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {Canvas} p_canvas
     * @param {Transform2D} p_transform
     */
    viewport_set_canvas_transform(p_viewport: Viewport_t, p_canvas: Canvas, p_transform: Transform2D) {
        p_viewport.canvas_map.get(p_canvas).transform.copy(p_transform);
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {Canvas} p_canvas
     * @param {number} p_layer
     * @param {number} p_sublayer
     */
    viewport_set_canvas_stacking(p_viewport: Viewport_t, p_canvas: Canvas, p_layer: number, p_sublayer: number) {
        const canvas = p_viewport.canvas_map.get(p_canvas);
        canvas.layer = p_layer;
        canvas.sublayer = p_sublayer;
    }
    /**
     * @param {Viewport_t} p_viewport
     * @param {Transform2D} p_xform
     */
    viewport_set_global_canvas_transform(p_viewport: Viewport_t, p_xform: Transform2D) {
        p_viewport.global_transform.copy(p_xform);
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {boolean} p_enabled
     */
    viewport_set_transparent_background(p_viewport: Viewport_t, p_enabled: boolean) {
        VSG.storage.render_target_set_flag(p_viewport.render_target, "TRANSPARENT", p_enabled);
        p_viewport.transparent_bg = p_enabled;
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {Scenario_t} p_scenario
     */
    viewport_set_scenario(p_viewport: Viewport_t, p_scenario: Scenario_t) {
        p_viewport.scenario = p_scenario;
    }

    /**
     * @param {Viewport_t} p_viewport
     * @param {Camera_t} p_camera
     */
    viewport_attach_camera(p_viewport: Viewport_t, p_camera: Camera_t) {
        p_viewport.camera = p_camera;
    }

    draw_viewports() {
        // sort viewports
        this.active_viewports.sort(viewport_sort);

        // draw viewports
        for (const vp of this.active_viewports) {
            if (vp.update_mode === VIEWPORT_UPDATE_DISABLED) {
                continue;
            }

            let visible = !vp.viewport_to_screen_rect.is_zero() || vp.update_mode === VIEWPORT_UPDATE_ALWAYS || vp.update_mode === VIEWPORT_UPDATE_ONCE || (vp.update_mode === VIEWPORT_UPDATE_WHEN_VISIBLE && VSG.storage.render_target_was_used(vp.render_target));
            visible = visible && vp.size.x > 1 && vp.size.y > 1;

            if (!visible) {
                continue;
            }

            VSG.storage.render_target_clear_used(vp.render_target);

            VSG.rasterizer.set_current_render_target(vp.render_target);

            this._draw_viewport(vp);

            if (!vp.viewport_to_screen_rect.is_zero() && !vp.viewport_render_direct_to_screen) {
                VSG.rasterizer.set_current_render_target(null);
                VSG.rasterizer.blit_render_target_to_screen(vp.render_target, vp.viewport_to_screen_rect, vp.viewport_to_screen);
            }
        }
    }

    /* private */

    /**
     * @param {Viewport_t} p_viewport
     * @param {Canvas} p_canvas
     * @param {CanvasData} p_canvas_data
     * @param {Rect2} p_rect
     */
    _canvas_get_transform(p_viewport: Viewport_t, p_canvas: Canvas, p_canvas_data: CanvasData, p_rect: Rect2, r_out?: Transform2D) {
        const xf = (r_out || Transform2D.new()).copy(p_viewport.global_transform);

        let scale = 1;
        if (p_viewport.canvas_map.has(p_canvas.parent)) {
            xf.append(p_viewport.canvas_map.get(p_canvas.parent).transform);
            scale = p_canvas.parent_scale;
        }

        xf.append(p_canvas_data.transform);

        if (scale !== 1 && !VSG.canvas.disable_scale) {
            const pivot = _i_vec2_1.set(p_rect.width * 0.5, p_rect.height * 0.5);
            const xfpivot = _i_transform2d_1.identity();
            xfpivot.set_origin(pivot);
            const xfscale = _i_transform2d_2.identity();
            xfscale.scale(scale, scale);

            const inv = _i_transform2d_3.copy(xfpivot).affine_inverse();
            xf.copy(inv.append(xf));
            xf.copy(xfscale.append(xf));
            xf.copy(xfpivot.append(xf));
        }

        return xf;
    }

    /**
     * @param {Viewport_t} p_viewport
     */
    _draw_3d(p_viewport: Viewport_t) {
        VSG.scene.render_camera(p_viewport.camera, p_viewport.scenario, p_viewport.size, p_viewport.shadow_atlas);
    }

    /**
     * @param {Viewport_t} p_viewport
     */
    _draw_viewport(p_viewport: Viewport_t) {
        let scenario_draw_canvas_bg = false;

        let can_draw_3d = !p_viewport.disable_3d && !p_viewport.disable_3d_by_usage && !!p_viewport.camera;

        if (p_viewport.clear_mode !== VIEWPORT_CLEAR_NEVER) {
            VSG.rasterizer.clear_render_target(p_viewport.transparent_bg ? Black : this.clear_color);
            if (p_viewport.clear_mode === VIEWPORT_CLEAR_ONLY_NEXT_FRAME) {
                p_viewport.clear_mode = VIEWPORT_CLEAR_NEVER;
            }
        }

        if (!scenario_draw_canvas_bg && can_draw_3d) {
            this._draw_3d(p_viewport);
        }

        if (!p_viewport.hide_canvas) {
            clip_rect.set(0, 0, p_viewport.size.width, p_viewport.size.height);

            VSG.rasterizer.restore_render_target();

            VSG.canvas_render.prepare();

            let map_list = [...p_viewport.canvas_map.entries()].sort(canvas_sort);
            for (let [canvas, c] of map_list) {
                let xform = this._canvas_get_transform(p_viewport, canvas, c, clip_rect, _i_transform2d_4);
                VSG.canvas.render_canvas(canvas, xform, clip_rect, c.layer);
            }
        }
    }
}

/**
 * @param {[Canvas, CanvasData]} a
 * @param {[Canvas, CanvasData]} b
 */
function canvas_sort(a: [Canvas, CanvasData], b: [Canvas, CanvasData]) {
    return (a[1].layer + a[1].sublayer) - (b[1].layer + b[1].sublayer);
}

const _i_vec2_1 = new Vector2;
const _i_transform2d_1 = new Transform2D;
const _i_transform2d_2 = new Transform2D;
const _i_transform2d_3 = new Transform2D;
const _i_transform2d_4 = new Transform2D;
