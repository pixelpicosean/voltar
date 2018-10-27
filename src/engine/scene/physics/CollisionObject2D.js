import Node2D from '../Node2D';
import CollisionShape2D from './CollisionShape2D';
import { remove_items } from 'engine/dep/index';

/** @enum {number} */
export const CollisionObjectTypes = {
    NONE: 0,
    AREA: 1,
    RIGID: 2,
    KINEMATIC: 3,
    STATIC: 4,
};

export default class CollisionObject2D extends Node2D {
    /**
     * @returns {number}
     */
    get_collision_layer() {
        return this.collision_layer;
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     */
    get_collision_layer_bit(bit) {
        return this.collision_layer & (1 << bit);
    }
    /**
     * @param {number} layer
     */
    set_collision_layer(layer) {
        this.collision_layer = layer;
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {number} bit
     * @param {boolean} value
     */
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= 1 << bit;
        } else {
            this.collision_layer &= ~(1 << bit);
        }
    }

    /**
     * @returns {number}
     */
    get_collision_mask() {
        return this.collision_mask;
    }
    /**
     * Return an individual bit on the collision mask. Describes whether
     * this area will collide with others on the given layer.
     *
     * @param {number} bit
     */
    get_collision_mask_bit(bit) {
        return this.collision_mask & (1 << bit);
    }
    /**
     * @param {number} mask
     */
    set_collision_mask(mask) {
        this.collision_mask = mask;
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {number} bit
     * @param {boolean} value
     */
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= 1 << bit;
        } else {
            this.collision_mask &= ~(1 << bit);
        }
    }

    constructor() {
        super();

        this.is_physics_object = true;
        this.collision_object_type = CollisionObjectTypes.NONE;

        this.collision_layer = 0;
        this.collision_mask = 0;

        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;

        /**
         * @type {CollisionShape2D[]}
         */
        this.shapes = [];
    }
    _propagate_enter_tree() {
        if (this.is_inside_tree) {
            return;
        }

        this._add_shapes_to_physics_server();

        super._propagate_enter_tree();
    }
    _propagate_physics_process(delta) {
        if (this.physics_process) {
            this._physics_process(delta);
        }
    }
    _propagate_exit_tree() {
        super._propagate_exit_tree();

        this._remove_shapes_from_physics_server();
    }

    /**
     * @param {CollisionShape2D} shape
     */
    add_shape(shape) {
        shape.owner = this;
        this.shapes.push(shape);

        if (this.is_inside_tree) {
            this._add_shapes_to_physics_server();
        }
    }
    /**
     * @param {CollisionShape2D} shape
     */
    remove_shape(shape) {
        shape.owner = null;
        let idx = this.shapes.indexOf(shape);
        if (idx >= 0) {
            remove_items(this.shapes, idx, 1);
        }

        if (shape.is_inside_tree) {
            this.scene_tree.physics_server.remove_shape(shape);
        }
    }

    _load_data(data) {
        super._load_data(data);

        for (let k in data) {
            switch (k) {
            // Directly set
            // - Node2D
            case 'name':
            case 'x':
            case 'y':
            case 'collision_layer':
            case 'collision_mask':
                this[k] = data[k];
                break;

                // Set vector
                // - Node2D
            case 'position':
                this[k].x = data[k].x || 0;
                this[k].y = data[k].y || 0;
                break;

                // - Node2D
            case 'scale':
                this[k].x = data[k].x || 1;
                this[k].y = data[k].y || 1;
                break;
            }
        }

        return this;
    }
    _add_shapes_to_physics_server() {
        for (let s of this.shapes) {
            if (!s.is_inside_tree) {
                this.scene_tree.physics_server.add_shape(s);
            }
        }
    }
    _remove_shapes_from_physics_server() {
        for (let s of this.shapes) {
            if (s.is_inside_tree) {
                this.scene_tree.physics_server.remove_shape(s);
            }
        }
    }
}
