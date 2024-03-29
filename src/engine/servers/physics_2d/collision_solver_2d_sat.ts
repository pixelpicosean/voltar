import { CMP_EPSILON } from "engine/core/math/math_defs";
import { Vector2 } from "engine/core/math/vector2";
import { Transform2D } from "engine/core/math/transform_2d";
import { get_closest_point_to_segment_uncapped_2d } from "engine/core/math/geometry";

import {
    Shape2DSW,

    SegmentShape2DSW,
    CircleShape2DSW,
    RectangleShape2DSW,
    CapsuleShape2DSW,
    ConvexPolygonShape2DSW,
} from "./shape_2d_sw";

type CallbackResult = import("./collision_solver_2d_sw").CallbackResult;
type CollisionFunc = (A: Shape2DSW, xform_A: Transform2D, B: Shape2DSW, xform_B: Transform2D, collector: _CollectorCallback2D, motion_A: Vector2, motion_B: Vector2, margin_A: number, margin_B: number) => void;

function create_vec_array(n: number) {
    /** @type {Vector2[]} */
    const array: Vector2[] = Array(n);
    for (let i = 0; i < n; i++) {
        array[i] = new Vector2;
    }
    return array;
}
function reset_vec_array(arr: Vector2[]) {
    for (let v of arr) v.set(0, 0);
    return arr;
}

const max_supports = 2;
const supports_vec_1 = create_vec_array(max_supports);
const supports_vec_2 = create_vec_array(max_supports);

const res_A = { min: 0, max: 0 };
function get_res_A() {
    res_A.min = res_A.max = 0;
    return res_A;
}
const res_B = { min: 0, max: 0 };
function get_res_B() {
    res_B.min = res_B.max = 0;
    return res_B;
}


class _CollectorCallback2D {
    static new() {
        let inst = pool_cbk.pop();
        if (!inst) return new _CollectorCallback2D;

        inst.callback = null;
        inst.userdata = null;
        inst.swap = false;
        inst.collided = false;
        inst.normal.set(0, 0);
        inst.sep_axis = null;

        return inst;
    }
    static free(cbk: _CollectorCallback2D) {
        pool_cbk.push(cbk);
    }

    callback: CallbackResult = null;
    userdata: any = null;
    swap = false;
    collided = false;
    normal: Vector2 = new Vector2;
    sep_axis: Vector2[] = null;

    call(p_point_A: Vector2, p_point_B: Vector2) {
        if (this.swap) {
            this.callback(p_point_B, p_point_A, this.userdata);
        } else {
            this.callback(p_point_A, p_point_B, this.userdata);
        }
    }
}
const pool_cbk: _CollectorCallback2D[] = [];

export function collision_solver_2d(p_shape_A: Shape2DSW, p_transform_A: Transform2D, p_motion_A: Vector2, p_shape_B: Shape2DSW, p_transform_B: Transform2D, p_motion_B: Vector2, p_result_callback: import("./collision_solver_2d_sw").CallbackResult, p_userdata: any, p_swap: boolean = false, sep_axis: Vector2[] = null, p_margin_A: number = 0, p_margin_B: number = 0): boolean {
    let type_A = p_shape_A.type;
    let type_B = p_shape_B.type;

    const callback = _CollectorCallback2D.new();
    callback.callback = p_result_callback;
    callback.swap = p_swap;
    callback.userdata = p_userdata;
    callback.collided = false;
    callback.sep_axis = sep_axis;

    let A = p_shape_A;
    let B = p_shape_B;
    let transform_A = p_transform_A;
    let transform_B = p_transform_B;
    let motion_A = p_motion_A;
    let motion_B = p_motion_B;
    let margin_A = p_margin_A;
    let margin_B = p_margin_B;

    if (type_A > type_B) {
        let tmp;
        tmp = A; A = B; B = tmp;
        tmp = transform_A; transform_A = transform_B; transform_B = tmp;
        tmp = type_A; type_A = type_B; type_B = tmp;
        tmp = motion_A; motion_A = motion_B; motion_B = tmp;
        tmp = margin_A; margin_A = margin_B; margin_B = tmp;
        callback.swap = !callback.swap;
    }

    let collision_func: CollisionFunc = null;

    if (margin_A || margin_B) {
        if (motion_A.is_zero() && motion_B.is_zero()) {
            collision_func = collision_table_margin[type_A - 2][type_B - 2];
        } else if (!motion_A.is_zero() && motion_B.is_zero()) {
            collision_func = collision_table_castA_margin[type_A - 2][type_B - 2];
        } else if (motion_A.is_zero() && !motion_B.is_zero()) {
            collision_func = collision_table_castB_margin[type_A - 2][type_B - 2];
        } else {
            collision_func = collision_table_castA_castB_margin[type_A - 2][type_B - 2];
        }
    } else {
        if (motion_A.is_zero() && motion_B.is_zero()) {
            collision_func = collision_table[type_A - 2][type_B - 2];
        } else if (!motion_A.is_zero() && motion_B.is_zero()) {
            collision_func = collision_table_castA[type_A - 2][type_B - 2];
        } else if (motion_A.is_zero() && !motion_B.is_zero()) {
            collision_func = collision_table_castB[type_A - 2][type_B - 2];
        } else {
            collision_func = collision_table_castA_castB[type_A - 2][type_B - 2];
        }
    }

    collision_func(A, transform_A, B, transform_B, callback, motion_A, motion_B, margin_A, margin_B);

    const collided = callback.collided;
    _CollectorCallback2D.free(callback);

    return collided;
}

function _generate_contacts_point_point(p_points_A: Vector2[], p_point_count_A: number, p_points_B: Vector2[], p_point_count_B: number, p_collector: _CollectorCallback2D) {
    p_collector.call(p_points_A[0], p_points_B[0]);
}

function _generate_contacts_point_edge(p_points_A: Vector2[], p_point_count_A: number, p_points_B: Vector2[], p_point_count_B: number, p_collector: _CollectorCallback2D) {
    let closest_B = get_closest_point_to_segment_uncapped_2d(p_points_A[0], p_points_B, _i_g_c_p_e_Vector2);
    p_collector.call(p_points_A[0], closest_B);
}
class _generate_contacts_Pair {
    a = false;
    idx = 0;
    d = 0;
}
const dvec = [
    new _generate_contacts_Pair,
    new _generate_contacts_Pair,
    new _generate_contacts_Pair,
    new _generate_contacts_Pair,
]
const _generate_contacts_Pair_sort = (a: _generate_contacts_Pair, b: _generate_contacts_Pair): number => (a.d - b.d);

