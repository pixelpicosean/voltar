import { Matrix, Rectangle, Vector2 } from "engine/math/index";
import { Shape2DSW } from "./shape_2d_sw";
import Space2DSW from "./space_2d_sw";
import { Type } from "engine/scene/physics/const";
import { remove_items } from "engine/dep/index";

const IDTransform = Object.freeze(new Matrix());

class Shape {
    constructor() {
        this.xform = new Matrix();
        this.xform_inv = new Matrix();
        this.bpid = 0;
        this.aabb_cache = new Rectangle();
        /**
         * @type {Shape2DSW}
         */
        this.shape = null;
        this.metadata = null;
        this.disabled = false;
        this.one_way_collision = false;
    }
}

export default class CollisionObject2DSW {
    get static() {
        return  this._static;
    }
    /**
     * @param {boolean} value
     */
    set static(value) {
        this._static = value;
    }
    /**
     * @param {boolean} value
     */
    set_static(value) {
        this.static = value;
        return this;
    }

    /**
     * @param {Type} p_type
     */
    constructor(p_type) {
        this.type = p_type;
        this.self = this;
        this.instance = null;
        this.canvas_instance = null;
        this.pickable = true;

        /**
         * @type {Shape[]}
         */
        this.shapes = [];
        /**
         * @type {Space2DSW}
         */
        this.space = null;
        this.transform = new Matrix();
        this.inv_transform = new Matrix();
        this.collision_mask = 1;
        this.collision_layer = 1;
        this._static = true;
    }

    _update_shapes() {
        if (!this.space) {
            return;
        }

        for (let i = 0; i < this.shapes.length; i++) {
            const s = this.shapes[i];

            if (s.disabled) {
                continue;
            }

            if (s.bpid === 0) {
                s.bpid = this.space.broadphase.create(this, i);
                this.space.broadphase.set_static(s.bpid, this._static);
            }

            const shape_aabb = s.shape.aabb.clone();
            const xform = this.transform.clone().append(s.xform);
            xform.xform_rect(shape_aabb, shape_aabb);
            s.aabb_cache.copy(shape_aabb);
            s.aabb_cache.grow_to((s.aabb_cache.width + s.aabb_cache.height) * 0.5 * 0.05);
            Rectangle.delete(shape_aabb);

            this.space.broadphase.move(s.bpid, s.aabb_cache);
        }
    }

    /**
     * @param {Vector2} p_motion
     */
    _update_shapes_with_motion(p_motion) {
        if (!this.space) {
            return;
        }

        for (let i = 0; i < this.shapes.length; i++) {
            const s = this.shapes[i];

            if (s.disabled) {
                continue;
            }

            if (s.bpid === 0) {
                s.bpid = this.space.broadphase.create(this, i);
                this.space.broadphase.set_static(s.bpid, this._static);
            }

            const shape_aabb = s.shape.aabb.clone();
            const xform = this.transform.clone().append(s.xform);
            xform.xform_rect(shape_aabb, shape_aabb);
            s.aabb_cache.copy(shape_aabb);
            const rect = Rectangle.create(shape_aabb.x + p_motion.x, shape_aabb.y + p_motion.y, shape_aabb.width, shape_aabb.height);
            s.aabb_cache.merge_to(rect);
            Rectangle.delete(shape_aabb);
            Rectangle.delete(rect);

            this.space.broadphase.move(s.bpid, s.aabb_cache);
        }
    }
    _unregister_shapes() {
        for (let s of this.shapes) {
            if (s.bpid > 0) {
                this.space.broadphase.remove(s.bpid);
                s.bpid = 0;
            }
        }
    }

