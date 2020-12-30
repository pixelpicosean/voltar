import { node_class_map } from 'engine/registry';
import { GDCLASS } from 'engine/core/v_object';
import {
    MARGIN_LEFT,
    MARGIN_RIGHT,
    MARGIN_TOP,
    MARGIN_BOTTOM,
} from 'engine/core/math/math_defs.js';
import { clamp } from 'engine/core/math/math_funcs.js';
import { Vector2, Vector2Like } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2.js';
import { Transform2D } from 'engine/core/math/transform_2d.js';

import { Viewport } from '../main/viewport';
import { GROUP_CALL_REALTIME } from '../main/scene_tree';
import {
    NOTIFICATION_INTERNAL_PROCESS,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    Node,
} from '../main/node';
import { Node2D } from './node_2d';
import {
    NOTIFICATION_DRAW,
} from './canvas_item';
import { NOTIFICATION_TRANSFORM_CHANGED } from '../const';


export const ANCHOR_MODE_FIXED_TOP_LEFT = 0;
export const ANCHOR_MODE_DRAG_CENTER = 1;

export const CAMERA2D_PROCESS_PHYSICS = 0;
export const CAMERA2D_PROCESS_IDLE = 1;

export class Camera2D extends Node2D {
    get class() { return 'Camera2D' }

    get drag_margin_left() {
        return this.drag_margin[MARGIN_LEFT];
    }
    /**
     * @param {number} value
     */
    set_drag_margin_left(value) {
        this.drag_margin[MARGIN_LEFT] = value;
    }

    get drag_margin_right() {
        return this.drag_margin[MARGIN_RIGHT];
    }
    /**
     * @param {number} value
     */
    set_drag_margin_right(value) {
        this.drag_margin[MARGIN_RIGHT] = value;
    }

    get drag_margin_top() {
        return this.drag_margin[MARGIN_TOP];
    }
    /**
     * @param {number} value
     */
    set_drag_margin_top(value) {
        this.drag_margin[MARGIN_TOP] = value;
    }

    get drag_margin_bottom() {
        return this.drag_margin[MARGIN_BOTTOM];
    }
    /**
     * @param {number} value
     */
    set_drag_margin_bottom(value) {
        this.drag_margin[MARGIN_BOTTOM] = value;
    }

    get limit_left() {
        return this.limit[MARGIN_LEFT];
    }
    /**
     * @param {number} value
     */
    set_limit_left(value) {
        this.limit[MARGIN_LEFT] = value;
    }

    get limit_right() {
        return this.limit[MARGIN_RIGHT];
    }
    /**
     * @param {number} value
     */
    set_limit_right(value) {
        this.limit[MARGIN_RIGHT] = value;
    }

    get limit_top() {
        return this.limit[MARGIN_TOP];
    }
    /**
     * @param {number} value
     */
    set_limit_top(value) {
        this.limit[MARGIN_TOP] = value;
    }

    get limit_bottom() {
        return this.limit[MARGIN_BOTTOM];
    }
    /**
     * @param {number} value
     */
    set_limit_bottom(value) {
        this.limit[MARGIN_BOTTOM] = value;
    }

    constructor() {
        super();

        /** @type {Viewport} */
        this.custom_viewport = null;
        /** @type {Viewport} */
        this.viewport = null;
        this.canvas = null;

        this.anchor_mode = ANCHOR_MODE_DRAG_CENTER;
        this.current = false;
        this.drag_margin = [0.2, 0.2, 0.2, 0.2];
        this.drag_margin_h_enabled = true;
        this.drag_margin_v_enabled = true;
        this.limit = [
            -10000000,
            -10000000,
            +10000000,
            +10000000,
        ];
        this.limit_smoothed = false;
        this.offset = new Vector2();
        this.offset_h = 0;
        this.offset_v = 0;
        this.process_mode = CAMERA2D_PROCESS_IDLE;
        this.rotating = false;
        this.smoothing_enabled = false;

        this.smoothing_speed = 5.0;
        this.zoom = new Vector2(1, 1);

        this.first = true;
        this.camera_pos = new Vector2();
        this.smoothed_camera_pos = new Vector2();
        this.camera_screen_center = new Vector2();

        this.h_offset_changed = false;
        this.v_offset_changed = false;

        this.group_name = '';
        this.canvas_group_name = '';

        this.set_notify_transform(true);
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.anchor_mode !== undefined) this.set_anchor_mode(data.anchor_mode);
        if (data.current !== undefined) this.set_current(data.current);

