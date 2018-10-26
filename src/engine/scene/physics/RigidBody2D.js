import { Vector2 } from 'engine/math/index';
import PhysicsBody2D from './PhysicsBody2D';
import { CollisionObjectTypes } from './CollisionObject2D';

const tmp_vec = new Vector2();

const default_angular_damp = 1;
const default_linear_damp = 0.1;
const gravity = new Vector2(0, 98);

export default class RigidBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.RIGID;

        this.angular_damp = -1;
        this.angular_velocity = 0;
        this.applied_force = new Vector2(0, 0);
        this.applied_torque = 0;
        this.bounce = 0;
        this.can_sleep = true;
        this.friction = 1;
        this.gravity_scale = 1;
        this.inertia = 1;
        this.linear_damp = -1;
        this.linear_velocity = new Vector2(0, 0);
        this.mass = 1;
        this.sleeping = false;

        this._motion = new Vector2(0, 0);
        this._inv_mass = 1.0 / this.mass;
        this._inv_inertia = 1.0 / this.inertia;

        this._still_time = 0;
    }

    /**
     * @param {Vector2} offset
     * @param {Vector2} force
     */
    add_force(offset, force) {
        if (offset.length_squared() > 0) {
            // TODO: psudo torque
            this.applied_torque = 0;
        }
        this.applied_force.add(force);

        this.sleeping = false;
        this._still_time = 0;
    }

    /**
     * @param {Vector2} offset
     * @param {Vector2} impulse
     */
    apply_impulse(offset, impulse) {
        if (offset.length_squared() > 0) {
            // TODO: psudo torque
            this.applied_torque = 0;
        }
        this.linear_velocity.copy(impulse);

        this.sleeping = false;
        this._still_time = 0;
    }
    /**
     * @param {Vector2} axis_velocity
     */
    set_axis_velocity(axis_velocity) {
        const axis = tmp_vec.copy(axis_velocity).normalize()
        this.linear_velocity.subtract(axis.scale(axis_velocity.dot(this.linear_velocity)));
        this.linear_velocity.add(axis_velocity);

        this.sleeping = false;
        this._still_time = 0;
    }

    /**
     * @param {number} step
     */
    _integrate_forces(step) {
        if (this.sleeping) {
            return;
        }

        // Calculate rotating
        let angular_damp = (this.angular_damp >= 0) ? this.angular_damp : default_angular_damp;
        angular_damp = 1.0 - step * angular_damp;
        if (angular_damp < 0) {
            angular_damp = 0;
        }
        this.angular_velocity *= angular_damp;
        this.angular_velocity += this._inv_inertia * this.applied_torque * step;
        this.rotation += this.angular_velocity * step;

        // Apply force -> velocity
        let linear_damp = (this.linear_damp >= 0) ? this.linear_damp : default_linear_damp;
        linear_damp = 1.0 - step * linear_damp;
        if (linear_damp < 0) {
            linear_damp = 0;
        }
        this.linear_velocity.scale(linear_damp);
        this.linear_velocity.add(
            this._inv_mass * (gravity.x * this.gravity_scale * this.mass + this.applied_force.x) * step,
            this._inv_mass * (gravity.y * this.gravity_scale * this.mass + this.applied_force.y) * step
        );

        // Apply velocity -> motion
        this._motion.copy(this.linear_velocity).scale(step);

        // Transform the motion to world space since physics
        // simulation only works in the world space
        tmp_vec.set(this._world_position.x + this._motion.x, this._world_position.y + this._motion.y);

        // Apply the motion, we will test collision and solve it later
        this.parent.transform.world_transform.apply_inverse(tmp_vec, this.position);
    }
}
