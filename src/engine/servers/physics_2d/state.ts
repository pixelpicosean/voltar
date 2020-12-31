import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";

import {
    INTERSECTION_QUERY_MAX,
    CollisionObject2DSW$Type,
    BodyState,
} from "engine/scene/2d/const";
import { Node2D } from "engine/scene/2d/node_2d";

type Space2DSW = import("./space_2d_sw").Space2DSW;
type Body2DSW = import("./body_2d_sw").Body2DSW;
type CollisionObject2DSW = import("./collision_object_2d_sw").CollisionObject2DSW;
type Shape2DSW = import("./shape_2d_sw").Shape2DSW;

export class Physics2DDirectBodyStateSW {
    get_total_gravity(): Vector2 {
        return this.body.gravity;
    }
    get_total_linear_damp(): number {
        return this.body.area_linear_damp;
    }
    get_total_angular_damp(): number {
        return this.body.area_angular_damp;
    }

    get_inverse_mass(): number {
        return this.body.inv_mass;
    }
    /**
     * @returns {number}
     */
    get_inverse_inertia(): number {
        return this.body.inv_inertia;
    }

    /**
     * @param {Vector2} velocity
     */
    set_linear_velocity(velocity: Vector2) {
        return this.body.linear_velocity.copy(velocity);
    }
    /**
     * @returns {Vector2}
     */
    get_linear_velocity(): Vector2 {
        return this.body.linear_velocity;
    }

    /**
     * @param {number} velocity
     */
    set_angular_velocity(velocity: number) {
        this.body.angular_velocity = velocity;
    }
    /**
     * @returns {number}
     */
    get_angular_velocity(): number {
        return this.body.angular_velocity;
    }

    /**
     * @param {Transform2D} transform
     */
    set_transform(transform: Transform2D) {
        this.body.set_state(BodyState.TRANSFORM, transform);
    }
    /**
     * @returns {Transform2D}
     */
    get_transform(): Transform2D {
        return this.body.transform;
    }

    /**
     * @param {Vector2} force
     */
    add_central_force(force: Vector2) {
        // this.body.add_central_force(force);
    }
    /**
     * @param {Vector2} offset
     * @param {Vector2} force
     */
    add_force(offset: Vector2, force: Vector2) { }
    /**
     * @param {number} torque
     */
    add_torque(torque: number) { }
    /**
     * @param {Vector2} impulse
     */
    add_central_impulse(impulse: Vector2) { }
    /**
     * @param {number} torque
     */
    add_torque_impulse(torque: number) { }
    /**
     * @param {Vector2} offset
     * @param {Vector2} impulse
     */
    apply_impulse(offset: Vector2, impulse: Vector2) { }

    /**
     * @param {boolean} p_enable
     */
    set_sleep_state(p_enable: boolean) {
        this.body.active = !p_enable;
    }
    /**
     * @returns {boolean}
     */
    is_sleeping(): boolean {
        return !this.body.active;
    }

    /**
     * @returns {number}
     */
    get_contact_count(): number {
        return 0;
    }

    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_local_position(contact_idx: number): Vector2 {
        return null;
    }
    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_local_normal(contact_idx: number): Vector2 {
        return null;
    }
    /**
     * @param {number} contact_idx
     * @returns {number}
     */
    get_contact_local_shape(contact_idx: number): number {
        return 0;
    }

    /**
     * @param {number} contact_idx
     * @returns {any}
     */
    get_contact_collider(contact_idx: number): any { }
    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_collider_position(contact_idx: number): Vector2 {
        return null;
    }
    /**
     * @param {number} contact_idx
     * @returns {number}
     */
    get_contact_collider_shape(contact_idx: number): number {
        return 0;
    }
    /**
     * @param {number} contact_idx
     * @returns {any}
     */
    get_contact_collider_shape_metadata(contact_idx: number): any { }
    /**
     * @param {number} contact_idx
     * @returns {Vector2}
     */
    get_contact_collider_velocity_at_position(contact_idx: number): Vector2 {
        return null;
    }

    /**
     * @returns {number}
     */
    get_step(): number {
        return 0;
    }
    integrate_forces() { }

