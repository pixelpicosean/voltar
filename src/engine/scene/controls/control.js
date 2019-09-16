import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import {
    rad2deg,
    deg2rad,
    clamp,
} from 'engine/core/math/math_funcs';
import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from 'engine/core/math/math_defs';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color } from 'engine/core/color';
import { MessageQueue } from 'engine/core/message_queue';
import { BLEND_MODES } from 'engine/drivers/constants';

import { Theme } from '../resources/theme';
import { Font } from '../resources/font';
import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_POST_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_MOVED_IN_PARENT,
} from '../main/node';
import {
    CanvasItem,
    NOTIFICATION_ENTER_CANVAS,
    NOTIFICATION_EXIT_CANVAS,
    NOTIFICATION_DRAW,
    NOTIFICATION_VISIBILITY_CHANGED,
} from '../2d/canvas_item';
import {
    GROW_DIRECTION_END,
    SIZE_FILL,
    GROW_DIRECTION_BEGIN,
    GROW_DIRECTION_BOTH,
    ANCHOR_BEGIN,
    ANCHOR_END,
    PRESET_TOP_LEFT,
    PRESET_BOTTOM_LEFT,
    PRESET_CENTER_LEFT,
    PRESET_TOP_WIDE,
    PRESET_BOTTOM_WIDE,
    PRESET_LEFT_WIDE,
    PRESET_HCENTER_WIDE,
    PRESET_WIDE,
    PRESET_VCENTER_WIDE,
    PRESET_BOTTOM_RIGHT,
    PRESET_CENTER_BOTTOM,
    PRESET_RIGHT_WIDE,
    PRESET_CENTER,
    PRESET_CENTER_RIGHT,
    PRESET_CENTER_TOP,
    PRESET_TOP_RIGHT,
    PRESET_MODE_MINSIZE,
    PRESET_MODE_KEEP_WIDTH,
    PRESET_MODE_KEEP_HEIGHT,
} from './const';
import { VSG } from 'engine/servers/visual/visual_server_globals';
import { NOTIFICATION_WM_UNFOCUS_REQUEST } from 'engine/core/main_loop';


export const NOTIFICATION_RESIZED = 40;
export const NOTIFICATION_MOUSE_ENTER = 41;
export const NOTIFICATION_MOUSE_EXIT = 42;
export const NOTIFICATION_FOCUS_ENTER = 43;
export const NOTIFICATION_FOCUS_EXIT = 44;
export const NOTIFICATION_THEME_CHANGED = 45;
export const NOTIFICATION_MODAL_CLOSE = 46;
export const NOTIFICATION_SCROLL_BEGIN = 47;
export const NOTIFICATION_SCROLL_END = 48;

const margin_pos = [0, 0, 0, 0];


export class Control extends CanvasItem {
    get class() { return 'Control' }

    /**
     * @type {number}
     */
    get anchor_bottom() {
        return this.c_data.anchor[MARGIN_BOTTOM];
    }
    set anchor_bottom(value) {
        this.set_anchor(MARGIN_BOTTOM, value);
    }
    /**
     * @param {number} value
     */
    set_anchor_bottom(value) {
        this.set_anchor(MARGIN_BOTTOM, value);
        return this;
    }

    /**
     * @type {number}
     */
    get anchor_left() {
        return this.c_data.anchor[MARGIN_LEFT];
    }
    set anchor_left(value) {
        this.set_anchor(MARGIN_LEFT, value);
    }
    /**
     * @param {number} value
     */
    set_anchor_left(value) {
        this.set_anchor(MARGIN_LEFT, value);
        return this;
    }

    /**
     * @type {number}
     */
    get anchor_top() {
        return this.c_data.anchor[MARGIN_TOP];
    }
    set anchor_top(value) {
        this.set_anchor(MARGIN_TOP, value);
    }
    /**
     * @param {number} value
     */
    set_anchor_top(value) {
        this.set_anchor(MARGIN_TOP, value);
        return this;
    }

    /**
     * @type {number}
     */
    get anchor_right() {
        return this.c_data.anchor[MARGIN_RIGHT];
    }
    set anchor_right(value) {
        this.set_anchor(MARGIN_RIGHT, value);
    }
    /**
     * @param {number} value
     */
    set_anchor_right(value) {
        this.set_anchor(MARGIN_RIGHT, value);
        return this;
    }

    /**
     * @type {number}
     */
    get margin_bottom() {
        return this.c_data.margin[MARGIN_BOTTOM];
    }
    set margin_bottom(value) {
        this.set_margin(MARGIN_BOTTOM, value);
    }
    /**
     * @param {number} value
     */
    set_margin_bottom(value) {
        this.set_margin(MARGIN_BOTTOM, value);
        return this;
    }

    /**
     * @type {number}
     */
    get margin_left() {
        return this.c_data.margin[MARGIN_LEFT];
    }
    set margin_left(value) {
        this.set_margin(MARGIN_LEFT, value);
    }
    /**
     * @param {number} value
     */
    set_margin_left(value) {
        this.set_margin(MARGIN_LEFT, value);
        return this;
    }

    /**
     * @type {number}
     */
    get margin_top() {
        return this.c_data.margin[MARGIN_TOP];
    }
    set margin_top(value) {
        this.set_margin(MARGIN_TOP, value);
    }
    /**
     * @param {number} value
     */
    set_margin_top(value) {
        this.set_margin(MARGIN_TOP, value);
        return this;
    }

    /**
     * @type {number}
     */
    get margin_right() {
        return this.c_data.margin[MARGIN_RIGHT];
    }
    set margin_right(value) {
        this.set_margin(MARGIN_RIGHT, value);
    }
    /**
     * @param {number} value
     */
    set_margin_right(value) {
        this.set_margin(MARGIN_RIGHT, value);
        return this;
    }

