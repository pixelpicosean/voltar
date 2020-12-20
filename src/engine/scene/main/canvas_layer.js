import { node_class_map } from "engine/registry.js";
import { GDCLASS } from "engine/core/v_object.js";
import { Vector2 } from "engine/core/math/vector2.js";
import { Transform2D } from "engine/core/math/transform_2d.js";
import {
    rad2deg,
    deg2rad,
} from "engine/core/math/math_funcs.js";

import { VSG } from "engine/servers/visual/visual_server_globals.js";

import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_MOVED_IN_PARENT,
} from "./node.js";
import { Rect2 } from "engine/core/math/rect2.js";


export class CanvasLayer extends Node {
    get class() { return 'CanvasLayer' }

    get custom_viewport() { return this._custom_viewport }
    set custom_viewport(value) { this.set_custom_viewport(value) }

    get follow_viewport_enable() { return this._follow_viewport_enable }
    set follow_viewport_enable(value) { this.set_follow_viewport_enable(value) }

    get follow_viewport_scale() { return this._follow_viewport_scale }
    set follow_viewport_scale(value) { this.set_follow_viewport_scale(value) }

    get layer() { return this._layer }
    set layer(value) { this.set_layer(value) }

    get offset() { return this._offset }
    set offset(value) { this.set_offset(value) }

    get rotation() { return this._rotation }
    set rotation(value) { this.set_rotation(value) }

    get rotation_degrees() { return rad2deg(this._rotation) }
    set rotation_degrees(value) { this.set_rotation(deg2rad(value)) }

    get scale() { return this._scale }
    set scale(value) { this.set_scale(value) }

    get transform() { return this._transform }
    set transform(value) { this.set_transform(value) }

    constructor() {
        super();

        this.locrotscale_dirty = false;
        this._offset = new Vector2();
        this._rotation = 0;
        this._scale = new Vector2(1, 1);

        this._layer = 1;
        this._transform = new Transform2D();
        this.canvas = VSG.canvas.canvas_create();

        /** @type {import('./viewport').Viewport} */
        this._custom_viewport = null;

        this.viewport = null;
        /** @type {import('./viewport').Viewport} */
        this.vp = null;

        this._follow_viewport_enable = false;
        this._follow_viewport_scale = 1.0;

        this.sort_index = 0;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.transform !== undefined) {
            this.set_transform(data.transform);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (this._custom_viewport) {
                    this.vp = this._custom_viewport;
                } else {
                    this.vp = this.data.viewport;
                }

                this.vp._canvas_layer_add(this);
                this.viewport = this.vp.get_viewport_rid();

                VSG.viewport.viewport_attach_canvas(this.viewport, this.canvas);
                VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this._layer, this.get_position_in_parent());
                VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this.transform);
                this._update_follow_viewport();
            } break;
            case NOTIFICATION_EXIT_TREE: {
                this.vp._canvas_layer_remove(this);
                VSG.viewport.viewport_remove_canvas(this.viewport, this.canvas);
                this.viewport = null;
                this._update_follow_viewport(false);
            } break;
            case NOTIFICATION_MOVED_IN_PARENT: {
                if (this.is_inside_tree()) {
                    VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this._layer, this.get_position_in_parent());
                }
            } break;
        }
    }

    /* public */

    /**
     * @param {number} p_layer
     */
    set_layer(p_layer) {
        this._layer = p_layer;
        if (this.viewport) {
            VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this._layer, this.get_position_in_parent());
        }
    }

    /**
     * @param {Vector2} value
     */
    set_offset(value) {
        this.set_offset_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_offset_n(x, y) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this._offset.set(x, y);
        this._update_xform();
    }
    reset_sort_index() {
        this.sort_index = 0;
    }

    /**
     * @param {number} value
     */
    set_rotation(value) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this._rotation = value;
        this._update_xform();
    }

    /**
     * @param {number} value
     */
    set_rotation_degree(value) {
        this._rotation = deg2rad(value);
    }

    /**
     * @param {Vector2} value
     */
    set_scale(value) {
        this.set_scale_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scale_n(x, y) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this._scale.set(x, y);
        this._update_xform();
    }

    /**
     * @param {boolean} p_enabled
     */
    set_follow_viewport_enable(p_enabled) {
        if (this._follow_viewport_enable === p_enabled) {
            return;
        }

        this._follow_viewport_enable = p_enabled;
        this._update_follow_viewport();
    }

    /**
    * @param {number} p_scale
    */
    set_follow_viewport_scale(p_scale) {
        this._follow_viewport_scale = p_scale;
        this._update_follow_viewport();
    }

    /**
     * @param {Node} p_viewport
     */
    set_custom_viewport(p_viewport) {
        if (this.is_inside_tree()) {
            this.vp._canvas_layer_remove(this);
            VSG.viewport.viewport_remove_canvas(this.viewport, this.canvas);
            this.viewport = null;
        }

        if (p_viewport.class === 'Viewport') {
            this._custom_viewport = /** @type {import('./viewport').Viewport} */(p_viewport);
        } else {
            this._custom_viewport = null;
        }

        if (this.is_inside_tree()) {
            if (this._custom_viewport) {
                this.vp = this._custom_viewport;
            } else {
                this.vp = this.data.viewport;
            }

            this.vp._canvas_layer_add(this);
            this.viewport = this.vp.get_viewport_rid();

            VSG.viewport.viewport_attach_canvas(this.viewport, this.canvas);
            VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this._layer, this.get_position_in_parent());
            VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this.transform);
        }
    }

    /**
     * @param {Transform2D} p_xform
     */
    set_transform(p_xform) {
        this.transform.copy(p_xform);
        this.locrotscale_dirty = true;
        if (this.viewport) {
            VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this.transform);
        }
    }

    // @ts-ignore
    get_viewport() {
        return this.viewport;
    }
    get_viewport_size() {
        if (!this.is_inside_tree()) {
            return Vector2.new(1, 1);
        }
        const rect = this.vp.get_visible_rect();
        const r = Vector2.new(rect.width, rect.height);
        Rect2.free(rect);
        return r;
    }

    /* private */

    _update_locrotscale() {
        this._offset.set(this.transform.tx, this.transform.ty);
        this._rotation = this.transform.get_rotation();
        this.transform.get_scale(this._scale);
    }
    _update_xform() {
        this.transform.set_rotation_and_scale(this._rotation, this._scale);
    }
    _update_follow_viewport(p_force_exit = false) {
        if (!this.is_inside_tree()) {
            return;
        }
        if (p_force_exit || !this._follow_viewport_enable) {
            VSG.canvas.canvas_set_parent(this.canvas, null, 1);
        } else {
            VSG.canvas.canvas_set_parent(this.canvas, this.vp._world_2d.canvas, this._follow_viewport_scale);
        }
    }
}
node_class_map['CanvasLayer'] = GDCLASS(CanvasLayer, Node)