    /**
     * @returns {Physics2DDirectSpaceStateSW}
     */
    get_space_state(): Physics2DDirectSpaceStateSW {
        return null;
    }

    body: Body2DSW = null;

    step = 0;

    static get singleton() {
        return Physics2DDirectBodyStateSW_singleton;
    }
    static create() {
        Physics2DDirectBodyStateSW_singleton = new Physics2DDirectBodyStateSW()
        return Physics2DDirectBodyStateSW_singleton;
    }
}
/** @type {Physics2DDirectBodyStateSW} */
let Physics2DDirectBodyStateSW_singleton: Physics2DDirectBodyStateSW = null;

export class Physics2DShapeQueryParameters {
    shape: Shape2DSW = null;
    transform = new Transform2D;
    motion = new Vector2;
    margin = 0;
    exclude: any[] = [];
    collision_mask = 0x7FFFFFFF;

    collide_with_bodies = true;
    collide_with_areas = false;

    set_shape(shape: Shape2DSW) {
        this.shape = shape;
    }

    /**
     * @param {Transform2D} transform
     */
    set_transform(transform: Transform2D) {
        this.transform.copy(transform);
    }
    get_transform() {
        return this.transform;
    }

    /**
     * @param {Vector2} motion
     */
    set_motion(motion: Vector2) {
        this.motion.copy(motion);
    }
    get_motion() {
        return this.motion;
    }

    /**
     * @param {number} margin
     */
    set_margin(margin: number) {
        this.margin = margin;
    }
    get_margin() {
        return this.margin;
    }

    /**
     * @param {number} mask
     */
    set_collision_mask(mask: number) {
        this.collision_mask = mask;
    }
    get_collision_mask() {
        return this.collision_mask;
    }

    /**
     * @param {boolean} enable
     */
    set_collide_with_bodies(enable: boolean) {
        this.collide_with_bodies = enable;
    }
    is_collide_with_bodies_enabled() {
        return this.collide_with_bodies;
    }

    /**
     * @param {boolean} enable
     */
    set_collide_with_areas(enable: boolean) {
        this.collide_with_areas = enable;
    }
    is_collide_with_areas_enabled() {
        return this.collide_with_areas;
    }

    /**
     * @param {Array} exclude
     */
    set_exclude(exclude: Array<any>) {
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
    collider: CollisionObject2DSW = null;
    shape = 0;
    metadata: any = null;
}

class ShapeRestInfo {
    point = new Vector2;
    normal = new Vector2;
    collider: CollisionObject2DSW = null;
    shape = 0;
    linear_velocity = new Vector2;
    metadata: any = null;
}

function _can_collide_with(p_object: CollisionObject2DSW, p_collision_mask: number, p_collide_with_bodies: boolean, p_collide_with_areas: boolean) {
    if (!(p_object.collision_layer & p_collision_mask)) {
        return false;
    }

    if (p_object.type === CollisionObject2DSW$Type.AREA && !p_collide_with_areas) {
        return false;
    }
    if (p_object.type === CollisionObject2DSW$Type.BODY && !p_collide_with_bodies) {
        return false;
    }

    return true;
}

export class RayResult {
    position = new Vector2;
    normal = new Vector2;
    rid: CollisionObject2DSW = null;
    collider: Node2D = null;
    shape = 0;
    metadata: any = null;
}

export class Physics2DDirectSpaceStateSW {
    space: Space2DSW = null;

    _predelete() {
        return true;
    }
    _free() { }