    /**
     * @type {string}
     */
    get mouse_default_cursor_shape() {
        return this.cursor;
    }
    set mouse_default_cursor_shape(value) {
        this.cursor = value;
    }
    /**
     * @param {string} value
     */
    set_mouse_default_cursor_shape(value) {
        this.cursor = value;
        return this;
    }

    get rect_min_size() {
        return this.c_data.custom_minimum_size;
    }
    set_rect_min_size(value) {
        if (this.c_data.custom_minimum_size.equals(value)) {
            return;
        }

        this.c_data.custom_minimum_size.copy(value);
        this.minimum_size_changed();
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_rect_min_size_n(x, y) {
        const size = Vector2.new(x, y);
        this.set_rect_min_size(size);
        Vector2.free(size);
    }

    get rect_clip_content() {
        return this.c_data.clip_contents;
    }
    /**
     * @param {boolean} value
     */
    set_rect_clip_content(value) {
        this.c_data.rect_clip_content = value;
        this.update();
    }

    constructor() {
        super();

        this.is_control = true;

        this.c_data = {
            pos_cache: new Vector2(),
            size_cache: new Vector2(),
            minimum_size_cache: new Vector2(),
            minimum_size_valid: false,

            last_minimum_size: new Vector2(),
            updating_last_minimum_size: false,

            margin: [0, 0, 0, 0],
            anchor: [ANCHOR_BEGIN, ANCHOR_BEGIN, ANCHOR_BEGIN, ANCHOR_BEGIN],
            h_grow: GROW_DIRECTION_END,
            v_grow: GROW_DIRECTION_END,

            rotation: 0,
            scale: new Vector2(1, 1),
            pivot_offset: new Vector2(0, 0),

            pending_resize: false,

            h_size_flags: SIZE_FILL,
            v_size_flags: SIZE_FILL,
            expand: 1,
            custom_minimum_size: new Vector2(),

            pass_on_modal_close_click: false,

            clip_contents: false,

            block_minimum_size_adjust: false,
            disable_visibility_clip: false,

            /**
             * @type {Control}
             */
            parent: null,
            modal_exclusive: false,
            modal_frame: 0,
            theme: null,
            /**
             * @type {CanvasItem}
             */
            theme_owner: null,

            tooltip: '',
            default_cursor: '',

            MI: null,
            SI: null,
            RI: null,

            /**
             * @type {CanvasItem}
             */
            parent_canvas_item: null,

            modal_prev_focus_owner: null,

            focus_neighbour: [null, null, null, null],
            focus_next: null,
            focus_prev: null,

            icon_override: undefined,
            style_override: undefined,
            font_override: undefined,
            color_override: undefined,
            constant_override: undefined,
        };

        this.blend_mode = BLEND_MODES.NORMAL;

        this.hit_area = new Rect2();
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.anchor_bottom !== undefined) {
            this.set_anchor_bottom(data.anchor_bottom);
        }
        if (data.anchor_left !== undefined) {
            this.set_anchor_left(data.anchor_left);
        }
        if (data.anchor_right !== undefined) {
            this.set_anchor_right(data.anchor_right);
        }
        if (data.anchor_top !== undefined) {
            this.set_anchor_top(data.anchor_top);
        }

        if (data.margin_bottom !== undefined) {
            this.set_margin_bottom(data.margin_bottom);
        }
        if (data.margin_left !== undefined) {
            this.set_margin_left(data.margin_left);
        }
        if (data.margin_right !== undefined) {
            this.set_margin_right(data.margin_right);
        }
        if (data.margin_top !== undefined) {
            this.set_margin_top(data.margin_top);
        }

        if (data.rect_min_size !== undefined) {
            this.set_rect_min_size(data.rect_min_size);
        }
        if (data.rect_rotation !== undefined) {
            this.set_rect_rotation(data.rect_rotation);
        }
        if (data.rect_scale !== undefined) {
            this.set_rect_scale(data.rect_scale);
        }
        if (data.rect_pivot_offset !== undefined) {
            this.set_rect_pivot_offset(data.rect_pivot_offset);
        }
        if (data.rect_clip_content !== undefined) {
            this.set_rect_clip_content(data.rect_clip_content);
        }

        if (data.grow_horizontal !== undefined) {
            this.set_grow_horizontal(data.grow_horizontal);
        }
        if (data.grow_vertical !== undefined) {
            this.set_grow_vertical(data.grow_vertical);
        }

        if (data.mouse_default_cursor_shape !== undefined) {
            this.mouse_default_cursor_shape = data.mouse_default_cursor_shape;
        }

        if (data.size_flags_horizontal !== undefined) {
            this.set_size_flags_horizontal(data.size_flags_horizontal);
        }
        if (data.size_flags_vertical !== undefined) {
            this.set_size_flags_vertical(data.size_flags_vertical);
        }
        if (data.size_flags_stretch_ratio !== undefined) {
            this.set_size_flags_stretch_ratio(data.size_flags_stretch_ratio);
        }

        return this;
    }

