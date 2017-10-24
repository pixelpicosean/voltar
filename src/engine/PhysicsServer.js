import { Vector } from './core';
import remove_items from 'remove-array-items';


let i = 0;

const Arrays = new Array(20);
for (i = 0; i < 20; i++) {
    Arrays[i] = [];
}
const get_array = () => {
    let arr = Arrays.pop();
    if (!arr) {
        arr = [];
    }
    return arr;
};
const put_array = (arr) => {
    arr.length = 0;
    Arrays.push(arr);
};

const res = {
    overlap: 0,
    overlap_n: new Vector(),
    overlap_v: new Vector(),
};

const tmp_vec = new Vector();

const tmp_res = {
    collision: {
        x: false,
        y: false,
        slope: undefined,
    },

    tile: new Vector(),
    collider: undefined,

    position: new Vector(),
    normal: new Vector(),
    travel: new Vector(),
    remainder: new Vector(),
};

/**
 * A pool of `Vector` objects that are used in calculations to avoid
 * allocating memory.
 * @type {array<Vector>}
 * @private
 */
const T_VECTORS = new Array(10);
for (i = 0; i < 10; i++) { T_VECTORS[i] = new Vector() }

/**
 * A pool of arrays of numbers used in calculations to avoid allocating
 * memory.
 * @type {array<array<number>>}
 * @private
 */
const T_ARRAYS = new Array(5);
for (i = 0; i < 5; i++) { T_ARRAYS[i] = [] }

/**
 * Flattens the specified array of points onto a unit vector axis,
 * resulting in a one dimensional range of the minimum and
 * maximum value on that axis.
 * @private
 * @param {array<Vector>} points The points to flatten
 * @param {Vector} normal The unit vector axis to flatten on
 * @param {array<Number>} result An array.  After calling this function,
 *   result[0] will be the minimum value,
 *   result[1] will be the maximum value
 */
