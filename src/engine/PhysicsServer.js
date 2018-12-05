import { Vector2, Rectangle, clamp } from 'engine/math/index';
import { remove_items } from 'engine/dep/index';
import Node2D from './scene/Node2D';

import CollisionShape2D from './scene/physics/CollisionShape2D';
import CollisionObject2D, { CollisionObjectTypes } from './scene/physics/CollisionObject2D';
import Area2D from './scene/physics/Area2D';
import PhysicsBody2D from './scene/physics/PhysicsBody2D';
import RigidBody2D from './scene/physics/RigidBody2D';
import KinematicBody2D from './scene/physics/KinematicBody2D';

// These settings will be set from scene tree
let sleep_threshold_linear = 2;
let sleep_threshold_angular = 8.0 / 180.0 * Math.PI;
let time_before_sleep = 0.5;

let sleep_threshold_linear_sqr = sleep_threshold_linear * sleep_threshold_linear;

let i = 0;

const Vector2s = new Array(20);
for (i = 0; i < 20; i++) {
    Vector2s[i] = new Vector2();
}
/**
 * @returns {Vector2}
 */
const get_vector2 = () => {
    let vec = Vector2s.pop();
    if (!vec) {
        vec = new Vector2();
    }
    return vec;
};
/**
 * @param {Vector2} vec
 */
const put_vector2 = (vec) => {
    vec.set(0, 0);
    Vector2s.push(vec);
};

const Arrays = new Array(20);
for (i = 0; i < 20; i++) {
    Arrays[i] = [];
}
/**
 * @returns {Array}
 */
const get_array = () => {
    let arr = Arrays.pop();
    if (!arr) {
        arr = [];
    }
    return arr;
};
/**
 * @param {Array} arr
 */
const put_array = (arr) => {
    arr.length = 0;
    Arrays.push(arr);
};

export class Collision {
    constructor() {
        /**
         * @type {PhysicsBody2D}
         */
        this.collider = null;
        this.collider_vel = new Vector2();

        this.normal = new Vector2();
        this.travel = new Vector2();
        this.remainder = new Vector2();

        this.overlap = Number.POSITIVE_INFINITY;
    }
    reset() {
        this.collider = null;
        this.collider_vel.set(0, 0);

        this.normal.set(0, 0);
        this.travel.set(0, 0);
        this.remainder.set(0, 0);

        this.overlap = Number.POSITIVE_INFINITY;

        return this;
    }
}
const COLLSION_POOL = [];
for (let i = 0; i < 16; i++) {
    COLLSION_POOL.push(new Collision());
}
/**
 * @returns {Collision}
 */
const get_collision = () => {
    let co = COLLSION_POOL.pop();
    if (!co) {
        return new Collision();
    }
    return co;
}
const put_collision = (co) => {
    co.reset();
    COLLSION_POOL.push(co);
};

const tmp_res = {
    collision: {
        x: false,
        y: false,
        slope: undefined,
    },

    tile: new Vector2(),
    collider: undefined,

    position: new Vector2(),
    normal: new Vector2(),
    travel: new Vector2(),
    remainder: new Vector2(),
};

const tmp_aabb = new Rectangle();

/**
 * A pool of `Vector` objects that are used in calculations to avoid
 * allocating memory.
 * @type {Vector2[]}
 * @private
 */
const VECTOR_POOL = new Array(10);
for (i = 0; i < 10; i++) { VECTOR_POOL[i] = new Vector2() }

/**
 * A pool of arrays of numbers used in calculations to avoid allocating
 * memory.
 * @type {number[][]}
 * @private
 */
const ARRAY_POOL = new Array(5);
for (i = 0; i < 5; i++) { ARRAY_POOL[i] = [] }

/**
 * Project a list of points onto an axis,
 * resulting in a one dimensional range of the minimum and
 * maximum value on that axis.
 *
 * @param {Vector2[]} points The points to flatten
 * @param {Vector2} normal The unit vector axis to flatten on
 * @param {number[]} result An array.  After calling this function,
 *      result[0] will be the minimum value,
 *      result[1] will be the maximum value
 */
function project_points(points, normal, result) {
    let min = +Number.MAX_VALUE;
    let max = -Number.MAX_VALUE;
    let len = points.length;
    let i = 0, dot;
    for (i = 0; i < len; i++) {
        // The magnitude of the projection of the point onto the normal
        dot = points[i].dot(normal);
        if (dot < min) { min = dot; }
        if (dot > max) { max = dot; }
    }
    result[0] = min;
    result[1] = max;
}

