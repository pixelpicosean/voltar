import CollisionObject2D from "./collision_object_2d";
import PhysicsServer from "engine/servers/physics_2d/physics_server";
import { BodyMode } from "./const";
import { Vector2, Matrix } from "engine/math/index";
import Body2DSW from "engine/servers/physics_2d/body_2d_sw";
import PhysicsMaterial from "../resources/physics_material";
import Node2D from "../Node2D";
import { MotionResult } from "engine/servers/physics_2d/state";

export class PhysicsBody2D extends CollisionObject2D {
    /**
     * @returns {number}
     */
    get_collision_layer() {
        return this.collision_layer;
    }
    /**
     * Return an individual bit on the layer mask. Describes whether
     * other areas will collide with this one on the given layer.
     *
     * @param {number} bit
     * @returns {boolean}
     */
    get_collision_layer_bit(bit) {
        return !!(this.collision_layer & (1 << bit));
    }
    /**
     * @param {number} layer
     * @returns {this}
     */
    set_collision_layer(layer) {
        this.collision_layer = layer;

        return this;
    }
    /**
     * Set/clear individual bits on the layer mask. This makes
     * getting an area in/out of only one layer easier.
     *
     * @param {number} bit
     * @param {boolean} value
     * @returns {this}
     */
    set_collision_layer_bit(bit, value) {
        if (value) {
            this.collision_layer |= (1 << bit);
        } else {
            this.collision_layer &= ~(1 << bit);
        }

        return this;
    }

    /**
     * @returns {number}
     */
    get_collision_mask() {
        return this.collision_mask;
    }
    /**
     * Return an individual bit on the collision mask. Describes whether
     * this area will collide with others on the given layer.
     *
     * @param {number} bit
     * @returns {boolean}
     */
    get_collision_mask_bit(bit) {
        return !!(this.collision_mask & (1 << bit));
    }
    /**
     * @param {number} mask
     * @returns {this}
     */
    set_collision_mask(mask) {
        this.collision_mask = mask;

        return this;
    }
    /**
     * Set/clear individual bits on the collision mask. This makes
     * selecting the areas scanned easier.
     *
     * @param {number} bit
     * @param {boolean} value
     * @returns {this}
     */
    set_collision_mask_bit(bit, value) {
        if (value) {
            this.collision_mask |= (1 << bit);
        } else {
            this.collision_mask &= ~(1 << bit);
        }

        return this;
    }

    /**
     * @param {number} p_mask
     */
    _set_layers(p_mask) {
        this.set_collision_layer(p_mask);
        this.set_collision_mask(p_mask);
    }
    _get_layers() {
        return this.collision_layer;
    }

    /**
     * @param {BodyMode} p_mode
     */
    constructor(p_mode) {
        super(PhysicsServer.singleton.body_create(), false);

        this.collision_layer = 1;
        this.collision_mask = 1;

        /**
         * @type {Body2DSW}
         */
        this.rid;

        this.rid.set_mode(p_mode);
    }

    get_collision_exception() { }
    add_collision_exception_with(p_node) { }
    remove_collision_exception_with(p_node) { }
}

export class StaticBody2D extends PhysicsBody2D {
    get friction() {
        if (!this._physics_material_override) {
            return 1;
        }

        return this._physics_material_override._friction;
    }
    /**
     * @param {number} p_friction
     */
    set friction(p_friction) {
        if (p_friction === 1) {
            return;
        }

        if (!this._physics_material_override) {
            this.physics_material_override = new PhysicsMaterial();
        }
        this._physics_material_override.friction = p_friction;
    }
    /**
     * @param {number} p_friction
     */
    set_friction(p_friction) {
        this.friction = p_friction;
        return this;
    }

