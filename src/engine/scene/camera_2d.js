import Node2D from './node_2d';
import { Vector2, Matrix, clamp, Rectangle } from 'engine/math/index';
import { Margin } from './controls/const';
import { node_class_map } from 'engine/registry';

/**
 * @enum {number}
 */
export const AnchorMode = {
    FIXED_TOP_LEFT: 0,
    DRAG_CENTER: 1,
}

/**
 * @enum {number}
 */
export const Camera2DProcessMode = {
    PHYSICS: 0,
    IDLE: 1,
}

export default class Camera2D extends Node2D {
    get drag_margin_left() {
        return this.drag_margin[Margin.Left];
    }
    set drag_margin_left(value) {
        this.drag_margin[Margin.Left] = value;
    }

    get drag_margin_right() {
        return this.drag_margin[Margin.Right];
    }
    set drag_margin_right(value) {
        this.drag_margin[Margin.Right] = value;
    }

    get drag_margin_top() {
        return this.drag_margin[Margin.Top];
    }
    set drag_margin_top(value) {
        this.drag_margin[Margin.Top] = value;
    }

    get drag_margin_bottom() {
        return this.drag_margin[Margin.Bottom];
    }
    set drag_margin_bottom(value) {
        this.drag_margin[Margin.Bottom] = value;
    }

    get limit_left() {
        return this.limit[Margin.Left];
    }
    set limit_left(value) {
        this.limit[Margin.Left] = value;
    }

    get limit_right() {
        return this.limit[Margin.Right];
    }
    set limit_right(value) {
        this.limit[Margin.Right] = value;
    }

    get limit_top() {
        return this.limit[Margin.Top];
    }
    set limit_top(value) {
        this.limit[Margin.Top] = value;
    }

    get limit_bottom() {
        return this.limit[Margin.Bottom];
    }
    set limit_bottom(value) {
        this.limit[Margin.Bottom] = value;
    }

    get current() {
        return this._current;
    }
    set current(value) {
        this._current = value;
        // TODO: set current
    }

    constructor() {
        super();

        this.type = 'Camera2D';

        this.anchor_mode = AnchorMode.DRAG_CENTER;
        this._current = false;
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
        this.process_mode = Camera2DProcessMode.IDLE;
        this.rotating = false;
        this.smoothing_enabled = false;
        this.smoothing_speed = 5;
        this.zoom = new Vector2(1, 1);

        this.first = true;
        this.camera_pos = new Vector2();
        this.smoothed_camera_pos = new Vector2();
        this.camera_screen_center = new Vector2();
    }

    _load_data(data) {
        super._load_data(data);

        if (data.anchor_mode !== undefined) this.anchor_mode = data.anchor_mode;
        if (data.current !== undefined) this.current = data.current;

        if (data.drag_margin_left !== undefined) this.drag_margin_left = data.drag_margin_left;
        if (data.drag_margin_right !== undefined) this.drag_margin_right = data.drag_margin_right;
        if (data.drag_margin_top !== undefined) this.drag_margin_top = data.drag_margin_top;
        if (data.drag_margin_bottom !== undefined) this.drag_margin_bottom = data.drag_margin_bottom;

        if (data.drag_margin_h_enabled !== undefined) this.drag_margin_h_enabled = data.drag_margin_h_enabled;
        if (data.drag_margin_v_enabled !== undefined) this.drag_margin_v_enabled = data.drag_margin_v_enabled;

        if (data.limit_left !== undefined) this.limit_left = data.limit_left;
        if (data.limit_right !== undefined) this.limit_right = data.limit_right;
        if (data.limit_top !== undefined) this.limit_top = data.limit_top;
        if (data.limit_bottom !== undefined) this.limit_bottom = data.limit_bottom;

        if (data.limit_smoothed !== undefined) this.limit_smoothed = data.limit_smoothed;

        if (data.offset !== undefined) this.offset.copy(data.offset);
        if (data.offset_h !== undefined) this.offset_h = data.offset_h;
        if (data.offset_v !== undefined) this.offset_v = data.offset_v;

        if (data.process_mode !== undefined) this.process_mode = data.process_mode;

        if (data.rotating !== undefined) this.rotating = data.rotating;

        if (data.smooth_enabled !== undefined) this.smooth_enabled = data.smooth_enabled;
        if (data.smooth_speed !== undefined) this.smooth_speed = data.smooth_speed;

        if (data.zoom !== undefined) this.zoom.copy(data.zoom);

        return this;
    }

