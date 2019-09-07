import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { Rect2 } from "engine/core/math/rect2";
import {
    NOTIFICATION_WM_MOUSE_EXIT,
    NOTIFICATION_WM_FOCUS_OUT,
} from "engine/core/main_loop";
import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_READY,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
} from "engine/scene/main/node";
import {
    Texture,
} from "../resources/texture";
import { World2D } from "../resources/world_2d";

import { VSG } from "engine/servers/visual/visual_server_globals";

import { CanvasLayer } from "./canvas_layer";
import { CanvasItem } from "../2d/canvas_item";


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
    }
    free() {
        if (this.vp) {
            this.vp.viewport_textures.delete(this);
        }
        return super.free();
    }

    get_width() { return this.vp.size.width }
    get_height() { return this.vp.size.height }
    get_size() { return this.vp.size }

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
    }
}
GDCLASS(ViewportTexture, Texture)


class GUI {
    constructor() {
        this.key_event_accepted = false;
        this.mouse_focus = null;
        this.last_mouse_focus = false;
        this.mouse_click_grabber = null;
        this.mouse_focus_mask = 0;
        this.key_focus = null;
        this.mouse_over = false;
        this.tooltip = null;
        this.tooltip_popup = null;
        this.tooltip_label = null;
        this.tooltip_pos = false;
        this.last_mouse_pos = false;
        this.drag_accum = false;
        this.drag_attempted = false;
        this.drag_data = false;
        this.drag_preview = false;
        this.tooltip_timer = -1;
        this.tooltip_delay = 0.5;
        this.modal_stack = false;
        this.focus_inv_xform = false;
        this.subwindow_order_dirty = false;
        this.subwindow_visibility_dirty = false;
        this.subwindows = false;
        this.all_known_subwindows = false;
        this.roots_order_dirty = false;
        this.roots = false;
        this.canvas_sort_index = 0;
        this.dragging = false;
    }
}


export class Viewport extends Node {
    get size() { return this._size }
    set size(p_size) {
        if (this._size.x === Math.floor(p_size.x) && this._size.y === Math.floor(p_size.y)) {
            return;
        }
        this._size.copy(p_size).floor();
        VSG.viewport.viewport_set_size(this.viewport, this._size.x, this._size.y);

        this._update_stretch_transform();

        this.emit_signal('size_changed');
    }

    get canvas_transform() {
        return this._canvas_transform;
    }
    set canvas_transform(p_xform) {
        this._canvas_transform.copy(p_xform);
        VSG.viewport.viewport_set_canvas_transform(this.viewport, this.find_world_2d().canvas, this._canvas_transform);
    }

    get global_canvas_transform() {
        return this._global_canvas_transform;
    }
    set global_canvas_transform(p_xform) {
        this._global_canvas_transform.copy(p_xform);
        this._update_global_transform();
    }