    get bounce() {
        if (!this._physics_material_override) {
            return 1;
        }

        return this._physics_material_override._bounce;
    }
    /**
     * @param {number} p_bounce
     */
    set bounce(p_bounce) {
        if (p_bounce === 0) {
            return;
        }

        if (!this._physics_material_override) {
            this.physics_material_override = new PhysicsMaterial();
        }
        this._physics_material_override.bounce = p_bounce;
    }
    /**
     * @param {number} p_bounce
     */
    set_bounce(p_bounce) {
        this.bounce = p_bounce;
        return this;
    }

    get physics_material_override() {
        return this._physics_material_override;
    }
    /**
     * @param {PhysicsMaterial} p_physics_material_override
     */
    set physics_material_override(p_physics_material_override) {
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
     * @param {PhysicsMaterial} p_physics_material_override
     */
    set_physics_material_override(p_physics_material_override) {
        this.physics_material_override = p_physics_material_override;
        return this;
    }

    constructor() {
        super(BodyMode.STATIC);

        this.type = 'StaticBody2D';

        this.constant_linear_velocity = new Vector2();
        this.constant_angular_velocity = 0;

        /**
         * @type {PhysicsMaterial}
         */
        this._physics_material_override = null;
    }

    _reload_physics_characteristics() {
        if (!this._physics_material_override) {
            this.rid.bounce = 0;
            this.rid.friction = 1;
        } else {
            this.rid.bounce = this._physics_material_override.computed_bounce;
            this.rid.friction = this._physics_material_override.computed_friction;
        }
    }
}

class Collision {
    constructor() {
        this.collision = new Vector2();
        this.normal = new Vector2();
        this.collider_vel = new Vector2();
        /** @type {Node2D} */
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

export class KinematicCollision2D {
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
        this.metadata = Object.freeze(Object.create({}));
    }
}

const col = new Collision();
const motion_result = new MotionResult();

export class KinematicBody2D extends PhysicsBody2D {
    constructor() {
        super(BodyMode.KINEMATIC);

        this.type = 'KinematicBody2D';

        this.margin = 0.08;

        this.floor_velocity = new Vector2();
        this.on_floor_body = null;
        this.on_floor = false;
        this.on_ceiling = false;
        this.on_wall = false;
        this.sync_to_physics = false;

        /** @type {Collision[]} */
        this.colliders = [];
        /** @type {KinematicCollision2D[]} */
        this.slide_colliders = [];
        /** @type {KinematicCollision2D} */
        this.motion_cache = null;

        this.last_valid_transform = new Matrix();
    }

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
                this.motion_cache = new KinematicCollision2D();
                this.motion_cache.owner = this;
            }

            this.motion_cache.collision = col;

            return this.motion_cache;
        }

        return null;
    }
    _get_slide_collision(p_bounce) { }

    _direct_state_changed(p_state) { }

    /**
     * @param {Vector2} p_motion
     * @param {boolean} p_infinite_inertia
     * @param {Collision} r_collision
     * @param {boolean} [p_exclude_raycast_shapes]
     * @param {boolean} [p_test_only]
     */
    _move(p_motion, p_infinite_inertia, r_collision, p_exclude_raycast_shapes = true, p_test_only = false) {
        const gt = this.transform.world_transform.clone();
        motion_result.reset();
        const colliding = PhysicsServer.singleton.body_test_motion(this.rid, gt, p_motion, p_infinite_inertia, this.margin, motion_result, p_exclude_raycast_shapes);

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

        Matrix.delete(gt);
        return colliding;
    }

    test_move(p_from, p_motion, p_infinite_inertia = true) { }

    separate_raycast_shapes(p_infinite_inertia, r_collision) { }

    move_and_slide(p_linear_velocity, p_floor_direction = Vector2.Zero, p_stop_on_slope = false, p_max_slides = 4, p_floor_max_angle = Math.PI * 0.25, p_infinite_inertia = true) { }
    move_and_slide_with_snap(p_linear_velocity, p_snap, p_floor_direction = Vector2.Zero, p_stop_on_slope = false, p_max_slides = 4, p_floor_max_angle = Math.PI * 0.25, p_infinite_inertia = true) { }

    get_slide_count() { }
    get_slide_collision(p_bounce) { }
}