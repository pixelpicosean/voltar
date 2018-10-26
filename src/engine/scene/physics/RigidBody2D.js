import { Vector2 } from 'engine/math/index';
import PhysicsBody2D from './PhysicsBody2D';
import { CollisionObjectTypes } from './CollisionObject2D';

const tmp_vec = new Vector2();

export default class RigidBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.RIGID;

        this.applied_force = new Vector2(0, 0);
        this.linear_velocity = new Vector2(0, 0);

        this._motion = new Vector2(0, 0);
        this._bounce_count = 0;
    }
    _integrate_forces(step) {
        // Apply force -> velocity
        this.linear_velocity.add(this.applied_force.x * step, this.applied_force.y * step);

        // Apply velocity -> motion
        this._motion.copy(this.linear_velocity).scale(step);

        // Transform the motion to world space since physics
        // simulation only works in the world space
        tmp_vec.set(this._world_position.x + this._motion.x, this._world_position.y + this._motion.y);

        // Apply the motion, we will test collision and solve it later
        this.parent.transform.world_transform.apply_inverse(tmp_vec, this.position);
    }
}
