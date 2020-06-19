import { node_class_map } from "engine/registry";
import { GDCLASS } from "engine/core/v_object";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { ProjectSettings } from "engine/core/project_settings";
import { Engine } from "engine/core/engine";
import { Physics2DServer } from "engine/servers/physics_2d/physics_2d_server";
import { Body2DSW } from "engine/servers/physics_2d/body_2d_sw";
import {
    MotionResult,
    SeparationResult,
    Physics2DDirectBodyStateSW,
} from "engine/servers/physics_2d/state";

import { NOTIFICATION_ENTER_TREE } from "../main/node";
import { PhysicsMaterial } from "../resources/physics_material";
import { BodyMode, BodyState } from "./const";
import { NOTIFICATION_LOCAL_TRANSFORM_CHANGED } from "./canvas_item";
import { CollisionObject2D } from "./collision_object_2d";


export class PhysicsBody2D extends CollisionObject2D {
    get class() { return 'PhysicsBody2D' }

    get collision_layer() { return this._collision_layer }
    set collision_layer(value) { this.set_collision_layer(value) }

    get collision_mask() { return this._collision_mask }
    set collision_mask(value) { this.set_collision_mask(value) }

    get layers() { return this._collision_layer }
    set layers(p_mask) {
        this.set_collision_layer(p_mask);
        this.set_collision_mask(p_mask);
    }

    /**
     * @param {BodyMode} p_mode
     */
    constructor(p_mode) {
        super(Physics2DServer.get_singleton().body_create(), false);

        this._collision_layer = 1;
        this._collision_mask = 1;

        /**
         * @type {Body2DSW}
         */
        this.rid;

        this.rid.set_mode(p_mode);
    }
    _load_data(data) {
        super._load_data(data);

        if (data.collision_layer !== undefined) {
            this.set_collision_layer(data.collision_layer);
        }
        if (data.collision_mask !== undefined) {
            this.set_collision_mask(data.collision_mask);
        }

        return this;
    }

    get_collision_exception() { }
    add_collision_exception_with(p_node) { }
    remove_collision_exception_with(p_node) { }

    /* public */

    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     */
    get_collision_layer_bit(bit) {
        return !!(this._collision_layer & (1 << bit));
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {string} layer_name
     */
    get_collision_layer_bit_named(layer_name) {
        return !!(this._collision_layer & (1 << ProjectSettings.get_singleton().get_physics_layer_bit(layer_name)));
    }
    /**
     * @param {number} layer
     */
    set_collision_layer(layer) {
        this._collision_layer = layer;
        if (this.rid) {
            this.rid.collision_layer = this._collision_layer;
        }
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
            this._collision_layer |= 1 << bit;
        } else {
            this._collision_layer &= ~(1 << bit);
        }

        if (this.rid) {
            this.rid.collision_layer = this._collision_layer;
        }
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {string} layer_name
     * @param {boolean} value
     */
    set_collision_layer_bit_named(layer_name, value) {
        if (value) {
            this._collision_layer |= ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        } else {
            this._collision_layer &= ~ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        }

        if (this.rid) {
            this.rid.collision_layer = this._collision_layer;
        }
    }

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
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {string} layer_name
     */
    get_collision_mask_bit_named(layer_name) {
        return !!(this._collision_mask & (1 << ProjectSettings.get_singleton().get_physics_layer_bit(layer_name)));
    }
    /**
     * @param {number} mask
     */
    set_collision_mask(mask) {
        this._collision_mask = mask;

        if (this.rid) {
            this.rid.collision_mask = this._collision_mask;
        }
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
            this._collision_mask |= 1 << bit;
        } else {
            this._collision_mask &= ~(1 << bit);
        }

        if (this.rid) {
            this.rid.collision_mask = this._collision_mask;
        }
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {string} layer_name
     * @param {boolean} value
     */
    set_collision_mask_bit_named(layer_name, value) {
        if (value) {
            this._collision_mask |= ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        } else {
            this._collision_mask &= ~ProjectSettings.get_singleton().get_physics_layer_value(layer_name);
        }

        if (this.rid) {
            this.rid.collision_mask = this._collision_mask;
        }
    }
}
GDCLASS(PhysicsBody2D, CollisionObject2D)


export class StaticBody2D extends PhysicsBody2D {
    get class() { return 'StaticBody2D' }