    intersect_ray(p_from: Vector2, p_to: Vector2, r_result: RayResult, p_exclude: Set<CollisionObject2DSW> = new Set, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false) {
        const begin = p_from.clone();
        const end = p_to.clone();
        const normal = end.clone().subtract(begin).normalize();

        const amount = this.space.broadphase.cull_segment(begin, end, this.space.intersection_query_results, INTERSECTION_QUERY_MAX, this.space.intersection_query_subindex_results);

        // TODO: create another array that references results, compute AABBs and check
        // closest point to ray origin, sort and stop evaluating results when beyond first collision

        let collided = false;
        const res_point = Vector2.create();
        const res_normal = Vector2.create();
        let res_shape = 0;
        let res_obj: CollisionObject2DSW = null;
        let min_d = 1e10;

        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(this.space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            if (p_exclude.has(this.space.intersection_query_results[i])) {
                continue;
            }

            const col_obj = this.space.intersection_query_results[i];

            const shape_idx = this.space.intersection_query_subindex_results[i];
            const inv_xform = col_obj.get_shape_inv_transform(shape_idx).clone().append(col_obj.inv_transform);

            const local_from = inv_xform.xform(begin);
            const local_to = inv_xform.xform(end);

            const shape = col_obj.get_shape(shape_idx);

            const shape_point = new Vector2();
            const shape_normal = new Vector2();

            if (shape.intersect_segment(local_from, local_to, shape_point, shape_normal)) {
                const xform = col_obj.transform.clone().append(col_obj.get_shape_transform(shape_idx));
                xform.xform(shape_point, shape_point);

                const ld = normal.dot(shape_point);

                if (ld < min_d) {
                    min_d = ld;
                    res_point.copy(shape_point);
                    inv_xform.basis_xform_inv(shape_normal, res_normal).normalize();
                    res_shape = shape_idx;
                    res_obj = col_obj;
                    collided = true;
                }
            }
        }

        if (!collided) {
            return false;
        }

        r_result.collider = res_obj.instance;
        r_result.normal.copy(res_normal);
        r_result.metadata = res_obj.get_shape_metadata(res_shape);
        r_result.position.copy(res_point);
        r_result.rid = res_obj.self;
        r_result.shape = res_shape;

        // TODO: cache tons of temp objects
        Vector2.free(res_point);
        Vector2.free(res_normal);

        return true;
    }

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
    intersect_point(point: Vector2, result: ShapeResult, result_max: number, exclude: Array<any> = undefined, collision_layer: number = 0xFFFFFFFF, collide_with_bodies: boolean = true, collide_with_areas: boolean = false, pick_point: boolean = false) { }

