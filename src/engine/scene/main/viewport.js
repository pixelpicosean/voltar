import { node_class_map, preload_queue } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { Rect2 } from "engine/core/math/rect2";
import { OS } from "engine/core/os/os";
import {
    NOTIFICATION_WM_MOUSE_EXIT,
    NOTIFICATION_WM_FOCUS_OUT,
} from "engine/core/main_loop";
import {
    InputEvent,
    InputEventMouseButton,
    InputEventMouseMotion,
    BUTTON_LEFT,
    BUTTON_WHEEL_DOWN,
    BUTTON_WHEEL_UP,
    BUTTON_WHEEL_LEFT,
    BUTTON_WHEEL_RIGHT,
    BUTTON_MASK_LEFT,
} from "engine/core/os/input_event";
import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_READY,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
    NOTIFICATION_DRAG_END,
} from "engine/scene/main/node";
import { VSG } from "engine/servers/visual/visual_server_globals";
import { Texture } from "engine/scene/resources/texture";
import { World2D } from "engine/scene/resources/world_2d";
import { CanvasItem } from "engine/scene/2d/canvas_item";

import { CanvasLayer } from "./canvas_layer";
import { remove_items } from "engine/dep/index";
import { Input } from "engine/main/input";
import { Engine } from "engine/core/engine";
import {
    FOCUS_NONE,
    MOUSE_FILTER_STOP,
    MOUSE_FILTER_IGNORE,
} from "../gui/const";
import {
    Control,
    CComparator,
    NOTIFICATION_MODAL_CLOSE,
    NOTIFICATION_MOUSE_EXIT,
    NOTIFICATION_MOUSE_ENTER,
    NOTIFICATION_FOCUS_EXIT,
    NOTIFICATION_FOCUS_ENTER,
} from "../gui/control";
import {
    Camera,
    NOTIFICATION_LOST_CURRENT,
    NOTIFICATION_BECAME_CURRENT,
} from "../3d/camera";
import { World } from "../resources/world";
import {
    NOTIFICATION_EXIT_WORLD,
    NOTIFICATION_ENTER_WORLD,
} from "../3d/spatial";
import { GROUP_CALL_REALTIME } from "./scene_tree";


export const UPDATE_MODE_DISABLED = 0;
export const UPDATE_MODE_ONCE = 1;
export const UPDATE_MODE_WHEN_VISIBLE = 2;
export const UPDATE_MODE_ALWAYS = 3;

export const CLEAR_MODE_ALWAYS = 0;
export const CLEAR_MODE_NEVER = 1;
export const CLEAR_MODE_ONLY_NEXT_FRAME = 2;

export const USAGE_2D = 0;
export const USAGE_2D_NO_SAMPLING = 1;
export const USAGE_3D = 2;
export const USAGE_3D_NO_EFFECTS = 3;

const VEC2_NEG = Object.freeze(new Vector2(-1, -1));

const subdiv = [0, 1, 4, 16, 64, 256, 1024];


class ViewportTexture extends Texture {
    get viewport_path() {
        return this._viewport_path;
    }
    set viewport_path(path) {
        if (this._viewport_path === path) {
            return;
        }
        this._viewport_path = path;
        if (this.get_local_scene()) {
            this.setup_local_to_scene();
        }
    }

    constructor() {
        super();

        this.resource_local_to_scene = true;
        this._viewport_path = '';

        /** @type {Viewport} */
        this.vp = null;

        this.proxy = VSG.storage.texture_create();
    }
    free() {
        if (this.vp) {
            this.vp.viewport_textures.delete(this);
        }
        VSG.storage.texture_free(this.proxy);
        return super.free();
    }

    get_width() { return this.vp.size.width }
    get_height() { return this.vp.size.height }
    get_size() { return this.vp.size }

    set_flags(value) {
        Object.assign(this._flags, value);

        if (!this.vp) {
            return;
        }

        this.vp.texture_flags = this._flags;
        VSG.storage.texture_set_flags(this.vp.texture_rid, this._flags);
    }

    get_rid() {
        return this.proxy;
    }

    /* private */

    setup_local_to_scene() {
        if (this.vp) {
            this.vp.viewport_textures.delete(this);
        }
        this.vp = null
        const local_scene = this.get_local_scene();
        if (!local_scene) {
            return;
        }

        const vpn = local_scene.get_node(this.resource_path);
        this.vp = /** @type {Viewport} */(vpn);

        this.vp.viewport_textures.add(this);

        VSG.storage.texture_set_proxy(this.proxy, this.vp.texture_rid);

        Object.assign(this.vp.texture_flags, this._flags);
        VSG.storage.texture_set_flags(this.vp.texture_rid, this.flags);
    }
}
GDCLASS(ViewportTexture, Texture)


class GUI {
    constructor() {
        this.key_event_accepted = false;
        /** @type {Control} */
        this.mouse_focus = null;
        /** @type {Control} */
        this.last_mouse_focus = null;
        this.mouse_click_grabber = null;
        this.mouse_focus_mask = 0;
        /** @type {Control} */
        this.key_focus = null;
        /** @type {Control} */
        this.mouse_over = null;
        /** @type {Control} */
        this.tooltip = null;
        /** @type {Control} */
        this.tooltip_popup = null;
        this.tooltip_label = null;
        this.tooltip_pos = new Vector2;
        this.last_mouse_pos = new Vector2;
        this.drag_accum = new Vector2;
        this.drag_attempted = false;
        this.drag_data = false;
        /** @type {Control} */
        this.drag_preview = null;
        this.tooltip_timer = -1;
        this.tooltip_delay = 0.5;
        /** @type {Control[]} */
        this.modal_stack = [];
        this.focus_inv_xform = new Transform2D;
        this.subwindow_order_dirty = false;
        this.subwindow_visibility_dirty = false;
        /** @type {Control[]} */
        this.subwindows = [];
        /** @type {Control[]} */
        this.all_known_subwindows = [];
        this.roots_order_dirty = false;
        /** @type {Control[]} */
        this.roots = [];
        this.canvas_sort_index = 0;
        this.dragging = false;
    }
}


export class Viewport extends Node {
    get class() { return 'Viewport' }

    get render_target_update_mode() { return this._render_target_update_mode }
    set render_target_update_mode(value) { this.set_render_target_update_mode(value) }

    get render_target_clear_mode() { return this._render_target_clear_mode }
    set render_target_clear_mode(value) { this.set_render_target_clear_mode(value) }

    get size() { return this._size }
    set size(value) { this.set_size(value) }

    get canvas_transform() { return this._canvas_transform }
    set canvas_transform(value) { this.set_canvas_transform(value) }