    get constant_angular_velocity() { return this._constant_angular_velocity }
    set constant_angular_velocity(value) { this.set_constant_angular_velocity(value) }

    get constant_linear_velocity() { return this._constant_linear_velocity }
    set constant_linear_velocity(value) { this.set_constant_linear_velocity(value) }

    get physics_material_override() { return this._physics_material_override }
    set physics_material_override(value) { this.set_physics_material_override(value) }

    constructor() {
        super(BodyMode.STATIC);

        this._constant_linear_velocity = new Vector2();
        this._constant_angular_velocity = 0;

        /**
         * @type {PhysicsMaterial}
         */
        this._physics_material_override = null;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.constant_angular_velocity !== undefined) {
            this._constant_angular_velocity = data.constant_angular_velocity;
        }
        if (data.constant_linear_velocity !== undefined) {
            this._constant_linear_velocity.copy(data.constant_linear_velocity);
        }
        if (data.physics_material_override !== undefined) {
            // TODO: load physics_material_override
        }

        return this;
    }

    /* public */

    /**
     * @param {PhysicsMaterial} p_physics_material_override
     */
    set_physics_material_override(p_physics_material_override) {
        if (this._physics_material_override) {
            this._physics_material_override.disconnect('changed', this._reload_physics_characteristics, this);
        }

        this._physics_material_override = p_physics_material_override;

        if (p_physics_material_override) {
            p_physics_material_override.connect('changed', this._reload_physics_characteristics, this);
        }
        this._reload_physics_characteristics();
    }

    /**
     * @param {Vector2Like} p_linear_velocity
     */
    set_constant_linear_velocity(p_linear_velocity) {
        this.set_constant_linear_velocity_n(p_linear_velocity.x, p_linear_velocity.y);
    }
    /**
     * @param {number} x
     * @param {number} y
     */
    set_constant_linear_velocity_n(x, y) {
        this._constant_linear_velocity.set(x, y);
        this.rid.set_state(BodyState.LINEAR_VELOCITY, this._constant_linear_velocity);
    }

    /**
     * @param {number} p_angular_velocity
     */
    set_constant_angular_velocity(p_angular_velocity) {
        this._constant_angular_velocity = p_angular_velocity;
        this.rid.set_state(BodyState.ANGULAR_VELOCITY, this._constant_angular_velocity);
    }

    /* private */

    _reload_physics_characteristics() {
        if (!this._physics_material_override) {
            this.rid.bounce = 0;
            this.rid.friction = 1;
        } else {
            this.rid.bounce = this._physics_material_override.get_computed_bounce();
            this.rid.friction = this._physics_material_override.get_computed_friction();
        }
    }
}
node_class_map['StaticBody2D'] = GDCLASS(StaticBody2D, PhysicsBody2D)


/** @type {Collision[]} */
const Collision_Pool = [];
class Collision {
    static new() {
        const i = Collision_Pool.pop();
        if (i) {
            return i.reset();
        } else {
            return new Collision();
        }
    }
    /**
     * @param {Collision} c
     */
    static free(c) {
        if (c && Collision_Pool.length < 2019) {
            Collision_Pool.push(c);
        }
        return Collision;
    }
    constructor() {
        this.collision = new Vector2();
        this.normal = new Vector2();
        this.collider_vel = new Vector2();
        /** @type {StaticBody2D|KinematicBody2D} */
        this.collider = null;
        this.collider_rid = null;
        this.collider_shape = 0;
        this.collider_metadata = null;
        this.remainder = new Vector2();
        this.travel = new Vector2();
        this.local_shape = 0;
    }
    reset() {
        this.collision.set(0, 0);
        this.normal.set(0, 0);
        this.collider_vel.set(0, 0);
        this.collider = null;
        this.collider_rid = null;
        this.collider_shape = 0;
        this.collider_metadata = null;
        this.remainder.set(0, 0);
        this.travel.set(0, 0);
        this.local_shape = 0;
        return this;
    }
}

