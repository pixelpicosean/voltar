import Node2D from "../Node2D";
import Shape2D from "../resources/shape_2d";
import { Rectangle } from "engine/math/index";
import CollisionObject2D from "./collision_object_2d";

export default class CollisionShape2D extends Node2D {
    get shape() {
        return this._shape;
    }
    set shape(p_shape) {
        this._shape = p_shape;
        if (this.parent) {
            this.parent.shape_owner_clear_shapes(this.owner_id);
            if (this._shape) {
                this.parent.shape_owner_add_shape(this.owner_id, this.shape);
            }
        }
    }

    constructor() {
        super();

        this.type = 'CollisionShape2D';

        /**
         * @type {Shape2D}
         */
        this._shape = null;
        this._disabled = false;
        this._one_way_collision = false;
        this.owner_id = 0;
        /**
         * @type {CollisionObject2D}
         */
        this.parent = null;
        this.rect = new Rectangle(-10, -10, 20, 20);
    }
    _propagate_parent() {
        if (this.parent.is_collision_object) {
            this.owner_id = this.parent.create_shape_owner(this);
            if (this._shape) {
                this.parent.shape_owner_add_shape(this.owner_id, this._shape);
            }
            this._update_in_shape_owner();
        }
    }
    _propagate_unparent() {
        if (this.parent) {
            this.parent.remove_shape_owner(this.owner_id);
        }
        this.owner_id = 0;
        this.parent = null;
    }
    _propagate_enter_tree() {
        super._propagate_enter_tree();

        if (this.parent) {
            this._update_in_shape_owner();
        }
    }

    // TODO: call `_update_in_shape_owner` when "local transform changed"

    /**
     * @param {boolean} [p_xform_only]
     */
    _update_in_shape_owner(p_xform_only = false) {
        this.parent.shape_owner_set_transform(this.owner_id, this.transform.local_transform);
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this.owner_id, this._disabled);
        this.parent.shape_owner_set_one_way_collision(this.owner_id, this._one_way_collision);
    }
}
