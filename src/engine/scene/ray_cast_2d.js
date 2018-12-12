import Node2D from "./Node2D";
import { Vector2 } from "engine/math/index";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import { RayResult } from "engine/servers/physics_2d/state";
import CollisionObject2D from "./physics/collision_object_2d";
import CollisionObject2DSW from "engine/servers/physics_2d/collision_object_2d_sw";

export default class RayCast2D extends Node2D {
    constructor() {
        super();

        this.type = 'RayCast2D';

        this.enabled = false;
        this.collided = false;
        this.against = null;
        this.against_shape = 0;
        this.collision_point = new Vector2();
        this.collision_normal = new Vector2();
        /** @type {Set<CollisionObject2DSW>} */
        this.exclude = new Set();
        this.collision_mask = 1;
        this.exclude_parent_body = false;

        this.cast_to = new Vector2();

        this.collide_with_ares = false;
        this.collide_with_bodies = false;
    }
    _propagate_enter_tree() {
        super._propagate_enter_tree();

        if (this.enabled) {
            this.set_physics_process(true);
        } else {
            this.set_physics_process(false);
        }

        if (this.parent.is_collision_object) {
            if (this.exclude_parent_body) {
                // @ts-ignore (cast<CollisionObject2D>)
                this.exclude.add(this.parent.rid);
            } else {
                // @ts-ignore (cast<CollisionObject2D>)
                this.exclude.delete(this.parent.rid);
            }
        }
    }
    _propagate_exit_tree() {
        if (!this.enabled) {
            this.set_physics_process(false);
        }

        super._propagate_exit_tree();
    }
    _physics_process() {
        if (!this.enabled) {
            return;
        }
        this._update_raycast_state();
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

    _update_raycast_state() {
        const dss = PhysicsServer.singleton.space_get_direct_state(this.get_world_2d().space);

        const gt = this.get_global_transform().clone();

        const to = this.cast_to.clone();
        if (to.is_zero()) {
            to.set(0, 0.01);
        }

        const rr = new RayResult();

        if (dss.intersect_ray(gt.origin, gt.xform(to, to), rr, this.exclude, this.collision_mask, this.collide_with_bodies, this.collide_with_ares)) {
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
    }
}