        if (data.drag_margin_left !== undefined) this.set_drag_margin_left(data.drag_margin_left);
        if (data.drag_margin_right !== undefined) this.set_drag_margin_right(data.drag_margin_right);
        if (data.drag_margin_top !== undefined) this.set_drag_margin_top(data.drag_margin_top);
        if (data.drag_margin_bottom !== undefined) this.set_drag_margin_bottom(data.drag_margin_bottom);

        if (data.drag_margin_h_enabled !== undefined) this.set_drag_margin_h_enabled(data.drag_margin_h_enabled);
        if (data.drag_margin_v_enabled !== undefined) this.set_drag_margin_v_enabled(data.drag_margin_v_enabled);

        if (data.limit_left !== undefined) this.set_limit_left(data.limit_left);
        if (data.limit_right !== undefined) this.set_limit_right(data.limit_right);
        if (data.limit_top !== undefined) this.set_limit_top(data.limit_top);
        if (data.limit_bottom !== undefined) this.set_limit_bottom(data.limit_bottom);

        if (data.limit_smoothed !== undefined) this.set_limit_smoothed(data.limit_smoothed);

        if (data.offset !== undefined) this.set_offset(data.offset);
        if (data.offset_h !== undefined) this.set_offset_h(data.offset_h);
        if (data.offset_v !== undefined) this.set_offset_v(data.offset_v);

        if (data.process_mode !== undefined) this.set_process_mode(data.process_mode);

        if (data.rotating !== undefined) this.set_rotating(data.rotating);

        if (data.smooth_enabled !== undefined) this.set_smooth_enabled(data.smooth_enabled);
        if (data.smooth_speed !== undefined) this.set_smooth_speed(data.smooth_speed);