    get global_canvas_transform() { return this._global_canvas_transform }
    set global_canvas_transform(value) { this.set_global_canvas_transform(value) }

    get world_2d() { return this._world_2d }
    set world_2d(value) { this.set_world_2d(value) }

    constructor() {
        super();

        this.input_group = `_vp_input${this.instance_id}`;
        this.gui_input_group = `_vp_gui_input${this.instance_id}`;
        this.unhandled_input_group = `_vp_unhandled_input${this.instance_id}`;
        this.unhandled_key_input_group = `_vp_unhandled_key_input${this.instance_id}`;

        /** @type {Viewport} */
        this.parent = null;

        /** @type {Camera} */
        this.camera = null;
        /** @type {Camera[]} */
        this.cameras = [];

        /** @type {Set<CanvasLayer>} */
        this.canvas_layers = new Set();

        this.viewport = VSG.viewport.viewport_create();
        this.current_canvas = null;

        this._canvas_transform = new Transform2D();
        this._global_canvas_transform = new Transform2D();
        this.stretch_transform = new Transform2D();

        this._size = new Vector2();
        this.attach_to_screen_rect = new Rect2();
        this.render_direct_to_screen = false;

        this.size_override = false;
        this.size_override_stretch = false;
        this.size_override_size = new Vector2(1, 1);
        this.size_override_margin = new Vector2();

        this.last_vp_rect = new Rect2();

        this.transparent_bg = false;
        this.render_target_v_flip = false;
        this._render_target_clear_mode = CLEAR_MODE_ALWAYS;
        this.filter = false;
        this.gen_mipmaps = false;

        this.snap_controls_to_pixels = true;

        this.local_input_handled = false;
        this.handle_input_locally = true;

        /** @type {World} */
        this.world = null;
        /** @type {World} */
        this.own_world = null;

        /**
         * @type {World2D}
         */
        this._world_2d = new World2D();

        this.disable_input = false;
        this.disable_3d = false;
        this.keep_3d_linear = false;
        this._render_target_update_mode = UPDATE_MODE_WHEN_VISIBLE;
        this.texture_rid = VSG.viewport.viewport_get_texture(this.viewport);
        this.texture_flags = {
            FILTER: false,
            REPEAT: false,
            MIPMAP: false,
        };

        this.usage = USAGE_3D;

        this.shadow_atlas_size = 0;
        this.shadow_atlas_quadrant_subdiv = [0, 0, 0, 0];

        /** @type {ViewportTexture} */
        this.default_texture = new ViewportTexture;
        this.default_texture.vp = this;

        /** @type {Set<ViewportTexture>} */
        this.viewport_textures = new Set();
        this.viewport_textures.add(this.default_texture);
        VSG.storage.texture_set_proxy(this.default_texture.proxy, this.texture_rid);

        this.gui = new GUI();
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.size) this.set_size(data.size);
        if (data.render_target_v_flip !== undefined) this.set_render_target_v_flip(data.render_target_v_flip);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (this.get_parent()) {
                    this.parent = this.get_parent().get_viewport();
                    VSG.viewport.viewport_set_parent_viewport(this.viewport, this.parent.get_viewport_rid());
                } else {
                    this.parent = null;
                }

                this.current_canvas = this.find_world_2d().canvas;
                VSG.viewport.viewport_set_scenario(this.viewport, this.find_world().scenario);
                VSG.viewport.viewport_attach_canvas(this.viewport, this.current_canvas);

                this.find_world_2d()._register_viewport(this, Rect2.EMPTY);

                this.add_to_group('_viewports');

