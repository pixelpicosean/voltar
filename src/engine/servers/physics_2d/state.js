import { Vector2, Matrix, Rectangle } from "engine/math/index";
import { INTERSECTION_QUERY_MAX, Type } from "engine/scene/physics/const";

export class Physics2DDirectBodyStateSW {
    /**
     * @returns {Vector2}
     */
    get_total_gravity() {
        return null;
    }
    /**
     * @returns {number}
     */
    get_total_linear_damp() {
        return 0;
    }
    /**
     * @returns {number}
     */
    get_total_angular_damp() {
        return 0;
    }

    /**
     * @returns {number}
     */
    get_inverse_mass() {
        return 0;
    }
    /**
     * @returns {number}
     */
    get_inverse_inertia() {
        return 0;
    }

    /**
     * @param {Vector2} velocity
     */
    set_linear_velocity(velocity) {
        return null;
    }
    /**
     * @returns {Vector2}
     */
    get_linear_velocity() {
        return null;
    }

    /**
     * @param {number} velocity
     */
    set_angular_velocity(velocity) {
        return null;
    }
    /**
     * @returns {number}
     */
    get_angular_velocity() {
        return 0;
    }

    /**
     * @param {Matrix} transform
     */
    set_transform(transform) { }
    /**
     * @returns {Matrix}
     */
    get_transform() {
        return null;
    }

    /**
     * @param {Vector2} force
     */
    add_central_force(force) { }
    /**
     * @param {Vector2} offset
     * @param {Vector2} force
     */
    add_force(offset, force) { }
    /**
     * @param {number} torque
     */
    add_torque(torque) { }
    /**
     * @param {Vector2} impulse
     */
    add_central_impulse(impulse) { }
    /**
     * @param {number} torque
     */
    add_torque_impulse(torque) { }
    /**
     * @param {Vector2} offset
     * @param {Vector2} impulse
     */
    apply_impulse(offset, impulse) { }

    /**
     * @param {boolean} enable
     */
    set_sleep_state(enable) { }
    /**
     * @returns {boolean}
     */
    is_sleeping() {
        return false;
    }

    /**
     * @returns {number}
     */
    get_contact_count() {
        return 0;
    }

    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_local_position(contact_idx) {
        return null;
    }
    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_local_normal(contact_idx) {
        return null;
     }
    /**
     * @param {number} contact_idx
     * @returns {number}
     */
    get_contact_local_shape(contact_idx) {
        return 0;
    }

    /**
     * @param {number} contact_idx
     * @returns {any}
     */
    get_contact_collider(contact_idx) { }
    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_collider_position(contact_idx) {
        return null;
    }
    /**
     * @param {number} contact_idx
     * @returns {number}
     */
    get_contact_collider_shape(contact_idx) {
        return 0;
     }
    /**
     * @param {number} contact_idx
     * @returns {any}
     */
    get_contact_collider_shape_metadata(contact_idx) { }
    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_collider_velocity_at_position(contact_idx) {
        return null;
    }

    /**
     * @returns {number}
     */
    get_step() {
        return 0;
    }
    integrate_forces() { }

    /**
     * @returns {Physics2DDirectSpaceStateSW}
     */
    get_space_state() {
        return null;
     }
}

export class Physics2DShapeQueryParameters {
    constructor() {
        this.shape = null;
        this.transform = new Matrix();
        this.motion = new Vector2();
        this.margin = 0;
        this.exclude = [];
        this.collision_mask = 0x7FFFFFFF;

        this.collide_with_bodies = true;
        this.collide_with_areas = false;
    }

    set_shape(shape) {
        this.shape = shape;
    }

    /**
     * @param {Matrix} transform
     */
    set_transform(transform) {
        this.transform.copy(transform);
    }
    get_transform() {
        return this.transform;
    }

    /**
     * @param {Vector2} motion
     */
    set_motion(motion) {
        this.motion.copy(motion);
    }
    get_motion() {
        return this.motion;
    }

    /**
     * @param {number} margin
     */
    set_margin(margin) {
        this.margin = margin;
    }
    get_margin() {
        return this.margin;
    }

    /**
     * @param {number} mask
     */
    set_collision_mask(mask) {
        this.collision_mask = mask;
    }
    get_collision_mask() {
        return this.collision_mask;
    }

    /**
     * @param {boolean} enable
     */
    set_collide_with_bodies(enable) {
        this.collide_with_bodies = enable;
    }
    is_collide_with_bodies_enabled() {
        return this.collide_with_bodies;
    }

    /**
     * @param {boolean} enable
     */
    set_collide_with_areas(enable) {
        this.collide_with_areas = enable;
    }
    is_collide_with_areas_enabled() {
        return this.collide_with_areas;
    }

    /**
     * @param {Array} exclude
     */
    set_exclude(exclude) {
        this.exclude.length = 0;
        for (let e of exclude) {
            this.exclude.push(e);
        }
    }
    get_excluce() {
        return this.exclude;
    }
}

export class ShapeResult {
    constructor() {
        this.collider = null;
        this.shape = 0;
        this.metadata = null;
    }
}

