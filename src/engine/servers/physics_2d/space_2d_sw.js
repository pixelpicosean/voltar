import { Physics2DDirectSpaceStateSW, MotionResult, CollCbkData, _shape_col_cbk, Physics2DDirectBodyStateSW } from "../../servers/physics_2d/state";
import { INTERSECTION_QUERY_MAX, CollisionObjectType, ShapeType, BodyMode } from "../../scene/physics/const";
import Area2DSW from "./area_2d_sw";
import SelfList, { List } from "engine/core/self_list";
import BroadPhase2D from "./broad_phase_2d_sw";
import CollisionObject2DSW from "./collision_object_2d_sw";
import { Area2Pair2DSW } from "./area_pair_2d";
import Constraint2DSW from "./constraint_2d_sw";
import Body2DSW from "./body_2d_sw";
import { Shape2DSW } from "./shape_2d_sw";
import { Matrix, Vector2, Rectangle, CMP_EPSILON } from "engine/math/index";
import CollisionSolver2DSW from "./collision_solver_2d_sw";

const max_excluded_shape_pairs = 32;
/** @type {ExcludedShapeSW[]} */
const excluded_shape_pairs = (() => {
    const arr = new Array(max_excluded_shape_pairs);
    for (let i = 0; i < max_excluded_shape_pairs; i++) arr[i] = new ExcludedShapeSW();
    return arr;
})()

const max_results = 32;
/** @type {Vector2[]} */
const sr = (() => {
    const sr = new Array(max_results * 2);
    for (let i = 0; i < max_results * 2; i++) sr[i] = new Vector2();
    return sr;
})()
const get_sr = () => {
    for (let v of sr) v.set(0, 0);
    return sr;
}

/**
 * @param {Vector2} p_point_A
 * @param {Vector2} p_point_B
 * @param {_RestCallbackData2D} rd
 */
function _rest_cbk_result(p_point_A, p_point_B, rd) {
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
    if (len <= rd.best_len) {
        return;
    }

    rd.best_len = len;
    rd.best_contact.copy(p_point_B);
    rd.best_normal.copy(contact_rel).divide(len, len);
    rd.best_object = rd.object;
    rd.best_shape = rd.shape;
    rd.best_local_shape = rd.local_shape;
}

const ElapsedTime = {
    INTEGRATE_FORCES: 0,
    GENERATE_ISLANDS: 1,
    SETUP_CONSTRAINTS: 2,
    SOLVE_CONSTRAINTS: 3,
    INTEGRATE_VELOCITIES: 4,
    MAX: 5,
}

class ExcludedShapeSW {
    constructor() {
        /** @type {Shape2DSW} */
        this.local_shape = null;
        /** @type {CollisionObject2DSW} */
        this.against_object = null;
        this.against_shape_index = 0;
    }
}

class _RestCallbackData2D {
    constructor() {
        /** @type {CollisionObject2DSW} */
        this.object = null;
        /** @type {CollisionObject2DSW} */
        this.best_object = null;
        this.local_shape = 0;
        this.best_local_shape = 0;
        this.shape = 0;
        this.best_shape = 0;
        this.best_contact = new Vector2();
        this.best_normal = new Vector2();
        this.best_len = 0;
        this.valid_dir = new Vector2();
        this.valid_depth = 0;
    }
}

export default class Space2DSW {
    get active() {
        return this._active;
    }
    /**
     * @param {boolean} value
     */
    set active(value) {
        this._active = value;
    }
    /**
     * @param {boolean} value
     * @returns {this}
     */
    set_active(value) {
        this.active = value;
        return this;
    }
    constructor() {
        this._active = false;

        this.elapsed_time = new Array(ElapsedTime.MAX);

        /** @type {Physics2DDirectSpaceStateSW} */
        this.direct_access = null;
        this.self = this;

        /** @type {BroadPhase2D} */
        this.broadphase = new BroadPhase2D();
        this.broadphase.set_pair_callback(this._broadphase_pair, this);
        this.broadphase.set_unpair_callback(this._broadphase_unpair, this);

        /** @type {List<Body2DSW>} */
        this.active_list = new List();
        /** @type {List<Body2DSW>} */
        this.inertia_update_list = new List();
        /** @type {List<Body2DSW>} */
        this.state_query_list = new List();
        /** @type {List<Area2DSW>} */
        this.monitor_query_list = new List();
        /** @type {List<Area2DSW>} */
        this.area_moved_list = new List();

        /** @type {Set<CollisionObject2DSW>} */
        this.objects = new Set();

        /**
         * @type {Area2DSW}
         */
        this.default_area = null;

        this.contact_recycle_radius = 0;
        this.contact_max_separation = 0;
        this.contact_max_allowed_penetration = 0;
        this.constraint_bias = 0;

        /** @type {CollisionObject2DSW[]} */
        this.intersection_query_results = new Array(INTERSECTION_QUERY_MAX);
        /** @type {number[]} */
        this.intersection_query_subindex_results = new Array(INTERSECTION_QUERY_MAX);

        this.body_linear_velocity_sleep_threshold = 0;
        this.body_angular_velocity_sleep_threshold = 0;
        this.body_time_to_sleep = 0;

        this.island_count = 0;
        this.active_objects = 0;
        this.collision_pairs = 0;
    }