                VSG.viewport.viewport_set_active(this.viewport, true);
            } break;
            case NOTIFICATION_READY: {
                if (this.cameras.length && !this.camera) {
                    /** @type {Camera} */
                    let first = null;
                    for (let i = 0; i < this.cameras.length; i++) {
                        if (!first || first.is_greater_than(this.cameras[i])) {
                            first = this.cameras[i];
                        }
                    }
                    if (first) first.make_current();
                }

                this.set_process_internal(true);
                this.set_physics_process_internal(true);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this._gui_cancel_tooltip();
                if (this._world_2d) {
                    this._world_2d._remove_viewport(this);
                }

                VSG.viewport.viewport_set_scenario(this.viewport, null);
                VSG.viewport.viewport_remove_canvas(this.viewport, this.current_canvas);

                this.remove_from_group('_viewports');

                VSG.viewport.viewport_set_active(this.viewport, false);
            } break;
            case NOTIFICATION_INTERNAL_PROCESS: {
                if (this.gui.tooltip_timer >= 0) {
                    this.gui.tooltip_timer -= this.get_process_delta_time();
                    if (this.gui.tooltip_timer < 0) {
                        this._gui_show_tooltip();
                    }
                }
            } break;
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: {
                // TODO: physics pick
            } break;
            case NOTIFICATION_WM_MOUSE_EXIT:
            case NOTIFICATION_WM_FOCUS_OUT: {
                this._drop_physics_mouseover();

                if (this.gui.mouse_focus) {
                    this._drop_mouse_focus();
                }
            } break;
        }
    }

    free() {
        VSG.viewport.viewport_free(this.viewport);
        return super.free();
    }

    /* public */

    is_input_handled() {
        if (this.handle_input_locally) {
            return this.local_input_handled;
        } else {
            return this.get_tree().is_input_handled();
        }
    }
    set_input_as_handled() {
        if (this.handle_input_locally) {
            this.local_input_handled = true;
        } else {
            this.get_tree().set_input_as_handled();
        }
    }
    /**
     * @param {InputEvent} p_event
     */
    input(p_event) {
        this.local_input_handled = false;

        if (!this.is_input_handled()) {
            this.get_tree()._call_input_pause(this.input_group, '_input', p_event);
        }

        if (!this.is_input_handled()) {
            this._gui_input_event(p_event);
        }
    }
    /**
     * @param {InputEvent} p_event
     */
    unhandled_input(p_event) {
        this.get_tree()._call_input_pause(this.unhandled_input_group, '_unhandled_input', p_event);
        if (!this.get_tree().input_handled && p_event.class === 'InputKeyEvent') {
            this.get_tree()._call_input_pause(this.unhandled_key_input_group, '_unhandled_key_input', p_event);
        }

        // TODO: if (physics_object_picking)
    }

    /**
     * returns new Vector2
     */
    get_mouse_position() {
        const xform = this.get_final_transform().affine_inverse()
        const input_pre_xform = this._get_input_pre_xform();
        xform.append(input_pre_xform);
        Transform2D.free(input_pre_xform);
        const pos = Input.get_singleton().get_mouse_position().clone()
            .subtract(this._get_window_offset())
        xform.xform(pos, pos);
        Transform2D.free(xform);
        return pos;
    }
    warp_mouse(p_pos) { }

    get_viewport_rid() {
        return this.viewport;
    }

    gui_reset_canvas_sort_index() {
        this.gui.canvas_sort_index = 0;
    }
    gui_get_canvas_sort_index() {
        return this.gui.canvas_sort_index++;
    }

    /**
     * @param {Vector2Like} p_size
     */
    set_size(p_size) {
        if (this._size.x === Math.floor(p_size.x) && this._size.y === Math.floor(p_size.y)) {
            return;
        }
        this._size.copy(p_size).floor();
        VSG.viewport.viewport_set_size(this.viewport, this._size.x, this._size.y);

        this._update_stretch_transform();

        this.emit_signal('size_changed');
    }

    /**
     * @param {Transform2D} p_xform
     */
    set_canvas_transform(p_xform) {
        this._canvas_transform.copy(p_xform);
        VSG.viewport.viewport_set_canvas_transform(this.viewport, this.find_world_2d().canvas, this._canvas_transform);
    }

    /**
     * @param {Transform2D} p_xform
     */
    set_global_canvas_transform(p_xform) {
        this._global_canvas_transform.copy(p_xform);
        this._update_global_transform();
    }

    /**
     * @param {World2D} p_world_2d
     */
    set_world_2d(p_world_2d) {
        if (this._world_2d === p_world_2d) {
            return;
        }

        if (this.parent && this.parent.find_world_2d() === p_world_2d) {
            return;
        }

        if (this.is_inside_tree()) {
            this.find_world_2d()._remove_viewport(this);
            VSG.viewport.viewport_remove_canvas(this.viewport, this.current_canvas);
        }

        if (p_world_2d) {
            this._world_2d = p_world_2d;
        } else {
            this._world_2d = new World2D();
        }

        if (this.is_inside_tree()) {
            this.current_canvas = this.find_world_2d().canvas;
            VSG.viewport.viewport_attach_canvas(this.viewport, this.current_canvas);
            this.find_world_2d()._register_viewport(this, Rect2.EMPTY);
        }
    }

    /**
     * @param {number} value
     */
    set_render_target_update_mode(value) {
        this._render_target_update_mode = value;
        VSG.viewport.viewport_set_update_mode(this.viewport, value);
    }

    /**
     * @param {boolean} p_enabled
     */
    set_transparent_bg(p_enabled) {
        this.transparent_bg = p_enabled;
        VSG.viewport.viewport_set_transparent_background(this.viewport, p_enabled);
    }

    /**
     * @param {boolean} p_enabled
     */
    set_render_target_v_flip(p_enabled) {
        this.render_target_v_flip = p_enabled;
        VSG.viewport.viewport_set_vflip(this.viewport, p_enabled);
    }

    /**
     * @param {number} value
     */
    set_render_target_clear_mode(value) {
        this._render_target_clear_mode = value;
        VSG.viewport.viewport_set_clear_mode(this.viewport, value);
    }

    /**
     * @param {Rect2} p_rect
     */
    set_attach_to_screen_rect(p_rect) {
        VSG.viewport.viewport_attach_to_screen(this.viewport, p_rect);
        this.attach_to_screen_rect.copy(p_rect);
    }

    /**
     * @param {number} p_size
     */
    set_shadow_atlas_size(p_size) {
        if (this.shadow_atlas_size === p_size) {
            return;
        }

        this.shadow_atlas_size = p_size;
        this.viewport.shadow_atlas_size = p_size;
        VSG.scene_render.shadow_atlas_set_size(this.viewport.shadow_atlas, this.viewport.shadow_atlas_size);
    }

    /**
     * @param {number} p_quadrant
     * @param {number} p_subdiv
     */
    set_shadow_atlas_quadrant_subdiv(p_quadrant, p_subdiv) {
        if (this.shadow_atlas_quadrant_subdiv[p_quadrant] === p_subdiv) {
            return;
        }

        this.shadow_atlas_quadrant_subdiv[p_quadrant] = p_subdiv;
        VSG.scene_render.shadow_atlas_set_quadrant_subdivision(this.viewport.shadow_atlas, p_quadrant, subdiv[p_subdiv])
    }

    /* private */

    /**
     * @param {Camera} camera
     */
    _camera_set(camera) {
        if (this.camera === camera) return;

        if (this.camera) {
            this.camera.notification(NOTIFICATION_LOST_CURRENT);
        }

        this.camera = camera;

        if (camera) {
            VSG.viewport.viewport_attach_camera(this.viewport, camera.camera);
        } else {
            VSG.viewport.viewport_attach_camera(this.viewport, null);
        }

        if (camera) {
            camera.notification(NOTIFICATION_BECAME_CURRENT);
        }
    }

    /**
     * @param {Camera} camera
     */
    _camera_add(camera) {
        this.cameras.push(camera);
        return this.cameras.length === 1;
    }

    /**
     * @param {Camera} camera
     */
    _camera_remove(camera) {
        let idx = this.cameras.indexOf(camera);
        if (idx >= 0) {
            this.cameras.splice(idx, 1);
        }
        if (this.camera === camera) {
            this.camera.notification(NOTIFICATION_LOST_CURRENT);
            this.camera = null;
        }
    }

    /**
     * @param {Camera} p_exclude
     */
    _camera_make_next_current(p_exclude) {
        for (let i = 0; i < this.cameras.length; i++) {
            if (this.cameras[i] === p_exclude) continue;
            if (!this.cameras[i].is_inside_tree()) continue;
            if (this.camera) return;
            this.cameras[i].make_current();
        }
    }

    _camera_transform_changed_notify() { }

    /**
     * @param {Control} p_control
     * @param {InputEvent} p_input
     */
    _gui_call_input(p_control, p_input) {
        const mb = /** @type {InputEventMouseButton} */(p_input);
        let cant_stop_me_now = (
            mb.class === 'InputEventMouseButton'
            &&
            (
                mb.button_index === BUTTON_WHEEL_DOWN
                ||
                mb.button_index === BUTTON_WHEEL_UP
                ||
                mb.button_index === BUTTON_WHEEL_LEFT
                ||
                mb.button_index === BUTTON_WHEEL_RIGHT
            )
        )
        cant_stop_me_now = (p_input.class === 'InputEventPanGesture') || cant_stop_me_now;

        const ismouse = (p_input.class === 'InputEventMouseButton') || (p_input.class === 'InputEventMouseMotion');

        let ci = p_control;
        while (ci) {
            if (ci.is_control) {
                if (ci.c_data.mouse_filter !== MOUSE_FILTER_IGNORE) {
                    ci.emit_signal('gui_input', p_input);
                }
                if (this.gui.key_event_accepted) {
                    break;
                }
                if (!ci.is_inside_tree()) {
                    break;
                }

                if (ci.c_data.mouse_filter !== MOUSE_FILTER_IGNORE) {
                    ci._gui_input_(p_input);
                }

                if (!ci.is_inside_tree() || ci.is_set_as_toplevel()) {
                    break;
                }
                if (this.gui.key_event_accepted) {
                    break;
                }
                if (!cant_stop_me_now && ci.c_data.mouse_filter === MOUSE_FILTER_STOP && ismouse) {
                    break;
                }
            }

            if (ci.is_set_as_toplevel()) {
                break;
            }

            const ev = p_input.xformed_by(ci.get_transform());
            ci = /** @type {Control} */(ci.get_parent_item());
        }
    }
    /**
     * @param {Control} p_control
     * @param {number} p_what
     */
    _gui_call_notification(p_control, p_what) {
        let ci = p_control;
        while (ci) {
            if (ci.is_control) {
                if (ci.c_data.mouse_filter !== MOUSE_FILTER_IGNORE) {
                    ci.notification(p_what);
                }

                if (!ci.is_inside_tree()) {
                    break;
                }

                if (!ci.is_inside_tree() || ci.is_set_as_toplevel()) {
                    break;
                }
                if (ci.c_data.mouse_filter === MOUSE_FILTER_STOP) {
                    break;
                }
            }

            if (ci.is_set_as_toplevel()) {
                break;
            }

            ci = /** @type {Control} */(ci.get_parent_item());
        }
    }

    _gui_prepare_subwindows() {
        if (this.gui.subwindow_visibility_dirty) {
            this.gui.subwindows.length = 0;
            for (const E of this.gui.all_known_subwindows) {
                if (E.is_visible_in_tree()) {
                    this.gui.subwindows.push(E);
                }
            }

            this.gui.subwindow_visibility_dirty = false;
            this.gui.subwindow_order_dirty = true;
        }

        this._gui_sort_subwindows();
    }
    _gui_sort_subwindows() {
        if (!this.gui.subwindow_order_dirty) return;

        this.gui.modal_stack.sort(CComparator);
        this.gui.subwindows.sort(CComparator);

        this.gui.subwindow_order_dirty = false;
    }
    _gui_sort_roots() {
        if (!this.gui.roots_order_dirty) {
            return;
        }
        this.gui.roots.sort(CComparator);
        this.gui.roots_order_dirty = false;
    }
    _gui_sort_modal_stack() { }
    /**
     * @param {Vector2Like} p_global
     */
    _gui_find_control(p_global) {
        this._gui_prepare_subwindows();

        const subwindows = this.gui.subwindows;
        for (let i = subwindows.length - 1; i >= 0; i--) {
            const sw = subwindows[i];
            if (!sw.is_visible_in_tree()) continue;

            /** @type {Transform2D} */
            let xform = null;
            const pci = sw.get_parent_item();
            if (pci) {
                xform = pci.get_global_transform_with_canvas();
            } else {
                xform = sw.get_canvas_transform().clone();
            }

            const ret = this._gui_find_control_at_pos(sw, p_global, xform, this.gui.focus_inv_xform);
            Transform2D.free(xform);

            if (ret) {
                return ret;
            }
        }

        this._gui_sort_roots();

        const roots = this.gui.roots;
        for (let i = roots.length - 1; i >= 0; i--) {
            const sw = roots[i];
            if (!sw.is_visible_in_tree()) continue;

            /** @type {Transform2D} */
            let xform = null;
            const pci = sw.get_parent_item();
            if (pci) {
                xform = pci.get_global_transform_with_canvas();
            } else {
                xform = sw.get_canvas_transform().clone();
            }

            const ret = this._gui_find_control_at_pos(sw, p_global, xform, this.gui.focus_inv_xform);
            Transform2D.free(xform);

            if (ret) {
                return ret;
            }
        }

        return null;
    }
    /**
     * @param {CanvasItem} p_node
     * @param {Vector2Like} p_global
     * @param {Transform2D} p_xform
     * @param {Transform2D} r_inv_xform
     */
    _gui_find_control_at_pos(p_node, p_global, p_xform, r_inv_xform) {
        if (p_node.class === 'Viewport') {
            return null;
        }

        if (!p_node.visible) {
            return null;
        }

        const node_xform = p_node.get_transform();
        const matrix = p_xform.clone().append(node_xform);
        if (matrix.basis_determinant() === 0) {
            Transform2D.free(matrix);
            Transform2D.free(node_xform);
            return null;
        }

        const c = /** @type {Control} */(p_node);
        const matrix_inv = matrix.clone().affine_inverse();
        const xform_global = matrix_inv.xform(p_global);
        // const has = c._has_point_(xform_global);
        if (!c.is_control || !c.clips_input() || c._has_point_(xform_global)) {
            for (let i = p_node.data.children.length - 1; i >= 0; i--) {
                if (p_node === this.gui.tooltip_popup) {
                    continue;
                }

                const ci = /** @type {CanvasItem} */(p_node.data.children[i]);
                if (!ci.is_canvas_item || ci.is_set_as_toplevel()) {
                    continue;
                }

                const ret = this._gui_find_control_at_pos(ci, p_global, matrix, r_inv_xform);
                if (ret) {
                    Vector2.free(xform_global);
                    Transform2D.free(matrix_inv);
                    Transform2D.free(matrix);
                    Transform2D.free(node_xform);
                    return ret;
                }
            }
        }

        if (!c.is_control) {
            return null;
        }

        matrix.affine_inverse();

        const xform_global2 = matrix.xform(p_global);
        const has2 = c._has_point_(xform_global2);
        if (c.c_data.mouse_filter !== MOUSE_FILTER_IGNORE && c._has_point_(xform_global2) && (!this.gui.drag_preview || (c !== this.gui.drag_preview && !this.gui.drag_preview.is_a_parent_of(c)))) {
            r_inv_xform.copy(matrix);

            Vector2.free(xform_global2);
            Vector2.free(xform_global);
            Transform2D.free(matrix_inv);
            Transform2D.free(matrix);
            Transform2D.free(node_xform);
            return c;
        }

        Vector2.free(xform_global2);
        Vector2.free(xform_global);
        Transform2D.free(matrix_inv);
        Transform2D.free(matrix);
        Transform2D.free(node_xform);

        return null;
    }

    /**
     * @param {InputEvent} p_event
     */
    _gui_input_event(p_event) {
        const gui = this.gui;

        if (p_event.class === 'InputEventMouseButton') {
            let mb = /** @type {InputEventMouseButton} */(p_event);
            gui.key_event_accepted = false;

            const mpos = mb.position;
            if (mb.is_pressed()) {
                const pos = mpos.clone();

                if (gui.mouse_focus_mask) {
                    gui.mouse_focus_mask |= (1 << (mb.button_index - 1));
                } else {
                    let is_handled = false;

                    this._gui_sort_modal_stack();
                    while (gui.modal_stack.length > 0) {
                        const top = gui.modal_stack[gui.modal_stack.length - 1];
                        const gt = top.get_global_transform_with_canvas();
                        const pos2 = gt.affine_inverse().xform(mpos);
                        if (!top._has_point_(pos2)) {
                            if (top.c_data.modal_exclusive || top.c_data.modal_frame === Engine.get_singleton().get_frames_drawn()) {
                                this.set_input_as_handled();
                                return;
                            }

                            top.notification(NOTIFICATION_MODAL_CLOSE);
                            top._modal_stack_remove();
                            top.hide();

                            if (!top.pass_on_modal_close_click()) {
                                is_handled = true;
                            }
                        } else {
                            break;
                        }

                        Vector2.free(pos2);
                        Transform2D.free(gt);
                    }

                    if (is_handled) {
                        this.set_input_as_handled();
                        return;
                    }

                    gui.mouse_focus = this._gui_find_control(pos);
                    gui.last_mouse_focus = gui.mouse_focus;

                    if (!gui.mouse_focus) {
                        gui.mouse_focus_mask = 0;
                        return;
                    }

                    gui.mouse_focus_mask = (1 << (mb.button_index - 1));

                    if (mb.button_index === BUTTON_LEFT) {
                        gui.drag_accum.set(0, 0);
                        gui.drag_attempted = false;
                    }
                }

                mb = mb.xformed_by(Transform2D.IDENTITY);
                mb.global_position.copy(pos);
                gui.focus_inv_xform.xform(pos, pos);
                mb.position.copy(pos);

                if (mb.button_index === BUTTON_LEFT) {
                    let ci = gui.mouse_focus;
                    while (ci) {
                        if (ci.is_control) {
                            if (ci.focus_mode !== FOCUS_NONE) {
                                if (ci !== gui.key_focus) {
                                    ci.grab_focus();
                                }
                                break;
                            }

                            if (ci.c_data.mouse_filter === MOUSE_FILTER_STOP) {
                                break;
                            }
                        }

                        if (ci.is_set_as_toplevel()) {
                            break;
                        }

                        ci = /** @type {Control} */(ci.get_parent_item());
                    }
                }

                if (gui.mouse_focus && gui.mouse_focus.can_process()) {
                    this._gui_call_input(gui.mouse_focus, mb);
                }

                this.set_input_as_handled();

                if (gui.drag_data && mb.button_index === BUTTON_LEFT) {
                    if (gui.mouse_focus) {
                        this._gui_drop(gui.mouse_focus, pos, false);
                    }

                    gui.drag_data = null;
                    gui.dragging = false;

                    if (gui.drag_preview) {
                        // FIXME: should we free this `gui.drag_preview`?
                        gui.drag_preview = null;
                    }
                    this._propagate_viewport_notification(this, NOTIFICATION_DRAG_END);
                }

                this._gui_cancel_tooltip();

                Vector2.free(pos);
            } else {
                if (gui.drag_data && mb.button_index === BUTTON_LEFT) {
                    if (gui.mouse_over) {
                        const pos = mpos.clone();
                        gui.focus_inv_xform.xform(pos, pos);
                        this._gui_drop(gui.mouse_over, pos, false);
                        Vector2.free(pos);
                    }

                    if (gui.drag_preview && mb.button_index === BUTTON_LEFT) {
                        // FIXME: should we free this `gui.drag_preview`?
                        gui.drag_preview = null;
                    }

                    gui.drag_data = null;
                    gui.dragging = false;
                    this._propagate_viewport_notification(this, NOTIFICATION_DRAG_END);
                }

                gui.mouse_focus_mask &= ~(1 << (mb.button_index - 1));

                if (!gui.mouse_focus) {
                    return;
                }

                const pos = mpos.clone();
                mb = mb.xformed_by(Transform2D.IDENTITY);
                mb.global_position.copy(pos);
                gui.focus_inv_xform.xform(pos, pos);
                mb.position.copy(pos);
                Vector2.free(pos);

                const mouse_focus = gui.mouse_focus;

                if (gui.mouse_focus_mask === 0) {
                    gui.mouse_focus = null;
                }

                if (mouse_focus && mouse_focus.can_process()) {
                    this._gui_call_input(mouse_focus, mb);
                }

                this.set_input_as_handled();
            }
        }

        if (p_event.class === 'InputEventMouseMotion') {
            let mm = /** @type {InputEventMouseMotion} */(p_event);

            gui.key_event_accepted = false;
            const mpos = mm.position.clone();

            gui.last_mouse_pos.copy(mpos);

            /** @type {Control} */
            let over = null;

            if (!gui.drag_attempted && gui.mouse_focus && mm.button_mask & BUTTON_MASK_LEFT) {
                // TODO
            }

            if (gui.mouse_focus) {
                over = gui.mouse_focus;
            } else {
                over = this._gui_find_control(mpos);
            }

            if (gui.drag_data && gui.modal_stack.length > 0) {
                // TODO
            }

            if (over !== gui.mouse_over) {
                if (gui.mouse_over) {
                    this._gui_call_notification(gui.mouse_over, NOTIFICATION_MOUSE_EXIT);
                }

                this._gui_cancel_tooltip();

                if (over) {
                    this._gui_call_notification(over, NOTIFICATION_MOUSE_ENTER);
                }
            }

            gui.mouse_over = over;

            if (gui.drag_preview) {
                gui.drag_preview.set_rect_position(mpos);
            }

            if (!over) {
                // TODO: OS.get_singleton().set_cursor_shape()
                return;
            }

            const localizer = over.get_global_transform_with_canvas().affine_inverse();
            const pos = localizer.xform(mpos);
            const speed = localizer.basis_xform(mm.speed);
            const rel = localizer.basis_xform(mm.relative);

            // TODO: recycle input events
            mm = mm.xformed_by(Transform2D.IDENTITY);

            mm.global_position.copy(mpos);
            mm.speed.copy(speed);
            mm.relative.copy(rel);

            if (mm.button_mask === 0) {
                let can_tooltip = true;

                if (gui.modal_stack.length > 0) {
                    const last = gui.modal_stack[gui.modal_stack.length - 1];
                    if (last !== over && !last.is_a_parent_of(over)) {
                        can_tooltip = false;
                    }
                }

                let is_tooltip_shown = false;

                if (gui.tooltip_popup) {
                    if (can_tooltip && gui.tooltip) {
                        const p = gui.tooltip.get_global_transform().xform_inv(mpos);
                        const tooltip = this._gui_get_tooltip(over, p);

                        if (tooltip.length === 0) {
                            this._gui_cancel_tooltip();
                        } else if (gui.tooltip_label) {
                            if (tooltip === gui.tooltip_label.text) {
                                is_tooltip_shown = true;
                            }
                        } else if (tooltip === /** @type {any} */(gui.tooltip_popup).get_tooltip_text()) {
                            is_tooltip_shown = true;
                        }

                        Vector2.free(p);
                    } else {
                        this._gui_cancel_tooltip();
                    }
                }

                if (can_tooltip && !is_tooltip_shown) {
                    gui.tooltip = over;
                    gui.tooltip_pos.copy(mpos);
                    gui.tooltip_timer = gui.tooltip_delay;
                }
            }

            mm.position.copy(pos);

            // TODO: update cursor

            if (over && over.can_process()) {
                this._gui_call_input(over, mm);
            }

            this.set_input_as_handled();

            if (gui.drag_data && mm.button_mask === BUTTON_MASK_LEFT) {
                const can_drop = this._gui_drop(over, pos, true);

                // TODO: update cursor
                if (!can_drop) {}
            }

            Vector2.free(rel);
            Vector2.free(speed);
            Vector2.free(pos);
            Transform2D.free(localizer);

            Vector2.free(mpos);
        }

        if (p_event.class === 'InputEventScreenTouch') { }
        if (p_event.class === 'InputEventGesture') { }
        if (p_event.class === 'InputEventScreenDrag') { }
    }

    update_worlds() {
        if (!this.is_inside_tree()) {
            return;
        }

        const abstracted_rect = this.get_visible_rect();
        abstracted_rect.x = abstracted_rect.y = 0;

        const xformed_rect = this.global_canvas_transform.clone()
            .append(this.canvas_transform)
            .affine_inverse()
            .xform_rect(abstracted_rect);
        this.find_world_2d()._update_viewport(this, xformed_rect);
        this.find_world_2d()._update();

        Rect2.free(abstracted_rect);
    }

    /**
     * returns new Transform2D
     */
    _get_input_pre_xform() {
        const pre_xf = Transform2D.new();
        if (!this.attach_to_screen_rect.is_zero()) {
            pre_xf.tx = -this.attach_to_screen_rect.x;
            pre_xf.ty = -this.attach_to_screen_rect.y;
            pre_xf.scale(this.size.x / this.attach_to_screen_rect.width, this.size.y / this.attach_to_screen_rect.height);
        }
        return pre_xf;
    }

    /**
     * @param {InputEvent} p_ev
     */
    _vp_input(p_ev) {
        if (this.disable_input) return;
        if (this.attach_to_screen_rect.is_zero()) return;

        const ev = this._make_input_local(p_ev);
        this.input(ev);
    }
    /**
     * @param {string} p_text
     */
    _vp_input_text(p_text) { }
    /**
     * @param {InputEvent} p_ev
     */
    _vp_unhandled_input(p_ev) {
        if (this.disable_input) return;
        if (this.attach_to_screen_rect.is_zero()) return;

        const ev = this._make_input_local(p_ev);
        this.unhandled_input(ev);
    }
    /**
     * @param {InputEvent} ev
     */
    _make_input_local(ev) {
        const vp_ofs = this._get_window_offset().clone().negate();
        const pre_xform = this._get_input_pre_xform();
        const ai = this.get_final_transform().affine_inverse().append(pre_xform);
        const local_ev = ev.xformed_by(ai, vp_ofs);
        Transform2D.free(pre_xform);
        Transform2D.free(ai);
        Vector2.free(vp_ofs);
        return local_ev;
    }

    /**
     * @param {Control} p_control
     */
    _gui_add_root_control(p_control) {
        this.gui.roots_order_dirty = true;
        this.gui.roots.push(p_control);
        return p_control;
    }

    /**
     * @param {Control} p_control
     */
    _gui_add_subwindow_control(p_control) {
        p_control.connect('visibility_changed', this._subwindow_visibility_changed, this);

        if (p_control.is_visible_in_tree()) {
            this.gui.subwindow_order_dirty = true;
            this.gui.subwindows.push(p_control);
        }

        return this.gui.all_known_subwindows.push(p_control);
    }

    _gui_set_subwindow_order_dirty() { }
    _gui_set_root_order_dirty() { }

    /**
     * @param {Control} p_control
     */
    _gui_remove_modal_control(p_control) { }
    /**
     * @param {Control} MI
     * @param {Control} p_prev_focus_owner
     */
    _gui_remove_from_modal_stack(MI, p_prev_focus_owner) {
        // TODO: modal stack support
    }
    /**
     * @param {Control} p_control
     */
    _gui_remove_root_control(p_control) {
        remove_items(this.gui.roots, this.gui.roots.indexOf(p_control), 1);
    }
    /**
     * @param {Control} p_control
     */
    _gui_remove_subwindow_control(p_control) { }

    /**
     * @param {Control} p_control
     * @param {Vector2} p_pos
     * @param {{ from: Control }} [r_which]
     */
    _gui_get_tooltip(p_control, p_pos, r_which) {
        const pos = p_pos.clone();
        let tooltip = '';

        while (p_control) {
            tooltip = p_control.get_tooltip(pos);
            if (r_which) {
                r_which.from = p_control;
            }

            if (tooltip.length > 0) {
                break;
            }
            const xform = p_control.get_transform();
            xform.xform(pos, pos);
            Transform2D.free(xform);

            if (p_control.c_data.mouse_filter === MOUSE_FILTER_STOP) {
                break;
            }
            if (p_control.is_set_as_toplevel()) {
                break;
            }

            p_control = p_control.get_parent_control();
        }

        Vector2.free(pos);

        return tooltip;
    }
    _gui_cancel_tooltip() {
        this.gui.tooltip = null;
        this.gui.tooltip_timer = -1;
        if (this.gui.tooltip_popup) {
            this.gui.tooltip_popup.queue_free();
            this.gui.tooltip_popup = null;
            this.gui.tooltip_label = null;
        }
    }
    _gui_show_tooltip() { }

    /**
     * @param {Control} p_control
     */
    _gui_remove_control(p_control) {
        const gui = this.gui;
        if (gui.mouse_focus === p_control) {
            gui.mouse_focus = null;
            gui.mouse_focus_mask = 0;
        }
        if (gui.last_mouse_focus === p_control) {
            gui.last_mouse_focus = null;
        }
        if (gui.key_focus === p_control) {
            gui.key_focus = null;
        }
        if (gui.mouse_over === p_control) {
            gui.mouse_over = null;
        }
        if (gui.tooltip === p_control) {
            gui.tooltip = null;
        }
        if (gui.tooltip_popup === p_control) {
            this._gui_cancel_tooltip();
        }
    }
    /**
     * @param {Control} p_control
     */
    _gui_hid_control(p_control) {
        if (this.gui.mouse_focus === p_control) {
            this._drop_mouse_focus();
        }

        if (this.gui.key_focus === p_control) {
            this._gui_remove_focus();
        }
        if (this.gui.mouse_over === p_control) {
            this.gui.mouse_over = null;
        }
        if (this.gui.tooltip === p_control) {
            this._gui_cancel_tooltip();
        }
    }

    _gui_force_drag() { }
    _gui_set_drag_preview() { }

    /**
     * @param {Control} p_control
     */
    _gui_is_modal_on_top(p_control) {
        return (this.gui.modal_stack.length && this.gui.modal_stack[this.gui.modal_stack.length - 1] === p_control);
    }
    _gui_show_modal() { }

    _gui_remove_focus() {
        if (this.gui.key_focus) {
            const f = this.gui.key_focus;
            this.gui.key_focus = null;
            f.notification(NOTIFICATION_FOCUS_EXIT, true);
        }
    }
    /**
     * @param {Control} p_control
     */
    _gui_unfocus_control(p_control) {
        if (this.gui.key_focus === p_control) {
            this.gui.key_focus.release_focus();
        }
    }
    /**
     * @param {Control} p_control
     */
    _gui_control_has_focus(p_control) {
        return this.gui.key_focus === p_control;
    }
    /**
     * @param {Control} p_control
     */
    _gui_control_grab_focus(p_control) {
        if (this.gui.key_focus && this.gui.key_focus === p_control) {
            return;
        }
        this.get_tree().call_group_flags(GROUP_CALL_REALTIME, '_viewports', '_gui_remove_focus');
        this.gui.key_focus = p_control;
        p_control.notification(NOTIFICATION_FOCUS_ENTER);
        p_control.update();
    }
    /**
     * @param {Control} p_control
     */
    _gui_grab_click_focus(p_control) {
        this.gui.mouse_click_grabber = p_control;
        this.call_deferred('_post_gui_grab_click_focus');
    }
    _post_gui_grab_click_focus() {
        const focus_grabber = this.gui.mouse_click_grabber;
        if (!focus_grabber) {
            return;
        }
        this.gui.mouse_click_grabber = null;

        if (this.gui.mouse_focus) {
            if (this.gui.mouse_focus === focus_grabber) {
                return;
            }

            const mask = this.gui.mouse_focus_mask;
            const xform_inv = this.gui.mouse_focus.get_global_transform_with_canvas().affine_inverse();
            const click = xform_inv.xform(this.gui.last_mouse_pos);

            for (let i = 0; i < 3; i++) {
                if (mask & (1 << i)) {
                    const mb = InputEventMouseButton.instance();
                    mb.position.copy(click);
                    mb.button_index = i + 1;
                    mb.pressed = false;
                    this.gui.mouse_focus._gui_input_(mb);
                    mb.free();
                }
            }

            this.gui.mouse_focus = focus_grabber;
            const focus_xform_inv = this.gui.mouse_focus.get_global_transform_with_canvas().affine_inverse();
            this.gui.focus_inv_xform.copy(focus_xform_inv);
            const xform_last_pos = focus_xform_inv.xform(this.gui.last_mouse_pos);
            click.copy(xform_last_pos);
            Vector2.free(xform_last_pos);
            Transform2D.free(focus_xform_inv);

            for (let i = 0; i < 3; i++) {
                if (mask & (1 << i)) {
                    const mb = InputEventMouseButton.instance();
                    mb.position.copy(click);
                    mb.button_index = i + 1;
                    mb.pressed = true;
                    this.gui.mouse_focus._gui_input_(mb);
                    mb.free();
                }
            }
        }
    }
    _gui_accept_event() {
        this.gui.key_event_accepted = true;
        if (this.is_inside_tree()) {
            this.set_input_as_handled();
        }
    }

    _gui_get_focus_owner() { }

    _get_window_offset() {
        const parent = this.get_parent();
        if (parent && 'get_global_position' in parent) {
            return /** @type {Vector2} */(/** @type {any} */(parent).get_global_position());
        }
        return Vector2.ZERO;
    }

    /**
     * @param {Control} p_at_control
     * @param {Vector2} p_at_pos
     * @param {boolean} p_just_check
     */
    _gui_drop(p_at_control, p_at_pos, p_just_check) {
        let at_pos = p_at_pos.clone();

        /** @type {CanvasItem} */
        let ci = p_at_control;
        while (ci) {
            const control = /** @type {Control} */(ci);
            if (ci.is_control) {
                if (control._can_drop_data_(at_pos, this.gui.drag_data)) {
                    if (!p_just_check) {
                        control._drop_data_(at_pos, this.gui.drag_data);
                    }

                    return true;
                }

                if (control.c_data.mouse_filter === MOUSE_FILTER_STOP) {
                    break;
                }
            }

            const xform = ci.get_transform();
            xform.xform(at_pos, at_pos);
            Transform2D.free(xform);

            if (ci.is_set_as_toplevel()) {
                break;
            }

            ci = ci.get_parent_item();
        }

        Vector2.free(at_pos);

        return false;
    }

    /**
     * @param {CanvasLayer} p_layer
     */
    _canvas_layer_add(p_layer) {
        this.canvas_layers.add(p_layer);
    }
    /**
     * @param {CanvasLayer} p_layer
     */
    _canvas_layer_remove(p_layer) {
        this.canvas_layers.delete(p_layer);
    }

    _drop_mouse_focus() { }
    _drop_physics_mouseover() { }

    update_canvas_items() {
        if (!this.is_inside_tree()) {
            return;
        }
        this._update_canvas_items(this);
    }
    /**
     * @param {Node} p_node
     */
    _update_canvas_items(p_node) {
        if (p_node !== this) {
            const vp = /** @type {Viewport} */(p_node);
            if (vp.class === 'Viewport') {
                return;
            }

            const ci = /** @type {CanvasItem} */(p_node);
            if (ci.is_canvas_item) {
                ci.update();
            }
        }

        for (const c of p_node.data.children) {
            this._update_canvas_items(c);
        }
    }

    get_visible_rect() {
        const r = Rect2.new();

        if (this.size.is_zero()) {
            const window_size = OS.get_singleton().get_window_size();
            r.width = window_size.x;
            r.height = window_size.y;
        } else {
            r.width = this.size.width;
            r.height = this.size.height;
        }

        if (this.size_override) {
            r.width = this.size_override_size.width;
            r.height = this.size_override_size.height;
        }

        return r;
    }

    /**
     * @returns {World2D}
     */
    find_world_2d() {
        if (this._world_2d) {
            return this._world_2d;
        } else if (this.parent) {
            return this.parent.find_world_2d();
        } else {
            return null;
        }
    }

    /**
     * @param {boolean} p_world
     */
    set_use_own_world(p_world) {
        if (!!this.own_world === p_world) return;

        if (this.is_inside_tree()) {
            this._propagate_exit_world(this);
        }

        if (!p_world) {
            this.own_world = null;
        } else {
            if (this.world) {
                this.own_world = this.world.duplicate();
            } else {
                this.own_world = new World;
            }
        }

        if (this.is_inside_tree()) {
            this._propagate_enter_world(this);
            VSG.viewport.viewport_set_scenario(this.viewport, this.find_world().scenario);
        }
    }

    /**
     * @param {World} world
     */
    set_world(world) {
        if (this.world === world) return;

        if (this.is_inside_tree()) {
            this._propagate_exit_world(this);
        }

        if (this.own_world && this.world) {
            this.world.disconnect('changed', this._own_world_changed, this);
        }

        this.world = world;

        if (this.own_world) {
            if (this.world) {
                this.own_world = this.world.duplicate();
                this.world.connect('changed', this._own_world_changed, this);
            } else {
                this.world = new World;
            }
        }

        if (this.is_inside_tree()) {
            this._propagate_enter_world(this);

            VSG.viewport.viewport_set_scenario(this.viewport, this.find_world().scenario);
        }
    }

    /**
     * @returns {World}
     */
    find_world() {
        if (this.own_world) return this.own_world;
        else if (this.world) return this.world;
        else if (this.parent) return this.parent.find_world();
        else return null;
    }

    get_texture() {
        return this.default_texture;
    }

    /**
     * @param {boolean} p_enabled
     * @param {Vector2Like} p_size
     * @param {Vector2Like} [p_margin]
     */
    set_size_override(p_enabled, p_size = VEC2_NEG, p_margin = Vector2.ZERO) {
        if (this.size_override === p_enabled && this.size_override_size.equals(p_size)) {
            return;
        }

        this.size_override = p_enabled;
        if (p_size.x >= 0 || p_size.y >= 0) {
            this.size_override_size.copy(p_size);
        }
        this.size_override_margin.copy(p_margin);

        this._update_stretch_transform();
        this.emit_signal('size_changed');
    }
    get_size_override() {
        return this.size_override_size;
    }
    is_size_override_enabled() {
        return this.size_override;
    }

    /**
     * @param {boolean} p_enabled
     */
    set_size_override_stretch(p_enabled) {
        if (p_enabled === this.size_override_stretch) {
            return;
        }
        this.size_override_stretch = p_enabled;

        this._update_stretch_transform();
    }
    is_size_override_stretch_enabled() {
        return this.size_override_stretch;
    }

    /**
     * returns new Transform2D
     */
    get_final_transform() {
        return this.stretch_transform.clone().append(this.global_canvas_transform);
    }

    /**
     * @param {Node} p_node
     */
    _propagate_enter_world(p_node) {
        if (p_node !== this) {
            if (!p_node.is_inside_tree()) return;

            if (p_node.is_spatial || p_node.class === 'WorldEnvironment') {
                p_node.notification(NOTIFICATION_ENTER_WORLD);
            } else {
                if (p_node.class === 'Viewport') {
                    const v = /** @type {Viewport} */(p_node);
                    if (!v.world || !v.own_world) return;
                }
            }
        }

        for (const c of p_node.data.children) {
            this._propagate_enter_world(c);
        }
    }
    /**
     * @param {Node} p_node
     */
    _propagate_exit_world(p_node) {
        if (p_node !== this) {
            if (!p_node.is_inside_tree()) return;

            if (p_node.is_spatial) {
                p_node.notification(NOTIFICATION_EXIT_WORLD);
            }
        }

        for (let i = 0; i < p_node.data.children.length; i++) {
            this._propagate_exit_world(p_node.data.children[i]);
        }
    }
    /**
     * @param {Node} p_node
     * @param {number} p_what
     */
    _propagate_viewport_notification(p_node, p_what) {
        p_node.notification(p_what);
        for (const c of p_node.data.children) {
            if (c.class === 'Viewport') {
                continue;
            }
            this._propagate_viewport_notification(c, p_what);
        }
    }

    _update_stretch_transform() {
        if (this.size_override_stretch && this.size_override) {
            this.stretch_transform.reset();
            const scale = Vector2.new(
                this.size.x / (this.size_override_size.x + this.size_override_margin.x * 2),
                this.size.y / (this.size_override_size.y + this.size_override_margin.y * 2)
            );
            this.stretch_transform.scale(scale.x, scale.y);
            this.stretch_transform.tx = this.size_override_margin.x * scale.x;
            this.stretch_transform.ty = this.size_override_margin.y * scale.y;
            Vector2.free(scale);
        } else {
            this.stretch_transform.reset();
        }

        this._update_global_transform();
    }
    _update_global_transform() {
        const sxform = this.stretch_transform.clone()
            .append(this.global_canvas_transform);
        VSG.viewport.viewport_set_global_canvas_transform(this.viewport, sxform);
        Transform2D.free(sxform);
    }

    _subwindow_visibility_changed() {
        this.gui.subwindow_visibility_dirty = true;
    }

    _own_world_changed() {
        if (this.is_inside_tree()) {
            this._propagate_exit_world(this);
        }

        this.own_world = this.world.duplicate();

        if (this.is_inside_tree()) {
            this._propagate_enter_world(this);
        }

        if (this.is_inside_tree()) {
            VSG.viewport.viewport_set_scenario(this.viewport, this.find_world().scenario);
        }
    }
}
node_class_map['Viewport'] = GDCLASS(Viewport, Node)
