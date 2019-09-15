import { remove_items } from 'engine/dep/index';
import { GDCLASS } from 'engine/core/v_object';
import { Transform2D } from 'engine/core/math/transform_2d';

import { Physics2DServer } from 'engine/servers/physics_2d/physics_2d_server';
import { CollisionObject2DSW } from 'engine/servers/physics_2d/collision_object_2d_sw';
import { Area2DSW } from 'engine/servers/physics_2d/area_2d_sw';
import { Body2DSW } from 'engine/servers/physics_2d/body_2d_sw';

import { Shape2D } from '../resources/shape_2d';
import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from '../main/node';
import { Node2D } from '../2d/node_2d';
import { CollisionShape2D } from './collision_shape_2d';
import { CollisionPolygon2D } from './collision_polygon_2d';
import { BodyState } from './const';
import {
    NOTIFICATION_ENTER_CANVAS,
    NOTIFICATION_TRANSFORM_CHANGED,
    NOTIFICATION_EXIT_CANVAS,
} from '../2d/canvas_item';


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
        this.xform = new Transform2D();
        /**
         * @type {Shape[]}
         */
        this.shapes = [];
        this.disabled = false;
        this.one_way_collision = false;
        this.one_way_collision_margin = 0;
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

export class CollisionObject2D extends Node2D {
    get class() { return 'CollisionObject2D' }

    set_pickable(p_enabled) {
        if (this.pickable === p_enabled) return;
        this.pickable = p_enabled;
        this._update_pickable();
    }

    /**
     * @param {CollisionObject2DSW} p_rid
     * @param {boolean} p_area
     */
    constructor(p_rid, p_area) {
        super();

        this.is_collision_object = true;

        this.pickable = false;

        this.area = p_area;
        this.rid = p_rid;

        this.total_subshapes = 0;
        /**
         * @type {Map<CollisionShape2D|CollisionPolygon2D, ShapeData>}
         */
        this.shapes = new Map();
        this.last_transform = new Transform2D();
        this.only_update_transform_changes = false;

        this.set_notify_transform(true);

        if (p_area) {
            // @ts-ignore
            Physics2DServer.get_singleton().area_attach_object_instance(/** @type {Area2DSW} */(this.rid), this);
        } else {
            // @ts-ignore
            Physics2DServer.get_singleton().body_attach_object_instance(/** @type {Body2DSW} */(this.rid), this);
        }
    }