    align() {
        const screen_size = this.scene_tree.viewport_rect.size;

        const current_camera_pos = this.get_global_position();
        if (this.anchor_mode === AnchorMode.DRAG_CENTER) {
            if (this.offset_h < 0) {
                this.camera_pos.x = current_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[Margin.Right] * this.offset_h;
            } else {
                this.camera_pos.x = current_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[Margin.Left] * this.offset_h;
            }
            if (this.offset_v < 0) {
                this.camera_pos.y = current_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[Margin.Top] * this.offset_v;
            } else {
                this.camera_pos.y = current_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[Margin.Bottom] * this.offset_v;
            }
        } else if (this.anchor_mode === AnchorMode.FIXED_TOP_LEFT) {
            this.camera_pos.copy(current_camera_pos);
        }

        this._udpate_scroll();
    }

    clear_current() {
        this.current = false;
    }

    force_update_scroll() {
        this._udpate_scroll();
    }

    get_camera_position() {
        return this.camera_pos;
    }

    get_camera_screen_center() {
        return this.camera_screen_center;
    }

    make_current() {
        if (!this.scene_tree) {
            this.current = true;
        }
        this._udpate_scroll();
    }

    reset_smoothing() {
        this.smoothed_camera_pos.copy(this.camera_pos);
        this._udpate_scroll();
    }

    _propagate_enter_tree() {
        super._propagate_enter_tree();

        this._udpate_scroll();
        this.first = true;
    }
    _propagate_exit_tree() {
        if (this.current) {
            this.scene_tree.viewport.canvas_transform.set(1, 0, 0, 1, 0, 0);
        }

        super._propagate_exit_tree();
    }

    /**
     * @param {number} delta
     */
    _propagate_process(delta) {
        super._propagate_process(delta);

        if (this.process_mode === Camera2DProcessMode.PHYSICS) {
            return;
        }

        this._udpate_scroll();
    }

    /**
     * @param {number} delta
     */
    _propagate_physics_process(delta) {
        super._propagate_physics_process(delta);

        if (this.process_mode !== Camera2DProcessMode.PHYSICS) {
            return;
        }

        this._udpate_scroll();
    }

    _udpate_scroll() {
        if (!this.scene_tree) {
            return;
        }

        if (this.current) {
            this.scene_tree.viewport.canvas_transform.copy(this.get_camera_transform());
        }
    }