/** @type {KinematicCollision2D[]} */
const KinematicCollision2D_Pool = [];
export class KinematicCollision2D {
    static new() {
        const k = KinematicCollision2D_Pool.pop();
        if (!k) {
            return new KinematicCollision2D();
        } else {
            return k.reset();
        }
    }
    static free(k) {
        if (k && KinematicCollision2D_Pool.length < 2019) {
            KinematicCollision2D_Pool.push(k);
        }
        return KinematicCollision2D;
    }
    get position() { return this.collision.collision }
    get normal() { return this.collision.normal }
    get travel() { return this.collision.travel }
    get remainder() { return this.collision.remainder }
    get local_shape() { return this.owner.shape_find_owner(this.collision.local_shape) }
    get collider() { return this.collision.collider }
    get collider_shape() {
        if (this.collider) {
            if (this.collider.is_collision_object) {
                // @ts-ignore (cast_to<CollisionObject2D>)
                return this.collider.shape_find_owner(this.collision.collider_shape);
            }
        }
        return null;
    }
    get collider_shape_index() { return this.collision.collider_shape }
    get collider_velocity() { return this.collision.collider_vel }
    constructor() {
        /** @type {KinematicBody2D} */
        this.owner = null;
        this.collision = new Collision();
        this.metadata = {};
    }
    reset() {
        this.owner = null;
        this.collision.reset();
        this.metadata = {};
        return this;
    }
}

const col = new Collision();
const motion_result = new MotionResult();
const sep_res = (() => {
    /** @type {SeparationResult[]} */
    const arr = new Array(8);
    for (let i = 0; i < 8; i++) arr[i] = new SeparationResult();
    return arr;
})()
const get_sep_res = () => {
    for (let s of sep_res) s.reset();
    return sep_res;
}

const FLOOR_ANGLE_THRESHOLD = 0.01;

export class KinematicBody2D extends PhysicsBody2D {
    get class() { return 'KinematicBody2D' }

    get sync_to_physics() { return this._sync_to_physics }
    set sync_to_physics(value) { this.set_sync_to_physics(value) }

    constructor() {
        super(BodyMode.KINEMATIC);

        this.margin = 0.08;

        this.floor_velocity = new Vector2;
        this.floor_normal = new Vector2;
        /** @type {PhysicsBody2D} */
        this.on_floor_body = null;
        this.on_floor = false;
        this.on_ceiling = false;
        this.on_wall = false;
        this._sync_to_physics = false;

        /** @type {Collision[]} */
        this.colliders = [];
        /** @type {KinematicCollision2D[]} */
        this.slide_colliders = [];
        /** @type {KinematicCollision2D} */
        this.motion_cache = null;

        this.last_valid_transform = new Transform2D;
    }

    /* virtual */

    _load_data(data) {
        super._load_data(data);

        if (data.safe_margin !== undefined) {
            this.margin = data.safe_margin;
        }

        return this;
    }

    /**
     * @param {number} p_what
     */
    _notification(p_what) {
        switch (p_what) {
            case NOTIFICATION_ENTER_TREE: {
                this.last_valid_transform.copy(this.get_global_transform());

                // reset move_and_slide data
                this.on_floor = false;
                this.on_floor_body = null;
                this.on_ceiling = false;
                this.on_wall = false;
                this.colliders.length = 0;
                this.floor_velocity.set(0, 0);
            } break;
            case NOTIFICATION_LOCAL_TRANSFORM_CHANGED: {
                const new_transform = this.get_global_transform();
                this.rid.set_state(BodyState.TRANSFORM, new_transform);
                this.set_notify_local_transform(false);
                this.set_global_transform(this.last_valid_transform);
                this.set_notify_local_transform(true);
            } break;
        }
    }

    /* public */