    /* virtual */
    free() {
        Physics2DServer.get_singleton().free_rid(this.rid);
        return super.free();
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                const global_transform = this.get_global_transform();

                if (this.area) {
                    Physics2DServer.get_singleton().area_set_transform(/** @type {Area2DSW} */(this.rid), global_transform);
                } else {
                    Physics2DServer.get_singleton().body_set_state(/** @type {Body2DSW} */(this.rid), BodyState.TRANSFORM, global_transform);
                }

                this.last_transform.copy(global_transform);

                const space = this.get_world_2d().space;
                if (this.area) {
                    Physics2DServer.get_singleton().area_set_space(/** @type {Area2DSW} */(this.rid), space);
                } else {
                    Physics2DServer.get_singleton().body_set_space(/** @type {Body2DSW} */(this.rid), space);
                }

                this._update_pickable();
            } break;
            case NOTIFICATION_ENTER_CANVAS: {
                this._update_pickable();
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                const global_transform = this.get_global_transform();

                if (this.only_update_transform_changes && global_transform.equals(this.last_transform)) {
                    return;
                }

                if (this.area) {
                    Physics2DServer.get_singleton().area_set_transform(/** @type {Area2DSW} */(this.rid), global_transform);
                } else {
                    Physics2DServer.get_singleton().body_set_state(/** @type {Body2DSW} */(this.rid), BodyState.TRANSFORM, global_transform);
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                if (this.area) {
                    Physics2DServer.get_singleton().area_set_space(/** @type {Area2DSW} */(this.rid), null);
                } else {
                    Physics2DServer.get_singleton().body_set_space(/** @type {Body2DSW} */(this.rid), null);
                }
            } break;
            case NOTIFICATION_EXIT_CANVAS: {
                if (this.area) {
                    // @ts-ignore
                    Physics2DServer.get_singleton().area_attach_object_instance(/** @type {Area2DSW} */(this.rid), null);
                } else {
                    // @ts-ignore
                    Physics2DServer.get_singleton().body_attach_object_instance(/** @type {Body2DSW} */(this.rid), null);
                }
            } break;
        }
    }

    _input_event(p_viewport, p_input_event, p_shape) { }
    _mouse_enter() { }
    _mouse_exit() { }

    /* public */

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_shape
     */
    create_shape_owner(p_shape) {
        const sd = new ShapeData();
        sd.owner = p_shape;
        this.shapes.set(p_shape, sd);
        return p_shape;
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    remove_shape_owner(p_owner) {
        this.shape_owner_clear_shapes(p_owner);
        this.shapes.delete(p_owner);
    }
    get_shape_owners() {
        return this.shapes.keys();
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {Transform2D} p_transform
     */
    shape_owner_set_transform(p_owner, p_transform) {
        const sd = this.shapes.get(p_owner);
        sd.xform.copy(p_transform);
        for (let s of sd.shapes) {
            if (this.area) {
                Physics2DServer.get_singleton().area_set_shape_transform(/** @type {Area2DSW} */(this.rid), s.index, p_transform);
            } else {
                Physics2DServer.get_singleton().body_set_shape_transform(/** @type {Body2DSW} */(this.rid), s.index, p_transform);
            }
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    shape_owner_get_transform(p_owner) {
        return this.shapes.get(p_owner).xform;
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    shape_owner_get_owner(p_owner) {
        return this.shapes.get(p_owner).owner;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {boolean} p_disabled
     */
    shape_owner_set_disabled(p_owner, p_disabled) {
        const sd = this.shapes.get(p_owner);
        sd.disabled = p_disabled;
        for (let i = 0; i < sd.shapes.length; i++) {
            if (this.area) {
                Physics2DServer.get_singleton().area_set_shape_disabled(/** @type {Area2DSW} */(this.rid), i, p_disabled);
            } else {
                Physics2DServer.get_singleton().body_set_shape_disabled(/** @type {Body2DSW} */(this.rid), i, p_disabled);
            }
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    is_shape_owner_disabled(p_owner) {
        return this.shapes.get(p_owner).disabled;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {boolean} p_enable
     */
    shape_owner_set_one_way_collision(p_owner, p_enable) {
        if (this.area) {
            return;
        }

        const sd = this.shapes.get(p_owner);
        sd.one_way_collision = p_enable;
        for (let s of sd.shapes) {
            Physics2DServer.get_singleton().body_set_shape_as_one_way_collision(/** @type {Body2DSW} */(this.rid), s.index, sd.one_way_collision, sd.one_way_collision_margin);
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    is_shape_owner_one_way_collision(p_owner) {
        return this.shapes.get(p_owner).one_way_collision;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {number} p_margin
     */
    shape_owner_set_one_way_collision_margin(p_owner, p_margin) {
        if (this.area) {
            return;
        }

        const sd = this.shapes.get(p_owner);
        sd.one_way_collision_margin = p_margin;
        for (let s of sd.shapes) {
            Physics2DServer.get_singleton().body_set_shape_as_one_way_collision(/** @type {Body2DSW} */(this.rid), s.index, sd.one_way_collision, sd.one_way_collision_margin);
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    get_shape_owner_one_way_collision_margin(p_owner) {
        return this.shapes.get(p_owner).one_way_collision_margin;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {Shape2D} p_shape
     */
    shape_owner_add_shape(p_owner, p_shape) {
        const sd = this.shapes.get(p_owner);
        const s = new Shape();
        s.index = this.total_subshapes;
        s.shape = p_shape;
        if (this.area) {
            Physics2DServer.get_singleton().area_add_shape(/** @type {Area2DSW} */(this.rid), p_shape.shape, sd.xform);
        } else {
            Physics2DServer.get_singleton().body_add_shape(/** @type {Body2DSW} */(this.rid), p_shape.shape, sd.xform);
        }
        sd.shapes.push(s);

        this.total_subshapes++;
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    shape_owner_get_shape_count(p_owner) {
        return this.shapes.get(p_owner).shapes.length;
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {number} p_shape
     */
    shape_owner_get_shape(p_owner, p_shape) {
        return this.shapes.get(p_owner).shapes[p_shape].shape;
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {number} p_shape
     */
    shape_owner_get_shape_index(p_owner, p_shape) {
        return this.shapes.get(p_owner).shapes[p_shape].index;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {number} p_shape
     */
    shape_owner_remove_shape(p_owner, p_shape) {
        const index_to_remove = this.shapes.get(p_owner).shapes[p_shape].index;
        if (this.area) {
            Physics2DServer.get_singleton().area_remove_shape(/** @type {Area2DSW} */(this.rid), index_to_remove);
        } else {
            Physics2DServer.get_singleton().body_remove_shape(/** @type {Body2DSW} */(this.rid), index_to_remove);
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
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
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

    _update_pickable() {
        if (!this.is_inside_tree()) return;

        const is_pickable = this.pickable && this.is_visible_in_tree();
        if (this.area) {
            Physics2DServer.get_singleton().area_set_pickable(/** @type {Area2DSW} */(this.rid), is_pickable);
        } else {
            Physics2DServer.get_singleton().body_set_pickable(/** @type {Body2DSW} */(this.rid), is_pickable);
        }
    }
}
GDCLASS(CollisionObject2D, Node2D)