function flatten_points_on(points, normal, result) {
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
 * @param {Vector} aPos The position of the first polygon
 * @param {Vector} bPos The position of the second polygon
 * @param {array<Vector>} aPoints The points in the first polygon
 * @param {array<Vector>} bPoints The points in the second polygon
 * @param {Vector} axis The axis (unit sized) to test against. The points of both polygons
 *   will be projected onto this axis
 * @param {Response=} response A Response object (optional) which will be populated
 *   if the axis is not a separating axis
 * @return {boolean} true if it is a separating axis, false otherwise.  If false,
 *   and a response is passed in, information about how much overlap and
 *   the direction of the overlap will be populated
 */
function is_separating_axis(aPos, bPos, aPoints, bPoints, axis, response) {
    var rangeA = T_ARRAYS.pop();
    var rangeB = T_ARRAYS.pop();
    // The magnitude of the offset between the two polygons
    var offsetV = T_VECTORS.pop().copy(bPos).subtract(aPos);
    var projectedOffset = offsetV.dot(axis);
    // Project the polygons onto the axis.
    flatten_points_on(aPoints, axis, rangeA);
    flatten_points_on(bPoints, axis, rangeB);
    // Move B's range to its position relative to A.
    rangeB[0] += projectedOffset;
    rangeB[1] += projectedOffset;
    // Check if there is a gap. If there is, this is a separating axis and we can stop
    if (rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1]) {
        T_VECTORS.push(offsetV);
        T_ARRAYS.push(rangeA);
        T_ARRAYS.push(rangeB);
        return true;
    }
    // This is not a separating axis. If we're calculating a response, calculate the overlap.
    if (response) {
        var overlap = 0;
        // A starts further left than B
        if (rangeA[0] < rangeB[0]) {
            response.aInB = false;
            // A ends before B does. We have to pull A out of B
            if (rangeA[1] < rangeB[1]) {
                overlap = rangeA[1] - rangeB[0];
                response.bInA = false;
                // B is fully inside A.  Pick the shortest way out.
            }
            else {
                var option1 = rangeA[1] - rangeB[0];
                var option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
            // B starts further left than A
        }
        else {
            response.bInA = false;
            // B ends before A ends. We have to push A out of B
            if (rangeA[1] > rangeB[1]) {
                overlap = rangeA[0] - rangeB[1];
                response.aInB = false;
                // A is fully inside B.  Pick the shortest way out.
            }
            else {
                var option1 = rangeA[1] - rangeB[0];
                var option2 = rangeB[1] - rangeA[0];
                overlap = option1 < option2 ? option1 : -option2;
            }
        }
        // If this is the smallest amount of overlap we've seen so far, set it as the minimum overlap.
        var absOverlap = Math.abs(overlap);
        if (absOverlap < response.overlap) {
            response.overlap = absOverlap;
            response.overlapN.copy(axis);
            if (overlap < 0) {
                response.overlapN.reverse();
            }
        }
    }
    T_VECTORS.push(offsetV);
    T_ARRAYS.push(rangeA);
    T_ARRAYS.push(rangeB);

    return false;
}

const test_overlap = (a, b, a_is_area, b_is_area) => {
    // AABB overlap
    if (!(
        a.bottom <= b.top ||
        a.top >= b.bottom ||
        a.left >= b.right ||
        a.right <= b.left)
    ) {
        // body vs body: no need to test any more, since we don't support rotated body collision
        if (!a_is_area && !b_is_area) {
            return true;
        }
        // area vs body or area vs area: SAT algorithm come to save
        else {
            let a_pos = a.get_global_position(), b_pos = b.get_global_position();
            let a_points = a._shape.calc_points, b_points = b._shape.calc_points;
            let i = 0;
            // If any of the edge normals of A is a separating axis, no intersection.
            for (i = 0; i < 4; i++) {
                if (is_separating_axis(a_pos, b_pos, a_points, b_points, a._shape.normals[i], undefined)) {
                    return false;
                }
            }
            // If any of the edge normals of B is a separating axis, no intersection.
            for (i = 0; i < 4; i++) {
                if (is_separating_axis(a_pos, b_pos, a_points, b_points, b._shape.normals[i], undefined)) {
                    return false;
                }
            }
            return true;
        }
    }
    else {
        return false;
    }
};


export default class PhysicsServer {
    constructor() {
        this.is_initialized = false;

        this.spatial_shift = 5;
        this.hash = null;
        this.checks = null;
        this.collision_checks = 0;

        this.collision_maps = [];
    }

    init() {
        if (this.is_initialized) {
            return;
        }
        this.is_initialized = true;
    }
    solve_collision(node) {
        // Reset hash and checks
        this.hash = Object.create(null);
        this.checks = Object.create(null);
        this.collision_checks = 0;

        if ((node.is_physics_object && node._shape) || node._physics_children_count > 0) {
            this._test_node(node);
        }

        // Recycle arrays in the hash
        for (let i in this.hash) {
          let group = this.hash[i];
          for (let j in group) {
            put_array(group[j]);
          }
        }
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

    collision_map_entered(c) {
        if (this.collision_maps.indexOf(c) < 0) {
            this.collision_maps.push(c);
        }
    }
    collision_map_exited(c) {
        remove_items(this.collision_maps, this.collision_maps.indexOf(c), 1);
    }

    _test_node(node) {
        if (!node.is_physics_object || !node._shape) {
            if (node._physics_children_count > 0) {
                let i = 0, c;
                for (i = 0; i < node.children.length; i++) {
                    c = node.children[i];
                    if ((c.is_physics_object && c._shape) || c._physics_children_count > 0) {
                        this._test_node(c);
                    }
                }
            }
            return;
        }

        const coll = node;

        // Update bounds
        if (coll._shape) {
            coll._shape.calculate_points(coll);

            let pos = coll.get_global_position();
            coll.left = pos.x + coll._shape.left;
            coll.right = pos.x + coll._shape.right;
            coll.top = pos.y + coll._shape.top;
            coll.bottom = pos.y + coll._shape.bottom;
        }

        // Insert the hash and test collisions
        const sx = coll.left >> this.spatial_shift;
        const sy = coll.top >> this.spatial_shift;
        const ex = coll.right >> this.spatial_shift;
        const ey = coll.bottom >> this.spatial_shift;

        const a_is_area = coll.type === 'Area2D';

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
                group.push(coll);

                // Pass: only one collider
                if (group.length === 1) {
                    continue;
                }

                // Test colliders in the same group
                for (let j = 0; j < group.length; j++) {
                    let coll2 = group[j];

                    // Pass: same collider or someone is already removed
                    if (coll2 === coll || coll.is_queued_for_deletion || coll2.is_queued_for_deletion) {
                        continue;
                    }

                    let a2b = !!(coll.collision_mask & coll2.collision_layer);
                    let b2a = !!(coll2.collision_mask & coll.collision_layer);

                    // Pass: never collide with each other
                    if (!a2b && !b2a) {
                        continue;
                    }

                    const key = `${coll.id < coll2.id ? coll.id : coll2.id}:${coll.id > coll2.id ? coll.id : coll2.id}`;

                    // Pass: already checked
                    if (this.checks[key]) {
                        continue;
                    }

                    // Mark this pair is already checked
                    this.checks[key] = true;
                    this.collision_checks++;

                    const b_is_area = coll2.type === 'Area2D';

                    // AABB overlap
                    coll._shape.calculate_points(coll);
                    coll2._shape.calculate_points(coll2);
                    if (test_overlap(coll, coll2, a_is_area, b_is_area)) {
                        // Area vs Area
                        if (a_is_area && b_is_area) {
                            coll._area_inout(true, coll2);
                            coll2._area_inout(true, coll);
                        }
                        // Area vs Body
                        else if (a_is_area && !b_is_area) {
                            coll._body_inout(true, coll2);
                        }
                        // Body vs Area
                        else if (!a_is_area && b_is_area) {
                            coll2._body_inout(true, coll);
                        }
                        // Body vs Body
                        else {
                            a2b = a2b && (coll.collision_exceptions.indexOf(coll2) < 0);
                            b2a = b2a && (coll2.collision_exceptions.indexOf(coll) < 0);

                            let push_a = false, push_b = false;
                            let a_is_left = true, a_is_top = true;
                            let overlap_x = Infinity, overlap_y = Infinity, half_overlap;
                            if (coll.x < coll2.x) {
                                a_is_left = true;
                                overlap_x = coll.right - coll2.left;
                            }
                            else if (coll.x > coll2.x) {
                                a_is_left = false;
                                overlap_x = coll2.right - coll.left;
                            }
                            if (coll.y < coll2.y) {
                                a_is_top = true;
                                overlap_y = coll.bottom - coll2.top;
                            }
                            else if (coll.y > coll2.y) {
                                a_is_top = false;
                                overlap_y = coll2.bottom - coll.top;
                            }

                            // No overlap at all
                            if (overlap_x === 0 && overlap_y === 0) {
                                continue;
                            }

                            if (overlap_x < overlap_y) {
                                res.overlap = overlap_x;

                                if (a_is_left) {
                                    res.overlap_n.set(-1, 0);
                                    res.overlap_v.set(-overlap_x, 0);
                                    push_a = (a2b && coll._collide_body(coll2, res));

                                    res.overlap_n.set(1, 0);
                                    res.overlap_v.set(overlap_x, 0);
                                    push_b = (b2a && coll2._collide_body(coll, res));
                                }
                                else {
                                    res.overlap_n.set(1, 0);
                                    res.overlap_v.set(overlap_x, 0);
                                    push_a = (a2b && coll._collide_body(coll2, res));

                                    res.overlap_n.set(-1, 0);
                                    res.overlap_v.set(-overlap_x, 0);
                                    push_b = (b2a && coll2._collide_body(coll, res));
                                }

                                if (push_a && !push_b) {
                                    if (a_is_left) {
                                        coll.x -= overlap_x;
                                    }
                                    else {
                                        coll.x += overlap_x;
                                    }
                                }
                                else if (!push_a && push_b) {
                                    if (a_is_left) {
                                        coll2.x += overlap_x;
                                    }
                                    else {
                                        coll2.x -= overlap_x;
                                    }
                                }
                                else if (push_a && push_b) {
                                    half_overlap = overlap_x * 0.5;

                                    if (a_is_left) {
                                        coll.x -= half_overlap;
                                        coll2.x += half_overlap;
                                    }
                                    else {
                                        coll2.x -= half_overlap;
                                        coll.x += half_overlap;
                                    }
                                }
                            }
                            else {
                                res.overlap = overlap_y;

                                if (a_is_top) {
                                    res.overlap_n.set(0, -1);
                                    res.overlap_v.set(0, -overlap_y);
                                    push_a = (a2b && coll._collide_body(coll2, res));

                                    res.overlap_n.set(0, 1);
                                    res.overlap_v.set(0, overlap_y);
                                    push_b = (b2a && coll2._collide_body(coll, res));
                                }
                                else {
                                    res.overlap_n.set(0, 1);
                                    res.overlap_v.set(0, overlap_y);
                                    push_a = (a2b && coll._collide_body(coll2, res));

                                    res.overlap_n.set(0, -1);
                                    res.overlap_v.set(0, -overlap_y);
                                    push_b = (b2a && coll2._collide_body(coll, res));
                                }

                                if (push_a && !push_b) {
                                    if (a_is_top) {
                                        coll.y -= overlap_y;
                                    }
                                    else {
                                        coll.y += overlap_y;
                                    }
                                }
                                else if (!push_a && push_b) {
                                    if (a_is_top) {
                                        coll2.y += overlap_y;
                                    }
                                    else {
                                        coll2.y -= overlap_y;
                                    }
                                }
                                else if (push_a && push_b) {
                                    half_overlap = overlap_y * 0.5;
                                    if (a_is_top) {
                                        coll.y -= half_overlap;
                                        coll2.y += half_overlap;
                                    }
                                    else {
                                        coll.y += half_overlap;
                                        coll2.y -= half_overlap;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Area exit test
        if (a_is_area) {
            let a = coll;
            for (let k in a.area_map) {
                let b = a.area_map[k];

                // No longer overlap?
                if (
                  a.bottom <= b.top ||
                  a.top >= b.bottom ||
                  a.left >= b.right ||
                  a.right <= b.left
                ) {
                    a._area_inout(false, b);
                }
            }
        }
        // Body exit test
        if (a_is_area) {
            let a = coll;
            for (let k in a.body_map) {
                let b = a.body_map[k];

                // No longer overlap?
                if (
                  a.bottom <= b.top ||
                  a.top >= b.bottom ||
                  a.left >= b.right ||
                  a.right <= b.left
                ) {
                    a._body_inout(false, b);
                }
            }
        }

        // Test child nodes
        for (let i = 0; i < node.children.length; i++) {
            this._test_node(node.children[i]);
        }
    }
}
