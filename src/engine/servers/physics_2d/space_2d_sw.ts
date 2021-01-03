import { SelfList, List } from "engine/core/self_list";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import { Vector2 } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";

import {
    INTERSECTION_QUERY_MAX,
    CollisionObject2DSW$Type,
    ShapeType,
    BodyMode,
    SpaceParameter,
} from "engine/scene/2d/const";

import { Area2DSW } from "./area_2d_sw";
import { Area2Pair2DSW, AreaPair2DSW } from "./area_pair_2d";
import { Body2DSW, Physics2DDirectBodyStateSW } from "./body_2d_sw";
import { BodyPair2DSW } from "./body_pair_2d";
import { BroadPhase2D } from "./broad_phase_2d_sw";
import { CollisionObject2DSW } from "./collision_object_2d_sw";
import { CollisionSolver2DSW } from "./collision_solver_2d_sw";
import { Shape2DSW } from "./shape_2d_sw";
import { Constraint2DSW } from "./constraint_2d_sw";
import {
    ShapeResult,
    MotionResult,
    SeparationResult,

    CollCbkData,

    _shape_col_cbk,
} from "./state";

type Node2D = import("engine/scene/2d/node_2d").Node2D;


class ExcludedShapeSW {
    local_shape: Shape2DSW = null;
    against_object: CollisionObject2DSW = null;
    against_shape_index = 0;
}

const max_excluded_shape_pairs = 32;
/** @type {ExcludedShapeSW[]} */
const excluded_shape_pairs: ExcludedShapeSW[] = (() => {
    const arr = Array(max_excluded_shape_pairs);
    for (let i = 0; i < max_excluded_shape_pairs; i++) arr[i] = new ExcludedShapeSW;
    return arr;
})()

const max_results = 32;
/** @type {Vector2[]} */
const sr: Vector2[] = (() => {
    const sr = Array(max_results * 2);
    for (let i = 0; i < max_results * 2; i++) sr[i] = new Vector2();
    return sr;
})()
const get_sr = () => {
    for (let v of sr) v.set(0, 0);
    return sr;
}

const cd = [new Vector2, new Vector2];
const get_cd = () => {
    cd[0].set(0, 0);
    cd[1].set(0, 0);
    return cd;
}

const cbk = new CollCbkData;

const seps = [new Vector2];

/**
 * @param {Vector2} p_point_A
 * @param {Vector2} p_point_B
 * @param {_RestCallbackData2D} rd
 */
function _rest_cbk_result(p_point_A: Vector2, p_point_B: Vector2, rd: _RestCallbackData2D) {
    if (!rd.valid_dir.is_zero()) {
        if (p_point_A.distance_squared_to(p_point_B) > rd.valid_depth * rd.valid_depth) {
            return;
        }
        if (rd.valid_dir.dot((p_point_A.clone().subtract(p_point_B).normalize())) < Math.PI * 0.25) {
            return;
        }
    }

    const contact_rel = p_point_B.clone().subtract(p_point_A);
    const len = contact_rel.length();

    if (len < rd.min_allowed_depth) {
        return;
    }

    if (len <= rd.best_len) {
        return;
    }

    rd.best_len = len;
    rd.best_contact.copy(p_point_B);
    rd.best_normal.copy(contact_rel).scale(1 / len);
    rd.best_object = rd.object;
    rd.best_shape = rd.shape;
    rd.best_local_shape = rd.local_shape;
}

enum ElapsedTime {
    INTEGRATE_FORCES,
    GENERATE_ISLANDS,
    SETUP_CONSTRAINTS,
    SOLVE_CONSTRAINTS,
    INTEGRATE_VELOCITIES,
    MAX,
}

class _RestCallbackData2D {
    object: CollisionObject2DSW = null;
    best_object: CollisionObject2DSW = null;
    local_shape = 0;
    best_local_shape = 0;
    shape = 0;
    best_shape = 0;
    best_contact = new Vector2;
    best_normal = new Vector2;
    best_len = 0;
    valid_dir = new Vector2;
    valid_depth = 0;
    min_allowed_depth = 0;

    reset() {
        this.object = null;
        this.best_object = null;
        this.local_shape = 0;
        this.best_local_shape = 0;
        this.shape = 0;
        this.best_shape = 0;
        this.best_contact.set(0, 0);
        this.best_normal.set(0, 0);
        this.best_len = 0;
        this.valid_dir.set(0, 0);
        this.valid_depth = 0;
        this.min_allowed_depth = 0;
        return this;
    }
}

const rcd = new _RestCallbackData2D;

export class Space2DSW {
    elapsed_time: number[] = Array(ElapsedTime.MAX);

    direct_access: Physics2DDirectSpaceStateSW = new Physics2DDirectSpaceStateSW;
    self = this;

    broadphase: BroadPhase2D = new BroadPhase2D;
    active_list: List<Body2DSW> = new List;
    inertia_update_list: List<Body2DSW> = new List;
    state_query_list: List<Body2DSW> = new List;
    monitor_query_list: List<Area2DSW> = new List;
    area_moved_list: List<Area2DSW> = new List;

    objects: Set<CollisionObject2DSW> = new Set;

    area: Area2DSW = null;

    contact_recycle_radius = 1.0;
    contact_max_separation = 1.5;
    contact_max_allowed_penetration = 0.3;
    constraint_bias = 0.2;
    test_motion_min_contact_depth = 0.005;

    intersection_query_results: CollisionObject2DSW[] = Array(INTERSECTION_QUERY_MAX);
    intersection_query_subindex_results: number[] = Array(INTERSECTION_QUERY_MAX);

    // @Incomplete: load from project.godot
    body_linear_velocity_sleep_threshold = 2.0;
    body_angular_velocity_sleep_threshold = 8.0 / 180.0 * Math.PI;
    body_time_to_sleep = 0.5;

    island_count = 0;
    active_objects = 0;
    collision_pairs = 0;

    constructor() {
        for (let i = 0; i < this.elapsed_time.length; i++) {
            this.elapsed_time[i] = 0;
        }

        this.direct_access.space = this;

        this.broadphase.set_pair_callback(this._broadphase_pair, this);
        this.broadphase.set_unpair_callback(this._broadphase_unpair, this);
    }
    _predelete() {
        return true;
    }
    _free() {
        this.broadphase._free();
        this.broadphase = null;

        this.direct_access._free();
        this.direct_access = null;
    }