        if (data.zoom !== undefined) this.set_zoom(data.zoom);

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_INTERNAL_PROCESS:
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: {
                this._update_scroll();
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                if (!this.is_processing_internal() && !this.is_physics_processing_internal()) {
                    this._update_scroll();
                }
            } break;
            case NOTIFICATION_ENTER_TREE: {
                if (this.custom_viewport) {
                    this.viewport = this.custom_viewport;
                } else {
                    this.viewport = this.get_viewport();
                }
                this.canvas = this.get_canvas();
                const vp = this.viewport.get_viewport_rid();

                this.group_name = `__cameras_${vp._id}`;
                this.canvas_group_name = `__cameras_c${this.canvas._id}`;
                this.add_to_group(this.group_name);
                this.add_to_group(this.canvas_group_name);

                this._update_process_mode();
                this._update_scroll();
                this.first = true;
            } break;
            case NOTIFICATION_EXIT_TREE: {
                if (this.current) {
                    if (this.viewport && this.custom_viewport) {
                        this.viewport.set_canvas_transform(Transform2D.IDENTITY);
                    }
                    this.remove_from_group(this.group_name);
                    this.remove_from_group(this.canvas_group_name);
                    this.viewport = null;
                }
            } break;
            case NOTIFICATION_DRAW: {
                if (!this.is_inside_tree()) return;

                // draw screen
                // draw limit
                // draw margin
            } break;
        }
    }

    /* public */

    /**
     * @param {Node} p_viewport
     */
    set_custom_viewport(p_viewport) {
        if (this.is_inside_tree()) {
            this.remove_from_group(this.group_name);
            this.remove_from_group(this.canvas_group_name);
        }

        this.custom_viewport = /** @type {Viewport} */(p_viewport);
        if (p_viewport.class !== 'Viewport') {
            this.custom_viewport = null;
        }

        if (this.is_inside_tree()) {
            if (this.custom_viewport) {
                this.viewport = this.custom_viewport;
            } else {
                this.viewport = this.get_viewport();
            }

            const vp = this.viewport.get_viewport_rid();
            this.group_name = `__cameras_${vp._id}`;
            this.canvas_group_name = `__cameras_c${this.canvas._id}`;
            this.add_to_group(this.group_name);
            this.add_to_group(this.canvas_group_name);
        }
    }

    align() {
        const rect = this.viewport.get_visible_rect();
        const screen_size = Vector2.create(rect.width, rect.height);

        const current_camera_pos = this.get_global_transform().get_origin();
        if (this.anchor_mode === ANCHOR_MODE_DRAG_CENTER) {
            if (this.offset_h < 0) {
                this.camera_pos.x = current_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[MARGIN_RIGHT] * this.offset_h;
            } else {
                this.camera_pos.x = current_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[MARGIN_LEFT] * this.offset_h;
            }
            if (this.offset_v < 0) {
                this.camera_pos.y = current_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[MARGIN_TOP] * this.offset_v;
            } else {
                this.camera_pos.y = current_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[MARGIN_BOTTOM] * this.offset_v;
            }
        } else if (this.anchor_mode === ANCHOR_MODE_FIXED_TOP_LEFT) {
            this.camera_pos.copy(current_camera_pos);
        }
        Vector2.free(current_camera_pos);

        this._update_scroll();
    }

    clear_current() {
        this.current = false;
        if (this.is_inside_tree()) {
            this.get_tree().call_group_flags(GROUP_CALL_REALTIME, this.group_name, '_make_current', null);
        }
    }

    force_update_scroll() {
        this._update_scroll();
    }

    get_camera_position() {
        return this.camera_pos;
    }

    get_camera_screen_center() {
        return this.camera_screen_center;
    }

    make_current() {
        if (!this.is_inside_tree()) {
            this.current = true;
        } else {
            this.get_tree().call_group_flags(GROUP_CALL_REALTIME, this.group_name, '_make_current', this);
        }
        this._update_scroll();
    }

    reset_smoothing() {
        this.smoothed_camera_pos.copy(this.camera_pos);
        this._update_scroll();
    }

    set_current(value) {
        if (value) {
            this.make_current();
        }

        this.current = value;
    }

    set_offset_h(value) {
        this.offset_h = value;
        this.h_offset_changed = true;

        let old_smoothed_camera_pos = this.smoothed_camera_pos.clone();
        this._update_scroll();
        this.smoothed_camera_pos.copy(old_smoothed_camera_pos);
        Vector2.free(old_smoothed_camera_pos);
    }

    set_offset_v(value) {
        this.offset_v = value;
        this.v_offset_changed = true;

        let old_smoothed_camera_pos = this.smoothed_camera_pos.clone();
        this._update_scroll();
        this.smoothed_camera_pos.copy(old_smoothed_camera_pos);
        Vector2.free(old_smoothed_camera_pos);
    }

    /**
     * @param {Vector2Like} p_offset
     */
    set_offset(p_offset) {
        this.set_offset_n(p_offset.x, p_offset.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_offset_n(x, y) {
        this.offset.set(x, y);

        let old_smoothed_camera_pos = this.smoothed_camera_pos.clone();
        this._update_scroll();
        this.smoothed_camera_pos.copy(old_smoothed_camera_pos);
        Vector2.free(old_smoothed_camera_pos);
    }

    /**
     * @param {number} p_anchor_mode
     */
    set_anchor_mode(p_anchor_mode) {
        this.anchor_mode = p_anchor_mode;
        this._update_scroll();
    }

    /**
     * @param {boolean} p_rotating
     */
    set_rotating(p_rotating) {
        this.rotating = p_rotating;

        let old_smoothed_camera_pos = this.smoothed_camera_pos.clone();
        this._update_scroll();
        this.smoothed_camera_pos.copy(old_smoothed_camera_pos);
        Vector2.free(old_smoothed_camera_pos);
    }

    /**
     * @param {number} p_mode
     */
    set_process_mode(p_mode) {
        if (this.process_mode === p_mode) {
            return;
        }

        this.process_mode = p_mode;
        this._update_process_mode();
    }

    /**
     * @param {boolean} p_smoothing_enabled
     */
    set_smoothing_enabled(p_smoothing_enabled) {
        this.smoothing_enabled = p_smoothing_enabled;
        this._update_scroll();
    }

    /**
     * @param {number} p_smoothing_speed
     */
    set_smoothing_speed(p_smoothing_speed) {
        this.smoothing_speed = p_smoothing_speed;
        if (this.smooth_speed > 0) {
            this.set_process_internal(true);
        } else {
            this.set_process_internal(false);
        }
    }

    /**
     * @param {Vector2Like} p_zoom
     */
    set_zoom(p_zoom) {
        this.set_zoom_n(p_zoom.x, p_zoom.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_zoom_n(x, y) {
        this.zoom.set(x, y);
        let old_smoothed_camera_pos = this.smoothed_camera_pos.clone();
        this._update_scroll();
        this.smoothed_camera_pos.copy(old_smoothed_camera_pos);
        Vector2.free(old_smoothed_camera_pos);
    }

    /* private */

    _update_scroll() {
        if (!this.is_inside_tree()) {
            return;
        }

        if (!this.viewport) {
            return;
        }

        if (this.current) {
            const xform = this.get_camera_transform();
            this.viewport.set_canvas_transform(xform);
            Transform2D.free(xform);

            const rect = this.viewport.get_visible_rect();
            const screen_size = Vector2.create(rect.width, rect.height);
            const screen_offset = (this.anchor_mode === ANCHOR_MODE_DRAG_CENTER ? (screen_size.clone().scale(0.5)) : Vector2.create(0, 0));

            this.get_tree().call_group_flags(GROUP_CALL_REALTIME, this.group_name, '_camera_moved', xform, screen_offset);

            Vector2.free(screen_size);
            Vector2.free(screen_offset);
        }
    }
    _update_process_mode() {
        if (this.process_mode === CAMERA2D_PROCESS_IDLE) {
            this.set_process_internal(true);
            this.set_physics_process_internal(false);
        } else {
            this.set_process_internal(false);
            this.set_physics_process_internal(true);
        }
    }

    /**
     * @param {Camera2D} p_which
     */
    _make_current(p_which) {
        if (p_which === this) {
            this.current = true;
        } else {
            this.current = false;
        }
    }

    get_camera_transform() {
        if (!this.get_tree()) {
            return Transform2D.create();
        }

        const rect = this.viewport.get_visible_rect();
        const screen_size = Vector2.create(rect.width, rect.height);

        const new_camera_pos = this.get_global_transform().get_origin();
        const ret_camera_pos = Vector2.create();

        if (!this.first) {
            if (this.anchor_mode === ANCHOR_MODE_DRAG_CENTER) {
                if (this.drag_margin_h_enabled && this.h_offset_changed) {
                    this.camera_pos.x = clamp(this.camera_pos.x,
                        (new_camera_pos.x - screen_size.x * 0.5 * this.zoom.x * this.drag_margin[MARGIN_RIGHT]),
                        (new_camera_pos.x + screen_size.x * 0.5 * this.zoom.x * this.drag_margin[MARGIN_LEFT])
                    );
                } else {
                    if (this.offset_h < 0) {
                        this.camera_pos.x = new_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[MARGIN_RIGHT] * this.offset_h;
                    } else {
                        this.camera_pos.x = new_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[MARGIN_LEFT] * this.offset_h;
                    }

                    this.h_offset_changed = false;
                }

                if (this.drag_margin_v_enabled && !this.v_offset_changed) {
                    this.camera_pos.y = clamp(this.camera_pos.y,
                        (new_camera_pos.y - screen_size.y * 0.5 * this.zoom.y * this.drag_margin[MARGIN_BOTTOM]),
                        (new_camera_pos.y + screen_size.y * 0.5 * this.zoom.y * this.drag_margin[MARGIN_TOP])
                    );
                } else {
                    if (this.offset_v < 0) {
                        this.camera_pos.y = new_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[MARGIN_TOP] * this.offset_v;
                    } else {
                        this.camera_pos.y = new_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[MARGIN_BOTTOM] * this.offset_v;
                    }

                    this.v_offset_changed = false;
                }
            } else if (this.anchor_mode === ANCHOR_MODE_FIXED_TOP_LEFT) {
                this.camera_pos.copy(new_camera_pos);
            }

            const screen_offset = (this.anchor_mode === ANCHOR_MODE_DRAG_CENTER ? (screen_size.clone().scale(0.5).multiply(this.zoom)) : Vector2.create(0, 0));
            const screen_rect = Rect2.create(
                -screen_offset.x + this.camera_pos.x, -screen_offset.y + this.camera_pos.y,
                screen_size.x * this.zoom.x, screen_size.y * this.zoom.y
            );

            if (this.limit_smoothed) {
                if (screen_rect.x < this.limit[MARGIN_LEFT]) {
                    this.camera_pos.x -= (screen_rect.x - this.limit[MARGIN_LEFT]);
                }

                if (screen_rect.x + screen_rect.width > this.limit[MARGIN_RIGHT]) {
                    this.camera_pos.x -= (screen_rect.x + screen_rect.width - this.limit[MARGIN_RIGHT]);
                }

                if (screen_rect.y + screen_rect.height > this.limit[MARGIN_BOTTOM]) {
                    this.camera_pos.y -= (screen_rect.y + screen_rect.height - this.limit[MARGIN_BOTTOM]);
                }

                if (screen_rect.y < this.limit[MARGIN_TOP]) {
                    this.camera_pos.y -= (screen_rect.y - this.limit[MARGIN_TOP]);
                }
            }

            if (this.smoothing_enabled) {
                const c = this.smoothing_speed * (this.process_mode === CAMERA2D_PROCESS_PHYSICS ? this.get_physics_process_delta_time() : this.get_process_delta_time());
                const pos = this.camera_pos.clone().subtract(this.smoothed_camera_pos).scale(c)
                this.smoothed_camera_pos.add(pos);
                Vector2.free(pos);
                ret_camera_pos.copy(this.smoothed_camera_pos);
            } else {
                ret_camera_pos.copy(this.smoothed_camera_pos.copy(this.camera_pos));
            }
        } else {
            ret_camera_pos.copy(this.smoothed_camera_pos.copy(this.camera_pos.copy(new_camera_pos)));
            this.first = false;
        }

        const screen_offset = (this.anchor_mode === ANCHOR_MODE_DRAG_CENTER ? (screen_size.clone().scale(0.5).multiply(this.zoom)) : Vector2.create(0, 0));

        let angle = this.get_global_transform().get_rotation();
        if (this.rotating) {
            screen_offset.rotate(angle);
        }

        const screen_rect = Rect2.create(
            -screen_offset.x + ret_camera_pos.x, -screen_offset.y + ret_camera_pos.y,
            screen_size.x * this.zoom.x, screen_size.y * this.zoom.y
        );
        if (screen_rect.x < this.limit[MARGIN_LEFT]) {
            screen_rect.x = this.limit[MARGIN_LEFT];
        }
        if (screen_rect.x + screen_rect.width > this.limit[MARGIN_RIGHT]) {
            screen_rect.x = this.limit[MARGIN_RIGHT] - screen_rect.width;
        }
        if (screen_rect.y + screen_rect.height > this.limit[MARGIN_BOTTOM]) {
            screen_rect.y = this.limit[MARGIN_BOTTOM] - screen_rect.height;
        }
        if (screen_rect.y < this.limit[MARGIN_TOP]) {
            screen_rect.y = this.limit[MARGIN_TOP];
        }

        if (!this.offset.is_zero()) {
            screen_rect.x += this.offset.x;
            screen_rect.y += this.offset.y;
        }

        this.camera_screen_center.set(
            screen_rect.x + screen_rect.width * 0.5,
            screen_rect.y + screen_rect.height * 0.5
        );

        const xform = Transform2D.create();
        if (this.rotating) {
            xform.set_rotation(angle);
        }
        xform.scale_basis(this.zoom.x, this.zoom.y);
        xform.tx = screen_rect.x;
        xform.ty = screen_rect.y;

        Rect2.free(screen_rect);
        Vector2.free(screen_offset);
        Vector2.free(ret_camera_pos);
        Vector2.free(screen_size);

        return xform.affine_inverse();
    }
}
node_class_map['Camera2D'] = GDCLASS(Camera2D, Node2D)
