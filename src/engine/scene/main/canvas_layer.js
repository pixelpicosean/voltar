import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import {
    rad2deg,
    deg2rad,
} from "engine/core/math/math_funcs";

import { VSG } from "engine/servers/visual/visual_server_globals";

import {
    Node,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_MOVED_IN_PARENT,
} from "./node";


export class CanvasLayer extends Node {
    /**
     * @type {Vector2}
     */
    get offset() {
        return this.ofs;
    }
    set offset(value) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this.ofs.copy(value);
        this._update_xform();
    }
    /**
     * @param {Vector2} value
     */
    set_offset(value) {
        this.offset = value;
        return this;
    }

    /**
     * @type {number}
     */
    get rotation() {
        return this.rot;
    }
    set rotation(value) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this.rot = value;
        this._update_xform();
    }
    /**
     * @param {number} value
     */
    set_rotation(value) {
        this.rotation = value;
        return this;
    }

    /**
     * @type {number}
     */
    get rotation_degree() {
        return rad2deg(this.rotation);
    }
    set rotation_degree(value) {
        this.rotation = deg2rad(value);
    }
    /**
     * @param {number} value
     */
    set_rotation_degree(value) {
        this.rotation = deg2rad(value);
        return this;
    }

    /**
     * @type {Vector2}
     */
    get scale() {
        return this._scale;
    }
    set scale(value) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this._scale.copy(value);
        this._update_xform();
    }
    /**
     * @param {Vector2} value
     */
    set_scale(value) {
        this.scale = value;
        return this;
    }

    /** @type {boolean} */
    get follow_viewport_enable() {
        return this._follow_viewport_enable;
    }
    set follow_viewport_enable(p_enabled) {
        if (this._follow_viewport_enable === p_enabled) {
            return;
        }

        this._follow_viewport_enable = p_enabled;
        this._update_follow_viewport();
    }

    /** @type {number} */
    get follow_viewport_scale() {
        return this._follow_viewport_scale;
    }
    set follow_viewport_scale(p_scale) {
        this._follow_viewport_scale = p_scale;
        this._update_follow_viewport();
    }

    get custom_viewport() {
        return this._custom_viewport;
    }
    set custom_viewport(/** @type {Node} */p_viewport) {
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
            VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this.layer, this.get_position_in_parent());
            VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this.transform);
        }
    }

    get transform() {
        return this._transform;
    }
    set transform(p_xform) {
        this._transform.copy(p_xform);
        this.locrotscale_dirty = true;
        if (this.viewport) {
            VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this._transform);
        }
    }

    constructor() {
        super();

        this.class = 'CanvasLayer';

        this.locrotscale_dirty = false;
        this.ofs = new Vector2();
        this.rot = 0;
        this._scale = new Vector2(1, 1);

        this.layer = 1;
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

        if (data.transform !== undefined) { }

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
                VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this.layer, this.get_position_in_parent());
                VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this._transform);
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
                    VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this.layer, this.get_position_in_parent());
                }
            } break;
        }
    }

    /* public */

    get_canvas() {
        return this.canvas;
    }

    /* private */

    _update_locrotscale() { }
    _update_xform() { }
    _update_follow_viewport(p_force_exit = false) {
        if (!this.is_inside_tree()) {
            return;
        }
        if (p_force_exit || !this._follow_viewport_enable) {
            VSG.canvas.canvas_set_parent(this.canvas, null, 1);
        } else {
            VSG.canvas.canvas_set_parent(this.canvas, this.vp.world_2d.canvas, this._follow_viewport_scale);
        }
    }
}
node_class_map['CanvasLayer'] = GDCLASS(CanvasLayer, Node)