function _generate_contacts_edge_edge(p_points_A: Vector2[], p_point_count_A: number, p_points_B: Vector2[], p_point_count_B: number, p_collector: _CollectorCallback2D) {
    let n = _i_generate_contacts_edge_edge_Vector2_3.copy(p_collector.normal);
    let t = n.tangent(_i_generate_contacts_edge_edge_Vector2_4);
    let dA = n.dot(p_points_A[0]);
    let dB = n.dot(p_points_B[0]);

    dvec[0].d = t.dot(p_points_A[0]);
    dvec[0].a = true;
    dvec[0].idx = 0;
    dvec[1].d = t.dot(p_points_A[1]);
    dvec[1].a = true;
    dvec[1].idx = 1;
    dvec[2].d = t.dot(p_points_B[0]);
    dvec[2].a = false;
    dvec[2].idx = 0;
    dvec[3].d = t.dot(p_points_B[1]);
    dvec[3].a = false;
    dvec[3].idx = 1;

    dvec.sort(_generate_contacts_Pair_sort);

    for (let i = 1; i <= 2; i++) {
        if (dvec[i].a) {
            let a = p_points_A[dvec[i].idx];
            let b = n.plane_project(dB, a, _i_generate_contacts_edge_edge_Vector2_1);
            if (n.dot(a) > n.dot(b) - CMP_EPSILON) {
                continue;
            }
            p_collector.call(a, b);
        } else {
            let b = p_points_B[dvec[i].idx];
            let a = n.plane_project(dA, b, _i_generate_contacts_edge_edge_Vector2_2);
            if (n.dot(a) > n.dot(b) - CMP_EPSILON) {
                continue;
            }
            p_collector.call(a, b);
        }
    }
}

const _i_generate_contacts_edge_edge_Vector2_1 = new Vector2;
const _i_generate_contacts_edge_edge_Vector2_2 = new Vector2;
const _i_generate_contacts_edge_edge_Vector2_3 = new Vector2;
const _i_generate_contacts_edge_edge_Vector2_4 = new Vector2;

const generate_contacts_func_table = [
    [
        _generate_contacts_point_point,
        _generate_contacts_point_edge,
    ],
    [
        null,
        _generate_contacts_edge_edge,
    ]
]

function _generate_contacts_from_supports(p_points_A: Vector2[], p_point_count_A: number, p_points_B: Vector2[], p_point_count_B: number, p_collector: _CollectorCallback2D) {
    let pointcount_B = p_point_count_B, pointcount_A = p_point_count_A;
    let points_A = p_points_A, points_B = p_points_B;

    if (p_point_count_A > p_point_count_B) {
        // swap
        p_collector.swap = !p_collector.swap;
        p_collector.normal.negate();

        pointcount_B = p_point_count_A;
        pointcount_A = p_point_count_B;
        points_A = p_points_B;
        points_B = p_points_A;
    }

    const version_A = (pointcount_A > 2 ? 2 : pointcount_A) - 1;
    const version_B = (pointcount_B > 2 ? 2 : pointcount_B) - 1;

    const contacts_func = generate_contacts_func_table[version_A][version_B];
    contacts_func(points_A, pointcount_A, points_B, pointcount_B, p_collector);
}

class SeparatorAxisTest2D<ShapeA, ShapeB> {
    cast_A: boolean;
    cast_B: boolean;
    with_margin: boolean;

    margin_A = 0;
    margin_B = 0;
    best_depth = 1e15;
    best_axis = new Vector2;
    shape_A: ShapeA = null;
    shape_B: ShapeB = null;
    transform_A = new Transform2D;
    transform_B = new Transform2D;
    motion_A = new Vector2;
    motion_B = new Vector2;

    callback: _CollectorCallback2D = null;

    constructor(cast_A: boolean, cast_B: boolean, with_margin: boolean) {
        this.cast_A = cast_A;
        this.cast_B = cast_B;
        this.with_margin = with_margin;
    }

    init(p_shape_A: ShapeA, p_transform_A: Transform2D, p_shape_B: ShapeB, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2 = Vector2.ZERO, p_motion_B: Vector2 = Vector2.ZERO, p_margin_A: number = 0, p_margin_B: number = 0) {
        this.margin_A = p_margin_A;
        this.margin_B = p_margin_B;
        this.best_depth = 1e15;
        this.best_axis.set(0, 0);
        this.shape_A = p_shape_A;
        this.shape_B = p_shape_B;
        this.transform_A.copy(p_transform_A);
        this.transform_B.copy(p_transform_B);
        this.motion_A.copy(p_motion_A);
        this.motion_B.copy(p_motion_B);

        this.callback = p_collector;
        return this;
    }
    test_previous_axis(): boolean {
        if (this.callback && this.callback.sep_axis && !this.callback.sep_axis[0].is_zero()) {
            return this.test_axis(this.callback.sep_axis[0]);
        }
        return true;
    }
    test_cast(): boolean {
        if (this.cast_A) {
            let na = _i_test_cast_Vector2_1.copy(this.motion_A).normalize();
            if (!this.test_axis(na)) {
                return false;
            }
            let tangent = na.tangent(_i_test_cast_Vector2_2);
            if (!this.test_axis(tangent)) {
                return false;
            }
        }

        if (this.cast_B) {
            let nb = _i_test_cast_Vector2_3.copy(this.motion_B).normalize();
            if (!this.test_axis(nb)) {
                return false;
            }
            let tangent = nb.tangent(_i_test_cast_Vector2_4);
            if (!this.test_axis(tangent)) {
                return false;
            }
        }

        return true;
    }
    test_axis(p_axis: Vector2): boolean {
        let axis = _i_test_axis_Vector2_1.copy(p_axis);

        if (
            Math.abs(axis.x) < CMP_EPSILON
            &&
            Math.abs(axis.y) < CMP_EPSILON
        ) {
            axis.set(0, 1);
        }

        let res_A = get_res_A();
        let res_B = get_res_B();

        if (this.cast_A) {
            // @ts-ignore
            (this.shape_A as unknown as Shape2DSW).project_range_cast(this.motion_A, axis, this.transform_A, res_A);
        } else {
            // @ts-ignore
            (this.shape_A as unknown as Shape2DSW).project_range(axis, this.transform_A, res_A);
        }

        if (this.cast_B) {
            // @ts-ignore
            (this.shape_B as unknown as Shape2DSW).project_range_cast(this.motion_B, axis, this.transform_B, res_B);
        } else {
            // @ts-ignore
            (this.shape_B as unknown as Shape2DSW).project_range(axis, this.transform_B, res_B);
        }

        if (this.with_margin) {
            res_A.min -= this.margin_A;
            res_A.max += this.margin_A;
            res_B.min -= this.margin_B;
            res_B.max += this.margin_B;
        }

        res_B.min -= (res_A.max - res_A.min) * 0.5;
        res_B.max += (res_A.max - res_A.min) * 0.5;

        let dmin = res_B.min - (res_A.min + res_A.max) * 0.5;
        let dmax = res_B.max - (res_A.min + res_A.max) * 0.5;

        if (dmin > 0 || dmax < 0) {
            if (this.callback && this.callback.sep_axis) {
                this.callback.sep_axis[0].copy(axis);
            }

            return false;
        }

        dmin = Math.abs(dmin);

        if (dmax < dmin) {
            if (dmax < this.best_depth) {
                this.best_depth = dmax;
                this.best_axis.copy(axis);
            }
        } else {
            if (dmin < this.best_depth) {
                this.best_depth = dmin;
                this.best_axis.copy(axis).negate();
            }
        }

        return true;
    }
    generate_contacts() {
        // nothing to do, don't generate
        if (this.best_axis.is_zero()) {
            return;
        }

        if (this.callback) {
            this.callback.collided = true;

            // only collide, no callback
            if (!this.callback.callback) {
                return;
            }
        }

        let negate_best_axis = _i_generate_contacts_Vector2_1.copy(this.best_axis).negate();
        let negate_best_axis_inv = _i_generate_contacts_Vector2_2.set(0, 0);

        let supports_A = reset_vec_array(supports_vec_1);
        let support_count_A = 0;
        if (this.cast_A) {
            support_count_A = (this.shape_A as unknown as Shape2DSW).get_supports_transformed_cast(this.motion_A, negate_best_axis, this.transform_A, supports_A, support_count_A);
        } else {
            support_count_A = (this.shape_A as unknown as Shape2DSW).get_supports(this.transform_A.basis_xform_inv(negate_best_axis, negate_best_axis_inv).normalize(), supports_A, support_count_A);
            for (let i = 0; i < support_count_A; i++) {
                this.transform_A.xform(supports_A[i], supports_A[i]);
            }
        }

        if (this.with_margin) {
            for (let i = 0; i < support_count_A; i++) {
                supports_A[i].add(negate_best_axis.x * this.margin_A, negate_best_axis.y * this.margin_A);
            }
        }

        let supports_B = reset_vec_array(supports_vec_2);
        let support_count_B = 0;
        if (this.cast_B) {
            support_count_B = (this.shape_B as unknown as Shape2DSW).get_supports_transformed_cast(this.motion_B, this.best_axis, this.transform_B, supports_B, support_count_B);
        } else {
            support_count_B = (this.shape_B as unknown as Shape2DSW).get_supports(this.transform_B.basis_xform_inv(this.best_axis, negate_best_axis_inv).normalize(), supports_B, support_count_B);
            for (let i = 0; i < support_count_B; i++) {
                this.transform_B.xform(supports_B[i], supports_B[i]);
            }
        }

        if (this.with_margin) {
            for (let i = 0; i < support_count_B; i++) {
                supports_B[i].add(this.best_axis.x * this.margin_B, this.best_axis.y * this.margin_B);
            }
        }

        if (this.callback) {
            this.callback.normal.copy(this.best_axis);
            _generate_contacts_from_supports(supports_A, support_count_A, supports_B, support_count_B, this.callback);

            if (this.callback.sep_axis && !this.callback.sep_axis[0].is_zero()) {
                this.callback.sep_axis[0].set(0, 0); // invalidate previous axis (no test)
            }
        }
    }
}