    get_camera_transform() {
        if (!this.scene_tree) {
            return Matrix.IDENTITY;
        }

        const screen_size = this.scene_tree.viewport_rect.size;

        const new_camera_pos = this.get_global_position();
        const ret_camera_pos = new Vector2();

        if (!this.first) {
            if (this.anchor_mode === AnchorMode.DRAG_CENTER) {
                if (this.drag_margin_h_enabled) {
                    this.camera_pos.x = clamp(this.camera_pos.x,
                        (new_camera_pos.x - screen_size.x * 0.5 * this.zoom.x * this.drag_margin[Margin.Right]),
                        (new_camera_pos.x + screen_size.x * 0.5 * this.zoom.x * this.drag_margin[Margin.Left])
                    );
                } else {
                    if (this.offset_h < 0) {
                        this.camera_pos.x = new_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[Margin.Right] * this.offset_h;
                    } else {
                        this.camera_pos.x = new_camera_pos.x + screen_size.x * 0.5 * this.drag_margin[Margin.Left] * this.offset_h;
                    }
                }

                if (this.drag_margin_v_enabled) {
                    this.camera_pos.y = clamp(this.camera_pos.y,
                        (new_camera_pos.y - screen_size.y * 0.5 * this.zoom.y * this.drag_margin[Margin.Bottom]),
                        (new_camera_pos.y + screen_size.y * 0.5 * this.zoom.y * this.drag_margin[Margin.Top])
                    );
                } else {
                    if (this.offset_v < 0) {
                        this.camera_pos.y = new_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[Margin.Top] * this.offset_v;
                    } else {
                        this.camera_pos.y = new_camera_pos.y + screen_size.y * 0.5 * this.drag_margin[Margin.Bottom] * this.offset_v;
                    }
                }
            } else if (this.anchor_mode === AnchorMode.FIXED_TOP_LEFT) {
                this.camera_pos.copy(new_camera_pos);
            }

            const screen_offset = (this.anchor_mode === AnchorMode.DRAG_CENTER ? (screen_size.clone().scale(0.5).multiply(this.zoom)) : Vector2.new(0, 0));
            const screen_rect = Rectangle.new(
                -screen_offset.x + this.camera_pos.x, -screen_offset.y + this.camera_pos.y,
                screen_size.x * this.zoom.x, screen_size.y * this.zoom.y
            );

            if (!this.offset.is_zero()) {
                screen_rect.x += this.offset.x;
                screen_rect.y += this.offset.y;
            }

            if (this.limit_smoothed) {
                if (screen_rect.x < this.limit[Margin.Left]) {
                    this.camera_pos.x -= (screen_rect.x - this.limit[Margin.Left]);
                }

                if (screen_rect.x + screen_rect.width > this.limit[Margin.Right]) {
                    this.camera_pos.x -= (screen_rect.x + screen_rect.width - this.limit[Margin.Right]);
                }

                if (screen_rect.y + screen_rect.height > this.limit[Margin.Bottom]) {
                    this.camera_pos.y -= (screen_rect.y + screen_rect.height - this.limit[Margin.Bottom]);
                }

                if (screen_rect.y < this.limit[Margin.Top]) {
                    this.camera_pos.y -= (screen_rect.y - this.limit[Margin.Top]);
                }
            }

            if (this.smoothing_enabled) {
                const c = this.smoothing_speed * (this.process_mode === Camera2DProcessMode.PHYSICS ? this.scene_tree.physics_process_time : this.scene_tree.idle_process_time);
                this.smoothed_camera_pos.add(this.camera_pos.clone().subtract(this.smoothed_camera_pos).scale(c));
                ret_camera_pos.copy(this.smoothed_camera_pos);
            } else {
                ret_camera_pos.copy(this.smoothed_camera_pos.copy(this.camera_pos));
            }
        } else {
            ret_camera_pos.copy(this.smoothed_camera_pos.copy(this.camera_pos.copy(new_camera_pos)));
            this.first = false;
        }

        const screen_offset = (this.anchor_mode === AnchorMode.DRAG_CENTER ? (screen_size.clone().scale(0.5).multiply(this.zoom)) : Vector2.new(0, 0));

        let angle = this.get_global_transform().rotation;
        if (this.rotating) {
            screen_offset.rotate(angle);
        }

        const screen_rect = Rectangle.new(
            -screen_offset.x + ret_camera_pos.x, -screen_offset.y + ret_camera_pos.y,
            screen_size.x * this.zoom.x, screen_size.y * this.zoom.y
        );
        if (screen_rect.x < this.limit[Margin.Left]) {
            screen_rect.x = this.limit[Margin.Left];
        }
        if (screen_rect.x + screen_rect.width > this.limit[Margin.Right]) {
            screen_rect.x = this.limit[Margin.Right] - screen_rect.width;
        }
        if (screen_rect.y + screen_rect.height > this.limit[Margin.Bottom]) {
            screen_rect.y = this.limit[Margin.Bottom] - screen_rect.height;
        }
        if (screen_rect.y < this.limit[Margin.Top]) {
            screen_rect.y = this.limit[Margin.Top];
        }

        if (!this.offset.is_zero()) {
            screen_rect.x += this.offset.x;
            screen_rect.y += this.offset.y;
            if (screen_rect.x < this.limit[Margin.Left]) {
                screen_rect.x = this.limit[Margin.Left];
            }
            if (screen_rect.x + screen_rect.width > this.limit[Margin.Right]) {
                screen_rect.x = this.limit[Margin.Right] - screen_rect.width;
            }
            if (screen_rect.y + screen_rect.height > this.limit[Margin.Bottom]) {
                screen_rect.y = this.limit[Margin.Bottom] - screen_rect.height;
            }
            if (screen_rect.y < this.limit[Margin.Top]) {
                screen_rect.y = this.limit[Margin.Top];
            }
        }

        this.camera_screen_center.set(
            screen_rect.x + screen_rect.width * 0.5,
            screen_rect.y + screen_rect.height * 0.5
        );

        const xform = Matrix.new();
        if (this.rotating) {
            xform.set_rotation(angle);
        }
        xform.scale_basis(this.zoom.x, this.zoom.y);
        xform.tx = screen_rect.x;
        xform.ty = screen_rect.y;

        return xform.affine_inverse();
    }
}

node_class_map['Camera2D'] = Camera2D;