    /**
     * @param {Vector2} p_motion
     * @param {boolean} [p_infinite_inertia]
     * @param {boolean} [p_exclude_raycast_shapes]
     * @param {boolean} [p_test_only]
     */
    move_and_collide(p_motion, p_infinite_inertia = true, p_exclude_raycast_shapes = true, p_test_only = false) {
        col.reset();

        if (this._move(p_motion, p_infinite_inertia, col, p_exclude_raycast_shapes, p_test_only)) {
            if (!this.motion_cache) {
                this.motion_cache = KinematicCollision2D.new();
                this.motion_cache.owner = this;
            }

            this.motion_cache.collision = col;

            return this.motion_cache;
        }

        return null;
    }


    /**
     * @param {Transform2D} p_from
     * @param {Vector2} p_motion
     * @param {boolean} [p_infinite_inertia]
     */
    test_move(p_from, p_motion, p_infinite_inertia = true) {
        return Physics2DServer.get_singleton().body_test_motion(this.rid, p_from, p_motion, p_infinite_inertia, this.margin);
    }

    /**
     * @param {boolean} p_infinite_inertia
     * @param {Collision} r_collision
     */
    separate_raycast_shapes(p_infinite_inertia, r_collision) {
        const sep_res = get_sep_res();

        const gt = this.get_global_transform().clone();

        const recover = Vector2.new();
        const hits = this.rid.space.test_body_ray_separation(this.rid, gt, p_infinite_inertia, recover, sep_res, 8, this.margin);
        let deepest = -1;
        let deepest_depth = 0;
        for (let i = 0; i < hits; i++) {
            if (deepest === -1 || sep_res[i].collision_depth > deepest_depth) {
                deepest = i;
                deepest_depth = sep_res[i].collision_depth;
            }
        }

        gt.tx += recover.x;
        gt.ty += recover.y;
        this.set_global_transform(gt);

        if (deepest !== -1) {
            r_collision.collider = sep_res[deepest].collider_id;
            r_collision.collider_metadata = sep_res[deepest].collider_metadata;
            r_collision.collider_shape = sep_res[deepest].collider_shape;
            r_collision.collider_vel.copy(sep_res[deepest].collider_velocity);
            r_collision.collision.copy(sep_res[deepest].collision_point);
            r_collision.normal.copy(sep_res[deepest].collision_normal);
            r_collision.local_shape = sep_res[deepest].collision_local_shape;
            r_collision.travel.copy(recover);
            r_collision.remainder.set(0, 0);

            Transform2D.free(gt);
            Vector2.free(recover);
            return true;
        } else {
            Transform2D.free(gt);
            Vector2.free(recover);
            return false;
        }
    }

