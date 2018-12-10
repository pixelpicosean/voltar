import Node2D from '../Node2D';
import { Matrix } from 'engine/math/index';
import Shape2D from '../resources/shape_2d';
import PhysicsServer from 'engine/servers/physics_2d/physics_server';
import { remove_items } from 'engine/dep/index';
import CollisionObject2DSW from 'engine/servers/physics_2d/collision_object_2d_sw';
import Area2DSW from 'engine/servers/physics_2d/area_2d_sw';
import CollisionShape2D from './collision_shape_2d';
import { BodyState } from './const';

class Shape {
    constructor() {
        /**
         * @type {Shape2D}
         */
        this.shape = null;
        this.index = 0;
    }
}
class ShapeData {
    constructor() {
        this.owner = null;
        this.xform = new Matrix();
        /**
         * @type {Shape[]}
         */
        this.shapes = [];
        this.disabled = false;
        this.one_way_collision = false;
    }
}

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
     * @param {CollisionObject2DSW} p_rid
     * @param {boolean} p_area
     */
    constructor(p_rid, p_area) {
        super();

        this.is_collision_object = true;

        this.area = p_area;
        this.rid = p_rid;

        this.total_subshapes = 0;
        /**
         * @type {Map<CollisionShape2D, ShapeData>}
         */
        this.shapes = new Map();
        this.last_transform = new Matrix();
        this.only_update_transform_changes = false;

        if (p_area) {
            // @ts-ignore
            PhysicsServer.singleton.area_attach_object_instance(this.rid, this);
        } else {
            // @ts-ignore
            PhysicsServer.singleton.body_attach_object_instance(this.rid, this);
        }
    }
    free() {
        PhysicsServer.singleton.free(this.rid);
    }

    _load_data(data) {
        super._load_data(data);

        // TODO: load data

        return this;
    }

    _propagate_enter_tree() {
        super._propagate_enter_tree();

        if (this.area) {
            // @ts-ignore
            this.rid.set_transform(this.get_global_transform());
        } else {
            // @ts-ignore
            this.rid.set_state(BodyState.TRANSFORM, this.get_global_transform());
        }

        this.last_transform.copy(this.get_global_transform());

        const space = this.get_world_2d().space;
        if (this.area) {
            // @ts-ignore
            PhysicsServer.singleton.area_set_space(this.rid, space);
        } else {
            // @ts-ignore
            PhysicsServer.singleton.body_set_space(this.rid, space);
        }
    }
    _notify_transform_changed() {
        if (this.area) {
            // @ts-ignore
            this.rid.set_transform(this.get_global_transform());
        } else {
            // @ts-ignore
            this.rid.set_state(BodyState.TRANSFORM, this.get_global_transform());
        }

        this.last_transform.copy(this.get_global_transform());
    }
    _propagate_exit_tree() {
        if (this.area) {
            // @ts-ignore
            PhysicsServer.singleton.area_set_space(this.rid, null);
        } else {
            // @ts-ignore
            PhysicsServer.singleton.body_set_space(this.rid, null);
        }

        super._propagate_exit_tree();
    }

    /**
     * @param {CollisionShape2D} p_shape
     */
    create_shape_owner(p_shape) {
        const sd = new ShapeData();
        sd.owner = p_shape;
        this.shapes.set(p_shape, sd);
        return p_shape;
    }
    /**
     * @param {CollisionShape2D} p_owner
     */
    remove_shape_owner(p_owner) {
        this.shape_owner_clear_shapes(p_owner);
        this.shapes.delete(p_owner);
    }
    get_shape_owners() { }

    /**
     * @param {CollisionShape2D} p_owner
     * @param {Matrix} p_transform
     */
    shape_owner_set_transform(p_owner, p_transform) { }
    /**
     * @param {CollisionShape2D} p_owner
     */
    shape_owner_get_transform(p_owner) { }
    /**
     * @param {CollisionShape2D} p_owner
     */
    shape_owner_get_owner(p_owner) { }

    /**
     * @param {CollisionShape2D} p_owner
     * @param {boolean} p_disabled
     */
    shape_owner_set_disabled(p_owner, p_disabled) {
        const sd = this.shapes.get(p_owner);
        sd.disabled = p_disabled;
        for (let i = 0; i < sd.shapes.length; i++) {
            if (this.area) {
                // @ts-ignore
                PhysicsServer.singleton.area_set_shape_disabled(this.rid, i, p_disabled);
            } else {
                // TODO: body_set_shape_disabled
                // PhysicsServer.singleton.body_set_shape_disabled(this.rid, i, p_disabled);
            }
        }
    }
    /**
     * @param {CollisionShape2D} p_owner
     * @param {boolean} p_disabled
     */
    is_shape_owner_disabled(p_owner, p_disabled) {
        return this.shapes.get(p_owner).disabled;
    }

    /**
     * @param {CollisionShape2D} p_owner
     * @param {boolean} p_enable
     */
    shape_owner_set_one_way_collision(p_owner, p_enable) {
        if (this.area) {
            return;
        }

        const sd = this.shapes.get(p_owner);
        sd.one_way_collision = p_enable;
        for (let s of sd.shapes) {
            // TODO: PhysicsServer.singleton.body_set_shape_as_one_way_collision
        }
    }
    /**
     * @param {CollisionShape2D} p_owner
     * @param {boolean} p_enable
     */
    is_shape_owner_one_way_collision(p_owner, p_enable) {
        return this.shapes.get(p_owner).one_way_collision;
    }

    /**
     * @param {CollisionShape2D} p_owner
     * @param {Shape2D} p_shape
     */
    shape_owner_add_shape(p_owner, p_shape) {
        const sd = this.shapes.get(p_owner);
        const s = new Shape();
        s.index = this.total_subshapes;
        s.shape = p_shape;
        if (this.area) {
            // @ts-ignore
            PhysicsServer.singleton.area_add_shape(this.rid, p_shape.shape, sd.xform);
        } else {
            // @ts-ignore
            PhysicsServer.singleton.body_add_shape(this.rid, p_shape.shape, sd.xform);
        }
        sd.shapes.push(s);

        this.total_subshapes++;
    }
    /**
     * @param {CollisionShape2D} p_owner
     */
    shape_owner_get_shape_count(p_owner) {
        return this.shapes.get(p_owner).shapes.length;
    }
    /**
     * @param {CollisionShape2D} p_owner
     * @param {number} p_shape
     */
    shape_owner_get_shape(p_owner, p_shape) {
        return this.shapes.get(p_owner).shapes[p_shape].shape;
    }
    /**
     * @param {CollisionShape2D} p_owner
     * @param {number} p_shape
     */
    shape_owner_get_shape_index(p_owner, p_shape) {
        return this.shapes.get(p_owner).shapes[p_shape].index;
    }

    /**
     * @param {CollisionShape2D} p_owner
     * @param {number} p_shape
     */
    shape_owner_remove_shape(p_owner, p_shape) {
        const index_to_remove = this.shapes.get(p_owner).shapes[p_shape].index;
        if (this.area) {
            // @ts-ignore
            PhysicsServer.singleton.area_remove_shape(this.rid, index_to_remove);
        } else {
            // TODO: PhysicsServer.singleton.body_remove_shape(this.rid, index_to_remove);
        }

        remove_items(this.shapes.get(p_owner).shapes, p_shape, 1);

        for (let [_, sd] of this.shapes) {
            for (let s of sd.shapes) {
                if (s.index > index_to_remove) {
                    s.index -= 1;
                }
            }
        }

        this.total_subshapes--;
    }
    /**
     * @param {CollisionShape2D} p_owner
     */
    shape_owner_clear_shapes(p_owner) {
        while (this.shape_owner_get_shape_count(p_owner) > 0) {
            this.shape_owner_remove_shape(p_owner, 0);
        }
    }

    /**
     * @param {number} p_shape_index
     */
    shape_find_owner(p_shape_index) {
        for (let [owner, sd] of this.shapes) {
            for (let s of sd.shapes) {
                if (s.index === p_shape_index) {
                    return owner;
                }
            }
        }

        return null;
    }
}
