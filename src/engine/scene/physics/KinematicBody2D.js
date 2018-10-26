import { CollisionObjectTypes } from './CollisionObject2D';
import PhysicsBody2D from './PhysicsBody2D';
import { Vector2 } from 'engine/math/index';

const tmp_vec = new Vector2();

export default class KinematicBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.KINEMATIC;
    }

    /**
     * Moves the body along the vector rel_vec. The body will stop if it collides.
     *
     * @param {Vector2} vec
     */
    move_and_collide(vec) {
        return this.scene_tree.physics_server.body_test_motion(this, vec);
    }

    /**
     * @param {Vector2} velocity
     * @param {Vector2} [floor_normal=Vector2(0, 0)]
     * @param {number} [slop_stop_min_velocity=5]
     * @param {number} [max_bounces=4]
     * @param {number} [floor_max_angle=0.785398]
     */
    move_and_slide(velocity, floor_normal = tmp_vec.set(0, 0), slop_stop_min_velocity = 5, max_bounces = 4, floor_max_angle = 0.785398) {

    }
}
