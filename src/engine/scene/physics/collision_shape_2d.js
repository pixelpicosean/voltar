import Node2D from "../node_2d";
import Shape2D from "../resources/shape_2d";
import { Rectangle } from "engine/core/math/index";
import { res_class_map } from "engine/registry";

export default class CollisionShape2D extends Node2D {
    get shape() {
        return this._shape;
    }
    /**
     * @param {Shape2D} p_shape
     */
    set shape(p_shape) {
        this._shape = p_shape;
        if (this.parent) {
            this.parent.shape_owner_clear_shapes(this);
            if (this._shape) {
                this.parent.shape_owner_add_shape(this.owner, this._shape);
            }
        }
    }
    /**
     * @param {Shape2D} p_shape
     */
    set_shape(p_shape) {
        this.shape = p_shape;
        return this;
    }

    get disabled() {
        return this._disabled;
    }
    /**
     * @param {boolean} p_disabled
     */
    set disabled(p_disabled) {
        this._disabled = p_disabled;
        if (this.parent) {
            this.parent.shape_owner_set_disabled(this.owner, p_disabled);
        }
    }
    /**
     * @param {boolean} p_disabled
     */
    set_disabled(p_disabled) {
        this.disabled = p_disabled;
        return this;
    }

    get one_way_collision() {
        return this._one_way_collision;
    }
    /**
     * @param {boolean} p_one_way_collision
     */
    set one_way_collision(p_one_way_collision) {
        this._one_way_collision = p_one_way_collision;
        if (this.parent) {
            this.parent.shape_owner_set_one_way_collision(this.owner, p_one_way_collision);
        }
    }
    /**
     * @param {boolean} p_one_way_collision
     */
    set_one_way_collision(p_one_way_collision) {
        this.one_way_collision = p_one_way_collision;
        return this;
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
        /**
         * @type {import('./collision_object_2d').default}
         */
        this.parent = null;
        this.rect = new Rectangle(-10, -10, 20, 20);
    }
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

        return this;
    }

    _propagate_parent() {
        if (this.parent.is_collision_object) {
            this.owner = this.parent.create_shape_owner(this);
            if (this._shape) {
                this.parent.shape_owner_add_shape(this.owner, this._shape);
            }
            this._update_in_shape_owner();
        }
    }
    _propagate_unparent() {
        if (this.parent) {
            this.parent.remove_shape_owner(this);
        }
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
        this.transform.update_local_transform();
        this.parent.shape_owner_set_transform(this, this.transform.local_transform);
        if (p_xform_only) {
            return;
        }
        this.parent.shape_owner_set_disabled(this, this._disabled);
        this.parent.shape_owner_set_one_way_collision(this, this._one_way_collision);
    }
}
