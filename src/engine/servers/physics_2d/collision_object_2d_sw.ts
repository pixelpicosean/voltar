import { remove_item, remove_items } from "engine/dep/index";
import { SelfList } from "engine/core/self_list.js";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";

import { CollisionObject2DSW$Type } from "engine/scene/2d/const";

import { Shape2DSW } from "./shape_2d_sw.js";
import { Space2DSW } from "./space_2d_sw.js";

type Node2D = import('engine/scene/2d/node_2d').Node2D;


const IDTransform = new Transform2D;

class Shape {
    xform = new Transform2D;
    xform_inv = new Transform2D;
    bpid = 0;
    aabb_cache = new Rect2;
    shape: Shape2DSW = null;
    metadata: any = null;
    disabled = false;
    one_way_collision = false;
    one_way_collision_margin = 0;
}

export class CollisionObject2DSW {
    _set_static(p_static: boolean) {
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

    type: CollisionObject2DSW$Type;
    self = this;
    instance: Node2D = null;
    canvas_instance: Node2D = null;
    pickable = true;

    shapes: Shape[] = [];
    space: Space2DSW = null;
    transform = new Transform2D;
    inv_transform = new Transform2D;
    collision_mask = 1;
    collision_layer = 1;
    _static = true;

    pending_shape_update_list = new SelfList<CollisionObject2DSW>(this);

    constructor(p_type: CollisionObject2DSW$Type) {
        this.type = p_type;
    }

    _update_shapes() {
        if (!this.space) {
            return;
        }

        for (let i = 0; i < this.shapes.length; i++) {
            let s = this.shapes[i];

            if (s.disabled) {
                continue;
            }

            if (s.bpid === 0) {
                s.bpid = this.space.broadphase.create(this, i);
                this.space.broadphase.set_static(s.bpid, this._static);
            }

            let shape_aabb = s.shape.aabb.clone();
            let xform = this.transform.clone().append(s.xform);
            xform.xform_rect(shape_aabb, shape_aabb);
            s.aabb_cache.copy(shape_aabb);
            s.aabb_cache.grow_by((s.aabb_cache.width + s.aabb_cache.height) * 0.5 * 0.05);
            Transform2D.free(xform);
            Rect2.free(shape_aabb);

            this.space.broadphase.move(s.bpid, s.aabb_cache);
        }
    }

    _update_shapes_with_motion(p_motion: Vector2) {
        if (!this.space) {
            return;
        }

        for (let i = 0; i < this.shapes.length; i++) {
            let s = this.shapes[i];
            if (s.disabled) {
                continue;
            }

            if (s.bpid === 0) {
                s.bpid = this.space.broadphase.create(this, i);
                this.space.broadphase.set_static(s.bpid, this._static);
            }

            let shape_aabb = s.shape.aabb.clone();
            let xform = this.transform.clone().append(s.xform);
            xform.xform_rect(shape_aabb, shape_aabb);
            s.aabb_cache.copy(shape_aabb);
            let rect = Rect2.create(shape_aabb.x + p_motion.x, shape_aabb.y + p_motion.y, shape_aabb.width, shape_aabb.height);
            s.aabb_cache.merge_with(rect);
            Rect2.free(rect);
            Transform2D.free(xform);
            Rect2.free(shape_aabb);

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
     * @param {Transform2D} p_transform
     * @param {boolean} [p_update_shapes]
     */
    _set_transform(p_transform: Transform2D, p_update_shapes: boolean = true) {
        this.transform.copy(p_transform);
        if (p_update_shapes) {
            this._update_shapes();
        }
    }
    _set_inv_transform(p_transform: Transform2D) {
        this.inv_transform.copy(p_transform);
    }

    _shape_changed() {
        this._update_shapes();
        this._shapes_changed();
    }

    _shapes_changed() { }

    _set_space(p_space: Space2DSW) {
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

    add_shape(p_shape: Shape2DSW, p_transform: Transform2D = IDTransform, p_disabled = false) {
        // @Incomplete @Memory: recycle `Shape`
        let s = new Shape;
        s.shape = p_shape;
        s.xform.copy(p_transform);
        s.xform_inv.copy(s.xform).affine_inverse();
        s.bpid = 0;
        s.disabled = p_disabled;
        s.one_way_collision = false;
        s.one_way_collision_margin = 0;
        this.shapes.push(s);
        p_shape.add_owner(this);

        if (!this.pending_shape_update_list.in_list()) {
            // @Incomplete
        }
    }
    set_shape(p_index: number, p_shape: Shape2DSW) {
        this.shapes[p_index].shape.remove_owner(this);
        this.shapes[p_index].shape = p_shape;

        p_shape.add_owner(this);

        if (!this.pending_shape_update_list.in_list()) {
            // @Incomplete
        }
    }
    /**
     * @param {number} p_index
     * @param {Transform2D} p_transform
     */
    set_shape_transform(p_index: number, p_transform: Transform2D) {
        this.shapes[p_index].xform.copy(p_transform);
        this.shapes[p_index].xform_inv.copy(p_transform).affine_inverse();

        if (!this.pending_shape_update_list.in_list()) {
            // @Incomplete
        }
    }
    /**
     * @param {number} p_index
     * @param {any} p_metadata
     */
    set_shape_metadata(p_index: number, p_metadata: any) {
        this.shapes[p_index].metadata = p_metadata;
    }
    /**
     * @param {number} p_index
     */
    get_shape(p_index: number) {
        return this.shapes[p_index].shape;
    }
    /**
     * @param {number} p_index
     */
    get_shape_transform(p_index: number) {
        return this.shapes[p_index].xform;
    }
    /**
     * @param {number} p_index
     */
    get_shape_inv_transform(p_index: number) {
        return this.shapes[p_index].xform_inv;
    }
    /**
     * @param {number} p_index
     */
    get_shape_metadata(p_index: number) {
        return this.shapes[p_index].metadata;
    }

    /**
     * @param {number} p_index
     * @param {boolean} p_disabled
     */
    set_shape_as_disabled(p_index: number, p_disabled: boolean) {
        let shape = this.shapes[p_index];
        if (shape.disabled === p_disabled) {
            return;
        }

        shape.disabled = p_disabled;

        if (!this.space) {
            return;
        }

        if (p_disabled && shape.bpid !== 0) {
            this.space.broadphase.remove(shape.bpid);
            shape.bpid = 0;
            if (!this.pending_shape_update_list.in_list()) {
                // @Incomplete
            }
        } else if (!p_disabled && shape.bpid === 0) {
            if (!this.pending_shape_update_list.in_list()) {
                // @Incomplete
            }
        }
    }
    /**
     * @param {number} p_index
     */
    is_shape_set_as_disabled(p_index: number) {
        return this.shapes[p_index].disabled;
    }

    /**
     * @param {number} p_index
     * @param {boolean} p_one_way_collision
     * @param {number} p_margin
     */
    set_shape_as_one_way_collision(p_index: number, p_one_way_collision: boolean, p_margin: number) {
        this.shapes[p_index].one_way_collision = p_one_way_collision;
        this.shapes[p_index].one_way_collision_margin = p_margin;
    }
    /**
     * @param {number} p_index
     */
    is_shape_one_way_collision(p_index: number) {
        return this.shapes[p_index].one_way_collision;
    }

    /**
     * @param {Shape2DSW} p_shape
     */
    remove_shape(p_shape: Shape2DSW) {
        for (let i = 0; i < this.shapes.length; i++) {
            if (this.shapes[i].shape === p_shape) {
                this.remove_shape_by_index(i);
                i--;
            }
        }
    }
    /**
     * @param {number} p_index
     */
    remove_shape_by_index(p_index: number) {
        for (let i = p_index; i < this.shapes.length; i++) {
            let s = this.shapes[i];
            if (s.bpid === 0) {
                continue;
            }
            this.space.broadphase.remove(s.bpid);
            s.bpid = 0;
        }
        this.shapes[p_index].shape.remove_owner(this);
        remove_item(this.shapes, p_index);

        if (!this.pending_shape_update_list.in_list()) {
            // @Incomplete
        }
    }

    /**
     * @param {CollisionObject2DSW} p_other
     */
    test_collision_mask(p_other: CollisionObject2DSW) {
        return !!(this.collision_layer & p_other.collision_mask) || !!(p_other.collision_layer & this.collision_mask);
    }
}