    /**
     * @type {World2D}
     */
    get world_2d() {
        return this._world_2d;
    }
    set world_2d(p_world_2d) {
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

    get render_target_update_mode() {
        return this._render_target_update_mode;
    }
    set render_target_update_mode(value) {
        this._render_target_update_mode = value;
        VSG.viewport.viewport_set_update_mode(this.viewport, value);
    }

    get clear_mode() {
        return this._clear_mode;
    }
    set clear_mode(value) {
        this._clear_mode = value;
        VSG.viewport.viewport_set_clear_mode(this.viewport, value);
    }

    constructor() {
        super();

        this.class = 'Viewport';

        this.input_group = `_vp_input${this.instance_id}`;
        this.gui_input_group = `_vp_gui_input${this.instance_id}`;
        this.unhandled_input_group = `_vp_unhandled_input${this.instance_id}`;
        this.unhandled_key_input_group = `_vp_unhandled_key_input${this.instance_id}`;

        /** @type {Viewport} */
        this.parent = null;

        /** @type {Set<CanvasLayer>} */
        this.canvas_layers = new Set();

        this.viewport = VSG.viewport.viewport_create();
        this.current_canvas = null;

        this._canvas_transform = new Transform2D();
        this._global_canvas_transform = new Transform2D();
        this.stretch_transform = new Transform2D();

        this._size = new Vector2();
        this.to_screen_rect = new Rect2();
        this.render_direct_to_screen = false;

        this.size_override = false;
        this.size_override_stretch = false;
        this.size_override_size = new Vector2(1, 1);
        this.size_override_margin = new Vector2();

        this.last_vp_rect = new Rect2();

        this.transparent_bg = false;
        this.vflip = false;
        this._clear_mode = CLEAR_MODE_ALWAYS;
        this.filter = false;
        this.gen_mipmaps = false;

        this.snap_controls_to_pixels = true;

        this.local_input_handled = false;
        this.handle_input_locally = true;

        /**
         * @type {World2D}
         */
        this._world_2d = new World2D();

        this.disable_3d = true;
        this.keep_3d_linear = false;
        this._render_target_update_mode = UPDATE_MODE_WHEN_VISIBLE;
        this.texture_rid = VSG.viewport.viewport_get_texture(this.viewport);
        this.texture_flags = 0;

        this.usage = USAGE_2D;

        this.shadow_atlas_size = 0;

        this.default_texture = null;
        /** @type {Set<ViewportTexture>} */
        this.viewport_textures = new Set();

        this.gui = new GUI();

        this.disable_input = true;
    }

    /* virtual */

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
                // VSG.viewport.viewport_set_scenario(this.viewport, this.find_world().get_scenario());
                VSG.viewport.viewport_attach_canvas(this.viewport, this.current_canvas);

                this.find_world_2d()._register_viewport(this, Rect2.EMPTY);

                this.add_to_group('_viewports');

                VSG.viewport.viewport_set_active(this.viewport, true);
            } break;
            case NOTIFICATION_READY: {
                this.set_process_internal(true);
                this.set_physics_process_internal(true);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this._gui_cancel_tooltip();
                if (this.world_2d) {
                    this.world_2d._remove_viewport(this);
                }

                // VSG.viewport.viewport_set_scenario(this.viewport, null);
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
        // TODO: erase self from viewport textures
        // TODO: free by VisualServer
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
    input(p_event) {
        this.local_input_handled = false;

        if (!this.is_input_handled()) {
            this.get_tree()._call_input_pause(this.input_group, '_input', p_event);
        }

        if (!this.is_input_handled()) {
            this._gui_input_event(p_event);
        }
    }
    unhandled_input(p_event) {
        this.get_tree()._call_input_pause(this.unhandled_input_group, '_unhandled_input', p_event);
        if (!this.get_tree().input_handled && p_event.class === 'InputKeyEvent') {
            this.get_tree()._call_input_pause(this.unhandled_key_input_group, '_unhandled_key_input', p_event);
        }

        // TODO: if (physics_object_picking)
    }

    get_mouse_position() { }
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

    /* private */
    _gui_call_input() { }
    _gui_call_notification() { }

    _gui_prepare_subwindows() { }
    _gui_sort_subwindows() { }
    _gui_sort_roots() { }
    _gui_sort_modal_stack() { }
    _gui_find_control() { }
    _gui_find_control_at_pos() { }

    _gui_input_event(p_event) { }

    update_worlds() {
        if (!this.is_inside_tree) {
            return;
        }

        const abstracted_rect = this.get_visible_rect();
        abstracted_rect.x = abstracted_rect.y = 0;

        const xformed_rect = this.global_canvas_transform.clone().append(this.canvas_transform).affine_inverse().xform_rect(abstracted_rect);
        this.find_world_2d()._update_viewport(this, xformed_rect);
        this.find_world_2d()._update();

        Rect2.free(abstracted_rect);
    }

    _get_input_re_xform() { }

    _vp_input() { }
    _vp_input_text() { }
    _vp_unhandled_input() { }
    _make_input_local() { }

    _gui_add_root_control() { }
    _gui_add_subwindow_control() { }

    _gui_set_subwindow_order_dirty() { }
    _gui_set_root_order_dirty() { }

    _gui_remove_modal_control() { }
    _gui_remove_from_modal_stack() { }
    _gui_remove_root_control() { }
    _gui_remove_subwindow_control() { }

    _gui_get_tooltip() { }
    _gui_cancel_tooltip() { }
    _gui_show_tooltip() { }

    _gui_remove_control() { }
    _gui_hid_control() { }

    _gui_force_drag() { }
    _gui_set_drag_preview() { }

    _gui_is_modal_on_top() { }
    _gui_show_modal() { }

    _gui_remove_focus() { }
    _gui_unfocus_control(p_control) { }
    _gui_control_has_focus(p_control) { }
    _gui_control_grab_focus(p_control) { }
    _gui_grab_click_focus(p_control) { }
    _post_gui_grab_click_focus() { }
    _gui_accept_event() { }

    _gui_get_focus_owner() { }

    _get_window_offset() { }

    _gui_drop(p_at_control, p_at_pos, p_just_check) { }

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
            r.width = window.innerWidth;
            r.height = window.innerHeight;
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
        if (this.world_2d) {
            return this.world_2d;
        } else if (this.parent) {
            return this.parent.find_world_2d();
        } else {
            return null;
        }
    }

    get_texture() {
        return this.default_texture;
    }

    /**
     * @param {boolean} p_enabled
     * @param {Vector2Like} p_size
     * @param {Vector2Like} p_margin
     */
    set_size_override(p_enabled, p_size, p_margin) {
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

    get_final_transform() {
        return this.stretch_transform.clone().append(this.global_canvas_transform);
    }

    set_handle_input_locally(p_locally) { }

    /**
     * @param {Node} p_node
     */
    _propagate_enter_world(p_node) {
        if (p_node !== this) {
            if (!p_node.is_inside_tree()) {
                return;
            }
        }
    }
    _propagate_exit_world() { }
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
        } else {
            this.stretch_transform.reset();
        }

        this._update_global_transform();
    }
    _update_global_transform() {
        const sxform = this.stretch_transform.clone().append(this.global_canvas_transform);
        VSG.viewport.viewport_set_global_canvas_transform(this.viewport, sxform);
        Transform2D.free(sxform);
    }
}
node_class_map['Viewport'] = GDCLASS(Viewport, Node)
