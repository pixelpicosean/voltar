import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2 } from "engine/core/math/vector2";

import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";
import { RayResult } from "engine/servers/physics_2d/state";
import { CollisionObject2DSW } from "engine/servers/physics_2d/collision_object_2d_sw";

import {
    NOTIFICATION_ENTER_TREE,
    NOTIFICATION_EXIT_TREE,
    NOTIFICATION_INTERNAL_PHYSICS_PROCESS,
} from "../main/node";
import { Node2D } from "./node_2d";
import { CollisionObject2D } from "./collision_object_2d";


export class RayCast2D extends Node2D {
    get class() { return 'RayCast2D' }

    get collision_mask() { return this._collision_mask }
    set collision_mask(value) { this.set_collision_mask(value) }

    get _enabled() { return this._enabled }
    set _enabled(value) { this.set_enabled(value) }

    get _exclude_parent() { return this._exclude_parent }
    set _exclude_parent(value) { this.set_exclude_parent(value) }

    constructor() {
        super();

        this._enabled = false;
        this.collided = false;
        this.against = null;
        this.against_shape = 0;
        this.collision_point = new Vector2();
        this.collision_normal = new Vector2();
        /** @type {Set<CollisionObject2DSW>} */
        this.exclude = new Set();
        this._collision_mask = 1;
        this._exclude_parent = false;

        this.cast_to = new Vector2(0, 50);

        this.collide_with_areas = false;
        this.collide_with_bodies = true;
    }

    /* virtual */

    _load_data(data) {
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
            this._collision_mask = data.collision_mask;
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
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                if (this._enabled) {
                    this.set_physics_process_internal(true);
                } else {
                    this.set_physics_process_internal(false);
                }

                const parent = /** @type {CollisionObject2D} */(this.get_parent());
                if (parent.is_collision_object) {
                    if (this._exclude_parent) {
                        this.exclude.add(parent.rid);
                    } else {
                        this.exclude.delete(parent.rid);
                    }
                }
            } break;
            case NOTIFICATION_EXIT_TREE: {
                if (this._enabled) {
                    this.set_physics_process_internal(false);
                }
            } break;
            case NOTIFICATION_INTERNAL_PHYSICS_PROCESS: {
                if (!this._enabled) break;
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
    get_collision_mask_bit(bit) {
        return !!(this._collision_mask & (1 << bit));
    }
    /**
     * @param {number} mask
     */
    set_collision_mask(mask) {
        this._collision_mask = mask;
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
            this._collision_mask |= (1 << bit);
        } else {
            this._collision_mask &= ~(1 << bit);
        }
    }

    /**
     * @param {boolean} p_enabled
     */
    set_enabled(p_enabled) {
        this._enabled = p_enabled;
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
    set_exclude_parent(p_exclude_parent_body) {
        if (this._exclude_parent === p_exclude_parent_body) {
            return;
        }

        this._exclude_parent = p_exclude_parent_body;

        if (!this.is_inside_tree()) {
            return;
        }

        const parent = /** @type {CollisionObject2D} */(this.get_parent());
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
    add_exception(p_object) {
        this.exclude.add(p_object.rid);
    }
    /**
     * @param {CollisionObject2D} p_object
     */
    remove_exception(p_object) {
        this.exclude.delete(p_object.rid);
    }
    clear_exceptions() {
        this.exclude.clear();
    }

    /* private */

    _update_raycast_state() {
        const dss = Physics2DServer.get_singleton().space_get_direct_state(this.get_world_2d().space);

        const gt = this.get_global_transform().clone();

        const to = this.cast_to.clone();
        if (to.is_zero()) {
            to.set(0, 0.01);
        }

        const rr = new RayResult();

        const origin = gt.get_origin();
        if (dss.intersect_ray(origin, gt.xform(to, to), rr, this.exclude, this._collision_mask, this.collide_with_bodies, this.collide_with_areas)) {
            this.collided = true;
            this.against = rr.collider_id;
            this.collision_point.copy(rr.position);
            this.collision_normal.copy(rr.normal);
            this.against_shape = rr.shape;
        } else {
            this.collided = false;
            this.against = null;
            this.against_shape = 0;
        }
        Vector2.free(origin);
    }
}
node_class_map['RayCast2D'] = GDCLASS(RayCast2D, Node2D)