    /**
     * @param {Vector2} p_linear_velocity
     * @param {Vector2} [p_up_direction]
     * @param {boolean} [p_stop_on_slope]
     * @param {number} [p_max_slides]
     * @param {number} [p_floor_max_angle]
     * @param {boolean} [p_infinite_inertia]
     */
    move_and_slide(p_linear_velocity, p_up_direction = Vector2.ZERO, p_stop_on_slope = false, p_max_slides = 4, p_floor_max_angle = Math.PI * 0.25, p_infinite_inertia = true) {
        let body_velocity = p_linear_velocity.clone();
        let body_velocity_normal = body_velocity.normalized();
        let up_direction = p_up_direction.normalized();

        let current_floor_velocity = this.floor_velocity.clone();
        if (this.on_floor && this.on_floor_body) {
            // this approach makes sure there is less delay between the actual body velocity
            // and the one we saved
            let bs = this.on_floor_body.rid;
            if (bs) {
                current_floor_velocity.copy(bs.linear_velocity);
            }
        }

        // hack in order to work with calling from _process as well as from _physics_process
        let motion = current_floor_velocity.clone().add(body_velocity).scale(Engine.get_singleton().is_in_physics_frame() ? this.get_physics_process_delta_time() : this.get_process_delta_time());

        this.on_floor = false;
        this.on_floor_body = null;
        this.on_ceiling = false;
        this.on_wall = false;
        this.colliders.length = 0;
        this.floor_normal.set(0, 0);
        this.floor_velocity.set(0, 0);

        while (p_max_slides) {
            let collision = Collision.new();
            let found_collision = false;

            for (let i = 0; i < 2; i++) {
                let collided = false;
                if (i === 0) { // collide
                    collided = this._move(motion, p_infinite_inertia, collision);
                    if (!collided) {
                        motion.set(0, 0); // clear because no collision happened and motion completed
                    }
                } else { // separate raycasts (if any)
                    collided = this.separate_raycast_shapes(p_infinite_inertia, collision);
                    if (collided) {
                        collision.remainder.copy(motion); // keep
                        collision.travel.set(0, 0);
                    }
                }

                if (collided) {
                    found_collision = true;

                    this.colliders.push(collision);
                    motion.copy(collision.remainder);

                    if (up_direction.is_zero()) {
                        // all is a wall
                        this.on_wall = true;
                    } else {
                        let negate_floor_direction = up_direction.clone().negate();
                        if (Math.acos(collision.normal.dot(up_direction)) <= p_floor_max_angle + FLOOR_ANGLE_THRESHOLD) { // floor
                            this.on_floor = true;
                            this.floor_normal.copy(collision.normal);
                            this.on_floor_body = collision.collider;
                            this.floor_velocity.copy(collision.collider_vel);

                            if (p_stop_on_slope) {
                                let vec = body_velocity_normal.clone().add(up_direction);
                                if (vec.length() < 0.01 && collision.travel.length() < 1) {
                                    let gt = this.get_global_transform().clone();
                                    let proj = collision.travel.clone().slide(up_direction);
                                    gt.tx -= proj.x;
                                    gt.ty -= proj.y;
                                    this.set_global_transform(gt);
                                    Vector2.free(proj);
                                    Transform2D.free(gt);

                                    Vector2.free(vec);
                                    Collision.free(collision);
                                    Vector2.free(motion);
                                    Vector2.free(current_floor_velocity);
                                    Vector2.free(up_direction);
                                    Vector2.free(body_velocity_normal);
                                    Vector2.free(body_velocity);

                                    return Vector2.new(0, 0);
                                }
                            }
                        } else if (Math.acos(collision.normal.dot(negate_floor_direction)) <= p_floor_max_angle + FLOOR_ANGLE_THRESHOLD) { // ceiling
                            this.on_ceiling = true;
                        } else {
                            this.on_wall = true;
                        }
                        Vector2.free(negate_floor_direction);
                    }

                    motion.slide(collision.normal);
                    body_velocity.slide(collision.normal);
                }
            }

            if (!found_collision || motion.is_zero()) {
                Collision.free(collision);
                break;
            }

            Collision.free(collision);
            p_max_slides--;
        }

        Vector2.free(motion);
        Vector2.free(current_floor_velocity);
        Vector2.free(up_direction);
        Vector2.free(body_velocity_normal);

        return body_velocity;
    }
    /**
     * @param {Vector2} p_linear_velocity
     * @param {Vector2} p_snap
     * @param {Vector2} [p_up_direction]
     * @param {boolean} [p_stop_on_slope]
     * @param {number} [p_max_slides]
     * @param {number} [p_floor_max_angle]
     * @param {boolean} [p_infinite_inertia]
     */
    move_and_slide_with_snap(p_linear_velocity, p_snap, p_up_direction = Vector2.ZERO, p_stop_on_slope = false, p_max_slides = 4, p_floor_max_angle = Math.PI * 0.25, p_infinite_inertia = true) {
        let up_direction = p_up_direction.normalized();
        let was_on_floor = this.on_floor;

        let ret = this.move_and_slide(p_linear_velocity, up_direction, p_stop_on_slope, p_max_slides, p_floor_max_angle, p_infinite_inertia);
        if (!was_on_floor || p_snap.is_zero()) {
            Vector2.free(up_direction);
            return ret;
        }

        let col = Collision.new();
        let gt = this.get_global_transform().clone();

        if (this._move(p_snap, p_infinite_inertia, col, false, true)) {
            let apply = true;
            if (!up_direction.is_zero()) {
                if (Math.acos(col.normal.dot(up_direction)) <= p_floor_max_angle + FLOOR_ANGLE_THRESHOLD) {
                    this.on_floor = true;
                    this.floor_normal.copy(col.normal);
                    this.on_floor_body = col.collider_rid;
                    this.floor_velocity.copy(col.collider_vel);
                    if (p_stop_on_slope) {
                        col.travel
                            .copy(up_direction)
                            .scale(up_direction.dot(col.travel))
                    }
                } else {
                    apply = false;
                }
            }

            if (apply) {
                gt.tx += col.travel.x;
                gt.ty += col.travel.y;
                this.set_global_transform(gt);
            }
        }

        Transform2D.free(gt);
        Collision.free(col);
        return ret;
    }

