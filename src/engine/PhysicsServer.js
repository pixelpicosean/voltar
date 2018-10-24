import { Vector2 } from 'engine/math/index';
import { remove_items } from 'engine/dep/index';
import Node2D from './scene/Node2D';
import CollisionShape2D from './scene/physics/CollisionShape2D';
import CollisionObject2D from './scene/physics/CollisionObject2D';
import Area2D from './scene/physics/Area2D';

/**
 * @typedef Response
 * @prop {boolean} a_in_b
 * @prop {boolean} b_in_a
 * @prop {number} overlap
 * @prop {Vector2} normal
 */

let i = 0;

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

const res = {
    overlap: 0,
    overlap_n: new Vector2(),
    overlap_v: new Vector2(),
};

const tmp_vec = new Vector2();

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
 * @param {Response=} response A Response object (optional) which will be populated
 *      if the axis is not a separating axis
 * @return {boolean} true if it is a separating axis, false otherwise.  If false,
 *      and a response is passed in, information about how much overlap and
 *      the direction of the overlap will be populated
 */
function try_to_separate_axis(a_pos, b_pos, a_points, b_points, axis, response) {
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
    if (response) {
        var overlap = 0;
        // A starts further left than B
        if (range_a[0] < range_b[0]) {
            response.a_in_b = false;
            // A ends before B does. We have to pull A out of B
            if (range_a[1] < range_b[1]) {
                overlap = range_a[1] - range_b[0];
                response.b_in_a = false;
                // B is fully inside A.  Pick the shortest way out.
            }
            else {
                var option1 = range_a[1] - range_b[0];
                var option2 = range_b[1] - range_a[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
            // B starts further left than A
        } else {
            response.b_in_a = false;
            // B ends before A ends. We have to push A out of B
            if (range_a[1] > range_b[1]) {
                overlap = range_a[0] - range_b[1];
                response.a_in_b = false;
                // A is fully inside B.  Pick the shortest way out.
            }
            else {
                var option1 = range_a[1] - range_b[0];
                var option2 = range_b[1] - range_a[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        }
        // If this is the smallest amount of overlap we've seen so far, set it as the minimum overlap.
        var absOverlap = Math.abs(overlap);
        if (absOverlap < response.overlap) {
            response.overlap = absOverlap;
            response.normal.copy(axis);
            if (overlap < 0) {
                response.normal.negate();
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
    }

    init() {
        if (this.is_initialized) {
            return;
        }
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
            for (let j in group) {
                put_array(group[j]);
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
        for (const coll of colls) {
            // TODO: Update StaticBody2D movement
            // TODO: Calculate RigidBody2D motion
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

            const a_is_area = (coll.type === 'Area2D');

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

                    // Pass: only one shape
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

                        // Pass: same shape or someone is already removed
                        if (shape2 === shape || coll.is_queued_for_deletion || coll2.is_queued_for_deletion) {
                            continue;
                        }

                        let a2b = !!(coll.collision_mask & coll2.collision_layer);
                        let b2a = !!(coll2.collision_mask & coll.collision_layer);

                        // Pass: never collide with each other
                        if (!a2b && !b2a) {
                            continue;
                        }

                        const key = `${shape.id < shape2.id ? shape.id : shape2.id}:${shape.id > shape2.id ? shape.id : shape2.id}`;

                        // Pass: already checked
                        if (this.checks[key]) {
                            continue;
                        }

                        // Mark this pair is already checked
                        this.checks[key] = true;
                        this.collision_checks++;

                        const b_is_area = coll2.type === 'Area2D';

                        if (!(
                            aabb.bottom <= aabb2.top ||
                            aabb.top >= aabb2.bottom ||
                            aabb.left >= aabb2.right ||
                            aabb.right <= aabb2.left)
                        ) {
                            // Body vs Body: calculate the collision information and solve it
                            if (!a_is_area && !b_is_area) {
                                // @ts-ignore
                                a2b = a2b && (coll.collision_exceptions.indexOf(coll2) < 0);
                                // @ts-ignore
                                b2a = b2a && (coll2.collision_exceptions.indexOf(coll) < 0);

                                // TODO: Body vs Body
                            }
                            // Area vs Body or Area vs Area
                            else {
                                let a_pos = coll._world_position, b_pos = coll2._world_position;
                                let a_points = shape.vertices, b_points = shape2.vertices;
                                let separated = false;
                                // If any of the edge normals of A is a separating axis, no intersection.
                                for (let i = 0; i < shape.normals.length; i++) {
                                    if (try_to_separate_axis(a_pos, b_pos, a_points, b_points, shape.normals[i], undefined)) {
                                        separated = true;
                                        break;
                                    }
                                }
                                // If any of the edge normals of B is a separating axis, no intersection.
                                for (let i = 0; i < shape2.normals.length; i++) {
                                    if (try_to_separate_axis(a_pos, b_pos, a_points, b_points, shape2.normals[i], undefined)) {
                                        separated = true;
                                        break;
                                    }
                                }
                                // Intersected?
                                if (!separated) {
                                    // Area vs Area
                                    if (a_is_area && b_is_area) {
                                        // @ts-ignore
                                        coll.touched_areas.push(coll2);
                                        // @ts-ignore
                                        if (coll.prev_touched_areas.indexOf(coll2) < 0) {
                                            // @ts-ignore
                                            coll._area_inout(true, coll2);
                                        }

                                        // @ts-ignore
                                        coll2.touched_areas.push(coll);
                                        // @ts-ignore
                                        if (coll2.prev_touched_areas.indexOf(coll) < 0) {
                                            // @ts-ignore
                                            coll2._area_inout(true, coll);
                                        }
                                    }
                                    // Area vs Body
                                    else if (a_is_area && !b_is_area) {
                                        // @ts-ignore
                                        coll._body_inout(true, coll2);
                                    }
                                    // Body vs Area
                                    else if (!a_is_area && b_is_area) {
                                        // @ts-ignore
                                        coll2._body_inout(true, coll);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        for (const coll of colls) {
            if (coll.type === 'Area2D') {
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
                if (area.physics_process) {
                    area._physics_process(delta);
                }
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
}
let physics_server = new PhysicsServer();