const _i_test_cast_Vector2_1 = new Vector2;
const _i_test_cast_Vector2_2 = new Vector2;
const _i_test_cast_Vector2_3 = new Vector2;
const _i_test_cast_Vector2_4 = new Vector2;

const _i_test_axis_Vector2_1 = new Vector2;

const TEST_POINT = <ShapeA, ShapeB>(separator: SeparatorAxisTest2D<ShapeA, ShapeB>, cast_A: boolean, cast_B: boolean, p_motion_A: Vector2, p_motion_B: Vector2, m_a: Vector2, m_b: Vector2) => {
    const vec = _i_TEST_POINT_Vector2.set(0, 0);
    const result = (
        (!separator.test_axis((vec.copy(m_a).subtract(m_b).normalize())))
        ||
        (cast_A && !separator.test_axis(vec.copy(m_a).add(p_motion_A).subtract(m_b).normalize()))
        ||
        (cast_B && !separator.test_axis(vec.copy(m_a).subtract(m_b).subtract(p_motion_B).normalize()))
        ||
        (cast_A && cast_B && !separator.test_axis(vec.copy(m_a).add(p_motion_A).subtract(m_b).subtract(p_motion_B).normalize()))
    );
    return result;
}

const _collision_segment_segment = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<SegmentShape2DSW, SegmentShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_segment_A: SegmentShape2DSW, p_transform_A: Transform2D, p_segment_B: SegmentShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        if (!separator.test_axis(p_segment_A.get_xformed_normal(p_transform_A))) {
            return;
        }
        if (!separator.test_axis(p_segment_B.get_xformed_normal(p_transform_B))) {
            return;
        }

        if (with_margin) {
            if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.xform(p_segment_A.a), p_transform_B.xform(p_segment_B.a))) {
                return;
            }
            if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.xform(p_segment_A.a), p_transform_B.xform(p_segment_B.b))) {
                return;
            }
            if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.xform(p_segment_A.b), p_transform_B.xform(p_segment_B.a))) {
                return;
            }
            if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.xform(p_segment_A.b), p_transform_B.xform(p_segment_B.b))) {
                return;
            }
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_segment_circle = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<SegmentShape2DSW, CircleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_segment_A: SegmentShape2DSW, p_transform_A: Transform2D, p_circle_B: CircleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_segment_A, p_transform_A, p_circle_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        // segment normal
        if (!separator.test_axis(
            p_transform_A.xform(p_segment_A.b, _i_c_s_c_Vector2_2).subtract(p_transform_A.xform(p_segment_A.a, _i_c_s_c_Vector2_3)).normalize().tangent(_i_c_s_c_Vector2_4)
        )) {
            return;
        }

        const B_origin = p_transform_B.get_origin(_i_c_s_c_Vector2_1);

        // endpoint a vs circle
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.xform(p_segment_A.a, _i_c_s_c_Vector2_5), B_origin)) {
            return;
        }
        // endpoint b vs circle
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.xform(p_segment_A.b, _i_c_s_c_Vector2_6), B_origin)) {
            return;
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_segment_rectangle = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<SegmentShape2DSW, RectangleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_segment_A: SegmentShape2DSW, p_transform_A: Transform2D, p_rect_B: RectangleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_segment_A, p_transform_A, p_rect_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        const vec = p_segment_A.get_xformed_normal(p_transform_A, _i_c_s_r_Vector2_1);
        if (!separator.test_axis(vec)) {
            return;
        }

        vec.set(p_transform_B.a, p_transform_B.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        vec.set(p_transform_B.c, p_transform_B.d).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        if (with_margin) {
            const inv = _i_c_s_r_Transform2D_1.copy(p_transform_B).affine_inverse();

            const a = p_transform_A.xform(p_segment_A.a, _i_c_s_r_Vector2_2);
            const b = p_transform_A.xform(p_segment_A.b, _i_c_s_r_Vector2_3);

            if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, a, _i_c_s_r_Vector2_4))) {
                return;
            }
            if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, b, _i_c_s_r_Vector2_5))) {
                return;
            }

            if (cast_A) {
                if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, vec.copy(a).add(p_motion_A), _i_c_s_r_Vector2_6))) {
                    return;
                }
                if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, vec.copy(b).add(p_motion_A), _i_c_s_r_Vector2_7))) {
                    return;
                }
            }

            if (cast_B) {
                if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, vec.copy(a).subtract(p_motion_B), _i_c_s_r_Vector2_8))) {
                    return;
                }
                if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, vec.copy(b).subtract(p_motion_B), _i_c_s_r_Vector2_9))) {
                    return;
                }
            }

            if (cast_A && cast_B) {
                if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, vec.copy(a).add(p_motion_A).subtract(p_motion_B), _i_c_s_r_Vector2_10))) {
                    return;
                }
                if (!separator.test_axis(p_rect_B.get_circle_axis(p_transform_B, inv, vec.copy(b).add(p_motion_A).subtract(p_motion_B), _i_c_s_r_Vector2_11))) {
                    return;
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_segment_capsule = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<SegmentShape2DSW, CapsuleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_segment_A: SegmentShape2DSW, p_transform_A: Transform2D, p_capsule_B: CapsuleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_segment_A, p_transform_A, p_capsule_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        const vec = p_segment_A.get_xformed_normal(p_transform_A, _i_c_s_cap_Vector2_1);
        if (!separator.test_axis(vec)) {
            return;
        }

        vec.set(p_transform_B.a, p_transform_B.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        let vec_a: Vector2;
        let vec_b: Vector2;

        vec_a = p_transform_A.xform(p_segment_A.a, _i_c_s_cap_Vector2_2);
        vec_b = p_transform_B.get_origin(_i_c_s_cap_Vector2_3).add(
            p_transform_B.c * p_capsule_B.height * 0.5,
            p_transform_B.d * p_capsule_B.height * 0.5
        );
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
            return;
        }

        vec_a = p_transform_A.xform(p_segment_A.a, _i_c_s_cap_Vector2_2);
        vec_b = p_transform_B.get_origin(_i_c_s_cap_Vector2_3).add(
            p_transform_B.c * p_capsule_B.height * -0.5,
            p_transform_B.d * p_capsule_B.height * -0.5
        );
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
            return;
        }

        vec_a = p_transform_A.xform(p_segment_A.b, _i_c_s_cap_Vector2_2);
        vec_b = p_transform_B.get_origin(_i_c_s_cap_Vector2_3).add(
            p_transform_B.c * p_capsule_B.height * 0.5,
            p_transform_B.d * p_capsule_B.height * 0.5
        );
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
            return;
        }

        vec_a = p_transform_A.xform(p_segment_A.b, _i_c_s_cap_Vector2_2);
        vec_b = p_transform_B.get_origin(_i_c_s_cap_Vector2_3).add(
            p_transform_B.c * p_capsule_B.height * -0.5,
            p_transform_B.d * p_capsule_B.height * -0.5
        );
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
            return;
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_segment_convex_polygon = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<SegmentShape2DSW, ConvexPolygonShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_segment_A: SegmentShape2DSW, p_transform_A: Transform2D, p_convex_B: ConvexPolygonShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_segment_A, p_transform_A, p_convex_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        const vec = p_segment_A.get_xformed_normal(p_transform_A, _i_c_s_con_Vector2_1);
        if (!separator.test_axis(vec)) {
            return;
        }

        for (let i = 0; i < p_convex_B.get_point_count(); i++) {
            let n = p_convex_B.get_xformed_segment_normal(p_transform_B, i, _i_c_s_con_Vector2_2);
            if (!separator.test_axis(n)) {
                return;
            }

            if (with_margin) {
                let vec_a: Vector2;
                let vec_b: Vector2;

                vec_a = p_transform_A.xform(p_segment_A.a, _i_c_s_con_Vector2_3);
                vec_b = p_transform_B.xform(p_convex_B.get_point(i), _i_c_s_con_Vector2_4);
                if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
                    return;
                }

                vec_a = p_transform_A.xform(p_segment_A.b, _i_c_s_con_Vector2_3);
                vec_b = p_transform_B.xform(p_convex_B.get_point(i), _i_c_s_con_Vector2_4);
                if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
                    return;
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}

