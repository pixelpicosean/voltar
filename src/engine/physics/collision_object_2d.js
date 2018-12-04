import Node2D from 'engine/scene/Node2D';
import { Type } from './const';
import { Shape2D } from '../scene/resources/shape_2d';
import { Matrix } from 'engine/math/index';

const IDTransform = Object.freeze(new Matrix());

export default class CollisionObject2D extends Node2D {
    constructor() {
        super();

        this.type = 'CollisionObject2D';

        /* CollisionObject2DSW API */

        /**
         * @type {Type}
         */
        this.physics_type = -1;

        this.canvas_instance = this;
        this.pickable = true;
        /**
         * @type {Shape2D[]}
         */
        this.shapes = [];
        this.space = null;
        this.transform_ = new Matrix();
        this.inv_transform_ = new Matrix();
        this.collision_mask = 1;
        this.collision_layer = 1;
        this._static = true;
    }

    /* ShapeOwner2DSW API */

    _shape_changed() { }
    remove_shape(shape) { }

    /* CollisionObject2DSW API */
    _update_shapes() { }
    _update_shapes_with_motion(motion) { }
    _unregister_shapes() { }

    /**
     * @param {Matrix} transform
     * @param {boolean} [update_shapes]
     */
    _set_transform(transform, update_shapes = true) {
        this.transform_.copy(transform);
        if (update_shapes) {
            this._update_shapes();
        }
    }
    /**
     * @param {Matrix} transform
     */
    _set_inv_transform(transform) {
        this.transform_.copy(transform);
    }
    _set_static(p_static) {
        if (this._static === p_static) {
            return;
        }
        this._static = p_static;

        if (!this.space) {
            return;
        }
        for (let s of this.shapes) {
            if (s.bpid > 0) {
                this.space.get_boardphase().set_static(s.bpid, this._static);
            }
        }
    }

    _shapes_changed() { }
    _set_space(space) { }

    /**
     * @param {Shape2D} p_shape
     * @param {Matrix} [p_transform]
     */
    add_shape(p_shape, p_transform = IDTransform) {
        p_shape.xform.copy(p_transform);
        p_shape.xform_inv.copy(p_shape.xform).affine_inverse();
        p_shape.bpid = 0;
        p_shape.disabled = false;
        p_shape.one_way_collision = false;
        this.shapes.push(p_shape);
        p_shape.add_owner(this);
        this._update_shapes();
        this._shapes_changed();
    }
    set_shape_transform(p_index, p_transform) { }
    /**
     * @param {number} p_index
     */
    get_shape(p_index) {
        return this.shapes[p_index];
    }
    /**
     * @param {number} p_index
     */
    get_shape_transform(p_index) {
        return this.shapes[p_index].xform;
    }
    /**
     * @param {number} p_index
     */
    get_shape_metadata(p_index) {
        return this.shapes[p_index].metadata;
    }
}