    /**
     * @param {any} shape
     * @param {Transform2D} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {ShapeResult} result
     * @param {number} result_max
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    intersect_shape(shape: any, xform: Transform2D, motion: Vector2, margin: number, result: ShapeResult, result_max: number, exclude: Array<any> = undefined, collision_layer: number = 0xFFFFFFFF, collide_with_bodies: boolean = true, collide_with_areas: boolean = false) {
    }

    /**
     * @param {any} shape
     * @param {Transform2D} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {number} closest_safe
     * @param {number} closest_unsafe
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    cast_motion(shape: any, xform: Transform2D, motion: Vector2, margin: number, closest_safe: number, closest_unsafe: number, result_max: number, exclude: Array<any> = undefined, collision_layer: number = 0xFFFFFFFF, collide_with_bodies: boolean = true, collide_with_areas: boolean = false) {
    }

    /**
     * @param {any} shape
     * @param {Transform2D} xform
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
    collide_shape(shape: any, xform: Transform2D, motion: Vector2, margin: number, results: ShapeResult, result_max: number, result_count: number, exclude: Array<any> = undefined, collision_layer: number = 0xFFFFFFFF, collide_with_bodies: boolean = true, collide_with_areas: boolean = false) {
    }

    /**
     * @param {any} shape
     * @param {Transform2D} xform
     * @param {Vector2} motion
     * @param {number} margin
     * @param {ShapeRestInfo} info
     * @param {Array} [exclude]
     * @param {number} [collision_layer]
     * @param {boolean} [collide_with_bodies=true]
     * @param {boolean} [collide_with_areas=false]
     */
    rest_info(shape: any, xform: Transform2D, motion: Vector2, margin: number, info: ShapeRestInfo, exclude: Array<any> = undefined, collision_layer: number = 0xFFFFFFFF, collide_with_bodies: boolean = true, collide_with_areas: boolean = false) {
    }

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
    _intersect_point_impl(p_point: Vector2, r_results: ShapeResult[], p_result_max: number, p_exclude: Array<any>, p_collision_mask: number, p_collide_with_bodies: boolean, p_collide_with_areas: boolean, p_pick_point: boolean, p_filter_by_canvas: boolean = false, p_canvas_instance_id: number = -1): number {
        if (p_result_max <= 0) {
            return 0;
        }

        const aabb = Rect2.create(
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

            if (p_filter_by_canvas && col_obj.canvas_instance.instance_id !== p_canvas_instance_id) {
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

        Rect2.free(aabb);

        return cc;
    }
}

export class MotionResult {
    motion = new Vector2;
    remainder = new Vector2;

    collision_point = new Vector2;
    collision_normal = new Vector2;
    collider_velocity = new Vector2;
    collision_local_shape = 0;
    collider_id: Node2D = null;
    collider: CollisionObject2DSW = null;
    collider_shape = 0;
    collider_metadata: any = null;

    reset() {
        this.motion.set(0, 0);
        this.remainder.set(0, 0);

        this.collision_point.set(0, 0);
        this.collision_normal.set(0, 0);
        this.collider_velocity.set(0, 0);
        this.collision_local_shape = 0;
        this.collider_id = null;
        this.collider = null;
        this.collider_shape = 0;
        this.collider_metadata = null;
        return this;
    }
}

export class SeparationResult {
    collision_depth = 0;
    collision_point = new Vector2;
    collision_normal = new Vector2;
    collider_velocity = new Vector2;
    collision_local_shape = 0;
    collider_id: Node2D = null;
    collider: CollisionObject2DSW = null;
    collider_shape = 0;
    collider_metadata: any = null;

    reset() {
        this.collision_depth = 0;
        this.collision_point.set(0, 0);
        this.collision_normal.set(0, 0);
        this.collider_velocity.set(0, 0);
        this.collision_local_shape = 0;
        this.collider_id = null;
        this.collider = null;
        this.collider_shape = 0;
        this.collider_metadata = null;
        return this;
    }
}

export class CollCbkData {
    valid_dir = new Vector2;
    valid_depth = 0;
    max = 0;
    amount = 0;
    passed = 0;
    invalid_by_dir = 0;
    ptr: Vector2[] = null;

    reset() {
        this.valid_dir.set(0, 0);
        this.valid_depth = 0;
        this.max = 0;
        this.amount = 0;
        this.passed = 0;
        this.invalid_by_dir = 0;
        this.ptr = null;
        return this;
    }
}

/**
 * @param {Vector2} p_point_A
 * @param {Vector2} p_point_B
 * @param {CollCbkData} p_userdata
 */
export function _shape_col_cbk(p_point_A: Vector2, p_point_B: Vector2, p_userdata: CollCbkData) {
    const cbk = p_userdata;

    if (cbk.max === 0) {
        return;
    }

    if (!cbk.valid_dir.is_zero()) {
        if (p_point_A.distance_squared_to(p_point_B) > cbk.valid_depth * cbk.valid_depth) {
            cbk.invalid_by_dir++;
            return;
        }
        const rel_dir = p_point_A.clone().subtract(p_point_B).normalize();

        if (cbk.valid_dir.dot(rel_dir) < 0.7071) { // sqrt(2) / 2 - 45 degrees
            cbk.invalid_by_dir++;
            return;
        }
    }

    if (cbk.amount === cbk.max) {
        let min_depth = Number.MAX_VALUE;
        let min_depth_idx = 0;
        for (let i = 0; i < cbk.amount; i++) {
            const d = cbk.ptr[i * 2 + 0].distance_squared_to(cbk.ptr[i * 2 + 1]);
            if (d < min_depth) {
                min_depth = d;
                min_depth_idx = i;
            }
        }

        let d = p_point_A.distance_squared_to(p_point_B);
        if (d < min_depth) {
            return;
        }
        cbk.ptr[min_depth_idx * 2 + 0].copy(p_point_A);
        cbk.ptr[min_depth_idx * 2 + 1].copy(p_point_B);
        cbk.passed++;
    } else {
        cbk.ptr[cbk.amount * 2 + 0].copy(p_point_A);
        cbk.ptr[cbk.amount * 2 + 1].copy(p_point_B);
        cbk.amount++;
        cbk.passed++;
    }
}