const _collision_circle_circle = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    /** @type {SeparatorAxisTest2D<CircleShape2DSW, CircleShape2DSW>} */
    const separator: SeparatorAxisTest2D<CircleShape2DSW, CircleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    /**
     * @param {CircleShape2DSW} p_circle_A
     * @param {Transform2D} p_transform_A
     * @param {CircleShape2DSW} p_circle_B
     * @param {Transform2D} p_transform_B
     * @param {_CollectorCallback2D} p_collector
     * @param {Vector2} p_motion_A
     * @param {Vector2} p_motion_B
     * @param {number} p_margin_A
     * @param {number} p_margin_B
     */
    const solve = (p_circle_A: CircleShape2DSW, p_transform_A: Transform2D, p_circle_B: CircleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_circle_A, p_transform_A, p_circle_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        const A_origin = p_transform_A.get_origin(_i_c_c_c_Vector2_1);
        const B_origin = p_transform_B.get_origin(_i_c_c_c_Vector2_2);

        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, A_origin, B_origin)) {
            return;
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_circle_rectangle = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<CircleShape2DSW, RectangleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_circle_A: CircleShape2DSW, p_transform_A: Transform2D, p_rectangle_B: RectangleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_circle_A, p_transform_A, p_rectangle_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        const sphere = p_transform_A.get_elements(2, _i_c_c_r_Vector2_1);
        const axis_0 = p_transform_B.get_elements(0, _i_c_c_r_Vector2_2);
        const axis_1 = p_transform_B.get_elements(1, _i_c_c_r_Vector2_3);

        if (!separator.test_axis(axis_0.normalize())) {
            return;
        }

        if (!separator.test_axis(axis_1.normalize())) {
            return;
        }

        const binv = _i_c_c_r_Transform2D_1.copy(p_transform_B).affine_inverse();
        {
            const c_axis = p_rectangle_B.get_circle_axis(p_transform_B, binv, sphere, _i_c_c_r_Vector2_4);
            if (!separator.test_axis(c_axis)) {
                return;
            }
        }

        if (cast_A) {
            const sphereofs = _i_c_c_r_Vector2_5.copy(sphere).add(p_motion_A);
            const c_axis = p_rectangle_B.get_circle_axis(p_transform_B, binv, sphereofs, _i_c_c_r_Vector2_6);
            if (!separator.test_axis(c_axis)) {
                return;
            }
        }

        if (cast_B) {
            const sphereofs = _i_c_c_r_Vector2_5.copy(sphere).add(p_motion_B);
            const c_axis = p_rectangle_B.get_circle_axis(p_transform_B, binv, sphereofs, _i_c_c_r_Vector2_6);
            if (!separator.test_axis(c_axis)) {
                return;
            }
        }

        if (cast_A && cast_B) {
            const sphereofs = _i_c_c_r_Vector2_5.copy(sphere).add(p_motion_A).subtract(p_motion_B);
            const c_axis = p_rectangle_B.get_circle_axis(p_transform_B, binv, sphereofs, _i_c_c_r_Vector2_6);
            if (!separator.test_axis(c_axis)) {
                return;
            }
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_circle_capsule = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<CircleShape2DSW, CapsuleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_circle_A: CircleShape2DSW, p_transform_A: Transform2D, p_capsule_B: CapsuleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_circle_A, p_transform_A, p_capsule_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        let vec = _i_c_c_cap_Vector2_1.set(p_transform_B.a, p_transform_B.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        let vec_a: Vector2;
        let vec_b: Vector2;

        vec_a = p_transform_A.get_origin(_i_c_c_cap_Vector2_2);
        vec_b = p_transform_B.get_origin(_i_c_c_cap_Vector2_3).add(
            p_transform_B.c * p_capsule_B.height * 0.5,
            p_transform_B.d * p_capsule_B.height * 0.5
        );
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
            return;
        }

        vec_a = p_transform_A.get_origin(_i_c_c_cap_Vector2_2);
        vec_b = p_transform_B.get_origin(_i_c_c_cap_Vector2_3).add(
            p_transform_B.c * p_capsule_B.height * -0.5,
            p_transform_B.d * p_capsule_B.height * -0.5
        );
        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, vec_a, vec_b)) {
            return;
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_circle_convex_polygon = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    /** @type {SeparatorAxisTest2D<CircleShape2DSW, ConvexPolygonShape2DSW>} */
    const separator: SeparatorAxisTest2D<CircleShape2DSW, ConvexPolygonShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    /**
     * @param {CircleShape2DSW} p_circle_A
     * @param {Transform2D} p_transform_A
     * @param {ConvexPolygonShape2DSW} p_convex_B
     * @param {Transform2D} p_transform_B
     * @param {_CollectorCallback2D} p_collector
     * @param {Vector2} p_motion_A
     * @param {Vector2} p_motion_B
     * @param {number} p_margin_A
     * @param {number} p_margin_B
     */
    const solve = (p_circle_A: CircleShape2DSW, p_transform_A: Transform2D, p_convex_B: ConvexPolygonShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_circle_A, p_transform_A, p_convex_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        // poly faces and poly points vs circle
        const point = _i_c_c_con_Vector2_1.set(0, 0);
        for (let i = 0, len = p_convex_B.get_point_count(); i < len; i++) {
            const A_origin = p_transform_A.get_origin(_i_c_c_con_Vector2_2);
            if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, A_origin, p_transform_B.xform(p_convex_B._points[i].pos, point))) {
                return;
            }

            const normal = p_convex_B.get_xformed_segment_normal(p_transform_B, i, _i_c_c_con_Vector2_3);
            if (!separator.test_axis(normal)) {
                return;
            }
        }

        separator.generate_contacts();
    }

    return solve;
}