    get_slide_count() {
        return this.colliders.length;
    }
    /**
     * @param {number} p_bounce
     */
    get_slide_collision(p_bounce) {
        return this.colliders[p_bounce];
    }

    /**
     * @param {boolean} p_enabled
     */
    set_sync_to_physics(p_enabled) {
        if (this._sync_to_physics === p_enabled) return;
        this._sync_to_physics = p_enabled;

        if (p_enabled) {
            Physics2DServer.get_singleton().body_set_force_integration_callback(this.rid, this._direct_state_changed, this);
            this.only_update_transform_changes = true;
            this.set_notify_local_transform(true);
        } else {
            Physics2DServer.get_singleton().body_set_force_integration_callback(this.rid, null, null);
            this.only_update_transform_changes = false;
            this.set_notify_local_transform(false);
        }
    }

    /* private */

    /**
     * @param {number} p_bounce
     */
    _get_slide_collision(p_bounce) {
        if (p_bounce >= this.slide_colliders.length) {
            this.slide_colliders.length = p_bounce + 1;
        }

        let inst = this.slide_colliders[p_bounce];
        if (!inst) {
            inst = new KinematicCollision2D();
            inst.owner = this;
            this.slide_colliders[p_bounce] = inst;
        }

        inst.collision = this.colliders[p_bounce];
        return inst;
    }

    /**
     * @param {Physics2DDirectBodyStateSW} p_state
     */
    _direct_state_changed(p_state) {
        if (!this.sync_to_physics) {
            return;
        }

        this.last_valid_transform.copy(p_state.get_transform());
        this.set_notify_local_transform(false);
        this.set_global_transform(this.last_valid_transform);
        this.set_notify_local_transform(true);
    }

    /**
     * @param {Vector2} p_motion
     * @param {boolean} p_infinite_inertia
     * @param {Collision} r_collision
     * @param {boolean} [p_exclude_raycast_shapes]
     * @param {boolean} [p_test_only]
     */
    _move(p_motion, p_infinite_inertia, r_collision, p_exclude_raycast_shapes = true, p_test_only = false) {
        const gt = this.get_global_transform().clone();
        motion_result.reset();
        const colliding = Physics2DServer.get_singleton().body_test_motion(this.rid, gt, p_motion, p_infinite_inertia, this.margin, motion_result, p_exclude_raycast_shapes);

        if (colliding) {
            r_collision.collider_metadata = motion_result.collider_metadata;
            r_collision.collider_shape = motion_result.collider_shape;
            r_collision.collider_vel.copy(motion_result.collider_velocity);
            r_collision.collision.copy(motion_result.collision_point);
            r_collision.normal.copy(motion_result.collision_normal);
            r_collision.collider = motion_result.collider_id;
            r_collision.collider_rid = motion_result.collider;
            r_collision.travel.copy(motion_result.motion);
            r_collision.remainder.copy(motion_result.remainder);
            r_collision.local_shape = motion_result.collision_local_shape;
        }

        if (!p_test_only) {
            gt.tx += motion_result.motion.x;
            gt.ty += motion_result.motion.y;
            this.set_global_transform(gt);
        }

        Transform2D.free(gt);
        return colliding;
    }
}
node_class_map['KinematicBody2D'] = GDCLASS(KinematicBody2D, PhysicsBody2D)
