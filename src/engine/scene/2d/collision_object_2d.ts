import { remove_items } from 'engine/dep/index';
import { GDCLASS } from 'engine/core/v_object';
import { Transform2D } from 'engine/core/math/transform_2d.js';

import { Physics2DServer } from 'engine/servers/physics_2d/physics_2d_server.js';
import { CollisionObject2DSW } from 'engine/servers/physics_2d/collision_object_2d_sw.js';
import { Area2DSW } from 'engine/servers/physics_2d/area_2d_sw.js';
import { Body2DSW } from 'engine/servers/physics_2d/body_2d_sw.js';

import { Shape2D } from '../resources/shape_2d';
import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
} from '../main/node';
import { Node2D } from './node_2d';
import {
    NOTIFICATION_EXIT_CANVAS,
    NOTIFICATION_VISIBILITY_CHANGED,
} from './canvas_item';
import { BodyState } from './const';
import { CollisionShape2D } from './collision_shape_2d';
import { CollisionPolygon2D } from './collision_polygon_2d';
import { NOTIFICATION_TRANSFORM_CHANGED } from '../const';


class Shape {
    shape: Shape2D = null;
    index = 0;
}
class ShapeData {
    owner: Node2D = null;
    xform = new Transform2D;
    shapes: Shape[] = [];
    disabled = false;
    one_way_collision = false;
    one_way_collision_margin = 0;
}

export enum CollisionObjectTypes {
    NONE,
    AREA,
    RIGID,
    KINEMATIC,
    STATIC,
};

export class CollisionObject2D extends Node2D {
    get class() { return 'CollisionObject2D' }

    set_pickable(p_enabled: boolean) {
        if (this.pickable === p_enabled) return;
        this.pickable = p_enabled;
        this._update_pickable();
    }

    is_collision_object = true;

    pickable = false;

    area: boolean;
    rid: CollisionObject2DSW;

    total_subshapes = 0;
    shapes: Map<Node2D, ShapeData> = new Map;
    last_transform = new Transform2D;
    only_update_transform_changes = false;