    /**
     * @param {CanvasItem} child
     */
    add_child_notify(child) {
        // TODO: change child's theme if we have any
    }
    /**
     * @param {CanvasItem} child
     */
    remove_child_notify(child) {
        // TODO: unset child's theme owner
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
            } break;
            case NOTIFICATION_POST_ENTER_TREE: {
                this.c_data.minimum_size_valid = false;
                this._size_changed();
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.get_viewport()._gui_remove_control(this);
            } break;
            case NOTIFICATION_ENTER_CANVAS: {
                const parent = /** @type {Control} */(this.get_parent());
                if (parent.is_control) {
                    this.c_data.parent = parent;
                }

                if (this.is_set_as_toplevel()) {
                    this.c_data.SI = this.get_viewport()._gui_add_subwindow_control(this);

                    if (!this.c_data.theme && this.c_data.parent && this.c_data.parent.c_data.theme_owner) {
                        this.c_data.theme_owner = this.c_data.parent.c_data.theme_owner;
                        this.notification(NOTIFICATION_THEME_CHANGED);
                    }
                } else {
                    /** @type {Node} */
                    let parent = this;
                    /** @type {Control} */
                    let parent_control = null;
                    let subwindow = false;

                    while (parent) {
                        parent = parent.get_parent();

                        if (!parent) break;

                        const ci = /** @type {CanvasItem} */(parent.is_canvas_item ? parent : null);
                        if (ci && ci.is_set_as_toplevel()) {
                            subwindow = true;
                            break;
                        }

                        parent_control = /** @type {Control} */(parent.is_control ? parent : null);

                        if (parent_control) {
                            break;
                        } else if (ci) {
                            // nothing here
                        } else {
                            break;
                        }
                    }

                    if (parent_control) {
                        if (!this.c_data.theme && parent_control.c_data.theme_owner) {
                            this.c_data.theme_owner = parent_control.c_data.theme_owner;
                            this.notification(NOTIFICATION_THEME_CHANGED);
                        }
                    } else if (subwindow) {
                        this.c_data.SI = this.get_viewport()._gui_add_subwindow_control(this);
                    } else {
                        this.c_data.RI = this.get_viewport()._gui_add_root_control(this);
                    }

                    this.c_data.parent_canvas_item = this.get_parent_item();

                    if (this.c_data.parent_canvas_item) {
                        this.c_data.parent_canvas_item.connect('item_rect_changed', this._size_changed, this);
                    } else {
                        this.get_viewport().connect('size_changed', this._size_changed, this);
                    }
                }
            } break;
            case NOTIFICATION_EXIT_CANVAS: {
                if (this.c_data.parent_canvas_item) {
                    this.c_data.parent_canvas_item.disconnect('item_rect_changed', this._size_changed, this);
                    this.c_data.parent_canvas_item = null;
                } else if (!this.is_set_as_toplevel()) {
                    this.get_viewport().disconnect('size_changed', this._size_changed, this);
                }

                if (this.c_data.MI) {
                    this.get_viewport()._gui_remove_modal_control(this.c_data.MI);
                    this.c_data.MI = null;
                }

                if (this.c_data.SI) {
                    this.get_viewport()._gui_remove_subwindow_control(this.c_data.SI);
                    this.c_data.SI = null;
                }

                if (this.c_data.RI) {
                    this.get_viewport()._gui_remove_root_control(this.c_data.RI);
                    this.c_data.RI = null;
                }

                this.c_data.parent = null;
                this.c_data.parent_canvas_item = null;
            } break;
            case NOTIFICATION_MOVED_IN_PARENT: {
                if (this.c_data.parent) {
                    this.c_data.parent.update();
                }
                this.update();

                if (this.c_data.SI) {
                    this.get_viewport()._gui_set_subwindow_order_dirty();
                }
                if (this.c_data.RI) {
                    this.get_viewport()._gui_set_root_order_dirty();
                }
            } break;
            case NOTIFICATION_RESIZED: {
                this.emit_signal('resized');
            } break;
            case NOTIFICATION_DRAW: {
                this._update_canvas_item_transform();
                const rect = Rect2.new(0, 0, this.rect_size.x, this.rect_size.y);
                VSG.canvas.canvas_item_set_custom_rect(this.canvas_item, !this.c_data.disable_visibility_clip, rect);
                VSG.canvas.canvas_item_set_clip(this.canvas_item, this.c_data.clip_contents);
            } break;
            case NOTIFICATION_MOUSE_ENTER: {
                this.emit_signal('mouse_entered');
            } break;
            case NOTIFICATION_MOUSE_EXIT: {
                this.emit_signal('mouse_exited');
            } break;
            case NOTIFICATION_FOCUS_ENTER: {
                this.emit_signal('focus_entered');
                this.update();
            } break;
            case NOTIFICATION_FOCUS_EXIT: {
                this.emit_signal('focus_exited');
                this.update();
            } break;
            case NOTIFICATION_THEME_CHANGED: {
                this.update();
            } break;
            case NOTIFICATION_MODAL_CLOSE: {
                this.emit_signal('modal_closed');
            } break;
            case NOTIFICATION_VISIBILITY_CHANGED: {
                if (!this.is_visible_in_tree()) {
                    const viewport = this.get_viewport();
                    if (viewport) {
                        viewport._gui_hid_control(this);
                    }
                    if (this.is_inside_tree()) {
                        this._modal_stack_remove();
                    }
                } else {
                    this.c_data.minimum_size_valid = false;
                    this._size_changed();
                }
            } break;
            case NOTIFICATION_WM_UNFOCUS_REQUEST: {
                this.get_viewport()._gui_unfocus_control(this);
            } break;
        }
    }

    _get_minimum_size() {
        return /** @type {Vector2} */(null);
    }

    accept_event() {
        if (this.is_inside_tree()) {
            this.get_viewport()._gui_accept_event();
        }
    }

    get_minimum_size() {
        const s = this._get_minimum_size();
        return s || Vector2.new(0, 0);
    }
    /**
     * returns new Vector2
     */
    get_combined_minimum_size() {
        if (!this.c_data.minimum_size_valid) {
            this._update_minimum_size_cache();
        }
        return this.c_data.minimum_size_cache.clone();
    }

    /**
     * @param {Vector2Like} p_custom
     */
    set_custom_minimum_size(p_custom) {
        if (this.c_data.custom_minimum_size.equals(p_custom)) {
            return;
        }
        this.c_data.custom_minimum_size.copy(p_custom);
        this.minimum_size_changed();
    }
    get_custom_minimum_size() {
        return this.c_data.custom_minimum_size;
    }

    is_window_modal_on_top() {
        if (!this.is_inside_tree()) return false;
        return this.get_viewport()._gui_is_modal_on_top(this);
    }
    get_modal_frame() {
        return this.c_data.modal_frame;
    }

    get_parent_control() {
        return this.c_data.parent;
    }
    get_root_parent_control() {
        let ci = /** @type {CanvasItem} */(this);
        let root = /** @type {Control} */(this);

        while (ci) {
            if (ci.is_control) {
                root = /** @type {Control} */(ci);
                if (root.c_data.RI || root.c_data.MI || root.is_toplevel_control()) {
                    break;
                }
            }

            ci = ci.get_parent_item();
        }

        return root;
    }

    /* positioning */

    /**
     * @param {number} margin
     * @param {number} anchor
     * @param {boolean} keep_margin
     * @param {boolean} push_opposite_anchor
     */
    set_anchor(margin, anchor, keep_margin = true, push_opposite_anchor = true) {
        const parent_rect = this.get_parent_anchorable_rect();
        let parent_range = (margin === MARGIN_LEFT || margin === MARGIN_RIGHT) ? parent_rect.width : parent_rect.height;
        let previous_margin_pos = this.c_data.margin[margin] + this.c_data.anchor[margin] * parent_range;
        let previous_opposite_margin_pos = this.c_data.margin[(margin + 2) % 4] + this.c_data.anchor[(margin + 2) % 4] * parent_range;

        this.c_data.anchor[margin] = clamp(anchor, 0.0, 1.0);

        if (
            ((margin === MARGIN_LEFT || margin === MARGIN_TOP) && this.c_data.anchor[margin] > this.c_data.anchor[(margin + 2) % 4])
            ||
            ((margin === MARGIN_RIGHT || margin === MARGIN_BOTTOM) && this.c_data.anchor[margin] < this.c_data.anchor[(margin + 2) % 4])
        ) {
            if (push_opposite_anchor) {
                this.c_data.anchor[(margin + 2) % 4] = this.c_data.anchor[margin];
            } else {
                this.c_data.anchor[margin] = this.c_data.anchor[(margin + 2) % 4];
            }
        }

        if (!keep_margin) {
            this.c_data.margin[margin] = previous_margin_pos - this.c_data.anchor[margin] * parent_range;
            if (push_opposite_anchor) {
                this.c_data.margin[(margin + 2) % 4] = previous_opposite_margin_pos - this.c_data.anchor[(margin + 2) % 4] * parent_range;
            }
        }
        if (this.is_inside_tree()) {
            this._size_changed();
        }

        this.update();
    }
    /**
     * @param {number} p_margin
     */
    get_anchor(p_margin) {
        return this.c_data.anchor[p_margin];
    }

    /**
     * @param {number} margin
     * @param {number} value
     */
    set_margin(margin, value) {
        this.c_data.margin[margin] = value;
        this._size_changed();

        return this;
    }
    /**
     * @param {number} p_margin
     */
    get_margin(p_margin) {
        return this.c_data.margin[p_margin];
    }

    /**
     * @param {number} p_margin
     * @param {number} p_anchor
     * @param {number} p_pos
     * @param {boolean} [p_push_opposite_anchor=true]
     */
    set_anchor_and_margin(p_margin, p_anchor, p_pos, p_push_opposite_anchor = true) {
        this.set_anchor(p_margin, p_anchor, false, p_push_opposite_anchor);
        this.set_margin(p_margin, p_pos);
    }

    /**
     * @param {number} p_preset
     * @param {boolean} [p_keep_margins=true]
     */
    set_anchors_preset(p_preset, p_keep_margins = true) {
        //Left
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_BOTTOM_LEFT:
            case PRESET_CENTER_LEFT:
            case PRESET_TOP_WIDE:
            case PRESET_BOTTOM_WIDE:
            case PRESET_LEFT_WIDE:
            case PRESET_HCENTER_WIDE:
            case PRESET_WIDE:
                this.set_anchor(MARGIN_LEFT, ANCHOR_BEGIN, p_keep_margins);
                break;

            case PRESET_CENTER_TOP:
            case PRESET_CENTER_BOTTOM:
            case PRESET_CENTER:
            case PRESET_VCENTER_WIDE:
                this.set_anchor(MARGIN_LEFT, 0.5, p_keep_margins);
                break;

            case PRESET_TOP_RIGHT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_RIGHT:
            case PRESET_RIGHT_WIDE:
                this.set_anchor(MARGIN_LEFT, ANCHOR_END, p_keep_margins);
                break;
        }

        // Top
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_TOP_RIGHT:
            case PRESET_CENTER_TOP:
            case PRESET_LEFT_WIDE:
            case PRESET_RIGHT_WIDE:
            case PRESET_TOP_WIDE:
            case PRESET_VCENTER_WIDE:
            case PRESET_WIDE:
                this.set_anchor(MARGIN_TOP, ANCHOR_BEGIN, p_keep_margins);
                break;

            case PRESET_CENTER_LEFT:
            case PRESET_CENTER_RIGHT:
            case PRESET_CENTER:
            case PRESET_HCENTER_WIDE:
                this.set_anchor(MARGIN_TOP, 0.5, p_keep_margins);
                break;

            case PRESET_BOTTOM_LEFT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_BOTTOM:
            case PRESET_BOTTOM_WIDE:
                this.set_anchor(MARGIN_TOP, ANCHOR_END, p_keep_margins);
                break;
        }

        // Right
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_BOTTOM_LEFT:
            case PRESET_CENTER_LEFT:
            case PRESET_LEFT_WIDE:
                this.set_anchor(MARGIN_RIGHT, ANCHOR_BEGIN, p_keep_margins);
                break;

            case PRESET_CENTER_TOP:
            case PRESET_CENTER_BOTTOM:
            case PRESET_CENTER:
            case PRESET_VCENTER_WIDE:
                this.set_anchor(MARGIN_RIGHT, 0.5, p_keep_margins);
                break;

            case PRESET_TOP_RIGHT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_RIGHT:
            case PRESET_TOP_WIDE:
            case PRESET_RIGHT_WIDE:
            case PRESET_BOTTOM_WIDE:
            case PRESET_HCENTER_WIDE:
            case PRESET_WIDE:
                this.set_anchor(MARGIN_RIGHT, ANCHOR_END, p_keep_margins);
                break;
        }

        // Bottom
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_TOP_RIGHT:
            case PRESET_CENTER_TOP:
            case PRESET_TOP_WIDE:
                this.set_anchor(MARGIN_BOTTOM, ANCHOR_BEGIN, p_keep_margins);
                break;

            case PRESET_CENTER_LEFT:
            case PRESET_CENTER_RIGHT:
            case PRESET_CENTER:
            case PRESET_HCENTER_WIDE:
                this.set_anchor(MARGIN_BOTTOM, 0.5, p_keep_margins);
                break;

            case PRESET_BOTTOM_LEFT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_BOTTOM:
            case PRESET_LEFT_WIDE:
            case PRESET_RIGHT_WIDE:
            case PRESET_BOTTOM_WIDE:
            case PRESET_VCENTER_WIDE:
            case PRESET_WIDE:
                this.set_anchor(MARGIN_BOTTOM, ANCHOR_END, p_keep_margins);
                break;
        }
    }

    /**
     * @param {number} p_preset
     * @param {number} p_resize_mode
     * @param {number} p_margin
     */
    set_margins_preset(p_preset, p_resize_mode, p_margin) {
        // Calculate the size if the node is not resized
        const min_size = this.get_minimum_size();
        const new_size = this.rect_size.clone();
        if (p_resize_mode == PRESET_MODE_MINSIZE || p_resize_mode == PRESET_MODE_KEEP_HEIGHT) {
            new_size.x = min_size.x;
        }
        if (p_resize_mode == PRESET_MODE_MINSIZE || p_resize_mode == PRESET_MODE_KEEP_WIDTH) {
            new_size.y = min_size.y;
        }

        const parent_rect = this.get_parent_anchorable_rect();

        //Left
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_BOTTOM_LEFT:
            case PRESET_CENTER_LEFT:
            case PRESET_TOP_WIDE:
            case PRESET_BOTTOM_WIDE:
            case PRESET_LEFT_WIDE:
            case PRESET_HCENTER_WIDE:
            case PRESET_WIDE:
                this.c_data.margin[0] = parent_rect.width * (0.0 - this.c_data.anchor[0]) + p_margin + parent_rect.x;
                break;

            case PRESET_CENTER_TOP:
            case PRESET_CENTER_BOTTOM:
            case PRESET_CENTER:
            case PRESET_VCENTER_WIDE:
                this.c_data.margin[0] = parent_rect.width * (0.5 - this.c_data.anchor[0]) - new_size.x / 2 + parent_rect.x;
                break;

            case PRESET_TOP_RIGHT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_RIGHT:
            case PRESET_RIGHT_WIDE:
                this.c_data.margin[0] = parent_rect.width * (1.0 - this.c_data.anchor[0]) - new_size.x - p_margin + parent_rect.x;
                break;
        }

        // Top
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_TOP_RIGHT:
            case PRESET_CENTER_TOP:
            case PRESET_LEFT_WIDE:
            case PRESET_RIGHT_WIDE:
            case PRESET_TOP_WIDE:
            case PRESET_VCENTER_WIDE:
            case PRESET_WIDE:
                this.c_data.margin[1] = parent_rect.height * (0.0 - this.c_data.anchor[1]) + p_margin + parent_rect.y;
                break;

            case PRESET_CENTER_LEFT:
            case PRESET_CENTER_RIGHT:
            case PRESET_CENTER:
            case PRESET_HCENTER_WIDE:
                this.c_data.margin[1] = parent_rect.height * (0.5 - this.c_data.anchor[1]) - new_size.y / 2 + parent_rect.y;
                break;

            case PRESET_BOTTOM_LEFT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_BOTTOM:
            case PRESET_BOTTOM_WIDE:
                this.c_data.margin[1] = parent_rect.height * (1.0 - this.c_data.anchor[1]) - new_size.y - p_margin + parent_rect.y;
                break;
        }

        // Right
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_BOTTOM_LEFT:
            case PRESET_CENTER_LEFT:
            case PRESET_LEFT_WIDE:
                this.c_data.margin[2] = parent_rect.width * (0.0 - this.c_data.anchor[2]) + new_size.x + p_margin + parent_rect.x;
                break;

            case PRESET_CENTER_TOP:
            case PRESET_CENTER_BOTTOM:
            case PRESET_CENTER:
            case PRESET_VCENTER_WIDE:
                this.c_data.margin[2] = parent_rect.width * (0.5 - this.c_data.anchor[2]) + new_size.x / 2 + parent_rect.x;
                break;

            case PRESET_TOP_RIGHT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_RIGHT:
            case PRESET_TOP_WIDE:
            case PRESET_RIGHT_WIDE:
            case PRESET_BOTTOM_WIDE:
            case PRESET_HCENTER_WIDE:
            case PRESET_WIDE:
                this.c_data.margin[2] = parent_rect.width * (1.0 - this.c_data.anchor[2]) - p_margin + parent_rect.x;
                break;
        }

        // Bottom
        switch (p_preset) {
            case PRESET_TOP_LEFT:
            case PRESET_TOP_RIGHT:
            case PRESET_CENTER_TOP:
            case PRESET_TOP_WIDE:
                this.c_data.margin[3] = parent_rect.height * (0.0 - this.c_data.anchor[3]) + new_size.y + p_margin + parent_rect.y;
                break;

            case PRESET_CENTER_LEFT:
            case PRESET_CENTER_RIGHT:
            case PRESET_CENTER:
            case PRESET_HCENTER_WIDE:
                this.c_data.margin[3] = parent_rect.height * (0.5 - this.c_data.anchor[3]) + new_size.y / 2 + parent_rect.y;
                break;

            case PRESET_BOTTOM_LEFT:
            case PRESET_BOTTOM_RIGHT:
            case PRESET_CENTER_BOTTOM:
            case PRESET_LEFT_WIDE:
            case PRESET_RIGHT_WIDE:
            case PRESET_BOTTOM_WIDE:
            case PRESET_VCENTER_WIDE:
            case PRESET_WIDE:
                this.c_data.margin[3] = parent_rect.height * (1.0 - this.c_data.anchor[3]) - p_margin + parent_rect.y;
                break;
        }

        this._size_changed();

        Rect2.free(parent_rect);
        Vector2.free(min_size);
        Vector2.free(new_size);
    }

    /**
     * @param {number} p_preset
     * @param {number} p_resize_mode
     * @param {number} p_margin
     */
    set_anchors_and_margins_preset(p_preset, p_resize_mode, p_margin) {
        this.set_anchors_preset(p_preset);
        this.set_margins_preset(p_preset, p_resize_mode, p_margin);
    }

    /**
     * @param {Vector2Like} p_point
     */
    set_begin(p_point) {
        this.set_begin_n(p_point.x, p_point.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_begin_n(x, y) {
        this.c_data.margin[0] = x;
        this.c_data.margin[1] = y;
        this._size_changed();
    }
    get_begin() {
        return Vector2.new(this.c_data.margin[0], this.c_data.margin[1]);
    }

    /**
     * @param {Vector2Like} p_point
     */
    set_end(p_point) {
        this.set_end_n(p_point.x, p_point.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_end_n(x, y) {
        this.c_data.margin[2] = x;
        this.c_data.margin[3] = y;
        this._size_changed();
    }
    get_end() {
        return Vector2.new(this.c_data.margin[2], this.c_data.margin[3]);
    }

    get rect_position() {
        return this.c_data.pos_cache;
    }
    /**
     * @param {Vector2Like} value
     * @param {boolean} [p_keep_margins=false]
     */
    set_rect_position(value, p_keep_margins = false) {
        this.set_rect_position_n(value.x, value.y, p_keep_margins);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} [p_keep_margins=false]
     */
    set_rect_position_n(x, y, p_keep_margins = false) {
        const rect = Rect2.new(x, y, this.c_data.size_cache.x, this.c_data.size_cache.y);
        if (p_keep_margins) {
            this._compute_anchors(rect, this.c_data.margin, this.c_data.anchor);
        } else {
            this._compute_margins(rect, this.c_data.anchor, this.c_data.margin);
        }
        this._size_changed();
        Rect2.free(rect);
    }

    get rect_global_position() {
        return this.get_global_transform().origin;
    }
    /**
     * @param {Vector2Like} value
     * @param {boolean} [p_keep_margins=false]
     */
    set_rect_global_position(value, p_keep_margins = false) {
        this.set_rect_global_position_n(value.x, value.y, p_keep_margins);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {boolean} [p_keep_margins=false]
     */
    set_rect_global_position_n(x, y, p_keep_margins = false) {
        const inv = Transform2D.new();
        if (this.c_data.parent_canvas_item) {
            inv.copy(this.c_data.parent_canvas_item.get_global_transform()).affine_inverse();
        }
        const point = Vector2.new(x, y)
        this.set_rect_position(inv.xform(point, point), p_keep_margins);
        Vector2.free(point);
        Transform2D.free(inv);
    }

    get rect_size() {
        return this.c_data.size_cache;
    }
    /**
     * @param {Vector2Like} value
     * @param {boolean} [p_keep_margins=false]
     */
    set_rect_size(value, p_keep_margins = false) {
        this.set_rect_size_n(value.x, value.y, p_keep_margins);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_rect_size_n(x, y, p_keep_margins = false) {
        const new_size = Vector2.new(x, y);
        const min = this.get_combined_minimum_size();
        if (new_size.x < min.x) {
            new_size.x = min.x;
        }
        if (new_size.y < min.y) {
            new_size.y = min.y;
        }

        const rect = Rect2.new(
            this.c_data.pos_cache.x,
            this.c_data.pos_cache.y,
            new_size.x,
            new_size.y
        )
        if (p_keep_margins) {
            this._compute_anchors(rect, this.c_data.margin, this.c_data.anchor);
        } else {
            this._compute_margins(rect, this.c_data.anchor, this.c_data.margin);
        }
        this._size_changed();
        Rect2.free(rect);
        Vector2.free(new_size);
        Vector2.free(min);
    }

    get_rect() {
        return Rect2.new(
            this.c_data.pos_cache.x,
            this.c_data.pos_cache.y,
            this.c_data.size_cache.x,
            this.c_data.size_cache.y
        )
    }
    get_global_rect() {
        const pos = this.rect_global_position;
        const rect = Rect2.new(
            pos.x,
            pos.y,
            this.c_data.size_cache.x,
            this.c_data.size_cache.y
        )
        return rect;
    }
    get_window_rect() {
        const gr = this.get_global_rect();
        const rect = this.get_viewport().get_visible_rect();
        gr.x += rect.x;
        gr.y += rect.y;
        return gr;
    }
    get_anchorable_rect() {
        return Rect2.new(0, 0, this.c_data.size_cache.x, this.c_data.size_cache.y);
    }

    get rect_rotation() {
        return this.c_data.rotation;
    }
    /**
     * @param {number} value
     */
    set_rect_rotation(value) {
        this.c_data.rotation = value;
        this.update();
        this._notify_transform();
    }

    get rect_rotation_degrees() {
        return rad2deg(this.c_data.rotation);
    }
    /**
     * @param {number} value
     */
    set_rect_rotation_degrees(value) {
        this.set_rect_rotation(deg2rad(value));
    }

    get grow_horizontal() {
        return this.c_data.h_grow;
    }
    /**
     * @param {number} value
     */
    set_grow_horizontal(value) {
        this.c_data.h_grow = value;
        this._size_changed();
    }

    get grow_vertical() {
        return this.c_data.v_grow;
    }
    /**
     * @param {number} value
     */
    set_grow_vertical(value) {
        this.c_data.v_grow = value;
        this._size_changed();
    }

    get rect_pivot_offset() {
        return this.c_data.pivot_offset;
    }
    /**
     * @param {Vector2Like} value
     */
    set_rect_pivot_offset(value) {
        this.set_rect_pivot_offset_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_rect_pivot_offset_n(x, y) {
        this.c_data.pivot_offset.set(x, y);
        this.update();
        this._notify_transform();
    }

    get rect_scale() {
        return this.c_data.scale;
    }
    /**
     * @param {Vector2Like} value
     */
    set_rect_scale(value) {
        this.set_rect_scale_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_rect_scale_n(x, y) {
        this.c_data.scale.set(x, y);
        this.update();
        this._notify_transform();
    }

    show_model() { }

    set_theme() { }
    get_theme() { }

    get size_flags_horizontal() {
        return this.c_data.h_size_flags;
    }
    /**
     * @param {number} value
     */
    set_size_flags_horizontal(value) {
        if (this.c_data.h_size_flags === value) {
            return;
        }
        this.c_data.h_size_flags = value;
        this.emit_signal('size_flags_changed');
    }

    get size_flags_vertical() {
        return this.c_data.v_size_flags;
    }
    /**
     * @param {number} value
     */
    set_size_flags_vertical(value) {
        if (this.c_data.v_size_flags === value) {
            return;
        }
        this.c_data.v_size_flags = value;
        this.emit_signal('size_flags_changed');
    }

    get size_flags_stretch_ratio() {
        return this.c_data.expand;
    }
    /**
     * @param {number} value
     */
    set_size_flags_stretch_ratio(value) {
        if (this.c_data.expand === value) {
            return;
        }
        this.c_data.expand = value;
        this.emit_signal('size_flags_changed');
    }

    minimum_size_changed() {
        if (!this.is_inside_tree() || this.c_data.block_minimum_size_adjust) {
            return;
        }

        /** @type {Control} */
        let invalidate = this;

        while (invalidate && invalidate.c_data.minimum_size_valid) {
            invalidate.c_data.minimum_size_valid = false;
            if (invalidate.is_set_as_toplevel()) {
                break;
            }
            invalidate = invalidate.c_data.parent;
        }

        if (!this.is_visible_in_tree()) {
            return;
        }

        if (this.c_data.updating_last_minimum_size) {
            return;
        }

        this.c_data.updating_last_minimum_size = true;

        MessageQueue.get_singleton().push_call(this, '_update_minimum_size');
    }

    /* focus */

    /* skinning */

    /**
     * @param {string} name
     * @param {Font} font
     */
    add_font_override(name, font) {
        this.c_data.font_override = this.c_data.font_override || {};
        this.c_data.font_override[name] = font;
        this._theme_changed();
        return this;
    }
    /**
     * @param {string} name
     * @param {Color} color
     */
    add_color_override(name, color) {
        this.c_data.color_override = this.c_data.color_override || {};
        this.c_data.color_override[name] = color;
        this._theme_changed();
        return this;
    }
    /**
     * @param {string} name
     * @param {number} p_constant
     */
    add_constant_override(name, p_constant) {
        this.c_data.constant_override = this.c_data.constant_override || {};
        this.c_data.constant_override[name] = p_constant;
        this._theme_changed();
        return this;
    }

    /* tooltip */

    /* cursor */

    /* private */

    /**
     * returns new Rect2
     */
    get_parent_anchorable_rect() {
        if (!this.is_inside_tree()) {
            return Rect2.new();
        }

        if (this.c_data.parent_canvas_item) {
            return this.c_data.parent_canvas_item.get_anchorable_rect();
        } else {
            return this.get_viewport().get_visible_rect();
        }
    }

    /**
     * returns new Vector2
     */
    get_parent_area_size() {
        const rect = this.get_parent_anchorable_rect();
        const size = Vector2.new(rect.width, rect.height);
        Rect2.free(rect);
        return size;
    }

    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_constant(name, type) {
        if (!type) {
            if (this.c_data.constant_override) {
                const c = this.c_data.constant_override[name];
                if (c !== undefined) {
                    return c;
                }
            }

            type = this.class;
        }

        // TODO: Loop through theme owners and find the value

        return Theme.get_default().get_constant(name, type);
    }
    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_stylebox(name, type) {
        if (!type) {
            if (this.c_data.stylebox_override) {
                const stylebox = this.c_data.stylebox_override[name];
                if (stylebox !== undefined) {
                    return stylebox;
                }
            }

            type = this.class;
        }

        // TODO: try with custom themes

        return Theme.get_default().get_stylebox(name, type);
    }
    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_font(name, type) {
        if (!type) {
            if (this.c_data.font_override) {
                const font = this.c_data.font_override[name];
                if (font !== undefined) {
                    return font;
                }
            }

            type = this.class;
        }

        // TODO: try with custom themes

        return Theme.get_default().get_font(name, type);
    }
    /**
     * @param {string} name
     * @param {string} [type]
     */
    get_color(name, type) {
        if (!type) {
            if (this.c_data.color_override) {
                const color = this.c_data.color_override[name];
                if (color !== undefined) {
                    return color;
                }
            }

            type = this.class;
        }

        // TODO: try with custom themes

        return Theme.get_default().get_color(name, type);
    }

    /**
     * @param {CanvasItem} p_at
     * @param {Control} p_owner
     * @param {boolean} p_assign
     */
    _propagate_theme_changed(p_at, p_owner, p_assign) { }

    _theme_changed() {
        this._propagate_theme_changed(this, this, false);
    }

    /**
     * @param {Rect2} p_rect
     * @param {number[]} p_anchors
     * @param {number[]} r_margins
     */
    _compute_margins(p_rect, p_anchors, r_margins) {
        const parent_rect = this.get_parent_anchorable_rect();
        r_margins[0] = Math.floor(p_rect.x - (p_anchors[0] * parent_rect.width));
        r_margins[1] = Math.floor(p_rect.y - (p_anchors[1] * parent_rect.height));
        r_margins[2] = Math.floor(p_rect.x + p_rect.width - (p_anchors[2] * parent_rect.width));
        r_margins[3] = Math.floor(p_rect.y + p_rect.height - (p_anchors[3] * parent_rect.height));
    }

    /**
     * @param {Rect2} p_rect
     * @param {number[]} p_margins
     * @param {number[]} r_anchors
     */
    _compute_anchors(p_rect, p_margins, r_anchors) {
        const parent_rect = this.get_parent_anchorable_rect();
        r_anchors[0] = (p_rect.x - p_margins[0]) / parent_rect.width;
        r_anchors[1] = (p_rect.y - p_margins[1]) / parent_rect.height;
        r_anchors[2] = (p_rect.x + p_rect.width - p_margins[2]) / parent_rect.width;
        r_anchors[3] = (p_rect.y + p_rect.height - p_margins[3]) / parent_rect.height;
    }

    _override_changed() {
        this.notification(NOTIFICATION_THEME_CHANGED);
        this.minimum_size_changed();
    }

    _size_changed() {
        const parent_rect = this.get_parent_anchorable_rect();
        margin_pos[0] = 0;
        margin_pos[1] = 0;
        margin_pos[2] = 0;
        margin_pos[3] = 0;

        for (let i = 0; i < 4; i++) {
            margin_pos[i] = this.c_data.margin[i] + (this.c_data.anchor[i] * ((i % 2 === 0) ? parent_rect.width : parent_rect.height));
        }

        const new_pos_cache = Vector2.new(margin_pos[0], margin_pos[1]);
        const new_size_cache = Vector2.new(margin_pos[2], margin_pos[3]).subtract(new_pos_cache);

        const minimum_size = this.get_combined_minimum_size();

        if (minimum_size.x > new_size_cache.x) {
            if (this.c_data.h_grow === GROW_DIRECTION_BEGIN) {
                new_pos_cache.x += (new_size_cache.x - minimum_size.x);
            } else if (this.c_data.h_grow === GROW_DIRECTION_BOTH) {
                new_pos_cache.x += 0.5 * (new_size_cache.x - minimum_size.x);
            }

            new_size_cache.x = minimum_size.x;
        }

        if (minimum_size.y > new_size_cache.y) {
            if (this.c_data.v_grow === GROW_DIRECTION_BEGIN) {
                new_pos_cache.y += (new_size_cache.y - minimum_size.y);
            } else if (this.c_data.v_grow === GROW_DIRECTION_BOTH) {
                new_pos_cache.y += 0.5 * (new_size_cache.y - minimum_size.y);
            }

            new_size_cache.y = minimum_size.y;
        }

        let pos_changed = !new_pos_cache.equals(this.c_data.pos_cache);
        let size_changed = !new_size_cache.equals(this.c_data.size_cache);

        this.c_data.pos_cache.copy(new_pos_cache);
        this.c_data.size_cache.copy(new_size_cache);

        if (this.is_inside_tree()) {
            if (size_changed) {
                this.notification(NOTIFICATION_RESIZED);
            }
            if (pos_changed && size_changed) {
                this.item_rect_changed(size_changed);
                this._notify_transform();
            }

            if (pos_changed && !size_changed) {
                this._update_canvas_item_transform();
            }
        }

        Vector2.free(minimum_size);
        Vector2.free(new_pos_cache);
        Vector2.free(new_size_cache);
        Rect2.free(parent_rect);
    }

    _update_canvas_item_transform() {
        const xform = this._get_internal_transform();
        const position = this.rect_position;
        xform.tx += position.x;
        xform.ty += position.y;

        if (this.is_inside_tree() && Math.abs(Math.sin(this.c_data.rotation * 4)) < 0.00001 && this.get_viewport().snap_controls_to_pixels) {
            xform.tx = Math.round(xform.tx);
            xform.ty = Math.round(xform.ty);
        }

        VSG.canvas.canvas_item_set_transform(this.canvas_item, xform);
        Transform2D.free(xform);
    }

    _get_internal_transform() {
        const rot_scale = Transform2D.new();
        rot_scale.set_rotation_and_scale(this.c_data.rotation, this.c_data.scale);
        const offset = Transform2D.new();
        offset.set_origin_n(-this.c_data.pivot_offset.x, -this.c_data.pivot_offset.y);
        rot_scale.append(offset);
        offset.affine_inverse().append(rot_scale);
        Transform2D.free(rot_scale);
        return offset;
    }

    _update_minimum_size() {
        if (!this.is_inside_tree) {
            return;
        }

        const minsize = this.get_combined_minimum_size();
        if (
            minsize.x > this.c_data.size_cache.x
            ||
            minsize.y > this.c_data.size_cache.y
        ) {
            this._size_changed();
        }

        this.c_data.updating_last_minimum_size = false;

        if (!minsize.equals(this.c_data.last_minimum_size)) {
            this.c_data.last_minimum_size.copy(minsize);
            this.emit_signal('minimum_size_changed');
        }
        Vector2.free(minsize);
    }
    _update_minimum_size_cache() {
        const minsize = this.get_minimum_size();
        minsize.x = Math.max(minsize.x, this.c_data.custom_minimum_size.x);
        minsize.y = Math.max(minsize.y, this.c_data.custom_minimum_size.y);

        let size_changed = false;
        if (!this.c_data.minimum_size_cache.equals(minsize)) {
            size_changed = true;
        }

        this.c_data.minimum_size_cache.copy(minsize);
        this.c_data.minimum_size_valid = true;

        if (size_changed) {
            this.minimum_size_changed();
        }
        Vector2.free(minsize);
    }

    _modal_stack_remove() {
        if (!this.c_data.MI) {
            return;
        }

        this.get_viewport()._gui_remove_from_modal_stack(this.c_data.MI, this.c_data.modal_prev_focus_owner);
    }

    is_toplevel_control() {
        return this.is_inside_tree() && (!this.c_data.parent_canvas_item && !this.c_data.RI && this.is_set_as_toplevel());
    }
}
node_class_map['Control'] = GDCLASS(Control, CanvasItem)
