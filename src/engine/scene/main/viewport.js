import { Node, PAUSE_MODE_STOP } from "engine/scene/main/node";
import { Vector2, Matrix, Rectangle } from "engine/core/math/index";
// import World2D from "../resources/world_2d";


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


class GUI {
    constructor() {
        this.key_event_accepted = false;
        this.mouse_focus = false;
        this.last_mouse_focus = false;
        this.mouse_click_grabber = false;
        this.mouse_focus_mask = false;
        this.key_focus = false;
        this.mouse_over = false;
        this.tooltip = false;
        this.tooltip_popup = false;
        this.tooltip_label = false;
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


export default class Viewport extends Node {
    constructor() {
        super();

        this.class = 'Viewport';

        this.input_group = `_vp_input${this.instance_id}`;
        this.gui_input_group = `_vp_gui_input${this.instance_id}`;
        this.unhandled_input_group = `_vp_unhandled_input${this.instance_id}`;
        this.unhandled_key_input_group = `_vp_unhandled_key_input${this.instance_id}`;

        /** @type {Viewport} */
        this.parent = null;

        this.viewport = null;
        this.current_canvas = null;

        this.canvas_transform = new Matrix();
        this.global_canvas_transform = new Matrix();
        this.stretch_transform = new Matrix();

        this.size = new Vector2();
        this.to_screen_rect = new Rectangle();
        this.render_direct_to_screen = false;

        this.size_override = false;
        this.size_override_stretch = false;
        this.size_override_size = new Vector2(1, 1);
        this.size_override_margin = new Vector2();

        this.last_vp_rect = new Rectangle();

        this.transparent_bg = false;
        this.vflip = false;
        this.clear_mode = CLEAR_MODE_ALWAYS;
        this.filter = false;
        this.gen_mipmaps = false;

        this.snap_controls_to_pixels = true;

        this.local_input_handled = false;
        this.handle_input_locally = true;

        /**
         * @type {World2D}
         */
        // this.world_2d = new World2D();

        this.disable_3d = true;
        this.keep_3d_linear = false;
        this.update_mode = UPDATE_MODE_WHEN_VISIBLE;
        this.texture_rid = null;
        this.texture_flags = 0;

        this.usage = USAGE_2D;

        this.shadow_atlas_size = 0;

        this.default_texture = null;
        this.viewport_textures = new Set();

        this.gui = new GUI();

        this.disable_input = true;
    }

    /* virtual */
    _notification(p_what) {

    }

    free() {
        // TODO: erase self from viewport textures
        // TODO: free by VisualServer
        return super.free();
    }

    /* public */
    input(p_event) { }
    unhandled_input(p_event) { }

    get_mouse_position() { }
    warp_mouse(p_pos) { }

    /* private */
    _gui_call_input() { }
    _gui_call_notification() { }

    _gui_prepare_subwindows() { }
    _gui_sort_subwindows() { }
    _gui_sort_roots() { }
    _gui_sort_modal_stack() { }
    _gui_find_control() { }
    _gui_find_control_at_pos() { }

    _gui_input_event() { }

    update_worlds() {
        if (!this.is_inside_tree) {
            return;
        }

        const abstracted_rect = this.get_visible_rect();
        abstracted_rect.x = abstracted_rect.y = 0;
        const xformed_rect = this.global_canvas_transform.clone().append(this.canvas_transform).affine_inverse().xform_rect(abstracted_rect);
        this.find_world_2d()._update_viewport(this, xformed_rect);
        this.find_world_2d()._update();

        Rectangle.free(abstracted_rect);
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

    _canvas_layer_add() { }
    _canvas_layer_remove() { }

    _drop_mouse_focus() { }
    _drop_physics_mouseover() { }

    _update_canvas_items(p_node) { }

    get_visible_rect() {
        const r = Rectangle.new();

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

    find_world_2d() {
        if (this.world_2d) {
            return this.world_2d;
        } else if (this.data.parent) {
            // TODO: this.parent.find_world_2d();
            return null;
        } else {
            return null;
        }
    }

    set_handle_input_locally(p_locally) { }

    _propagate_enter_world() { }
    _propagate_exit_world() { }
    _propagate_viewport_notification() { }

    _update_stretch_transform() { }
    _update_global_transform() { }
}
