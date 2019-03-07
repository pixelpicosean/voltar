import Node2D, { PauseMode } from "../node_2d";
import World2D from "../resources/world_2d";
import { Vector2, Matrix, Rectangle } from "engine/core/math/index";

export default class Viewport extends Node2D {
    constructor() {
        super();

        this.type = 'Viewport';

        this._pause_mode = PauseMode.STOP;
        this.pause_owner = this;

        this.is_inside_tree = true;
        this._is_ready = true;

        this.canvas_transform = new Matrix();
        this.global_canvas_transform = new Matrix();
        this.stretch_transform = new Matrix();

        this.size = new Vector2();
        this.to_screen_rect = new Vector2();

        this.size_override = false;
        this.size_override_stretch = false;
        this.size_override_size = new Vector2();
        this.size_override_margin = new Vector2();

        /**
         * @type {World2D}
         */
        this.world_2d = null;
    }

    /**
     * @param {number} p_delta
     */
    update_worlds(p_delta) {
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
        } else if (this.parent) {
            // TODO: this.parent.find_world_2d();
            return null;
        } else {
            return null;
        }
    }

    _propagate_enter_world() { }
    _propagate_exit_world() { }
    _propagate_viewport_notification() { }

    _update_stretch_transform() { }
    _update_global_transform() { }
}

/**
 * @enum {number}
 */
export const UpdateMode = {
    DISABLED: 0,
    ONCE: 1,
    WHEN_VISIBLE: 2,
    ALWAYS: 3,
}

/**
 * @enum {number}
 */
export const Usage = {
    '2D': 0,
    '2D_NO_SAMPLING': 1,
    '3D': 2,
    '3D_NO_EFFECTS': 3,
}