const _collision_rectangle_rectangle = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    /** @type {SeparatorAxisTest2D<RectangleShape2DSW, RectangleShape2DSW>} */
    const separator: SeparatorAxisTest2D<RectangleShape2DSW, RectangleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    /**
     * @param {RectangleShape2DSW} p_rectangle_A
     * @param {Transform2D} p_transform_A
     * @param {RectangleShape2DSW} p_rectangle_B
     * @param {Transform2D} p_transform_B
     * @param {_CollectorCallback2D} p_collector
     * @param {Vector2} p_motion_A
     * @param {Vector2} p_motion_B
     * @param {number} p_margin_A
     * @param {number} p_margin_B
     */
    const solve = (p_rectangle_A: RectangleShape2DSW, p_transform_A: Transform2D, p_rectangle_B: RectangleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_rectangle_A, p_transform_A, p_rectangle_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        // box faces A
        const elem_A_0 = p_transform_A.get_elements(0, _i_c_r_r_Vector2_1).normalize();
        if (!separator.test_axis(elem_A_0)) {
            return;
        }

        const elem_A_1 = p_transform_A.get_elements(1, _i_c_r_r_Vector2_2).normalize();
        if (!separator.test_axis(elem_A_1)) {
            return;
        }

        // box faces B
        const elem_B_0 = p_transform_B.get_elements(0, _i_c_r_r_Vector2_3).normalize();
        if (!separator.test_axis(elem_B_0)) {
            return;
        }

        const elem_B_1 = p_transform_B.get_elements(1, _i_c_r_r_Vector2_4).normalize();
        if (!separator.test_axis(elem_B_1)) {
            return;
        }

        if (with_margin) {
            const inv_A = _i_c_r_r_Transform2D_1.copy(p_transform_A).affine_inverse();
            const inv_B = _i_c_r_r_Transform2D_2.copy(p_transform_B).affine_inverse();

            if (!separator.test_axis(p_rectangle_A.get_box_axis(p_transform_A, inv_A, p_rectangle_B, p_transform_B, inv_B))) {
                return;
            }

            if (cast_A || cast_B) {
                const aofs = _i_c_r_r_Transform2D_3.copy(p_transform_A);
                aofs.tx += p_motion_A.x;
                aofs.ty += p_motion_A.y;

                const bofs = _i_c_r_r_Transform2D_4.copy(p_transform_B);
                bofs.tx += p_motion_B.x;
                bofs.ty += p_motion_B.y;

                const aofsinv = _i_c_r_r_Transform2D_5.copy(aofs).affine_inverse();
                const bofsinv = _i_c_r_r_Transform2D_6.copy(bofs).affine_inverse();

                if (cast_A) {
                    const box_axis = p_rectangle_A.get_box_axis(aofs, aofsinv, p_rectangle_B, p_transform_B, inv_B, _i_c_r_r_Vector2_5);
                    if (!separator.test_axis(box_axis)) {
                        return;
                    }
                }

                if (cast_B) {
                    const box_axis = p_rectangle_A.get_box_axis(p_transform_A, inv_A, p_rectangle_B, bofs, bofsinv, _i_c_r_r_Vector2_5);
                    if (!separator.test_axis(box_axis)) {
                        return;
                    }
                }

                if (cast_A && cast_B) {
                    const box_axis = p_rectangle_A.get_box_axis(aofs, aofsinv, p_rectangle_B, bofs, bofsinv, _i_c_r_r_Vector2_5);
                    if (!separator.test_axis(box_axis)) {
                        return;
                    }
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_rectangle_capsule = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<RectangleShape2DSW, CapsuleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_rect_A: RectangleShape2DSW, p_transform_A: Transform2D, p_capsule_B: CapsuleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_rect_A, p_transform_A, p_capsule_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        // box faces
        const vec = _i_c_r_cap_Vector2_1.set(p_transform_A.a, p_transform_A.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        vec.set(p_transform_A.c, p_transform_A.d).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        // capsule axis
        vec.set(p_transform_B.a, p_transform_B.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        // box end points to capsule circles
        let boxinv = _i_c_r_cap_Transform2D_1.copy(p_transform_A).affine_inverse();

        for (let i = 0; i < 2; i++) {
            {
                let capsule_endpoint = p_transform_B.get_origin(_i_c_r_cap_Vector2_2)
                    .add(
                        p_transform_B.c * p_capsule_B.height * (i === 0 ? 0.5 : -0.5),
                        p_transform_B.d * p_capsule_B.height * (i === 0 ? 0.5 : -0.5)
                    );

                let c_axis = p_rect_A.get_circle_axis(p_transform_A, boxinv, capsule_endpoint, _i_c_r_cap_Vector2_3);
                if (!separator.test_axis(c_axis)) {
                    return;
                }
            }

            if (cast_A) {
                let capsule_endpoint = p_transform_B.get_origin(_i_c_r_cap_Vector2_2)
                    .add(
                        p_transform_B.c * p_capsule_B.height * (i === 0 ? 0.5 : -0.5),
                        p_transform_B.d * p_capsule_B.height * (i === 0 ? 0.5 : -0.5)
                    );
                capsule_endpoint.subtract(p_motion_A);

                let c_axis = p_rect_A.get_circle_axis(p_transform_A, boxinv, capsule_endpoint, _i_c_r_cap_Vector2_3);
                if (!separator.test_axis(c_axis)) {
                    return;
                }
            }

            if (cast_B) {
                let capsule_endpoint = p_transform_B.get_origin(_i_c_r_cap_Vector2_2)
                    .add(
                        p_transform_B.c * p_capsule_B.height * (i === 0 ? 0.5 : -0.5),
                        p_transform_B.d * p_capsule_B.height * (i === 0 ? 0.5 : -0.5)
                    );
                capsule_endpoint.add(p_motion_B);

                let c_axis = p_rect_A.get_circle_axis(p_transform_A, boxinv, capsule_endpoint, _i_c_r_cap_Vector2_3);
                if (!separator.test_axis(c_axis)) {
                    return;
                }
            }

            if (cast_A && cast_B) {
                let capsule_endpoint = p_transform_B.get_origin(_i_c_r_cap_Vector2_2)
                    .add(
                        p_transform_B.c * p_capsule_B.height * (i === 0 ? 0.5 : -0.5),
                        p_transform_B.d * p_capsule_B.height * (i === 0 ? 0.5 : -0.5)
                    );
                capsule_endpoint.subtract(p_motion_A);
                capsule_endpoint.add(p_motion_B);

                let c_axis = p_rect_A.get_circle_axis(p_transform_A, boxinv, capsule_endpoint, _i_c_r_cap_Vector2_3);
                if (!separator.test_axis(c_axis)) {
                    return;
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_rectangle_convex_polygon = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    /** @type {SeparatorAxisTest2D<RectangleShape2DSW, ConvexPolygonShape2DSW>} */
    const separator: SeparatorAxisTest2D<RectangleShape2DSW, ConvexPolygonShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    /**
     * @param {RectangleShape2DSW} p_rectangle_A
     * @param {Transform2D} p_transform_A
     * @param {ConvexPolygonShape2DSW} p_convex_B
     * @param {Transform2D} p_transform_B
     * @param {_CollectorCallback2D} p_collector
     * @param {Vector2} p_motion_A
     * @param {Vector2} p_motion_B
     * @param {number} p_margin_A
     * @param {number} p_margin_B
     */
    const solve = (p_rectangle_A: RectangleShape2DSW, p_transform_A: Transform2D, p_convex_B: ConvexPolygonShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_rectangle_A, p_transform_A, p_convex_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        const vec = _i_c_r_con_Vector2_1;

        // box faces
        if (!separator.test_axis(vec.set(p_transform_A.a, p_transform_A.b).normalize())) {
            return;
        }

        if (!separator.test_axis(vec.set(p_transform_A.c, p_transform_A.d).normalize())) {
            return;
        }

        // convex faces
        const boxinv = _i_c_r_con_Transform2D_1.identity();
        if (with_margin) {
            boxinv.copy(p_transform_A).affine_inverse();
        }
        for (let i = 0, len = p_convex_B.get_point_count(); i < len; i++) {
            const normal = p_convex_B.get_xformed_segment_normal(p_transform_B, i, _i_c_r_con_Vector2_2);
            if (!separator.test_axis(normal)) {
                return;
            }

            if (with_margin) {
                // all points vs all points need to be tested if margin exist
                const point = p_transform_B.xform(p_convex_B.get_point(i), _i_c_r_con_Vector2_3);
                const axis = p_rectangle_A.get_circle_axis(p_transform_A, boxinv, point, _i_c_r_con_Vector2_4);
                if (!separator.test_axis(axis)) {
                    return;
                }
                if (cast_A) {
                    const point = p_transform_B.xform(p_convex_B.get_point(i), _i_c_r_con_Vector2_3).subtract(p_motion_A);
                    const axis = p_rectangle_A.get_circle_axis(p_transform_A, boxinv, point, _i_c_r_con_Vector2_4);
                    if (!separator.test_axis(axis)) {
                        return;
                    }
                }
                if (cast_B) {
                    const point = p_transform_B.xform(p_convex_B.get_point(i), _i_c_r_con_Vector2_3).add(p_motion_B);
                    const axis = p_rectangle_A.get_circle_axis(p_transform_A, boxinv, point, _i_c_r_con_Vector2_4);
                    if (!separator.test_axis(axis)) {
                        return;
                    }
                }
                if (cast_A && cast_B) {
                    const point = p_transform_B.xform(p_convex_B.get_point(i), _i_c_r_con_Vector2_3).add(p_motion_B).subtract(p_motion_A);
                    const axis = p_rectangle_A.get_circle_axis(p_transform_A, boxinv, point, _i_c_r_con_Vector2_4);
                    if (!separator.test_axis(axis)) {
                        return;
                    }
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}

const _collision_capsule_capsule = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<CapsuleShape2DSW, CapsuleShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_capsule_A: CapsuleShape2DSW, p_transform_A: Transform2D, p_capsule_B: CapsuleShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_capsule_A, p_transform_A, p_capsule_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        // capsule axis

        const vec = _i_c_cap_cap_Vector2_1.set(p_transform_B.a, p_transform_B.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        vec.set(p_transform_A.a, p_transform_A.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        for (let i = 0; i < 2; i++) {
            let capsule_endpoint_A = p_transform_A.get_origin(_i_c_cap_cap_Vector2_2)
                .add(
                    p_transform_A.c * p_capsule_A.height * (i === 0 ? 0.5 : -0.5),
                    p_transform_A.d * p_capsule_A.height * (i === 0 ? 0.5 : -0.5)
                );

            for (let j = 0; j < 2; j++) {
                let capsule_endpoint_B = p_transform_B.get_origin(_i_c_cap_cap_Vector2_3)
                    .add(
                        p_transform_B.c * p_capsule_B.height * (j === 0 ? 0.5 : -0.5),
                        p_transform_B.d * p_capsule_B.height * (j === 0 ? 0.5 : -0.5)
                    );

                if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, capsule_endpoint_A, capsule_endpoint_B)) {
                    return;
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}
const _collision_capsule_convex_polygon = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<CapsuleShape2DSW, ConvexPolygonShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_capsule_A: CapsuleShape2DSW, p_transform_A: Transform2D, p_convex_B: ConvexPolygonShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_capsule_A, p_transform_A, p_convex_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        // capsule axis

        const vec = _i_c_cap_con_Vector2_1.set(p_transform_B.a, p_transform_B.b).normalize();
        if (!separator.test_axis(vec)) {
            return;
        }

        // poly vs capsule
        for (let i = 0; i < p_convex_B.get_point_count(); i++) {
            let cpoint = p_transform_B.xform(p_convex_B.get_point(i), _i_c_cap_con_Vector2_2);

            for (let j = 0; j < 2; j++) {
                let capsule_endpoint_A = p_transform_A.get_origin(_i_c_cap_con_Vector2_3)
                    .add(
                        p_transform_A.c * p_capsule_A.height * (j === 0 ? 0.5 : -0.5),
                        p_transform_A.d * p_capsule_A.height * (j === 0 ? 0.5 : -0.5)
                    );

                if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, capsule_endpoint_A, cpoint)) {
                    return;
                }
            }

            let n = p_convex_B.get_xformed_segment_normal(p_transform_B, i, _i_c_cap_con_Vector2_4);
            if (!separator.test_axis(n)) {
                return;
            }
        }

        separator.generate_contacts();
    }

    return solve;
}

const _collision_convex_polygon_convex_polygon = (cast_A: boolean, cast_B: boolean, with_margin: boolean) => {
    const separator: SeparatorAxisTest2D<ConvexPolygonShape2DSW, ConvexPolygonShape2DSW> = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    const solve = (p_convex_A: ConvexPolygonShape2DSW, p_transform_A: Transform2D, p_convex_B: ConvexPolygonShape2DSW, p_transform_B: Transform2D, p_collector: _CollectorCallback2D, p_motion_A: Vector2, p_motion_B: Vector2, p_margin_A: number, p_margin_B: number) => {
        separator.init(p_convex_A, p_transform_A, p_convex_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        for (let i = 0; i < p_convex_A.get_point_count(); i++) {
            let vec = p_convex_A.get_xformed_segment_normal(p_transform_A, i, _i_c_p_c_p_Vector2_1);
            if (!separator.test_axis(vec)) {
                return;
            }
        }

        for (let i = 0; i < p_convex_B.get_point_count(); i++) {
            let vec = p_convex_B.get_xformed_segment_normal(p_transform_B, i, _i_c_p_c_p_Vector2_1);
            if (!separator.test_axis(vec)) {
                return;
            }
        }

        if (with_margin) {
            for (let i = 0; i < p_convex_A.get_point_count(); i++) {
                for (let j = 0; j < p_convex_B.get_point_count(); j++) {
                    let point_A = p_transform_A.xform(p_convex_A.get_point(i), _i_c_p_c_p_Vector2_1);
                    let point_B = p_transform_B.xform(p_convex_B.get_point(i), _i_c_p_c_p_Vector2_2);

                    if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, point_A, point_B)) {
                        return;
                    }
                }
            }
        }

        separator.generate_contacts();
    }

    return solve;
}

const collision_table = [
    [
        _collision_segment_segment(false, false, false),
        _collision_segment_circle(false, false, false),
        _collision_segment_rectangle(false, false, false),
        _collision_segment_capsule(false, false, false),
        _collision_segment_convex_polygon(false, false, false),
    ],
    [
        null,
        _collision_circle_circle(false, false, false),
        _collision_circle_rectangle(false, false, false),
        _collision_circle_capsule(false, false, false),
        _collision_circle_convex_polygon(false, false, false),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(false, false, false),
        _collision_rectangle_capsule(false, false, false),
        _collision_rectangle_convex_polygon(false, false, false),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(false, false, false),
        _collision_capsule_convex_polygon(false, false, false),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(false, false, false),
    ],
]

const collision_table_castA = [
    [
        _collision_segment_segment(true, false, false),
        _collision_segment_circle(true, false, false),
        _collision_segment_rectangle(true, false, false),
        _collision_segment_capsule(true, false, false),
        _collision_segment_convex_polygon(true, false, false),
    ],
    [
        null,
        _collision_circle_circle(true, false, false),
        _collision_circle_rectangle(true, false, false),
        _collision_circle_capsule(true, false, false),
        _collision_circle_convex_polygon(true, false, false),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(true, false, false),
        _collision_rectangle_capsule(true, false, false),
        _collision_rectangle_convex_polygon(true, false, false),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(true, false, false),
        _collision_capsule_convex_polygon(true, false, false),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(true, false, false),
    ],
]

const collision_table_castB = [
    [
        _collision_segment_segment(false, true, false),
        _collision_segment_circle(false, true, false),
        _collision_segment_rectangle(false, true, false),
        _collision_segment_capsule(false, true, false),
        _collision_segment_convex_polygon(false, true, false),
    ],
    [
        null,
        _collision_circle_circle(false, true, false),
        _collision_circle_rectangle(false, true, false),
        _collision_circle_capsule(false, true, false),
        _collision_circle_convex_polygon(false, true, false),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(false, true, false),
        _collision_rectangle_capsule(false, true, false),
        _collision_rectangle_convex_polygon(false, true, false),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(false, true, false),
        _collision_capsule_convex_polygon(false, true, false),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(false, true, false),
    ],
]

const collision_table_castA_castB = [
    [
        _collision_segment_segment(true, true, false),
        _collision_segment_circle(true, true, false),
        _collision_segment_rectangle(true, true, false),
        _collision_segment_capsule(true, true, false),
        _collision_segment_convex_polygon(true, true, false),
    ],
    [
        null,
        _collision_circle_circle(true, true, false),
        _collision_circle_rectangle(true, true, false),
        _collision_circle_capsule(true, true, false),
        _collision_circle_convex_polygon(true, true, false),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(true, true, false),
        _collision_rectangle_capsule(true, true, false),
        _collision_rectangle_convex_polygon(true, true, false),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(true, true, false),
        _collision_capsule_convex_polygon(true, true, false),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(true, true, false),
    ],
]

const collision_table_margin = [
    [
        _collision_segment_segment(false, false, true),
        _collision_segment_circle(false, false, true),
        _collision_segment_rectangle(false, false, true),
        _collision_segment_capsule(false, false, true),
        _collision_segment_convex_polygon(false, false, true),
    ],
    [
        null,
        _collision_circle_circle(false, false, true),
        _collision_circle_rectangle(false, false, true),
        _collision_circle_capsule(false, false, true),
        _collision_circle_convex_polygon(false, false, true),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(false, false, true),
        _collision_rectangle_capsule(false, false, true),
        _collision_rectangle_convex_polygon(false, false, true),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(false, false, true),
        _collision_capsule_convex_polygon(false, false, true),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(false, false, true),
    ],
]

const collision_table_castA_margin = [
    [
        _collision_segment_segment(true, false, true),
        _collision_segment_circle(true, false, true),
        _collision_segment_rectangle(true, false, true),
        _collision_segment_capsule(true, false, true),
        _collision_segment_convex_polygon(true, false, true),
    ],
    [
        null,
        _collision_circle_circle(true, false, true),
        _collision_circle_rectangle(true, false, true),
        _collision_circle_capsule(true, false, true),
        _collision_circle_convex_polygon(true, false, true),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(true, false, true),
        _collision_rectangle_capsule(true, false, true),
        _collision_rectangle_convex_polygon(true, false, true),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(true, false, true),
        _collision_capsule_convex_polygon(true, false, true),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(true, false, true),
    ],
]

const collision_table_castB_margin = [
    [
        _collision_segment_segment(false, true, true),
        _collision_segment_circle(false, true, true),
        _collision_segment_rectangle(false, true, true),
        _collision_segment_capsule(false, true, true),
        _collision_segment_convex_polygon(false, true, true),
    ],
    [
        null,
        _collision_circle_circle(false, true, true),
        _collision_circle_rectangle(false, true, true),
        _collision_circle_capsule(false, true, true),
        _collision_circle_convex_polygon(false, true, true),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(false, true, true),
        _collision_rectangle_capsule(false, true, true),
        _collision_rectangle_convex_polygon(false, true, true),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(false, true, true),
        _collision_capsule_convex_polygon(false, true, true),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(false, true, true),
    ],
]

const collision_table_castA_castB_margin = [
    [
        _collision_segment_segment(true, true, true),
        _collision_segment_circle(true, true, true),
        _collision_segment_rectangle(true, true, true),
        _collision_segment_capsule(true, true, true),
        _collision_segment_convex_polygon(true, true, true),
    ],
    [
        null,
        _collision_circle_circle(true, true, true),
        _collision_circle_rectangle(true, true, true),
        _collision_circle_capsule(true, true, true),
        _collision_circle_convex_polygon(true, true, true),
    ],
    [
        null,
        null,
        _collision_rectangle_rectangle(true, true, true),
        _collision_rectangle_capsule(true, true, true),
        _collision_rectangle_convex_polygon(true, true, true),
    ],
    [
        null,
        null,
        null,
        _collision_capsule_capsule(true, true, true),
        _collision_capsule_convex_polygon(true, true, true),
    ],
    [
        null,
        null,
        null,
        null,
        _collision_convex_polygon_convex_polygon(true, true, true),
    ],
]

const _i_g_c_p_e_Vector2 = new Vector2;

const _i_generate_contacts_Vector2_1 = new Vector2;
const _i_generate_contacts_Vector2_2 = new Vector2;

const _i_TEST_POINT_Vector2 = new Vector2;

const _i_c_s_c_Vector2_1 = new Vector2;
const _i_c_s_c_Vector2_2 = new Vector2;
const _i_c_s_c_Vector2_3 = new Vector2;
const _i_c_s_c_Vector2_4 = new Vector2;
const _i_c_s_c_Vector2_5 = new Vector2;
const _i_c_s_c_Vector2_6 = new Vector2;

const _i_c_s_r_Vector2_1 = new Vector2;
const _i_c_s_r_Vector2_2 = new Vector2;
const _i_c_s_r_Vector2_3 = new Vector2;
const _i_c_s_r_Vector2_4 = new Vector2;
const _i_c_s_r_Vector2_5 = new Vector2;
const _i_c_s_r_Vector2_6 = new Vector2;
const _i_c_s_r_Vector2_7 = new Vector2;
const _i_c_s_r_Vector2_8 = new Vector2;
const _i_c_s_r_Vector2_9 = new Vector2;
const _i_c_s_r_Vector2_10 = new Vector2;
const _i_c_s_r_Vector2_11 = new Vector2;
const _i_c_s_r_Transform2D_1 = new Transform2D;

const _i_c_s_cap_Vector2_1 = new Vector2;
const _i_c_s_cap_Vector2_2 = new Vector2;
const _i_c_s_cap_Vector2_3 = new Vector2;

const _i_c_s_con_Vector2_1 = new Vector2;
const _i_c_s_con_Vector2_2 = new Vector2;
const _i_c_s_con_Vector2_3 = new Vector2;
const _i_c_s_con_Vector2_4 = new Vector2;

const _i_c_c_c_Vector2_1 = new Vector2;
const _i_c_c_c_Vector2_2 = new Vector2;

const _i_c_c_r_Vector2_1 = new Vector2;
const _i_c_c_r_Vector2_2 = new Vector2;
const _i_c_c_r_Vector2_3 = new Vector2;
const _i_c_c_r_Vector2_4 = new Vector2;
const _i_c_c_r_Vector2_5 = new Vector2;
const _i_c_c_r_Vector2_6 = new Vector2;
const _i_c_c_r_Transform2D_1 = new Transform2D;

const _i_c_c_cap_Vector2_1 = new Vector2;
const _i_c_c_cap_Vector2_2 = new Vector2;
const _i_c_c_cap_Vector2_3 = new Vector2;

const _i_c_c_con_Vector2_1 = new Vector2;
const _i_c_c_con_Vector2_2 = new Vector2;
const _i_c_c_con_Vector2_3 = new Vector2;

const _i_c_r_r_Vector2_1 = new Vector2;
const _i_c_r_r_Vector2_2 = new Vector2;
const _i_c_r_r_Vector2_3 = new Vector2;
const _i_c_r_r_Vector2_4 = new Vector2;
const _i_c_r_r_Vector2_5 = new Vector2;
const _i_c_r_r_Transform2D_1 = new Transform2D;
const _i_c_r_r_Transform2D_2 = new Transform2D;
const _i_c_r_r_Transform2D_3 = new Transform2D;
const _i_c_r_r_Transform2D_4 = new Transform2D;
const _i_c_r_r_Transform2D_5 = new Transform2D;
const _i_c_r_r_Transform2D_6 = new Transform2D;

const _i_c_r_cap_Vector2_1 = new Vector2;
const _i_c_r_cap_Vector2_2 = new Vector2;
const _i_c_r_cap_Vector2_3 = new Vector2;
const _i_c_r_cap_Transform2D_1 = new Transform2D;

const _i_c_r_con_Vector2_1 = new Vector2;
const _i_c_r_con_Vector2_2 = new Vector2;
const _i_c_r_con_Vector2_3 = new Vector2;
const _i_c_r_con_Vector2_4 = new Vector2;
const _i_c_r_con_Transform2D_1 = new Transform2D;

const _i_c_cap_cap_Vector2_1 = new Vector2;
const _i_c_cap_cap_Vector2_2 = new Vector2;
const _i_c_cap_cap_Vector2_3 = new Vector2;

const _i_c_cap_con_Vector2_1 = new Vector2;
const _i_c_cap_con_Vector2_2 = new Vector2;
const _i_c_cap_con_Vector2_3 = new Vector2;
const _i_c_cap_con_Vector2_4 = new Vector2;

const _i_c_p_c_p_Vector2_1 = new Vector2;
const _i_c_p_c_p_Vector2_2 = new Vector2;
