import { CollisionObjectTypes } from './CollisionObject2D';
import PhysicsBody2D from './PhysicsBody2D';
import { Vector2 } from 'engine/math/index';

const tmp_vec = new Vector2();
const tmp_vec2 = new Vector2();
const tmp_vec3 = new Vector2();
const tmp_vec4 = new Vector2();
const tmp_vec5 = new Vector2();
const tmp_vec6 = new Vector2();

const ZeroVec = Object.freeze(new Vector2(0, 0))
const FLOOR_ANGLE_THRESHOLD = 0.01;

export default class KinematicBody2D extends PhysicsBody2D {
    constructor() {
        super();

        this.collision_object_type = CollisionObjectTypes.KINEMATIC;

        this.on_ceiling = false;
        this.on_wall = false;
        this.on_floor = false;

        /**
         * @type {PhysicsBody2D}
         */
        this.on_floor_body = null;
        this.floor_velocity = new Vector2();
    }

    /**
     * Moves the body along the vector vec. The body will stop if it collides.
     *
     * @param {Vector2} vec
     * @returns {import('engine/PhysicsServer').Collision}
     */
    move_and_collide(vec) {
        return this.scene_tree.physics_server.body_test_motion(this, vec);
    }

    /**
     * @param {Vector2} velocity
     * @param {Vector2} [floor_normal=Vector2(0, 0)]
     * @param {boolean} [stop_on_slope=false]
     * @param {number} [max_bounces=4]
     * @param {number} [floor_max_angle=0.785398]
     */
    move_and_slide(velocity, floor_normal = ZeroVec, stop_on_slope = false, max_bounces = 4, floor_max_angle = 0.785398) {
        const floor_motion = tmp_vec.copy(this.floor_velocity);
        if (this.on_floor && this.on_floor_body) {
            // this approach makes sure there is less delay between the actual body velocity and the one we saved
            floor_motion.copy(this.on_floor_body.linear_velocity);
        }

        const motion = tmp_vec2.copy(floor_motion).add(velocity).scale(this.scene_tree.physics_server.process_step);
        const lv = tmp_vec3.copy(velocity);

        this.on_floor = false;
        this.on_ceiling = false;
        this.on_wall = false;
        this.on_floor_body = null;
        this.floor_velocity.set(0, 0);

        const lv_n = tmp_vec4.copy(velocity).normalize();

        while (max_bounces > 0) {
            const collision = this.scene_tree.physics_server.body_test_motion(this, motion);

            if (collision) {
                motion.copy(collision.remainder);

                let is_on_slope = false;
                if (floor_normal === ZeroVec || floor_normal.equals(ZeroVec)) {
                    // All is a wall
                    this.on_wall = true;
                } else {
                    // Floor
                    if (collision.normal.dot(floor_normal) >= Math.cos(floor_max_angle + FLOOR_ANGLE_THRESHOLD)) {
                        this.on_floor = true;
                        this.on_floor_body = collision.collider;
                        this.floor_velocity.copy(collision.collider_vel);

                        if (stop_on_slope) {
                            if (tmp_vec5.copy(lv_n).add(floor_normal).equals(ZeroVec)) {
                                this._world_position.subtract(collision.travel);
                                this.parent.world_transform.apply_inverse(this._world_position, this.position);
                                return lv.set(0, 0);
                            }
                        }

                        is_on_slope = true;
                    }
                    // Ceiling
                    else if (collision.normal.dot(tmp_vec6.copy(floor_normal).negate()) >= Math.cos(floor_max_angle + FLOOR_ANGLE_THRESHOLD)) {
                        this.on_ceiling = true;
                    }
                    else {
                        this.on_wall = true;
                    }
                }

                if (stop_on_slope && is_on_slope) {
                    motion.slide(floor_normal);
                    lv.slide(floor_normal);
                } else {
                    motion.slide(collision.normal);
                    lv.slide(collision.normal);
                }
            }
            else {
                motion.set(0, 0);
                break;
            }

            max_bounces--;
            if (motion.equals(ZeroVec)) {
                break;
            }
        }

        return lv;
    }
}