    /**
     * @param {Matrix} p_transform
     * @param {boolean} [p_update_shapes]
     */
    _set_transform(p_transform, p_update_shapes = true) {
        this.transform.copy(p_transform);
        if (p_update_shapes) {
            this._update_shapes();
        }
    }
    /**
     * @param {Matrix} p_transform
     */
    _set_inv_transform(p_transform) {
        this.inv_transform.copy(p_transform);
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
                this.space.broadphase.set_static(s.bpid, this._static);
            }
        }
    }

    _shape_changed() {
        this._update_shapes();
        this._shapes_changed();
    }

    _shapes_changed() { }
    /**
     * @param {Space2DSW} p_space
     */
    _set_space(p_space) {
        if (this.space) {
            this.space.remove_object(this);

            for (let s of this.shapes) {
                if (s.bpid) {
                    this.space.broadphase.remove(s.bpid);
                    s.bpid = 0;
                }
            }
        }

        this.space = p_space;

        if (this.space) {
            this.space.add_object(this);
            this._update_shapes();
        }
    }

    /**
     * @param {Shape2DSW} p_shape
     * @param {Matrix} [p_transform]
     */
    add_shape(p_shape, p_transform = IDTransform) {
        const s = new Shape();
        s.shape = p_shape;
        s.xform.copy(p_transform);
        s.xform_inv.copy(s.xform).affine_inverse();
        s.bpid = 0;
        s.disabled = false;
        s.one_way_collision = false;
        this.shapes.push(s);
        p_shape.add_owner(this);
        this._update_shapes();
        this._shapes_changed();
    }
    /**
     * @param {number} p_index
     * @param {Shape2DSW} p_shape
     */
    set_shape(p_index, p_shape) {
        this.shapes[p_index].shape.remove_owner(this);
        this.shapes[p_index].shape = p_shape;

        p_shape.add_owner(this);
        this._update_shapes();
        this._shapes_changed();
    }
    /**
     * @param {number} p_index
     * @param {Matrix} p_transform
     */
    set_shape_transform(p_index, p_transform) {
        this.shapes[p_index].xform.copy(p_transform);
        this.shapes[p_index].xform_inv.copy(p_transform).affine_inverse();
        this._update_shapes();
        this._shapes_changed();
    }
    /**
     * @param {number} p_index
     * @param {any} p_metadata
     */
    set_shape_metadata(p_index, p_metadata) {
        this.shapes[p_index].metadata = p_metadata;
    }
    /**
     * @param {number} p_index
     */
    get_shape(p_index) {
        return this.shapes[p_index].shape;
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
    get_shape_inv_transform(p_index) {
        return this.shapes[p_index].xform_inv;
    }
    /**
     * @param {number} p_index
     */
    get_shape_metadata(p_index) {
        return this.shapes[p_index].metadata;
    }

    /**
     * @param {number} p_index
     * @param {boolean} p_disabled
     */
    set_shape_as_disabled(p_index, p_disabled) {
        this.shapes[p_index].disabled = p_disabled;
    }
    /**
     * @param {number} p_index
     */
    is_shape_set_as_disabled(p_index) {
        return this.shapes[p_index].disabled;
    }

    /**
     * @param {number} p_index
     * @param {boolean} p_one_way_collision
     */
    set_shape_as_one_way_collision(p_index, p_one_way_collision) {
        this.shapes[p_index].one_way_collision = p_one_way_collision;
    }
    /**
     * @param {number} p_index
     */
    is_shape_one_way_collision(p_index) {
        return this.shapes[p_index].one_way_collision;
    }

    /**
     * @param {Shape2DSW} p_shape
     */
    remove_shape(p_shape) {
        for (let i = 0; i < this.shapes.length; i++) {
            if (this.shapes[i].shape === p_shape) {
                this.remove_shape_by_index(i);
            }
        }
    }
    /**
     * @param {number} p_index
     */
    remove_shape_by_index(p_index) {
        for (let i = p_index; i < this.shapes.length; i++) {
            const s = this.shapes[i];
            if (s.bpid === 0) {
                continue;
            }
            this.space.broadphase.remove(s.bpid);
            s.bpid = 0;
        }
        this.shapes[p_index].shape.remove_owner(this);
        remove_items(this.shapes, p_index, 1);

        this._update_shapes();
        this._shapes_changed();
    }

    /**
     * @param {CollisionObject2DSW} p_other
     */
    test_collision_mask(p_other) {
        return this.collision_layer & p_other.collision_mask || p_other.collision_layer & this.collision_mask;
    }
}