/**
 * Check whether two convex polygons are separated by the specified
 * axis (must be a unit vector).
 * @private
 * @param {Vector2} a_pos The position of the first polygon
 * @param {Vector2} b_pos The position of the second polygon
 * @param {Vector2[]} a_points The points in the first polygon
 * @param {Vector2[]} b_points The points in the second polygon
 * @param {Vector2} axis The axis (unit sized) to test against. The points of both polygons
 *      will be projected onto this axis
 * @param {Collision=} collision A Collision object (optional) which will be populated
 *      if the axis is not a separating axis
 * @return {boolean} true if it is a separating axis, false otherwise.  If false,
 *      and a response is passed in, information about how much overlap and
 *      the direction of the overlap will be populated
 */
function sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, axis, collision) {
    var range_a = ARRAY_POOL.pop();
    var range_b = ARRAY_POOL.pop();
    // The magnitude of the offset between the two polygons
    var offset_v = VECTOR_POOL.pop().copy(b_pos).subtract(a_pos);
    var projected_offset = offset_v.dot(axis);
    // Project the polygons onto the axis.
    project_points(a_points, axis, range_a);
    project_points(b_points, axis, range_b);
    // Move B's range to its position relative to A.
    range_b[0] += projected_offset;
    range_b[1] += projected_offset;
    // Check if there is a gap. If there is, this is a separating axis and we can stop
    if (range_a[0] > range_b[1] || range_b[0] > range_a[1]) {
        VECTOR_POOL.push(offset_v);
        ARRAY_POOL.push(range_a);
        ARRAY_POOL.push(range_b);
        return true;
    }
    // This is not a separating axis. If we're calculating a response, calculate the overlap.
    if (collision) {
        var overlap = 0;
        // A starts further left than B
        if (range_a[0] < range_b[0]) {
            // A ends before B does. We have to pull A out of B
            if (range_a[1] < range_b[1]) {
                overlap = range_a[1] - range_b[0];
                // B is fully inside A.  Pick the shortest way out.
            }
            else {
                var option1 = range_a[1] - range_b[0];
                var option2 = range_b[1] - range_a[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
            // B starts further left than A
        } else {
            // B ends before A ends. We have to push A out of B
            if (range_a[1] > range_b[1]) {
                overlap = range_a[0] - range_b[1];
                // A is fully inside B.  Pick the shortest way out.
            }
            else {
                var option1 = range_a[1] - range_b[0];
                var option2 = range_b[1] - range_a[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        }
        // If this is the smallest amount of overlap we've seen so far, set it as the minimum overlap.
        var abs_overlap = Math.abs(overlap);
        if (abs_overlap < collision.overlap) {
            // FIXME: why we need this small number addition to get things right?
            collision.overlap = abs_overlap + 0.000001;
            collision.normal.copy(axis);
            if (overlap < 0) {
                collision.normal.negate();
            }
        }
    }
    VECTOR_POOL.push(offset_v);
    ARRAY_POOL.push(range_a);
    ARRAY_POOL.push(range_b);

    return false;
}

export default class PhysicsServer {
    static get_singleton() {
        return physics_server;
    }
    constructor() {
        this.is_initialized = false;

        this.spatial_shift = 5;
        /** @type {CollisionShape2D[][][]} */
        this.hash = null;
        /** @type {Object<string, boolean>} */
        this.checks = null;
        this.collision_checks = 0;

        /**
         * @type {CollisionShape2D[]}
         */
        this.shapes = [];
        /**
         * @type {CollisionShape2D[]}
         */
        this.delete_queue = [];
        this.collision_maps = [];

        this.process_step = 0;
    }

    init(settings) {
        if (this.is_initialized) {
            return;
        }

        sleep_threshold_linear = settings.sleep_threshold_linear;
        sleep_threshold_linear_sqr = sleep_threshold_linear * sleep_threshold_linear;
        sleep_threshold_angular = settings.sleep_threshold_angular;
        time_before_sleep = settings.time_before_sleep;

        this.is_initialized = true;
    }
    /**
     * @param {Node2D} scene
     * @param {number} delta
     */
    update(scene, delta) {
        // Flush shape delete queue
        for (let n of this.delete_queue) {
            let idx = this.shapes.indexOf(n);
            if (idx >= 0) {
                remove_items(this.shapes, idx, 1);
            }
        }
        this.delete_queue.length = 0;

        // Reset hash and checks
        this.hash = Object.create(null);
        this.checks = Object.create(null);
        this.collision_checks = 0;

        // Simulation, collision detection and solve
        const colls = get_array();
        this.fetch_collision_objects(scene, colls);
        this.simulate(colls, delta);
        put_array(colls);

        // Recycle arrays in the hash
        for (let i in this.hash) {
            let group = this.hash[i];
            if (Array.isArray(group)) {
                for (let j of group) {
                    j.length = 0;
                    put_array(j);
                }
            }
        }
    }
    clean() {
        this.shapes.length = 0;
        this.delete_queue.length = 0;
        this.collision_maps.length = 0;
    }

    /**
     * @param {CollisionShape2D} shape
     */
    add_shape(shape) {
        if (shape.is_inside_tree) {
            return;
        }
        this.shapes.push(shape);
        shape.is_inside_tree = true;
    }
    /**
     * @param {CollisionShape2D} shape
     */
    remove_shape(shape) {
        if (!shape.is_inside_tree) {
            return;
        }
        this.delete_queue.push(shape);
        shape.is_inside_tree = false;
    }
    add_collision_map(c) {
        if (this.collision_maps.indexOf(c) < 0) {
            this.collision_maps.push(c);
        }
    }
    remove_collision_map(c) {
        remove_items(this.collision_maps, this.collision_maps.indexOf(c), 1);
    }

    test_node_against_map(node, vec) {
        if (this.collision_maps.length > 0 && node._shape) {
            // Update bounds
            const pos = node._world_position;
            const scale = node._world_scale;

            const half_width = Math.abs(node._shape.extents.x * scale.x);
            const half_height = Math.abs(node._shape.extents.y * scale.x);

            node.left = pos.x - half_width;
            node.right = pos.x + half_width;
            node.top = pos.y - half_height;
            node.bottom = pos.y + half_height;

            for (let i = 0; i < this.collision_maps.length; i++) {
                if (!(node.collision_mask & this.collision_maps[i].collision_layer)) {
                    continue;
                }

                tmp_res.collision.x = false;
                tmp_res.collision.y = false;
                tmp_res.collision.slope = undefined;
                tmp_res.tile.set(0);
                tmp_res.normal.set(0);
                tmp_res.travel.set(0);
                tmp_res.remainder.set(0);
                tmp_res.collider = undefined;

                tmp_res.position.set(node.left - this.collision_maps[i]._world_position.x, node.top - this.collision_maps[i]._world_position.y);

                let curr_x = tmp_res.position.x, curr_y = tmp_res.position.y;
                this.collision_maps[i].trace(tmp_res.position.x, tmp_res.position.y, vec.x, vec.y, half_width * 2, half_height * 2, tmp_res);
                if (tmp_res.collision.x || tmp_res.collision.y || tmp_res.collision.slope) {
                    tmp_res.position.x += half_width;
                    tmp_res.position.y += half_height;

                    return tmp_res;
                }
            }
        }
        return null;
    }

    /**
     * @param {CollisionObject2D[]} colls
     * @param {number} delta
     */
    simulate(colls, delta) {
        this.process_step = delta;

        for (const coll of colls) {
            // TODO: Update StaticBody2D movement

            // Calculate RigidBody2D motion
            if (coll.collision_object_type === CollisionObjectTypes.RIGID) {
                /** @type {RigidBody2D} */
                // @ts-ignore
                const rigid = coll;

                // Custom physics process
                rigid._propagate_physics_process(delta);

                // Integrate force to the rigid body
                rigid._integrate_forces(delta);

                // Update transform info
                rigid._update_transform();
            }
        }

        for (const shape of this.shapes) {
            // Update AABBs and vertices
            shape.update_transform(shape.owner._world_position, shape.owner._world_rotation, shape.owner._world_scale);

            // Cleanup touched area/body list
            if (shape.owner.type === 'Area2D') {
                /** @type {Area2D} */
                // @ts-ignore
                const area = shape.owner;

                // Clean up the touched area list
                area.prev_touched_areas.length = 0;
                for (let a of area.touched_areas) {
                    area.prev_touched_areas.push(a);
                }
                area.touched_areas.length = 0;

                // Clean up the touched body list
                area.prev_touched_bodies.length = 0;
                for (let b of area.touched_bodies) {
                    area.prev_touched_bodies.push(b);
                }
                area.touched_bodies.length = 0;
            }
        }

        // Solve collisions and KinematicBody2D movement trace
        for (const shape of this.shapes) {
            /** @type {CollisionObject2D} */
            // @ts-ignore
            const coll = shape.owner;
            const aabb = shape.aabb;

            // Insert the hash and test collisions
            const sx = aabb.left >> this.spatial_shift;
            const sy = aabb.top >> this.spatial_shift;
            const ex = aabb.right >> this.spatial_shift;
            const ey = aabb.bottom >> this.spatial_shift;

            for (let y = sy; y <= ey; y++) {
                for (let x = sx; x <= ex; x++) {
                    // Find or create the list
                    if (!this.hash[x]) {
                        this.hash[x] = Object.create(null);
                    }
                    if (!this.hash[x][y]) {
                        this.hash[x][y] = get_array();
                    }
                    const group = this.hash[x][y];

                    // Insert collider into the group
                    group.push(shape);

                    // Ignore: kinematic bodies will be updated and test later
                    if (coll.collision_object_type === CollisionObjectTypes.KINEMATIC) {
                        continue;
                    }

                    // Ignore: only one shape
                    if (group.length === 1) {
                        continue;
                    }

                    // Test shapes in the same group
                    for (let j = 0; j < group.length; j++) {
                        let shape2 = group[j];
                        /** @type {CollisionObject2D} */
                        // @ts-ignore
                        const coll2 = shape2.owner;
                        const aabb2 = shape2.aabb;

                        // Sort the 2 object
                        const a = (coll.collision_object_type <= coll2.collision_object_type) ? coll : coll2;
                        const b = (coll === a) ? coll2 : coll;
                        const shape_a = (coll === a) ? shape : shape2;
                        const shape_b = (coll === a) ? shape2 : shape;
                        const aabb_a = (coll === a) ? aabb : aabb2;
                        const aabb_b = (coll === a) ? aabb2 : aabb;

                        // Ignore: same shape or same owner or is already marked as removed
                        if (shape_a === shape_b || a === b || a.is_queued_for_deletion || b.is_queued_for_deletion) {
                            continue;
                        }

                        // Ignore: static object does not overlap with anything
                        if (a.collision_object_type === CollisionObjectTypes.STATIC && b.collision_object_type === CollisionObjectTypes.STATIC) {
                            continue;
                        }

                        let a2b = !!(a.collision_mask & b.collision_layer);
                        let b2a = !!(b.collision_mask & a.collision_layer);

                        // Ignore: they don't collide with each other
                        if (!a2b && !b2a) {
                            continue;
                        }

                        const key = `${shape_a.id < shape_b.id ? shape_a.id : shape_b.id}:${shape_a.id > shape_b.id ? shape_a.id : shape_b.id}`;

                        // Ignore: already checked this pair
                        if (this.checks[key]) {
                            continue;
                        }

                        // Mark this pair is already checked
                        this.checks[key] = true;
                        this.collision_checks++;

                        const a_is_area = (a.collision_object_type === CollisionObjectTypes.AREA);
                        const b_is_area = (b.collision_object_type === CollisionObjectTypes.AREA);

                        if (!(
                            aabb_a.bottom <= aabb_b.top
                            ||
                            aabb_a.top >= aabb_b.bottom
                            ||
                            aabb_a.left >= aabb_b.right
                            ||
                            aabb_a.right <= aabb_b.left
                        )) {
                            // Body vs Body: calculate the collision information and solve it
                            if (!a_is_area && !b_is_area) {
                                // @ts-ignore
                                a2b = a2b && (a.collision_exceptions.indexOf(b) < 0);
                                // @ts-ignore
                                b2a = b2a && (b.collision_exceptions.indexOf(a) < 0);

                                // Ignore: they don't care about each other :)
                                if (!a2b && !b2a) {
                                    continue;
                                }

                                let a_pos = a._world_position, b_pos = b._world_position;
                                let a_points = shape_a.vertices, b_points = shape_b.vertices;
                                let separated = false;
                                // If any of the edge normals of A is a separating axis, no intersection.
                                /** @type {Collision[]} */
                                let collisions = get_array();
                                for (let i = 0; i < shape_a.normals.length; i++) {
                                    let co = get_collision();
                                    if (sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, shape_a.normals[i], co)) {
                                        separated = true;
                                        put_collision(co);
                                        break;
                                    } else {
                                        collisions.push(co);
                                    }
                                }
                                // If any of the edge normals of B is a separating axis, no intersection.
                                for (let i = 0; i < shape_b.normals.length; i++) {
                                    let co = get_collision();
                                    if (sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, shape_b.normals[i], co)) {
                                        separated = true;
                                        put_collision(co);
                                        break;
                                    } else {
                                        collisions.push(co);
                                    }
                                }
                                // Intersected?
                                if (!separated) {
                                    // Find the collision with minimal overlap
                                    /** @type {Collision} */
                                    let real_co = null;
                                    for (let co of collisions) {
                                        if (!real_co) {
                                            real_co = co;
                                            continue;
                                        } else {
                                            if (co.overlap < real_co.overlap) {
                                                real_co = co;
                                            }
                                        }
                                    }

                                    // Solve the overlapping between bodies
                                    // Always push self back to safe place
                                    if (a.collision_object_type === CollisionObjectTypes.RIGID) {
                                        /** @type {RigidBody2D} */
                                        // @ts-ignore
                                        const rigid = a;

                                        // Push rigid body back
                                        const tmp_vec2 = get_vector2();
                                        const angle = real_co.normal.angle_to(rigid._motion);
                                        // Fix the body position directly while the angle between motion
                                        // and response normal is too close to right-angle.
                                        // This is a hack but work pretty well.
                                        if (Math.abs(Math.abs(angle) - Math.PI * 0.5) < Math.PI * 0.1) {
                                            real_co.travel.copy(real_co.normal)
                                                .scale(real_co.overlap)
                                            rigid.parent.transform.world_transform.xform_inv(rigid._world_position.add(real_co.travel), rigid.position);
                                            rigid.linear_velocity.project_n(real_co.normal);
                                            console.log('what!')
                                        } else {
                                            const push_dist = (real_co.overlap) / Math.cos(angle);
                                            real_co.remainder.copy(rigid._motion).normalize()
                                                .scale(push_dist)
                                            real_co.travel.copy(rigid._motion)
                                                .subtract(real_co.remainder)
                                            rigid.parent.transform.world_transform.xform_inv(rigid._world_position.subtract(real_co.remainder), rigid.position);

                                            // Let the rigid body bounce
                                            rigid.linear_velocity.copy(rigid.linear_velocity).bounce(real_co.normal)
                                                .scale(rigid.bounce)
                                        }

                                        // Update transform of the body's shapes
                                        for (let s of rigid.shapes) {
                                            s.update_transform(rigid._world_position, rigid._world_rotation, rigid._world_scale);
                                        }

                                        put_vector2(tmp_vec2);
                                    }
                                }

                                // Recycle objects
                                for (let co of collisions) {
                                    put_collision(co);
                                }
                                put_array(collisions);
                            }
                            // Area vs Body or Area vs Area
                            else {
                                let a_pos = a._world_position, b_pos = b._world_position;
                                let a_points = shape_a.vertices, b_points = shape_b.vertices;
                                let separated = false;
                                // If any of the edge normals of A is a separating axis, no intersection.
                                for (let i = 0; i < shape_a.normals.length; i++) {
                                    if (sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, shape_a.normals[i], undefined)) {
                                        separated = true;
                                        break;
                                    }
                                }
                                // If any of the edge normals of B is a separating axis, no intersection.
                                for (let i = 0; i < shape_b.normals.length; i++) {
                                    if (sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, shape_b.normals[i], undefined)) {
                                        separated = true;
                                        break;
                                    }
                                }
                                // Intersected?
                                if (!separated) {
                                    // Area vs Area
                                    if (a_is_area && b_is_area) {
                                        // @ts-ignore
                                        a.touched_areas.push(b);
                                        // @ts-ignore
                                        if (a.prev_touched_areas.indexOf(b) < 0) {
                                            // @ts-ignore
                                            a._area_inout(true, b);
                                        }

                                        // @ts-ignore
                                        b.touched_areas.push(a);
                                        // @ts-ignore
                                        if (b.prev_touched_areas.indexOf(a) < 0) {
                                            // @ts-ignore
                                            b._area_inout(true, a);
                                        }
                                    }
                                    // Area vs Body
                                    else if (a_is_area && !b_is_area) {
                                        // @ts-ignore
                                        a.touched_bodies.push(b);
                                        // @ts-ignore
                                        if (a.prev_touched_bodies.indexOf(b) < 0) {
                                            // @ts-ignore
                                            a._body_inout(true, b);
                                        }
                                    }
                                    // Body vs Area
                                    else if (!a_is_area && b_is_area) {
                                        // @ts-ignore
                                        b.touched_bodies.push(a);
                                        // @ts-ignore
                                        if (b.prev_touched_bodies.indexOf(a) < 0) {
                                            // @ts-ignore
                                            b._body_inout(true, a);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        for (const coll of colls) {
            if (coll.collision_object_type === CollisionObjectTypes.AREA) {
                /** @type {Area2D} */
                // @ts-ignore
                const area = coll;

                // Areas only exist in the previous list is now out
                for (let t of area.prev_touched_areas) {
                    const idx = area.touched_areas.indexOf(t);
                    if (idx < 0) {
                        area._area_inout(false, t);
                    }
                }

                // Bodies only exist in the previous list is now out
                for (let t of area.prev_touched_bodies) {
                    const idx = area.touched_bodies.indexOf(t);
                    if (idx < 0) {
                        area._body_inout(false, t);
                    }
                }

                // Custom process method call
                area._propagate_physics_process(delta);
            }
            else if (coll.collision_object_type === CollisionObjectTypes.RIGID) {
                /** @type {RigidBody2D} */
                // @ts-ignore
                const rigid = coll;

                // Check whether the rigid body can sleep now
                if (
                    rigid.can_sleep
                    &&
                    rigid.linear_velocity.length_squared() <= sleep_threshold_linear_sqr
                    &&
                    Math.abs(rigid.angular_velocity) <= sleep_threshold_angular
                ) {
                    rigid._still_time += delta;
                    if (rigid._still_time > time_before_sleep) {
                        rigid.sleeping = true;
                    }
                } else {
                    rigid._still_time = 0;
                }
            }
            else if (coll.collision_object_type === CollisionObjectTypes.KINEMATIC) {
                /** @type {KinematicBody2D} */
                // @ts-ignore
                const kinematic = coll;
                kinematic._propagate_physics_process(delta);
            }
        }
    }

    /**
     * Recursively fetch physics nodes
     * @param {Node2D} node
     * @param {Node2D[]} out
     */
    fetch_collision_objects(node, out) {
        for (let c of node.children) {
            if (c.is_physics_object) {
                out.push(c);
            }
            this.fetch_collision_objects(c, out);
        }
    }

    /**
     * @param {KinematicBody2D} coll
     * @param {import('./math/Vector2').Vector2Like} motion
     * @returns {Collision}
     */
    body_test_motion(coll, motion) {
        const shape = coll.shapes[0];

        // Apply the motion now, so we can test whether there's a collision
        coll._world_position.add(motion);
        coll.parent.transform.world_transform.xform_inv(coll._world_position, coll.position);
        shape.update_transform(coll._world_position, coll._world_rotation, coll._world_scale);

        // Let the aabb contains both space before move and after move
        const aabb = tmp_aabb;
        aabb.copy(shape.aabb);
        aabb.x += motion.x;
        aabb.y += motion.y;
        aabb.merge_to(shape.aabb);

        // Insert the hash and test collisions
        const sx = aabb.left >> this.spatial_shift;
        const sy = aabb.top >> this.spatial_shift;
        const ex = aabb.right >> this.spatial_shift;
        const ey = aabb.bottom >> this.spatial_shift;

        for (let y = sy; y <= ey; y++) {
            for (let x = sx; x <= ex; x++) {
                // Find or create the list
                if (!this.hash[x]) {
                    this.hash[x] = Object.create(null);
                }
                if (!this.hash[x][y]) {
                    this.hash[x][y] = get_array();
                }
                const group = this.hash[x][y];

                // Pass: only one shape
                if (group.length === 0 || group.length === 1) {
                    continue;
                }

                // Test shapes in the same group
                for (let j = 0; j < group.length; j++) {
                    let shape2 = group[j];
                    /** @type {PhysicsBody2D} */
                    // @ts-ignore
                    const coll2 = shape2.owner;
                    const aabb2 = shape2.aabb;

                    // no more area
                    if (coll2.collision_object_type === CollisionObjectTypes.AREA) {
                        continue;
                    }

                    // No need to sort
                    const a = coll;
                    const b = coll2;
                    const shape_a = shape;
                    const shape_b = shape2;
                    const aabb_a = aabb;
                    const aabb_b = aabb2;

                    // Ignore: same shape or same owner or is already marked as removed
                    if (shape_a === shape_b || a === b || a.is_queued_for_deletion || b.is_queued_for_deletion) {
                        continue;
                    }

                    let a2b = !!(a.collision_mask & b.collision_layer);
                    let b2a = !!(b.collision_mask & a.collision_layer);

                    // Ignore: they don't collide with each other
                    if (!a2b && !b2a) {
                        continue;
                    }

                    // A new check but won't be added to the check key
                    // since this is a positive behavior, we don't need
                    // to poll.
                    this.collision_checks++;

                    if (!(
                        aabb_a.bottom <= aabb_b.top
                        ||
                        aabb_a.top >= aabb_b.bottom
                        ||
                        aabb_a.left >= aabb_b.right
                        ||
                        aabb_a.right <= aabb_b.left
                    )) {
                        // @ts-ignore
                        a2b = a2b && (a.collision_exceptions.indexOf(b) < 0);
                        // @ts-ignore
                        b2a = b2a && (b.collision_exceptions.indexOf(a) < 0);

                        // Ignore: they don't care about each other :)
                        if (!a2b && !b2a) {
                            continue;
                        }

                        let a_pos = a._world_position, b_pos = b._world_position;
                        let a_points = shape_a.vertices, b_points = shape_b.vertices;
                        let separated = false;
                        // If any of the edge normals of A is a separating axis, no intersection.
                        /** @type {Collision[]} */
                        let collisions = get_array();
                        for (let i = 0; i < shape_a.normals.length; i++) {
                            let co = get_collision();
                            if (sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, shape_a.normals[i], co)) {
                                separated = true;
                                put_collision(co);
                                break;
                            } else {
                                collisions.push(co);
                            }
                        }
                        // If any of the edge normals of B is a separating axis, no intersection.
                        for (let i = 0; i < shape_b.normals.length; i++) {
                            let co = get_collision();
                            if (sat_2d_calculate_penetration(a_pos, b_pos, a_points, b_points, shape_b.normals[i], co)) {
                                separated = true;
                                put_collision(co);
                                break;
                            } else {
                                collisions.push(co);
                            }
                        }
                        // Intersected?
                        if (!separated) {
                            // Find the collision with minimal overlap
                            /** @type {Collision} */
                            let real_co = null;
                            for (let co of collisions) {
                                if (!real_co) {
                                    real_co = co;
                                    continue;
                                } else {
                                    if (co.overlap < real_co.overlap) {
                                        real_co = co;
                                    }
                                }
                            }

                            // Solve the overlapping between bodies.
                            // Push body a back so they won't overlap any more.
                            const angle = real_co.normal.angle_to(motion);
                            // Fix the body position directly while the angle between motion
                            // and response normal is too close to right-angle.
                            // This is a hack but work pretty well.
                            if (Math.abs(Math.abs(angle) - Math.PI * 0.5) < Math.PI * 0.1) {
                                real_co.travel.set(0, 0)
                                real_co.remainder.copy(real_co.normal)
                                    .scale(real_co.overlap)
                                motion.x = 0
                                motion.y = 0
                                a.parent.transform.world_transform.xform_inv(a._world_position.add(real_co.travel), a.position);
                            } else {
                                real_co.remainder.copy(motion).normalize()
                                    .scale((real_co.overlap) / Math.cos(angle))
                                real_co.travel.copy(motion)
                                    .subtract(real_co.remainder)
                                a.parent.transform.world_transform.xform_inv(a._world_position.subtract(real_co.remainder), a.position);
                            }

                            // Update collision info
                            real_co.collider = b;

                            // Let's stop here and return the info
                            return real_co;
                        }

                        // Recycle objects
                        for (let co of collisions) {
                            put_collision(co);
                        }
                        put_array(collisions);
                    }
                }
            }
        }

        // Does not overlap at all
        return undefined;
    }
}
let physics_server = new PhysicsServer();
