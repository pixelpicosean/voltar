import { res_class_map } from "engine/registry";
import { Rect2 } from "engine/core/math/rect2";

import { Node2D } from "../2d/node_2d";
import {
    NOTIFICATION_PARENTED,
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_UNPARENTED,
} from "../main/node";
import {
    NOTIFICATION_LOCAL_TRANSFORM_CHANGED,
} from "../2d/canvas_item";
import { Shape2D } from "../resources/shape_2d";


export class CollisionShape2D extends Node2D {
    get class() { return 'CollisionShape2D' }

    /**
     * @param {Shape2D} p_shape
     */
    set_shape(p_shape) {
        this.shape = p_shape;
        if (this.parent) {
            this.parent.shape_owner_clear_shapes(this.owner);
            if (this.shape) {
                this.parent.shape_owner_add_shape(this.owner, this.shape);
            }
        }
    }

    /**
     * @param {boolean} p_disabled
     */
    set_disabled(p_disabled) {
        this.disabled = p_disabled;
        if (this.parent) {
            this.parent.shape_owner_set_disabled(this.owner, p_disabled);
        }
    }

    /**
     * @param {boolean} p_one_way_collision
     */
    set_one_way_collision(p_one_way_collision) {
        this.one_way_collision = p_one_way_collision;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision(this.owner, p_one_way_collision);
        }
    }

    /**
     * @param {number} p_one_way_collision_margin
     */
    set_one_way_collision_margin(p_one_way_collision_margin) {
        this.one_way_collision_margin = p_one_way_collision_margin;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision_margin(this.owner, p_one_way_collision_margin);
        }
    }

    constructor() {
        super();

        /**
         * @type {Shape2D}
         */
        this.shape = null;
        this.disabled = false;
        this.one_way_collision = false;
        this.one_way_collision_margin = 1.0;
        /**
         * @type {import('./collision_object_2d').CollisionObject2D}
         */
        this.parent = null;
        this.rect = new Rect2(-10, -10, 20, 20);

        /** @type {CollisionShape2D | import('./collision_polygon_2d').CollisionPolygon2D} */
        this.owner = null;
    }

    /* virtual */

    _load_data(p_data) {
        super._load_data(p_data);

        if (p_data.shape !== undefined) {
            // @ts-ignore
            this.set_shape(new res_class_map[p_data.shape.type]()._load_data(p_data.shape));
        }
        if (p_data.disabled !== undefined) {
            this.disabled = p_data.disabled;
        }
        if (p_data.one_way_collision !== undefined) {
            this.one_way_collision = p_data.one_way_collision;
        }
        if (p_data.one_way_collision_margin !== undefined) {
            this.one_way_collision_margin = p_data.one_way_collision_margin;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_PARENTED: {
                const parent = this.get_parent();
                if (parent.is_collision_object) {
                    this.owner = this.parent.create_shape_owner(this);
                    if (this.shape) {
                        this.parent.shape_owner_add_shape(this.owner, this.shape);
                    }
                    this._update_in_shape_owner();
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
                    this.parent.remove_shape_owner(this.owner);
                }
                this.owner = null;
                this.parent = null;
            } break;
        }
    }

    /* private */

    /**
     * @param {boolean} [p_xform_only]
     */
    _update_in_shape_owner(p_xform_only = false) {
        this.parent.shape_owner_set_transform(this.owner, this.get_transform());
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this.owner, this.disabled);
        this.parent.shape_owner_set_one_way_collision(this.owner, this.one_way_collision);
        this.parent.shape_owner_set_one_way_collision_margin(this.owner, this.one_way_collision_margin);
    }
}