    /**
     * @param {Body2DSW} p_body
     * @param {Rectangle} p_aabb
     */
    _cull_aabb_for_body(p_body, p_aabb) {
        let amount = this.broadphase.cull_aabb(p_aabb, this.intersection_query_results, INTERSECTION_QUERY_MAX, this.intersection_query_subindex_results);

        for (let i = 0; i < amount; i++) {
            let keep = true;

            /** @type {Body2DSW} */
            // @ts-ignore
            const res = this.intersection_query_results[i];
            if (res === p_body) {
                keep = false;
            } else if (res.type === CollisionObjectType.AREA) {
                keep = false;
            } else if (res.test_collision_mask(p_body) === 0) {
                keep = false;
            } else if (res.has_exception(p_body.self) || p_body.has_exception(res.self)) {
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
    body_add_to_active_list(p_body) {
        this.active_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_active_list(p_body) {
        this.active_list.remove(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_inertia_update_list(p_body) {
        this.inertia_update_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_inertia_update_list(p_body) {
        this.inertia_update_list.remove(p_body);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_moved_list(p_area) {
        this.area_moved_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_moved_list(p_area) {
        this.area_moved_list.remove(p_area);
    }

    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_add_to_state_query_list(p_body) {
        this.state_query_list.add(p_body);
    }
    /**
     * @param {SelfList<Body2DSW>} p_body
     */
    body_remove_from_state_query_list(p_body) {
        this.state_query_list.remove(p_body);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_state_query_list(p_area) {
        this.monitor_query_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_state_query_list(p_area) {
        this.monitor_query_list.remove(p_area);
    }

    /**
     * @param {CollisionObject2DSW} p_object
     */
    add_object(p_object) {
        this.objects.add(p_object);
    }
    /**
     * @param {CollisionObject2DSW} p_object
     */
    remove_object(p_object) {
        this.objects.delete(p_object);
    }

    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_add_to_monitor_query_list(p_area) {
        this.monitor_query_list.add(p_area);
    }
    /**
     * @param {SelfList<Area2DSW>} p_area
     */
    area_remove_from_monitor_query_list(p_area) {
        this.monitor_query_list.remove(p_area);
    }

    setup() {
        // while (this.inertia_update_list.first()) {
        //     this.inertia_update_list.first().self().update_inertias();
        //     this.inertia_update_list.remove(this.inertia_update_list.first())
        // }
    }
    update() {
        this.broadphase.update();
    }

    call_queries() {
        while (this.state_query_list.first()) {
            // TODO: query bodies
        }

        while (this.monitor_query_list.first()) {
            const a = this.monitor_query_list.first().self();
            this.monitor_query_list.remove(this.monitor_query_list.first());
            a.call_queries();
        }
    }

    set_param(p_param, p_value) { }
    get_param(p_param) { }

    /**
     * @param {Body2DSW} p_body
     * @param {Matrix} p_from
     * @param {Vector2} p_motion
     * @param {boolean} p_infinite_inertia
     * @param {number} p_margin
     * @param {MotionResult} r_result
     * @param {boolean} [p_exclude_raycast_shapes]
     */
    body_test_motion(p_body, p_from, p_motion, p_infinite_inertia, p_margin, r_result, p_exclude_raycast_shapes = true) {
        if (r_result) {
            r_result.collider_id = null;
            r_result.collider_shape = 0;
        }
        const body_aabb = Rectangle.create();

        let shapes_found = false;

        for (let i = 0; i < p_body.shapes.length; i++) {
            const s = p_body.shapes[i];
            if (s.disabled) {
                continue;
            }

            if (!shapes_found) {
                body_aabb.copy(s.aabb_cache);
                shapes_found = true;
            } else {
                body_aabb.merge_to(s.aabb_cache);
            }
        }

        if (!shapes_found) {
            return false;
        }

        p_from.xform_rect(p_body.inv_transform.xform_rect(body_aabb, body_aabb), body_aabb);
        body_aabb.grow_to(p_margin);

        let excluded_shape_pair_count = 0;

        const separation_margin = Math.min(p_margin, Math.max(0, p_motion.length() - CMP_EPSILON));

        const body_transform = p_from.clone();

        {
            // STEP 1, FREE BODY IF STUCK

            let recover_attempts = 4;
            const sr = get_sr();

            do {
                // TODO: cache CollCbkData
                const cbk = new CollCbkData();
                cbk.max = max_results;
                cbk.amount = 0;
                cbk.ptr = sr;
                cbk.invalid_by_dir = 0;
                excluded_shape_pair_count = 0; // last step is the one valid

                const cbkres = _shape_col_cbk;

                let collided = false;

                let amount = this._cull_aabb_for_body(p_body, body_aabb);

                for (let body_shape of p_body.shapes) {
                    if (body_shape.disabled) {
                        continue;
                    }

                    if (p_exclude_raycast_shapes && body_shape.shape.type === ShapeType.RAY) {
                        continue;
                    }

                    const body_shape_xform = body_transform.clone().append(body_shape.xform);
                    for (let i = 0; i < amount; i++) {
                        const col_obj = this.intersection_query_results[i];
                        let shape_index = this.intersection_query_subindex_results[i];

                        if (col_obj.type === CollisionObjectType.BODY) {
                            /** @type {Body2DSW} */
                            // @ts-ignore
                            const b = col_obj;
                            if (p_infinite_inertia && b.mode !== BodyMode.STATIC && b.mode !== BodyMode.KINEMATIC) {
                                continue;
                            }
                        }

                        const col_obj_shape_xform = col_obj.transform.clone().append(col_obj.shapes[shape_index].xform);

                        if (col_obj.shapes[shape_index].one_way_collision) {
                            // TODO: cache the get_axis() result
                            cbk.valid_dir.copy(col_obj_shape_xform.get_axis(1)).normalize();

                            cbk.valid_depth = p_margin;
                            cbk.invalid_by_dir = 0;

                            if (col_obj.type === CollisionObjectType.BODY) {
                                /** @type {Body2DSW} */
                                // @ts-ignore
                                const b = col_obj;
                                if (b.mode === BodyMode.KINEMATIC || b.mode === BodyMode.RIGID) {
                                    // fix for moving platforms (kinematic and dynamic), margin is increased by
                                    // how much it moved in the give direction
                                    const lv = b.linear_velocity.clone();
                                    // compute displacement from linear velocity
                                    const motion = lv.multiply(Physics2DDirectBodyStateSW.singleton.step);
                                    const motion_len = motion.length();
                                    motion.normalize();
                                    cbk.valid_depth += motion_len * Math.max(motion.dot(cbk.valid_dir.clone().negate()), 0);
                                }
                            } else {
                                cbk.valid_dir.set(0, 0);
                                cbk.valid_depth = 0;
                                cbk.invalid_by_dir = 0;
                            }

                            let current_collisions = cbk.amount;
                            let did_collide = false;

                            const against_shape = col_obj.shapes[shape_index].shape;
                            if (CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.Zero, against_shape, col_obj_shape_xform, Vector2.Zero, cbkres, cbk, null, separation_margin)) {
                                did_collide = cbk.amount > current_collisions;
                            }

                            if (!did_collide && cbk.invalid_by_dir > 0) {
                                // this shape must be excluded
                                if (excluded_shape_pair_count < max_excluded_shape_pairs) {
                                    const esp = excluded_shape_pairs[excluded_shape_pair_count++];
                                    esp.local_shape = body_shape.shape;
                                    esp.against_object = col_obj;
                                    esp.against_shape_index = shape_index;
                                }
                            }

                            if (did_collide) {
                                collided = true;
                            }
                        }
                    }
                }

                if (!collided) {
                    break;
                }

                const recover_motion = Vector2.create();

                for (let i = 0; i < cbk.amount; i++) {
                    recover_motion.add(
                        (sr[i * 2 + 1].x - sr[i * 2 + 0].x) * 0.4,
                        (sr[i * 2 + 1].y - sr[i * 2 + 0].y) * 0.4
                    );
                }

                if (recover_motion.is_zero()) {
                    collided = false;
                    break;
                }

                body_transform.tx += recover_motion.x;
                body_transform.ty += recover_motion.y;

                body_aabb.x += recover_motion.x;
                body_aabb.y += recover_motion.y;

                recover_attempts--;

            } while (recover_attempts);
        }

        let safe = 1;
        let unsafe = 1;
        let best_shape = -1;

        {
            // STEP 2 ATTEMPT MOTION

            const motion_aabb = body_aabb.clone();
            motion_aabb.x += p_motion.x;
            motion_aabb.y += p_motion.y;
            motion_aabb.merge_to(body_aabb);

            let amount = this._cull_aabb_for_body(p_body, motion_aabb);

            for (let body_shape_idx = 0; body_shape_idx < p_body.shapes.length; body_shape_idx++) {
                const body_shape = p_body.shapes[body_shape_idx];
                if (body_shape.disabled) {
                    continue;
                }

                if (p_exclude_raycast_shapes && body_shape.shape.type === ShapeType.RAY) {
                    continue;
                }

                const body_shape_xform = body_transform.clone().append(body_shape.xform);

                let stuck = false;

                let best_safe = 1;
                let best_unsafe = 1;

                for (let i = 0; i < amount; i++) {
                    const col_obj = this.intersection_query_results[i];
                    let col_shape_idx = this.intersection_query_subindex_results[i];
                    const against_shape = col_obj.shapes[col_shape_idx];

                    if (col_obj.type === CollisionObjectType.BODY) {
                        /** @type {Body2DSW} */
                        // @ts-ignore
                        const b = col_obj;
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

                    const col_obj_shape_xform = col_obj.transform.clone().append(against_shape.xform);
                    // test initial overlap, does it collide if going all the way?
                    if (!CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, p_motion, against_shape.shape, col_obj_shape_xform, Vector2.Zero, null, null, null, 0)) {
                        continue;
                    }

                    // test initial overlap
                    if (!CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.Zero, against_shape.shape, col_obj_shape_xform, Vector2.Zero, null, null, null, 0)) {
                        if (against_shape.one_way_collision) {
                            continue;
                        }

                        stuck = true;
                        break;
                    }

                    // just do kinematic solving
                    let low = 0;
                    let hi = 1;
                    const mnormal = p_motion.normalized();
                    const sep = mnormal.clone();

                    for (let k = 0; k < 8; k++) {
                        const ofs = (low + hi) * 0.5;

                        sep.copy(mnormal);
                        // TODO: cache array and other Vector2, Matrix
                        const collided = CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, p_motion.clone().scale(ofs), against_shape.shape, col_obj_shape_xform, Vector2.Zero, null, null, [sep], 0);

                        if (collided) {
                            hi = ofs;
                        } else {
                            low = ofs;
                        }
                    }

                    if (against_shape.one_way_collision) {
                        const cd = [new Vector2(), new Vector2()];
                        const cbk = new CollCbkData();
                        cbk.max = 1;
                        cbk.amount = 0;
                        cbk.ptr = cd;
                        cbk.valid_dir.copy(col_obj_shape_xform.get_axis(1)).normalize();

                        cbk.valid_depth = Number.MAX_VALUE;

                        const sep = [mnormal.clone()];
                        const collided = CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, p_motion.clone().scale(hi + this.contact_max_allowed_penetration), against_shape.shape, col_obj_shape_xform, Vector2.Zero, _shape_col_cbk, cbk, sep, 0);
                        if (!collided || cbk.amount === 0) {
                            continue;
                        }
                    }

                    if (low < best_safe) {
                        best_safe = low;
                        best_unsafe = hi;
                    }
                }

                if (stuck) {
                    safe = 0;
                    unsafe = 0;
                    best_shape = body_shape_idx;
                    break;
                }
                if (best_safe === 1) {
                    continue;
                }
                if (best_safe < safe) {
                    safe = best_safe;
                    unsafe = best_unsafe;
                    best_shape = body_shape_idx;
                }
            }
        }

        let collided = false;
        if (safe >= 1) {
            best_shape = -1; // no best shape with cast, reset to -1
        }

        {
            // it collided, let's get the reset info in unsafe advance
            const ugt = body_transform.clone();
            ugt.tx += p_motion.x * unsafe;
            ugt.ty += p_motion.y * unsafe;

            // TODO: cache _RestCallbackData2D
            const rcd = new _RestCallbackData2D();
            rcd.best_len = 0;
            rcd.best_object = null;
            rcd.best_shape = 0;

            // optimization
            let from_shape = best_shape !== -1 ? best_shape : 0;
            let to_shape = best_shape !== -1 ? best_shape + 1 : p_body.shapes.length;

            for (let j = from_shape; j < to_shape; j++) {
                const body_shape = p_body.shapes[j];
                const body_shape_xform = ugt.clone().append(body_shape.xform);

                body_aabb.x += p_motion.x * unsafe;
                body_aabb.y += p_motion.y * unsafe;

                let amount = this._cull_aabb_for_body(p_body, body_aabb);

                for (let i = 0; i < amount; i++) {
                    const col_obj = this.intersection_query_results[i];
                    const shape_idx = this.intersection_query_subindex_results[i];

                    if (col_obj.type === CollisionObjectType.BODY) {
                        /** @type {Body2DSW} */
                        // @ts-ignore
                        const b = col_obj;
                        if (p_infinite_inertia && b.mode !== BodyMode.STATIC && b.mode !== BodyMode.KINEMATIC) {
                            continue;
                        }
                    }

                    const against_shape = col_obj.shapes[shape_idx];

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

                    const col_obj_shape_xform = col_obj.transform.clone().append(against_shape.xform);

                    if (against_shape.one_way_collision) {
                        rcd.valid_dir.copy(col_obj_shape_xform.get_axis(1)).normalize();
                        rcd.valid_depth = Number.MAX_VALUE;
                    } else {
                        rcd.valid_dir.set(0, 0);
                        rcd.valid_depth = 0;
                    }

                    rcd.object = col_obj;
                    rcd.shape = shape_idx;
                    rcd.local_shape = j;
                    const sc = CollisionSolver2DSW.solve(body_shape.shape, body_shape_xform, Vector2.Zero, against_shape.shape, col_obj_shape_xform, Vector2.Zero, _rest_cbk_result, rcd, null, p_margin);
                    if (!sc) {
                        continue;
                    }
                }
            }

            if (rcd.best_len !== 0) {
                if (r_result) {
                    r_result.collider = rcd.best_object.self;
                    r_result.collider_id = rcd.best_object;
                    r_result.collider_shape = rcd.best_shape;
                    r_result.collision_local_shape = rcd.best_local_shape;
                    r_result.collision_normal.copy(rcd.best_normal);
                    r_result.collision_point.copy(rcd.best_contact);
                    r_result.collider_metadata = rcd.best_object.get_shape_metadata(rcd.best_shape);

                    /** @type {Body2DSW} */
                    // @ts-ignore
                    const body = rcd.best_object;
                    const rel_vec = r_result.collision_point.clone().subtract(body.transform.origin);
                    r_result.collider_velocity.set(
                        -body.angular_velocity * rel_vec.y,
                        body.angular_velocity * rel_vec.x
                    ).add(body.linear_velocity);

                    r_result.motion.copy(p_motion).scale(safe);
                    r_result.remainder.copy(p_motion).subtract(r_result.motion);
                    r_result.motion.add(body_transform.origin).subtract(p_from.origin);
                }

                collided = true;
            }
        }

        if (!collided && r_result) {
            r_result.motion.copy(p_motion);
            r_result.remainder.set(0, 0);
            r_result.motion.add(body_transform.origin.clone().subtract(p_from.origin));
        }

        return collided;
    }

    /**
     * @param {CollisionObject2DSW} A
     * @param {number} p_subindex_A
     * @param {CollisionObject2DSW} B
     * @param {number} p_subindex_B
     * @param {Space2DSW} p_self
     */
    _broadphase_pair(A, p_subindex_A, B, p_subindex_B, p_self) {
        let type_A = A.type;
        let type_B = B.type;
        if (type_A > type_B) {
            let tmp;
            tmp = B; B = A; A = tmp;
            tmp = p_subindex_A; p_subindex_A = p_subindex_B; p_subindex_B = tmp;
            tmp = type_B; type_B = type_A; type_A = tmp;
        }

        p_self.collision_pairs++;

        if (type_A === CollisionObjectType.AREA) {
            /** @type {Area2DSW} */
            // @ts-ignore
            const area = A;
            if (type_B === CollisionObjectType.AREA) {
                /** @type {Area2DSW} */
                // @ts-ignore
                const area_b = B;
                return new Area2Pair2DSW(area_b, p_subindex_B, area, p_subindex_A);
            } else {
                // TODO: body pair
            }
        } else {
            // TODO: body pair
        }

        return null;
    }
    /**
     * @param {CollisionObject2DSW} A
     * @param {number} p_subindex_A
     * @param {CollisionObject2DSW} B
     * @param {number} p_subindex_B
     * @param {Constraint2DSW} p_data
     * @param {Space2DSW} p_self
     */
    _broadphase_unpair(A, p_subindex_A, B, p_subindex_B, p_data, p_self) {
        p_self.collision_pairs--;
        p_data.free();
    }
}
