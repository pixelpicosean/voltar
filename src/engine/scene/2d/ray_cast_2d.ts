import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";
import { CollisionObject2DSW } from "engine/servers/physics_2d/collision_object_2d_sw";
import { RayResult } from "engine/servers/physics_2d/space_2d_sw";

import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
} from "../main/node";
import { Node2D } from "./node_2d";
import { CollisionObject2D } from "./collision_object_2d";


export class RayCast2D extends Node2D {
    get class() { return 'RayCast2D' }

    enabled = false;
    collided = false;
    against: Node2D = null;
    against_shape = 0;
    collision_point = new Vector2;
    collision_normal = new Vector2;
    exclude: Set<CollisionObject2DSW> = new Set;
    collision_mask = 1;
    exclude_parent = false;

    cast_to = new Vector2(0, 50);

    collide_with_areas = false;
    collide_with_bodies = true;

    /* virtual */

    _load_data(data: any) {
        super._load_data(data);

        if (data.cast_to !== undefined) {
            this.cast_to.copy(data.cast_to);
        }
        if (data.collide_with_ares !== undefined) {
            this.collide_with_areas = data.collide_with_ares;
        }
        if (data.collide_with_bodies !== undefined) {
            this.collide_with_bodies = data.collide_with_bodies;
        }
        if (data.collision_mask !== undefined) {
            this.set_collision_mask(data.collision_mask);
        }
        if (data.enabled !== undefined) {
            this.set_enabled(data.enabled);
        }
        if (data.exclude_parent !== undefined) {
            this.set_exclude_parent(data.exclude_parent);
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what: number) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (this.enabled) {
                    this.set_physics_process_internal(true);
                } else {
                    this.set_physics_process_internal(false);
                }

                const parent: CollisionObject2D = this.get_parent() as CollisionObject2D;
                if (parent.is_collision_object) {
                    if (this.exclude_parent) {
                        this.exclude.add(parent.rid);
                    } else {
                        this.exclude.delete(parent.rid);
                    }
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                if (this.enabled) {
                    this.set_physics_process_internal(false);
                }
            } break;
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: {
                if (!this.enabled) break;
                this._update_raycast_state();
            }
        }
    }

    /* public */

    /**
     * Return an individual bit on the collision mask. Describes whether
     * this area will collide with others on the given layer.
     *
     * @param {number} bit
     */
    get_collision_mask_bit(bit: number) {
        return !!(this.collision_mask & (1 << bit));
    }
    /**
     * @param {number} mask
     */
    set_collision_mask(mask: number) {
        this.collision_mask = mask;
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {number} bit
     * @param {boolean} value
     */
    set_collision_mask_bit(bit: number, value: boolean) {
        if (value) {
            this.collision_mask |= (1 << bit);
        } else {
            this.collision_mask &= ~(1 << bit);
        }
    }

    /**
     * @param {boolean} p_enabled
     */
    set_enabled(p_enabled: boolean) {
        this.enabled = p_enabled;
        if (this.is_inside_tree()) {
            this.set_physics_process_internal(p_enabled);
        }
        if (!p_enabled) {
            this.collided = false;
        }
    }

    /**
     * @param {boolean} p_exclude_parent_body
     */
    set_exclude_parent(p_exclude_parent_body: boolean) {
        if (this.exclude_parent === p_exclude_parent_body) {
            return;
        }

        this.exclude_parent = p_exclude_parent_body;

        if (!this.is_inside_tree()) {
            return;
        }

        const parent: CollisionObject2D = this.get_parent() as CollisionObject2D;
        if (parent.is_collision_object) {
            this.exclude.add(parent.rid);
        } else {
            this.exclude.delete(parent.rid);
        }
    }

    force_raycast_update() {
        this._update_raycast_state();
    }

    /**
     * @param {CollisionObject2D} p_object
     */
    add_exception(p_object: CollisionObject2D) {
        this.exclude.add(p_object.rid);
    }
    /**
     * @param {CollisionObject2D} p_object
     */
    remove_exception(p_object: CollisionObject2D) {
        this.exclude.delete(p_object.rid);
    }
    clear_exceptions() {
        this.exclude.clear();
    }

    /* private */

    _update_raycast_state() {
        let dss = Physics2DServer.get_singleton().space_get_direct_state(this.get_world_2d().space);

        let gt = this.get_global_transform().clone();

        let to = this.cast_to.clone();
        if (to.is_zero()) {
            to.set(0, 0.01);
        }

        let rr = RayResult.create();

        let origin = gt.get_origin();
        if (dss.intersect_ray(origin, gt.xform(to, to), rr, this.exclude, this.collision_mask, this.collide_with_bodies, this.collide_with_areas)) {
            this.collided = true;
            this.against = rr.collider;
            this.collision_point.copy(rr.position);
            this.collision_normal.copy(rr.normal);
            this.against_shape = rr.shape;
        } else {
            this.collided = false;
            this.against = null;
            this.against_shape = 0;
        }
        Vector2.free(origin);

        RayResult.free(rr);
    }
}
node_class_map['RayCast2D'] = GDCLASS(RayCast2D, Node2D)