    /**
     * @param {CollisionObject2DSW} p_rid
     * @param {boolean} p_area
     */
    constructor(p_rid: CollisionObject2DSW, p_area: boolean) {
        super();

        this.area = p_area;
        this.rid = p_rid;

        this.set_notify_transform(true);

        if (p_area) {
            Physics2DServer.get_singleton().area_attach_object_instance(this.rid as Area2DSW, this);
        } else {
            Physics2DServer.get_singleton().body_attach_object_instance(this.rid as Body2DSW, this);
        }
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                const global_transform = this.get_global_transform();

                if (this.area) {
                    Physics2DServer.get_singleton().area_set_transform(this.rid as Area2DSW, global_transform);
                } else {
                    Physics2DServer.get_singleton().body_set_state(this.rid as Body2DSW, BodyState.TRANSFORM, global_transform);
                }

                this.last_transform.copy(global_transform);

                const space = this.get_world_2d().space;
                if (this.area) {
                    Physics2DServer.get_singleton().area_set_space(this.rid as Area2DSW, space);
                } else {
                    Physics2DServer.get_singleton().body_set_space(this.rid as Body2DSW, space);
                }

                this._update_pickable();
            } break;
            case NOTIFICATION_VISIBILITY_CHANGED: {
                this._update_pickable();
            } break;
            case NOTIFICATION_TRANSFORM_CHANGED: {
                const global_transform = this.get_global_transform();

                if (this.only_update_transform_changes && global_transform.equals(this.last_transform)) {
                    return;
                }

                if (this.area) {
                    Physics2DServer.get_singleton().area_set_transform(this.rid as Area2DSW, global_transform);
                } else {
                    Physics2DServer.get_singleton().body_set_state(this.rid as Body2DSW, BodyState.TRANSFORM, global_transform);
                }

                this.last_transform.copy(global_transform);
            } break;
            case NOTIFICATION_EXIT_TREE: {
                if (this.area) {
                    Physics2DServer.get_singleton().area_set_space(this.rid as Area2DSW, null);
                } else {
                    Physics2DServer.get_singleton().body_set_space(this.rid as Body2DSW, null);
                }
            } break;
            case NOTIFICATION_EXIT_CANVAS: {
                if (this.area) {
                    // @ts-ignore
                    Physics2DServer.get_singleton().area_attach_object_instance(this.rid as Area2DSW, null);
                } else {
                    // @ts-ignore
                    Physics2DServer.get_singleton().body_attach_object_instance(this.rid as Body2DSW, null);
                }
            } break;
        }
    }

    /* public */

    create_shape_owner(p_owner: Node2D) {
        const sd = new ShapeData;
        sd.owner = p_owner;
        this.shapes.set(p_owner, sd);
        return p_owner;
    }
    remove_shape_owner(p_owner: Node2D) {
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
    shape_owner_set_transform(p_owner: Node2D, p_transform: Transform2D) {
        const sd = this.shapes.get(p_owner);
        sd.xform.copy(p_transform);
        for (let s of sd.shapes) {
            if (this.area) {
                Physics2DServer.get_singleton().area_set_shape_transform(this.rid as Area2DSW, s.index, p_transform);
            } else {
                Physics2DServer.get_singleton().body_set_shape_transform(this.rid as Body2DSW, s.index, p_transform);
            }
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    shape_owner_get_transform(p_owner: Node2D) {
        return this.shapes.get(p_owner).xform;
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    shape_owner_get_owner(p_owner: Node2D) {
        return this.shapes.get(p_owner).owner;
    }

    shape_owner_set_disabled(p_owner: Node2D, p_disabled: boolean) {
        const sd = this.shapes.get(p_owner);
        sd.disabled = p_disabled;
        for (let i = 0; i < sd.shapes.length; i++) {
            if (this.area) {
                Physics2DServer.get_singleton().area_set_shape_disabled(this.rid as Area2DSW, i, p_disabled);
            } else {
                Physics2DServer.get_singleton().body_set_shape_disabled(this.rid as Body2DSW, i, p_disabled);
            }
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    is_shape_owner_disabled(p_owner: Node2D) {
        return this.shapes.get(p_owner).disabled;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {boolean} p_enable
     */
    shape_owner_set_one_way_collision(p_owner: Node2D, p_enable: boolean) {
        if (this.area) {
            return;
        }

        const sd = this.shapes.get(p_owner);
        sd.one_way_collision = p_enable;
        for (let s of sd.shapes) {
            Physics2DServer.get_singleton().body_set_shape_as_one_way_collision(this.rid as Body2DSW, s.index, sd.one_way_collision, sd.one_way_collision_margin);
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    is_shape_owner_one_way_collision(p_owner: Node2D) {
        return this.shapes.get(p_owner).one_way_collision;
    }

    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     * @param {number} p_margin
     */
    shape_owner_set_one_way_collision_margin(p_owner: Node2D, p_margin: number) {
        if (this.area) {
            return;
        }

        const sd = this.shapes.get(p_owner);
        sd.one_way_collision_margin = p_margin;
        for (let s of sd.shapes) {
            Physics2DServer.get_singleton().body_set_shape_as_one_way_collision(this.rid as Body2DSW, s.index, sd.one_way_collision, sd.one_way_collision_margin);
        }
    }
    /**
     * @param {CollisionShape2D|CollisionPolygon2D} p_owner
     */
    get_shape_owner_one_way_collision_margin(p_owner: Node2D) {
        return this.shapes.get(p_owner).one_way_collision_margin;
    }

    shape_owner_add_shape(p_owner: Node2D, p_shape: Shape2D) {
        const sd = this.shapes.get(p_owner);
        const s = new Shape;
        s.index = this.total_subshapes;
        s.shape = p_shape;
        if (this.area) {
            Physics2DServer.get_singleton().area_add_shape(this.rid as Area2DSW, p_shape.shape, sd.xform);
        } else {
            Physics2DServer.get_singleton().body_add_shape(this.rid as Body2DSW, p_shape.shape, sd.xform);
        }
        sd.shapes.push(s);

        this.total_subshapes++;
    }
    shape_owner_get_shape_count(p_owner: Node2D) {
        return this.shapes.get(p_owner).shapes.length;
    }
    shape_owner_get_shape(p_owner: Node2D, p_shape: number) {
        return this.shapes.get(p_owner).shapes[p_shape].shape;
    }
    shape_owner_get_shape_index(p_owner: Node2D, p_shape: number) {
        return this.shapes.get(p_owner).shapes[p_shape].index;
    }

    shape_owner_remove_shape(p_owner: Node2D, p_shape: number) {
        const index_to_remove = this.shapes.get(p_owner).shapes[p_shape].index;
        if (this.area) {
            Physics2DServer.get_singleton().area_remove_shape(this.rid as Area2DSW, index_to_remove);
        } else {
            Physics2DServer.get_singleton().body_remove_shape(this.rid as Body2DSW, index_to_remove);
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
    shape_owner_clear_shapes(p_owner: Node2D) {
        while (this.shape_owner_get_shape_count(p_owner) > 0) {
            this.shape_owner_remove_shape(p_owner, 0);
        }
    }

    /**
     * @param {number} p_shape_index
     */
    shape_find_owner(p_shape_index: number) {
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
            Physics2DServer.get_singleton().area_set_pickable(this.rid as Area2DSW, is_pickable);
        } else {
            Physics2DServer.get_singleton().body_set_pickable(this.rid as Body2DSW, is_pickable);
        }
    }
}
GDCLASS(CollisionObject2D, Node2D)
