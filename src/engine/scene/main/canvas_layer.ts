import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
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

type Viewport = import("./viewport").Viewport;
type Viewport_t = import("engine/servers/visual/visual_server_viewport.js").Viewport_t;

export class CanvasLayer extends Node {
    get class() { return 'CanvasLayer' }

    locrotscale_dirty = false;
    offset = new Vector2;
    rotation = 0;
    scale = new Vector2(1, 1);

    layer = 1;
    transform = new Transform2D;
    canvas = VSG.canvas.canvas_create();

    // @Incomplete: custom viewport
    custom_viewport: Viewport = null;
    custom_viewport_id = 0;

    viewport: Viewport_t = null;
    vp: Viewport = null;

    follow_viewport_enable = false;
    follow_viewport_scale = 1.0;

    sort_index = 0;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.transform !== undefined) {
            this.set_transform(data.transform);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (this.custom_viewport) {
                    this.vp = this.custom_viewport;
                } else {
                    this.vp = super.get_viewport();
                }

                this.vp._canvas_layer_add(this);
                this.viewport = this.vp.get_viewport_rid();

                VSG.viewport.viewport_attach_canvas(this.viewport, this.canvas);
                VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this.layer, this.get_position_in_parent());
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
                    VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this.layer, this.get_position_in_parent());
                }
            } break;
        }
    }

    /* public */

    /**
     * @param {number} p_layer
     */
    set_layer(p_layer: number) {
        this.layer = p_layer;
        if (this.viewport) {
            VSG.viewport.viewport_set_canvas_stacking(this.viewport, this.canvas, this.layer, this.get_position_in_parent());
        }
    }

    /**
     * @param {Vector2} value
     */
    set_offset(value: Vector2) {
        this.set_offset_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_offset_n(x: number, y: number) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this.offset.set(x, y);
        this._update_xform();
    }
    get_offset() {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        return this.offset;
    }

    reset_sort_index() {
        this.sort_index = 0;
    }

    /**
     * @param {number} value
     */
    set_rotation(value: number) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this.rotation = value;
        this._update_xform();
    }
    /**
     * @param {number} value
     */
    set_rotation_degrees(value: number) {
        this.rotation = deg2rad(value);
    }
    get_rotation() {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        return this.rotation;
    }
    get_rotation_degrees() {
        rad2deg(this.get_rotation());
    }

    /**
     * @param {Vector2} value
     */
    set_scale(value: Vector2) {
        this.set_scale_n(value.x, value.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_scale_n(x: number, y: number) {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        this.scale.set(x, y);
        this._update_xform();
    }
    get_scale() {
        if (this.locrotscale_dirty) {
            this._update_locrotscale();
        }
        return this.scale;
    }

    /**
     * @param {boolean} p_enabled
     */
    set_follow_viewport_enable(p_enabled: boolean) {
        if (this.follow_viewport_enable === p_enabled) {
            return;
        }

        this.follow_viewport_enable = p_enabled;
        this._update_follow_viewport();
    }

    /**
    * @param {number} p_scale
    */
    set_follow_viewport_scale(p_scale: number) {
        this.follow_viewport_scale = p_scale;
        this._update_follow_viewport();
    }

    /**
     * @param {Node} p_viewport
     */
    set_custom_viewport(p_viewport: Node) {
        if (this.is_inside_tree()) {
            this.vp._canvas_layer_remove(this);
            VSG.viewport.viewport_remove_canvas(this.viewport, this.canvas);
            this.viewport = null;
        }

        if (p_viewport.class === 'Viewport') {
            this.custom_viewport = p_viewport as Viewport;
        } else {
            this.custom_viewport = null;
        }

        if (this.is_inside_tree()) {
            if (this.custom_viewport) {
                this.vp = this.custom_viewport;
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

    /**
     * @param {Transform2D} p_xform
     */
    set_transform(p_xform: Transform2D) {
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
            return Vector2.create(1, 1);
        }
        const rect = this.vp.get_visible_rect();
        const r = Vector2.create(rect.width, rect.height);
        Rect2.free(rect);
        return r;
    }

    /* private */

    _update_locrotscale() {
        this.offset.set(this.transform.tx, this.transform.ty);
        this.rotation = this.transform.get_rotation();
        this.transform.get_scale(this.scale);
        this.locrotscale_dirty = false;
    }
    _update_xform() {
        this.transform.set_rotation_and_scale(this.rotation, this.scale);
        this.transform.set_origin(this.offset);
        if (this.viewport) {
            VSG.viewport.viewport_set_canvas_transform(this.viewport, this.canvas, this.transform);
        }
    }
    _update_follow_viewport(p_force_exit = false) {
        if (!this.is_inside_tree()) {
            return;
        }
        if (p_force_exit || !this.follow_viewport_enable) {
            VSG.canvas.canvas_set_parent(this.canvas, null, 1);
        } else {
            VSG.canvas.canvas_set_parent(this.canvas, this.vp.world_2d.canvas, this.follow_viewport_scale);
        }
    }
}
node_class_map['CanvasLayer'] = GDCLASS(CanvasLayer, Node)