    _cull_aabb_for_body(p_body: Body2DSW, p_aabb: Rect2) {
        let amount = this.broadphase.cull_aabb(p_aabb, this.intersection_query_results, INTERSECTION_QUERY_MAX, this.intersection_query_subindex_results);

        for (let i = 0; i < amount; i++) {
            let keep = true;

            let res: Body2DSW = this.intersection_query_results[i] as Body2DSW;
            if (res === p_body) {
                keep = false;
            } else if (res.type === CollisionObject2DSW$Type.AREA) {
                keep = false;
            } else if (!res.test_collision_mask(p_body)) {
                keep = false;
            } else if (p_body.has_exception && (res.has_exception(p_body.self) || p_body.has_exception(res.self))) {
                keep = false;
            } else if (res.shapes[this.intersection_query_subindex_results[i]].disabled) {
                keep = false;
            }

            if (!keep) {
                if (i < amount - 1) {
                    let tmp;
                    tmp = this.intersection_query_results[i]; this.intersection_query_results[i] = this.intersection_query_results[amount - 1]; this.intersection_query_results[amount - 1] = tmp;
                    tmp = this.intersection_query_subindex_results[i]; this.intersection_query_subindex_results[i] = this.intersection_query_subindex_results[amount - 1]; this.intersection_query_subindex_results[amount - 1] = tmp;
                }

                amount--;
                i--;
            }
        }

        return amount;
    }

    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_active_list(p_body: SelfList<Body2DSW>) {
        this.active_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_active_list(p_body: SelfList<Body2DSW>) {
        this.active_list.remove(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_inertia_update_list(p_body: SelfList<Body2DSW>) {
        this.inertia_update_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_inertia_update_list(p_body: SelfList<Body2DSW>) {
        this.inertia_update_list.remove(p_body);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_moved_list(p_area: SelfList<Area2DSW>) {
        this.area_moved_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_moved_list(p_area: SelfList<Area2DSW>) {
        this.area_moved_list.remove(p_area);
    }

    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_state_query_list(p_body: SelfList<Body2DSW>) {
        this.state_query_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_state_query_list(p_body: SelfList<Body2DSW>) {
        this.state_query_list.remove(p_body);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_state_query_list(p_area: SelfList<Area2DSW>) {
        this.monitor_query_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_state_query_list(p_area: SelfList<Area2DSW>) {
        this.monitor_query_list.remove(p_area);
    }

    /**
     * @param {CollisionObject2DSW} p_object
     */
    add_object(p_object: CollisionObject2DSW) {
        this.objects.add(p_object);
    }
    /**
     * @param {CollisionObject2DSW} p_object
     */
    remove_object(p_object: CollisionObject2DSW) {
        this.objects.delete(p_object);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_monitor_query_list(p_area: SelfList<Area2DSW>) {
        this.monitor_query_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_monitor_query_list(p_area: SelfList<Area2DSW>) {
        this.monitor_query_list.remove(p_area);
    }

    setup() {
        while (this.inertia_update_list.first()) {
            this.inertia_update_list.first().self().update_inertias();
            this.inertia_update_list.remove(this.inertia_update_list.first())
        }
    }
    update() {
        this.broadphase.update();
    }

    call_queries() {
        while (this.state_query_list.first()) {
            let b = this.state_query_list.first().self();
            this.state_query_list.remove(this.state_query_list.first());
            b.call_queries();
        }

        while (this.monitor_query_list.first()) {
            let a = this.monitor_query_list.first().self();
            this.monitor_query_list.remove(this.monitor_query_list.first());
            a.call_queries();
        }
    }

    set_param(p_param: SpaceParameter, p_value: number) {
        switch (p_param) {
            case SpaceParameter.CONTACT_RECYCLE_RADIUS: this.contact_recycle_radius = p_value; break;
            case SpaceParameter.CONTACT_MAX_SEPARATION: this.contact_max_separation = p_value; break;
            case SpaceParameter.BODY_MAX_ALLOWED_PENETRATION: this.contact_max_allowed_penetration = p_value; break;
            case SpaceParameter.BODY_LINEAR_VELOCITY_SLEEP_THRESHOLD: this.body_linear_velocity_sleep_threshold = p_value; break;
            case SpaceParameter.BODY_ANGULAR_VELOCITY_SLEEP_THRESHOLD: this.body_angular_velocity_sleep_threshold = p_value; break;
            case SpaceParameter.BODY_TIME_TO_SLEEP: this.body_time_to_sleep = p_value; break;
            case SpaceParameter.CONSTRAINT_DEFAULT_BIAS: this.constraint_bias = p_value; break;
            case SpaceParameter.TEST_MOTION_MIN_CONTACT_DEPTH: this.test_motion_min_contact_depth = p_value; break;
        }
    }
    get_param(p_param: SpaceParameter): number {
        switch (p_param) {
            case SpaceParameter.CONTACT_RECYCLE_RADIUS: return this.contact_recycle_radius;
            case SpaceParameter.CONTACT_MAX_SEPARATION: return this.contact_max_separation;
            case SpaceParameter.BODY_MAX_ALLOWED_PENETRATION: return this.contact_max_allowed_penetration;
            case SpaceParameter.BODY_LINEAR_VELOCITY_SLEEP_THRESHOLD: return this.body_linear_velocity_sleep_threshold;
            case SpaceParameter.BODY_ANGULAR_VELOCITY_SLEEP_THRESHOLD: return this.body_angular_velocity_sleep_threshold;
            case SpaceParameter.BODY_TIME_TO_SLEEP: return this.body_time_to_sleep;
            case SpaceParameter.CONSTRAINT_DEFAULT_BIAS: return this.constraint_bias;
            case SpaceParameter.TEST_MOTION_MIN_CONTACT_DEPTH: return this.test_motion_min_contact_depth;
        }
        return 0;
    }

    test_body_motion(p_body: Body2DSW, p_from: Transform2D, p_motion: Vector2, p_infinite_inertia: boolean, p_margin: number, r_result: MotionResult, p_exclude_raycast_shapes: boolean = true) {
        if (r_result) {
            r_result.collider_id = null;
            r_result.collider_shape = 0;
        }
        let body_aabb = Rect2.create();

        let shapes_found = false;

        for (let i = 0; i < p_body.shapes.length; i++) {
            let s = p_body.shapes[i];

            if (s.disabled) {
                continue;
            }

            if (p_exclude_raycast_shapes && s.shape.type === ShapeType.RAY) {
                continue;
            }

            if (!shapes_found) {
                body_aabb.copy(s.aabb_cache);
                shapes_found = true;
            } else {
                body_aabb.merge_with(s.aabb_cache);
            }
        }

        if (!shapes_found) {
            if (r_result) {
                r_result.reset();
                r_result.motion.copy(p_motion);
            }

            Rect2.free(body_aabb);
            return false;
        }

        p_from.xform_rect(p_body.inv_transform.xform_rect(body_aabb, body_aabb), body_aabb);
        body_aabb.grow_by(p_margin);

        let excluded_shape_pair_count = 0;

        let separation_margin = Math.min(p_margin, Math.max(0, p_motion.length() - CMP_EPSILON));

        let body_transform = p_from.clone();

        {
            // STEP 1, FREE BODY IF STUCK

            let recover_attempts = 4;
            let sr = get_sr();

            do {
                cbk.reset();
                cbk.max = max_results;
                cbk.amount = 0;
                cbk.passed = 0;
                cbk.ptr = sr;
                cbk.invalid_by_dir = 0;
                excluded_shape_pair_count = 0; // last step is the one valid

                let cbkres = _shape_col_cbk;

                let collided = false;

                let amount = this._cull_aabb_for_body(p_body, body_aabb);

                for (let j = 0; j < p_body.shapes.length; j++) {
                    let body_shape = p_body.shapes[j];

                    if (body_shape.disabled) {
                        continue;
                    }

                    if (p_exclude_raycast_shapes && body_shape.shape.type === ShapeType.RAY) {
                        continue;
                    }

                    let body_shape_xform = body_transform.clone().append(body_shape.xform);
                    for (let i = 0; i < amount; i++) {
                        let col_obj = this.intersection_query_results[i];
                        let shape_idx = this.intersection_query_subindex_results[i];

                        if (col_obj.type === CollisionObject2DSW$Type.BODY) {
                            let b: Body2DSW = col_obj as Body2DSW;
                            if (p_infinite_inertia && b.mode !== BodyMode.STATIC && b.mode !== BodyMode.KINEMATIC) {
                                continue;
                            }
                        }

                        let col_obj_shape_xform = col_obj.transform.clone().append(col_obj.shapes[shape_idx].xform);

                        if (col_obj.shapes[shape_idx].one_way_collision) {
                            let axis = col_obj_shape_xform.get_axis(1).normalize();
                            cbk.valid_dir.copy(axis);
                            Vector2.free(axis);

                            cbk.valid_depth = Math.max(p_margin, col_obj.shapes[shape_idx].one_way_collision_margin);
                            cbk.invalid_by_dir = 0;

                            if (col_obj.type === CollisionObject2DSW$Type.BODY) {
                                let b: Body2DSW = col_obj as Body2DSW;
                                if (b.mode === BodyMode.KINEMATIC || b.mode === BodyMode.RIGID) {
                                    // fix for moving platforms (kinematic and dynamic), margin is increased by
                                    // how much it moved in the give direction
                                    let lv = b.linear_velocity.clone();
                                    // compute displacement from linear velocity
                                    let motion = lv.scale(Physics2DDirectBodyStateSW.singleton.step);
                                    let motion_len = motion.length();
                                    motion.normalize();
                                    let neg_dir = cbk.valid_dir.clone().negate();
                                    cbk.valid_depth += motion_len * Math.max(motion.dot(neg_dir), 0);
                                    Vector2.free(neg_dir);
                                    Vector2.free(lv);
                                }
                            }
                        } else {
                            cbk.valid_dir.set(0, 0);
                            cbk.valid_depth = 0;
                            cbk.invalid_by_dir = 0;
                        }

                        let current_passed = cbk.passed; // save how many points passed collision
                        let did_collide = false;

                        let against_shape = col_obj.shapes[shape_idx].shape;
                        if (CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.ZERO, against_shape, col_obj_shape_xform, Vector2.ZERO, cbkres, cbk, null, separation_margin)) {
                            did_collide = cbk.passed > current_passed; // more passed, so collision actually existed
                        }

                        if (!did_collide && cbk.invalid_by_dir > 0) {
                            // this shape must be excluded
                            if (excluded_shape_pair_count < max_excluded_shape_pairs) {
                                let esp = excluded_shape_pairs[excluded_shape_pair_count++];
                                esp.local_shape = body_shape.shape;
                                esp.against_object = col_obj;
                                esp.against_shape_index = shape_idx;
                            }
                        }

                        if (did_collide) {
                            collided = true;
                        }

                        Transform2D.free(col_obj_shape_xform);
                    }
                    Transform2D.free(body_shape_xform);
                }

                if (!collided) {
                    break;
                }

                let recover_motion = Vector2.create();

                for (let i = 0; i < cbk.amount; i++) {
                    recover_motion.add(
                        (sr[i * 2 + 1].x - sr[i * 2 + 0].x) * 0.4,
                        (sr[i * 2 + 1].y - sr[i * 2 + 0].y) * 0.4
                    );
                }

                if (recover_motion.is_zero()) {
                    collided = false;
                    Vector2.free(recover_motion);
                    break;
                }

                body_transform.tx += recover_motion.x;
                body_transform.ty += recover_motion.y;

                body_aabb.x += recover_motion.x;
                body_aabb.y += recover_motion.y;

                recover_attempts--;

                Vector2.free(recover_motion);

            } while (recover_attempts);
        }

        let safe = 1.0;
        let unsafe = 1.0;
        let best_shape = -1;

        {
            // STEP 2 ATTEMPT MOTION

            let motion_aabb = body_aabb.clone();
            motion_aabb.x += p_motion.x;
            motion_aabb.y += p_motion.y;
            motion_aabb.merge_with(body_aabb);

            let amount = this._cull_aabb_for_body(p_body, motion_aabb);

            for (let body_shape_idx = 0; body_shape_idx < p_body.shapes.length; body_shape_idx++) {
                let body_shape = p_body.shapes[body_shape_idx];

                if (body_shape.disabled) {
                    continue;
                }

                if (p_exclude_raycast_shapes && body_shape.shape.type === ShapeType.RAY) {
                    continue;
                }

                let body_shape_xform = body_transform.clone().append(body_shape.xform);

                let stuck = false;

                let best_safe = 1.0;
                let best_unsafe = 1.0;

                for (let i = 0; i < amount; i++) {
                    let col_obj = this.intersection_query_results[i];
                    let col_shape_idx = this.intersection_query_subindex_results[i];
                    let against_shape = col_obj.shapes[col_shape_idx];

                    if (col_obj.type === CollisionObject2DSW$Type.BODY) {
                        const b: Body2DSW = col_obj as Body2DSW;
                        if (p_infinite_inertia && b.mode !== BodyMode.STATIC && b.mode !== BodyMode.KINEMATIC) {
                            continue;
                        }
                    }

                    let excluded = false;

                    for (let k = 0; k < excluded_shape_pair_count; k++) {
                        if (excluded_shape_pairs[k].local_shape === body_shape.shape && excluded_shape_pairs[k].against_object === col_obj && excluded_shape_pairs[k].against_shape_index === col_shape_idx) {
                            excluded = true;
                            break;
                        }
                    }

                    if (excluded) {
                        continue;
                    }

                    let col_obj_shape_xform = col_obj.transform.clone().append(against_shape.xform);
                    // test initial overlap, does it collide if going all the way?
                    if (!CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, p_motion, against_shape.shape, col_obj_shape_xform, Vector2.ZERO, null, null, null, 0)) {
                        Transform2D.free(col_obj_shape_xform);
                        continue;
                    }

                    // test initial overlap
                    if (CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.ZERO, against_shape.shape, col_obj_shape_xform, Vector2.ZERO, null, null, null, 0)) {
                        if (against_shape.one_way_collision) {
                            Transform2D.free(col_obj_shape_xform);
                            continue;
                        }

                        stuck = true;
                        Transform2D.free(col_obj_shape_xform);
                        break;
                    }

                    // just do kinematic solving
                    let low = 0.0;
                    let hi = 1.0;
                    let mnormal = p_motion.normalized();
                    let motion_s = p_motion.clone();

                    for (let k = 0; k < 8; k++) {
                        let ofs = (low + hi) * 0.5;

                        seps[0].copy(mnormal);
                        motion_s.copy(p_motion).scale(ofs);
                        let collided = CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, motion_s, against_shape.shape, col_obj_shape_xform, Vector2.ZERO, null, null, seps, 0);

                        if (collided) {
                            hi = ofs;
                        } else {
                            low = ofs;
                        }
                    }

                    if (against_shape.one_way_collision) {
                        let cd = get_cd();;
                        cbk.reset();
                        cbk.max = 1;
                        cbk.amount = 0;
                        cbk.passed = 0;
                        cbk.ptr = cd;
                        let axis = col_obj_shape_xform.get_axis(1).normalize();
                        cbk.valid_dir.copy(axis);
                        Vector2.free(axis);

                        cbk.valid_depth = Number.MAX_VALUE;

                        seps[0].copy(mnormal);

                        motion_s.copy(p_motion).scale(hi + this.contact_max_allowed_penetration);
                        let collided = CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, motion_s, against_shape.shape, col_obj_shape_xform, Vector2.ZERO, _shape_col_cbk, cbk, seps, 0);
                        if (!collided || cbk.amount === 0) {
                            Vector2.free(motion_s);
                            Vector2.free(mnormal);
                            Transform2D.free(col_obj_shape_xform);
                            continue;
                        }
                    }

                    if (low < best_safe) {
                        best_safe = low;
                        best_unsafe = hi;
                    }

                    Vector2.free(motion_s);
                    Vector2.free(mnormal);
                    Transform2D.free(col_obj_shape_xform);
                }

                if (stuck) {
                    safe = 0.0;
                    unsafe = 0.0;
                    best_shape = body_shape_idx;

                    Transform2D.free(body_shape_xform);
                    break;
                }
                if (best_safe === 1) {
                    Transform2D.free(body_shape_xform);
                    continue;
                }
                if (best_safe < safe) {
                    safe = best_safe;
                    unsafe = best_unsafe;
                    best_shape = body_shape_idx;
                }

                Transform2D.free(body_shape_xform);
            }

            Rect2.free(motion_aabb);
        }

        let collided = false;
        if (safe >= 1) {
            best_shape = -1; // no best shape with cast, reset to -1
        }

        {
            // it collided, let's get the reset info in unsafe advance
            let ugt = body_transform.clone();
            ugt.tx += p_motion.x * unsafe;
            ugt.ty += p_motion.y * unsafe;

            rcd.reset();
            rcd.best_len = 0;
            rcd.best_object = null;
            rcd.best_shape = 0;
            rcd.min_allowed_depth = this.test_motion_min_contact_depth;

            // optimization
            let from_shape = best_shape !== -1 ? best_shape : 0;
            let to_shape = best_shape !== -1 ? best_shape + 1 : p_body.shapes.length;

            for (let j = from_shape; j < to_shape; j++) {
                let body_shape = p_body.shapes[j];

                if (body_shape.disabled) {
                    continue;
                }

                if (p_exclude_raycast_shapes && body_shape.shape.type === ShapeType.RAY) {
                    continue;
                }

                let body_shape_xform = ugt.clone().append(body_shape.xform);

                body_aabb.x += p_motion.x * unsafe;
                body_aabb.y += p_motion.y * unsafe;

                let amount = this._cull_aabb_for_body(p_body, body_aabb);

                for (let i = 0; i < amount; i++) {
                    let col_obj = this.intersection_query_results[i];
                    let shape_idx = this.intersection_query_subindex_results[i];

                    if (col_obj.type === CollisionObject2DSW$Type.BODY) {
                        const b: Body2DSW = col_obj as Body2DSW;
                        if (p_infinite_inertia && b.mode !== BodyMode.STATIC && b.mode !== BodyMode.KINEMATIC) {
                            continue;
                        }
                    }

                    let against_shape = col_obj.shapes[shape_idx];

                    let excluded = false;
                    for (let k = 0; k < excluded_shape_pair_count; k++) {
                        if (excluded_shape_pairs[k].local_shape === body_shape.shape && excluded_shape_pairs[k].against_object === col_obj && excluded_shape_pairs[k].against_shape_index === shape_idx) {
                            excluded = true;
                            break;
                        }
                    }
                    if (excluded) {
                        continue;
                    }

                    let col_obj_shape_xform = col_obj.transform.clone().append(against_shape.xform);

                    if (against_shape.one_way_collision) {
                        let naxis = col_obj_shape_xform.get_axis(1).normalize();
                        rcd.valid_dir.copy(naxis);
                        Vector2.free(naxis);
                        rcd.valid_depth = 10e20;
                    } else {
                        rcd.valid_dir.set(0, 0);
                        rcd.valid_depth = 0;
                    }

                    rcd.object = col_obj;
                    rcd.shape = shape_idx;
                    rcd.local_shape = j;
                    let sc = CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.ZERO, against_shape.shape, col_obj_shape_xform, Vector2.ZERO, _rest_cbk_result, rcd, null, p_margin);
                    if (!sc) {
                        Transform2D.free(col_obj_shape_xform);
                        continue;
                    }

                    Transform2D.free(col_obj_shape_xform);
                }

                Transform2D.free(body_shape_xform);
            }

            if (rcd.best_len !== 0) {
                if (r_result) {
                    r_result.collider = rcd.best_object.self;
                    r_result.collider_id = rcd.best_object.instance;
                    r_result.collider_shape = rcd.best_shape;
                    r_result.collision_local_shape = rcd.best_local_shape;
                    r_result.collision_normal.copy(rcd.best_normal);
                    r_result.collision_point.copy(rcd.best_contact);
                    r_result.collider_metadata = rcd.best_object.get_shape_metadata(rcd.best_shape);

                    let body: Body2DSW = rcd.best_object as Body2DSW;
                    let body_origin = body_transform.get_origin();
                    let from_origin = p_from.get_origin();

                    let rel_vec = r_result.collision_point.clone().subtract(body_origin);
                    r_result.collider_velocity.set(
                        -body.angular_velocity * rel_vec.y,
                        body.angular_velocity * rel_vec.x
                    ).add(body.linear_velocity);

                    r_result.motion.copy(p_motion).scale(safe);
                    r_result.remainder.copy(p_motion).subtract(p_motion.x * safe, p_motion.y * safe);
                    r_result.motion.add(body_origin.subtract(from_origin));

                    Vector2.free(rel_vec);
                    Vector2.free(from_origin);
                    Vector2.free(body_origin);
                }

                collided = true;
            }

            Transform2D.free(ugt);
        }

        if (!collided && r_result) {
            r_result.motion.copy(p_motion);
            r_result.remainder.set(0, 0);
            let origin = body_transform.get_origin();
            let from_origin = p_from.get_origin();
            r_result.motion.add(origin.subtract(from_origin));
            Vector2.free(from_origin);
            Vector2.free(origin);
        }

        Transform2D.free(body_transform);
        Rect2.free(body_aabb);
        return collided;
    }
    test_body_ray_separation(p_body: Body2DSW, p_transform: Transform2D, p_infinite_inertia: boolean, r_recover_motion: Vector2, r_results: SeparationResult[], p_result_max: number, p_margin: number) {
        let body_aabb = Rect2.create();

        let shapes_found = false;

        for (let s of p_body.shapes) {
            if (s.disabled) {
                continue;
            }

            if (s.shape.type !== ShapeType.RAY) {
                continue;
            }

            if (!shapes_found) {
                body_aabb.copy(s.aabb_cache);
                shapes_found = true;
            } else {
                body_aabb.merge_with(s.aabb_cache);
            }
        }

        if (!shapes_found) {
            return 0;
        }

        // undo the currently transform the physics server is aware of and apply the provided one
        p_transform.xform_rect(p_body.inv_transform.xform_rect(body_aabb, body_aabb), body_aabb);
        body_aabb.grow_by(p_margin);

        let body_transform = p_transform.clone();

        for (let i = 0; i < p_result_max; i++) {
            // reset results
            r_results[i].collision_depth = 0;
        }

        let rays_found = 0;

        {
            // raycast and separate

            let recover_attempts = 4;
            const sr = get_sr();
            cbk.reset();
            cbk.max = max_results;
            const cbkres = _shape_col_cbk;

            let recover_motion = Vector2.create();

            do {
                recover_motion.set(0, 0);

                let collided = false;

                let amount = this._cull_aabb_for_body(p_body, body_aabb);

                for (let j = 0; j < p_body.shapes.length; j++) {
                    let body_shape = p_body.shapes[j];

                    if (body_shape.disabled) {
                        continue;
                    }

                    if (body_shape.shape.type !== ShapeType.RAY) {
                        continue;
                    }

                    let body_shape_xform = body_transform.clone().append(body_shape.xform);

                    for (let i = 0; i < amount; i++) {
                        let col_obj = this.intersection_query_results[i];
                        let shape_idx = this.intersection_query_subindex_results[i];

                        cbk.amount = 0;
                        cbk.passed = 0;
                        cbk.ptr = sr;
                        cbk.invalid_by_dir = 0;

                        if (col_obj.type === CollisionObject2DSW$Type.BODY) {
                            let b: Body2DSW = col_obj as Body2DSW;
                            if (p_infinite_inertia && b.mode !== BodyMode.STATIC && b.mode !== BodyMode.KINEMATIC) {
                                continue;
                            }
                        }

                        let col_obj_shape_xform = col_obj.transform.clone().append(col_obj.get_shape_transform(shape_idx));

                        cbk.valid_dir.set(0, 0);
                        cbk.valid_depth = 0;
                        cbk.invalid_by_dir = 0;

                        let against_shape = col_obj.get_shape(shape_idx);
                        if (CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.ZERO, against_shape, col_obj_shape_xform, Vector2.ZERO, cbkres, cbk, null, p_margin)) {
                            if (cbk.amount > 0) {
                                collided = true;
                            }

                            let ray_index = -1;
                            for (let k = 0; k < rays_found; k++) {
                                if (r_results[k].collision_local_shape === j) {
                                    ray_index = k;
                                }
                            }

                            if (ray_index === -1 && rays_found < p_result_max) {
                                ray_index = rays_found;
                                rays_found++;
                            }

                            if (ray_index !== -1) {
                                let result = r_results[ray_index];

                                for (let k = 0; k < cbk.amount; k++) {
                                    let a = sr[k * 2 + 0];
                                    let b = sr[k * 2 + 1];

                                    let b_minus_a = b.clone().subtract(a);

                                    recover_motion.add(b_minus_a.scale(0.4));

                                    let depth = a.distance_to(b);
                                    if (depth > result.collision_depth) {
                                        result.collision_depth = depth;
                                        result.collision_point.copy(b);
                                        result.collision_normal.copy(b).subtract(a).normalize();
                                        result.collision_local_shape = j;
                                        result.collider_shape = shape_idx;
                                        result.collider = col_obj.self;
                                        result.collider_id = col_obj.instance;
                                        result.collider_metadata = col_obj.get_shape_metadata(shape_idx);
                                        if (col_obj.type === CollisionObject2DSW$Type.BODY) {
                                            let body: Body2DSW = col_obj as Body2DSW;

                                            let origin = body.transform.get_origin();
                                            let rel_vec = b.clone().subtract(origin);
                                            result.collider_velocity.set(
                                                -body.angular_velocity * rel_vec.y,
                                                body.angular_velocity * rel_vec.x
                                            ).add(body.linear_velocity);
                                            Vector2.free(rel_vec);
                                            Vector2.free(origin);
                                        }
                                    }

                                    Vector2.free(b_minus_a);
                                }
                            }
                        }

                        Transform2D.free(col_obj_shape_xform);
                    }

                    Transform2D.free(body_shape_xform);
                }

                if (!collided || recover_motion.is_zero()) {
                    break;
                }

                body_transform.tx += recover_motion.x;
                body_transform.ty += recover_motion.y;
                body_aabb.x += recover_motion.x;
                body_aabb.y += recover_motion.y;

                recover_attempts--;
            } while (recover_attempts);

            Vector2.free(recover_motion);
        }

        // optimize results (remove non colliding)
        for (let i = 0; i < rays_found; i++) {
            if (r_results[i].collision_depth === 0) {
                rays_found--;
                let tmp = r_results[i]; r_results[i] = r_results[rays_found]; r_results[rays_found] = tmp;
            }
        }

        r_recover_motion.set(body_transform.tx, body_transform.ty).subtract(p_transform.tx, p_transform.ty);

        Transform2D.free(body_transform);
        Rect2.free(body_aabb);

        return rays_found;
    }

    /**
     * @param {CollisionObject2DSW} A
     * @param {number} p_subindex_A
     * @param {CollisionObject2DSW} B
     * @param {number} p_subindex_B
     * @param {Space2DSW} p_self
     */
    _broadphase_pair(A: CollisionObject2DSW, p_subindex_A: number, B: CollisionObject2DSW, p_subindex_B: number, p_self: Space2DSW) {
        if (!A.test_collision_mask(B)) return null;

        let type_A = A.type;
        let type_B = B.type;
        if (type_A > type_B) {
            let tmp;
            tmp = B; B = A; A = tmp;
            tmp = p_subindex_A; p_subindex_A = p_subindex_B; p_subindex_B = tmp;
            tmp = type_B; type_B = type_A; type_A = tmp;
        }

        p_self.collision_pairs++;

        if (type_A === CollisionObject2DSW$Type.AREA) {
            let area: Area2DSW = A as Area2DSW;
            if (type_B === CollisionObject2DSW$Type.AREA) {
                let area_b: Area2DSW = B as Area2DSW;
                return new Area2Pair2DSW(area_b, p_subindex_B, area, p_subindex_A);
            } else {
                let body: Body2DSW = B as Body2DSW;
                return new AreaPair2DSW(body, p_subindex_B, area, p_subindex_A);
            }
        } else {
            let body_A: Body2DSW = A as Body2DSW;
            let body_B: Body2DSW = B as Body2DSW;
            return new BodyPair2DSW(body_A, p_subindex_A, body_B, p_subindex_B);
        }

        return null;
    }
    _broadphase_unpair(A: CollisionObject2DSW, p_subindex_A: number, B: CollisionObject2DSW, p_subindex_B: number, p_data: Constraint2DSW, p_self: Space2DSW) {
        if (!p_data) return;

        p_self.collision_pairs--;
        p_data._free();
    }
}

export class RayResult {
    position = new Vector2;
    normal = new Vector2;
    rid: CollisionObject2DSW = null;
    collider: Node2D = null;
    shape = 0;
    metadata: any = null;

    reset(): RayResult {
        this.position.set(0, 0);
        this.normal.set(0, 0);
        this.rid = null;
        this.collider = null;
        this.shape = 0;
        this.metadata = null;
        return this;
    }

    static create() {
        let rr = pool_RayResult.pop();
        if (!rr) return new RayResult;
        return rr.reset();
    }
    static free(rr: RayResult) {
        pool_RayResult.push(rr);
    }
}
let pool_RayResult: RayResult[] = [];

class ShapeRestInfo {
    point = new Vector2;
    normal = new Vector2;
    rid: CollisionObject2DSW = null;
    collider: Node2D = null;
    shape = 0;
    linear_velocity = new Vector2;
    metadata: any = null;

    reset(): ShapeRestInfo {
        this.point.set(0, 0);
        this.normal.set(0, 0);
        this.rid = null;
        this.collider = null;
        this.shape = 0;
        this.linear_velocity.set(0, 0);
        this.metadata = null;
        return this;
    }

    static create() {
        let rr = pool_ShapeRestInfo.pop();
        if (!rr) return new ShapeRestInfo;
        return rr.reset();
    }
    static free(rr: ShapeRestInfo) {
        pool_ShapeRestInfo.push(rr);
    }
}
let pool_ShapeRestInfo: ShapeRestInfo[] = [];

export class Physics2DDirectSpaceStateSW {
    space: Space2DSW = null;

    _predelete() {
        return true;
    }
    _free() { }

    intersect_ray(p_from: Vector2, p_to: Vector2, r_result: RayResult, p_exclude: Set<CollisionObject2DSW> = new Set, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false) {
        let begin = p_from.clone();
        let end = p_to.clone();
        let normal = end.clone().subtract(begin).normalize();

        let amount = this.space.broadphase.cull_segment(begin, end, this.space.intersection_query_results, INTERSECTION_QUERY_MAX, this.space.intersection_query_subindex_results);

        let collided = false;
        let res_point = Vector2.create();
        let res_normal = Vector2.create();
        let res_shape = 0;
        let res_obj: CollisionObject2DSW = null;
        let min_d = 1e10;

        let inv_xform = Transform2D.create();
        let local_from = Vector2.create();
        let local_to = Vector2.create();
        let shape_point = Vector2.create();
        let shape_normal = Vector2.create();
        let xform = Transform2D.create();
        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(this.space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            if (p_exclude.has(this.space.intersection_query_results[i])) {
                continue;
            }

            let col_obj = this.space.intersection_query_results[i];

            let shape_idx = this.space.intersection_query_subindex_results[i];
            inv_xform.copy(col_obj.get_shape_inv_transform(shape_idx)).append(col_obj.inv_transform);

            inv_xform.xform(begin, local_from);
            inv_xform.xform(end, local_to);

            let shape = col_obj.get_shape(shape_idx);

            shape_point.set(0, 0);
            shape_normal.set(0, 0);

            if (shape.intersect_segment(local_from, local_to, shape_point, shape_normal)) {
                xform.copy(col_obj.transform).append(col_obj.get_shape_transform(shape_idx));
                xform.xform(shape_point, shape_point);

                let ld = normal.dot(shape_point);

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
        Transform2D.free(xform);
        Vector2.free(shape_normal);
        Vector2.free(shape_point);
        Vector2.free(local_to);
        Vector2.free(local_from);
        Transform2D.free(inv_xform);

        if (!collided) {
            Vector2.free(res_point);
            Vector2.free(res_normal);

            Vector2.free(normal);
            Vector2.free(end);
            Vector2.free(begin);

            return false;
        }

        r_result.collider = res_obj.instance;
        r_result.normal.copy(res_normal);
        r_result.metadata = res_obj.get_shape_metadata(res_shape);
        r_result.position.copy(res_point);
        r_result.rid = res_obj.self;
        r_result.shape = res_shape;

        Vector2.free(res_point);
        Vector2.free(res_normal);

        Vector2.free(normal);
        Vector2.free(end);
        Vector2.free(begin);

        return true;
    }

    intersect_point(p_point: Vector2, r_result: ShapeResult[], p_result_max: number, p_exclude: CollisionObject2DSW[] = undefined, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false, p_pick_point: boolean = false) {
        this._intersect_point_impl(p_point, r_result, p_result_max, p_exclude, p_collision_mask, p_collide_with_bodies, p_collide_with_areas, p_pick_point);
    }

    intersect_shape(p_shape: Shape2DSW, p_xform: Transform2D, p_motion: Vector2, p_margin: number, r_result: ShapeResult[], p_result_max: number, p_exclude: CollisionObject2DSW[] = undefined, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false) {
        if (p_result_max <= 0) return 0;

        let aabb = p_xform.xform_rect(p_shape.aabb);
        aabb.grow_by(p_margin);

        let amount = this.space.broadphase.cull_aabb(aabb, this.space.intersection_query_results, INTERSECTION_QUERY_MAX, this.space.intersection_query_subindex_results);

        let cc = 0;

        for (let i = 0; i < amount; i++) {
            if (cc >= p_result_max) {
                break;
            }

            if (!_can_collide_with(this.space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            if (p_exclude.indexOf(this.space.intersection_query_results[i]) >= 0) {
                continue;
            }

            let col_obj = this.space.intersection_query_results[i];
            let shape_idx = this.space.intersection_query_subindex_results[i];

            r_result[cc].collider = col_obj.instance;
            r_result[cc].rid = col_obj.self;
            r_result[cc].shape = shape_idx;
            r_result[cc].metadata = col_obj.get_shape_metadata(shape_idx);

            cc++;
        }

        Rect2.free(aabb);

        return cc;
    }

    cast_motion(p_shape: Shape2DSW, p_xform: Transform2D, p_motion: Vector2, p_margin: number, p_closest: { safe: number, unsafe: number }, p_result_max: number, p_exclude: CollisionObject2DSW[] = undefined, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false) {
        let aabb = p_xform.xform_rect(p_shape.aabb);
        let ext = Rect2.create(aabb.x + p_motion.x, aabb.y + p_motion.y, aabb.width, aabb.height);
        aabb.merge_with(ext);
        Rect2.free(ext);
        aabb.grow_by(p_margin);

        let amount = this.space.broadphase.cull_aabb(aabb, this.space.intersection_query_results, INTERSECTION_QUERY_MAX, this.space.intersection_query_subindex_results);

        let best_safe = 1;
        let best_unsafe = 1;

        let col_obj_xform = Transform2D.create();
        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(this.space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            if (p_exclude.indexOf(this.space.intersection_query_results[i]) >= 0) {
                continue;
            }

            let col_obj = this.space.intersection_query_results[i];
            let shape_idx = this.space.intersection_query_subindex_results[i];

            col_obj_xform.copy(col_obj.transform).append(col_obj.get_shape_transform(shape_idx));
            if (!CollisionSolver2DSW.solve(p_shape, p_xform, p_motion, col_obj.get_shape(shape_idx), col_obj_xform, Vector2.ZERO, null, null, null, p_margin)) {
                continue;
            }

            if (CollisionSolver2DSW.solve(p_shape, p_xform, Vector2.ZERO, col_obj.get_shape(shape_idx), col_obj_xform, Vector2.ZERO, null, null, null, p_margin)) {
                Transform2D.free(col_obj_xform);

                Rect2.free(aabb);
                return false;
            }

            let low = 0;
            let hi = 1;
            let mnormal = p_motion.normalized();

            let motion_with_ofs = Vector2.create();
            for (let j = 0; j < 8; j++) {
                let ofs = (low + hi) * 0.5;

                seps[0].copy(mnormal);
                motion_with_ofs.copy(p_motion).scale(ofs);
                let collided = CollisionSolver2DSW.solve(p_shape, p_xform, motion_with_ofs, col_obj.get_shape(shape_idx), col_obj_xform, Vector2.ZERO, null, null, seps, p_margin);

                if (collided) {
                    hi = ofs;
                } else {
                    low = ofs;
                }
            }
            Vector2.free(motion_with_ofs);

            Vector2.free(mnormal);

            if (low < best_safe) {
                best_safe = low;
                best_unsafe = hi;
            }
        }
        Transform2D.free(col_obj_xform);

        p_closest.safe = best_safe;
        p_closest.unsafe = best_unsafe;

        Rect2.free(aabb);

        return true;
    }

    collide_shape(p_shape: Shape2DSW, p_shape_xform: Transform2D, p_motion: Vector2, p_margin: number, r_results: Vector2[], p_result_max: number, r_result: { count: number }, p_exclude: CollisionObject2DSW[] = undefined, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false) {
        if (p_result_max <= 0) return 0;

        let aabb = p_shape_xform.xform_rect(p_shape.aabb);
        let ext = Rect2.create(aabb.x + p_motion.x, aabb.y + p_motion.y, aabb.width, aabb.height);
        aabb.merge_with(ext);
        Rect2.free(ext);
        aabb.grow_by(p_margin);

        let amount = this.space.broadphase.cull_aabb(aabb, this.space.intersection_query_results, INTERSECTION_QUERY_MAX, this.space.intersection_query_subindex_results);

        let collided = false;
        r_result.count = 0;

        cbk.reset();
        cbk.max = p_result_max;
        cbk.amount = 0;
        cbk.passed = 0;
        cbk.ptr = r_results;
        let cbkres = _shape_col_cbk;

        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(this.space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            let col_obj = this.space.intersection_query_results[i];
            let shape_idx = this.space.intersection_query_subindex_results[i];

            if (p_exclude.indexOf(col_obj) >= 0) {
                continue;
            }

            cbk.valid_dir.set(0, 0);
            cbk.valid_depth = 0;

            let local_xform = col_obj.transform.clone().append(col_obj.get_shape_transform(shape_idx));
            if (CollisionSolver2DSW.solve(p_shape, p_shape_xform, p_motion, col_obj.get_shape(shape_idx), local_xform, Vector2.ZERO, cbkres, cbk, null, p_margin)) {
                collided = cbk.amount > 0;
            }
            Transform2D.free(local_xform);
        }

        r_result.count = cbk.amount;

        Rect2.free(aabb);

        return collided;
    }

    rest_info(p_shape: Shape2DSW, p_shape_xform: Transform2D, p_motion: Vector2, p_margin: number, r_info: ShapeRestInfo, p_exclude: CollisionObject2DSW[] = undefined, p_collision_mask: number = 0xFFFFFFFF, p_collide_with_bodies: boolean = true, p_collide_with_areas: boolean = false) {
        let aabb = p_shape_xform.xform_rect(p_shape.aabb);
        let ext = Rect2.create(aabb.x + p_motion.x, aabb.y + p_motion.y, aabb.width, aabb.height);
        aabb.merge_with(ext);
        Rect2.free(ext);
        aabb.grow_by(p_margin);

        let amount = this.space.broadphase.cull_aabb(aabb, this.space.intersection_query_results, INTERSECTION_QUERY_MAX, this.space.intersection_query_subindex_results);

        rcd.reset();
        rcd.best_len = 0;
        rcd.best_object = null;
        rcd.best_shape = 0;
        rcd.min_allowed_depth = this.space.test_motion_min_contact_depth;

        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(this.space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            let col_obj = this.space.intersection_query_results[i];
            let shape_idx = this.space.intersection_query_subindex_results[i];

            if (p_exclude.indexOf(col_obj) >= 0) {
                continue;
            }

            rcd.valid_dir.set(0, 0);
            rcd.valid_depth = 0;
            rcd.object = col_obj;
            rcd.shape = shape_idx;
            rcd.local_shape = 0;

            let local_xform = col_obj.transform.clone().append(col_obj.get_shape_transform(shape_idx));
            let sc = CollisionSolver2DSW.solve(p_shape, p_shape_xform, p_motion, col_obj.get_shape(shape_idx), local_xform, Vector2.ZERO, _rest_cbk_result, rcd, null, p_margin);
            Transform2D.free(local_xform);
            if (!sc) {
                continue;
            }
        }

        if (rcd.best_len === 0 || !rcd.best_object) {
            Rect2.free(aabb);
            return false;
        }

        r_info.collider = rcd.best_object.instance;
        r_info.shape = rcd.best_shape;
        r_info.normal.copy(rcd.best_normal);
        r_info.point.copy(rcd.best_contact);
        r_info.rid = rcd.best_object.self;
        r_info.metadata = rcd.best_object.get_shape_metadata(rcd.best_shape);
        if (rcd.best_object.type === CollisionObject2DSW$Type.BODY) {
            let body: Body2DSW = rcd.best_object as Body2DSW;
            let origin = body.transform.get_origin();
            let rel_vec = r_info.point.clone().subtract(origin);
            r_info.linear_velocity.set(
                -body.angular_velocity * rel_vec.y,
                body.angular_velocity * rel_vec.x
            ).add(body.linear_velocity);
            Vector2.free(rel_vec);
            Vector2.free(origin);
        } else {
            r_info.linear_velocity.set(0, 0);
        }

        Rect2.free(aabb);

        return true;
    }

    _intersect_point_impl(p_point: Vector2, r_results: ShapeResult[], p_result_max: number, p_exclude: CollisionObject2DSW[], p_collision_mask: number, p_collide_with_bodies: boolean, p_collide_with_areas: boolean, p_pick_point: boolean, p_filter_by_canvas: boolean = false, p_canvas_instance_id: number = -1): number {
        if (p_result_max <= 0) {
            return 0;
        }

        let aabb = Rect2.create(
            p_point.x - 0.00001,
            p_point.y - 0.00001,
            0.00002,
            0.00002
        );

        let space = this.space;

        let amount = space.broadphase.cull_aabb(aabb, space.intersection_query_results, INTERSECTION_QUERY_MAX, space.intersection_query_subindex_results);

        let cc = 0;

        let local_point = Vector2.create();
        for (let i = 0; i < amount; i++) {
            if (!_can_collide_with(space.intersection_query_results[i], p_collision_mask, p_collide_with_bodies, p_collide_with_areas)) {
                continue;
            }

            if (p_exclude.indexOf(space.intersection_query_results[i]) >= 0) {
                continue;
            }

            let col_obj = space.intersection_query_results[i];

            if (p_pick_point && !col_obj.pickable) {
                continue;
            }

            if (p_filter_by_canvas && col_obj.canvas_instance.instance_id !== p_canvas_instance_id) {
                continue;
            }

            let shape_idx = space.intersection_query_subindex_results[i];

            let shape = col_obj.get_shape(shape_idx);

            let combined_xform = col_obj.transform.clone().append(col_obj.get_shape_transform(shape_idx));
            combined_xform.affine_inverse()
                .xform(p_point, local_point);
            Transform2D.free(combined_xform);

            if (!shape.contains_point(local_point)) {
                continue;
            }

            if (cc >= p_result_max) {
                continue;
            }

            r_results[cc].collider = col_obj.instance;
            r_results[cc].rid = col_obj;
            r_results[cc].shape = shape_idx;
            r_results[cc].metadata = col_obj.get_shape_metadata(shape_idx);

            cc++;
        }
        Vector2.free(local_point);

        Rect2.free(aabb);

        return cc;
    }
}

function _can_collide_with(p_object: CollisionObject2DSW, p_collision_mask: number, p_collide_with_bodies: boolean, p_collide_with_areas: boolean): boolean {
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
