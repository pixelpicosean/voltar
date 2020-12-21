import { res_class_map, node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Rect2 } from "engine/core/math/rect2.js";

import { Shape2D } from "../resources/shape_2d.js";
import {
    NOTIFICATION_PARENTED,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_UNPARENTED,
} from "../main/node.js";
import {
    NOTIFICATION_LOCAL_TRANSFORM_CHANGED,
} from "./canvas_item.js";
import { Node2D } from "./node_2d.js";
import { CollisionObject2D } from "./collision_object_2d.js";


export class CollisionShape2D extends Node2D {
    get class() { return 'CollisionShape2D' }

    get disabled() { return this._disabled }
    set disabled(value) { this.set_disabled(value) }

    get one_way_collision() { return this._one_way_collision }
    set one_way_collision(value) { this.set_one_way_collision(value) }

    get one_way_collision_margin() { return this._one_way_collision_margin }
    set one_way_collision_margin(value) { this.set_one_way_collision_margin(value) }

    get shape() { return this._shape }
    set shape(value) { this.set_shape(value) }

    constructor() {
        super();

        /**
         * @type {Shape2D}
         */
        this._shape = null;
        this._disabled = false;
        this._one_way_collision = false;
        this._one_way_collision_margin = 1.0;
        /**
         * @type {import('./collision_object_2d').CollisionObject2D}
         */
        this.parent = null;
        this.rect = new Rect2(-10, -10, 20, 20);

        /** @type {CollisionShape2D | import('./collision_polygon_2d').CollisionPolygon2D} */
        this.shape_owner = null;
    }

    /* virtual */

    _load_data(p_data) {
        super._load_data(p_data);

        if (p_data.shape !== undefined) {
            this.set_shape(p_data.shape);
        }
        if (p_data.disabled !== undefined) {
            this._disabled = p_data.disabled;
        }
        if (p_data.one_way_collision !== undefined) {
            this._one_way_collision = p_data.one_way_collision;
        }
        if (p_data.one_way_collision_margin !== undefined) {
            this._one_way_collision_margin = p_data.one_way_collision_margin;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_PARENTED: {
                this.parent = /** @type {CollisionObject2D} */(this.get_parent());
                if (this.parent.is_collision_object) {
                    // owner is also self
                    this.shape_owner = this.parent.create_shape_owner(this);
                    if (this._shape) {
                        this.parent.shape_owner_add_shape(this.shape_owner, this._shape);
                    }
                    this._update_in_shape_owner();
                } else {
                    this.parent = null;
                }
            } break;
            case NOTIFICATION_ENTER_TREE: {
                if (this.parent) {
                    this._update_in_shape_owner();
                }
            } break;
            case NOTIFICATION_LOCAL_TRANSFORM_CHANGED: {
                if (this.parent) {
                    this._update_in_shape_owner(true);
                }
            } break;
            case NOTIFICATION_UNPARENTED: {
                if (this.parent) {
                    this.parent.remove_shape_owner(this);
                }
                this.shape_owner = null;
                this.parent = null;
            } break;
        }
    }

    /* public */

    /**
     * @param {Shape2D} p_shape
     */
    set_shape(p_shape) {
        this._shape = p_shape;
        this.update();
        if (this.parent) {
            this.parent.shape_owner_clear_shapes(this.shape_owner);
            if (this._shape) {
                this.parent.shape_owner_add_shape(this.shape_owner, this._shape);
            }
        }
    }

    /**
     * @param {boolean} p_disabled
     */
    set_disabled(p_disabled) {
        this._disabled = p_disabled;
        this.update();
        if (this.parent) {
            this.parent.shape_owner_set_disabled(this.shape_owner, p_disabled);
        }
    }

    /**
     * @param {boolean} p_one_way_collision
     */
    set_one_way_collision(p_one_way_collision) {
        this._one_way_collision = p_one_way_collision;
        this.update();
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision(this.shape_owner, p_one_way_collision);
        }
    }

    /**
     * @param {number} p_one_way_collision_margin
     */
    set_one_way_collision_margin(p_one_way_collision_margin) {
        this._one_way_collision_margin = p_one_way_collision_margin;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision_margin(this.shape_owner, p_one_way_collision_margin);
        }
    }

    /* private */

    /**
     * @param {boolean} [p_xform_only]
     */
    _update_in_shape_owner(p_xform_only = false) {
        this.parent.shape_owner_set_transform(this.shape_owner, this.get_transform());
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this.shape_owner, this._disabled);
        this.parent.shape_owner_set_one_way_collision(this.shape_owner, this._one_way_collision);
        this.parent.shape_owner_set_one_way_collision_margin(this.shape_owner, this._one_way_collision_margin);
    }
}
node_class_map['CollisionShape2D'] = GDCLASS(CollisionShape2D, Node2D)