class ShapeRestInfo {
    constructor() {
        this.point = new Vector2();
        this.normal = new Vector2();
        this.collider = null;
        this.shape = 0;
        this.linear_velocity = new Vector2();
        this.metadata = null;
    }
}

/**
 *
 * @param {import('./collision_object_2d_sw').default} p_object
 * @param {number} p_collision_mask
 * @param {boolean} p_collide_with_bodies
 * @param {boolean} p_collide_with_areas
 */
function _can_collide_with(p_object, p_collision_mask, p_collide_with_bodies, p_collide_with_areas) {
    if (!(p_object.collision_layer & p_collision_mask)) {
        return false;
    }

    if (p_object.type === Type.AREA && !p_collide_with_areas) {
        return false;
    }
    if (p_object.type === Type.BODY && !p_collide_with_bodies) {
        return false;
    }

    return true;
}

export class Physics2DDirectSpaceStateSW {
    constructor() {
        /** @type {import('./space_2d_sw').default} */
        this.space = null;
    }

    /**
     * @param {Vector2} from
     * @param {Vector2} to
     * @param {ShapeResult} result
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    intersect_ray(from, to, result, exclude = undefined, collision_layer = 0xFFFFFFFF, collide_with_bodies = true, collide_with_areas = false) { }

    /**
     * @param {Vector2} point
     * @param {ShapeResult} result
     * @param {number} result_max
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     * @param {boolean} [pick_point]
     */
    intersect_point(point, result, result_max, exclude = undefined, collision_layer = 0xFFFFFFFF, collide_with_bodies = true, collide_with_areas = false, pick_point = false) { }

    /**
     * @param {any} shape
     * @param {Matrix} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {ShapeResult} result
     * @param {number} result_max
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    intersect_shape(shape, xform, motion, margin, result, result_max, exclude = undefined, collision_layer = 0xFFFFFFFF, collide_with_bodies = true, collide_with_areas = false) { }

    /**
     * @param {any} shape
     * @param {Matrix} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {number} closest_safe
     * @param {number} closest_unsafe
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    cast_motion(shape, xform, motion, margin, closest_safe, closest_unsafe, result_max, exclude = undefined, collision_layer = 0xFFFFFFFF, collide_with_bodies = true, collide_with_areas = false) { }

    /**
     * @param {any} shape
     * @param {Matrix} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {ShapeResult} results
     * @param {number} result_max
     * @param {number} result_count
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    collide_shape(shape, xform, motion, margin, results, result_max, result_count, exclude = undefined, collision_layer = 0xFFFFFFFF, collide_with_bodies = true, collide_with_areas = false) { }

    /**
     * @param {any} shape
     * @param {Matrix} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {ShapeRestInfo} info
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    rest_info(shape, xform, motion, margin, info, exclude = undefined, collision_layer = 0xFFFFFFFF, collide_with_bodies = true, collide_with_areas = false) { }

    /**
     * @param {Vector2} p_point
     * @param {ShapeResult[]} r_results
     * @param {number} p_result_max
     * @param {Array} p_exclude
     * @param {number} p_collision_mask
     * @param {boolean} p_collide_with_bodies
     * @param {boolean} p_collide_with_areas
     * @param {boolean} p_pick_point
     * @param {boolean} [p_filter_by_canvas]
     * @param {number} [p_canvas_instance_id]
     * @returns {number}
     */
    _intersect_point_impl(p_point, r_results, p_result_max, p_exclude, p_collision_mask, p_collide_with_bodies, p_collide_with_areas, p_pick_point, p_filter_by_canvas = false, p_canvas_instance_id = -1) {
        if (p_result_max <= 0) {
            return 0;
        }

        const aabb = Rectangle.create(
            p_point.x - 0.00001,
            p_point.y - 0.00001,
            0.00002,
            0.00002
        );

        const space = this.space;

        const amount = space.broadphase.cull_aabb(aabb, space.intersection_query_results, INTERSECTION_QUERY_MAX, space.intersection_query_subindex_results);

        let cc = 0;

        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            if (p_exclude.indexOf(space.intersection_query_results[i]) >= 0) {
                continue;
            }

            const col_obj = space.intersection_query_results[i];

            if (p_pick_point && !col_obj.pickable) {
                continue;
            }

            if (p_filter_by_canvas && col_obj.canvas_instance.id !== p_canvas_instance_id) {
                continue;
            }

            let shape_idx = space.intersection_query_subindex_results[i];

            const shape = col_obj.get_shape(shape_idx);

            const local_point = col_obj.transform.clone().append(col_obj.get_shape_transform(shape_idx)).affine_inverse().xform(p_point);

            if (!shape.contains_point(local_point)) {
                continue;
            }

            if (cc >= p_result_max) {
                continue;
            }

            r_results[cc].collider = col_obj;
            r_results[cc].shape = shape_idx;
            r_results[cc].metadata = col_obj.get_shape_metadata(shape_idx);

            cc++;
        }

        Rectangle.delete(aabb);

        return cc;
    }
}
