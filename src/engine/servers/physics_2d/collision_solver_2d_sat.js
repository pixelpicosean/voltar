import { Shape2DSW, CircleShape2DSW } from "./shape_2d_sw";
import { Matrix, Vector2, CMP_EPSILON } from "engine/math/index";
import { get_closest_point_to_segment_uncapped_2d } from "engine/math/geometry";

/**
 * @param {number} n
 */
const create_vec_array = (n) => {
    /** @type {Vector2[]} */
    const array = new Array(n);
    for (let i = 0; i < n; i++) {
        array[i] = new Vector2();
    }
    return array;
}
/**
 * @param {Vector2[]} arr
 */
const reset_vec_array = (arr) => {
    for (let v of arr) v.set(0, 0);
    return arr;
}

const max_supports = 2;
const supports_vec_1 = create_vec_array(max_supports);
const supports_vec_2 = create_vec_array(max_supports);

class _CollectorCallback2D {
    constructor() {
        /** @type {import("./collision_solver_2d_sw").CallbackResult} */
        this.callback = null;
        this.userdata = null;
        this.swap = false;
        this.collided = false;
        this.normal = new Vector2();
        this.sep_axis = new Vector2();
    }
    /**
     * @param {Vector2} p_point_A
     * @param {Vector2} p_point_B
     */
    call(p_point_A, p_point_B) {
        if (this.swap) {
            this.callback(p_point_B, p_point_A, this.userdata);
        } else {
            this.callback(p_point_A, p_point_B, this.userdata);
        }
    }
}

/**
 * @param {Shape2DSW} p_shape_A
 * @param {Matrix} p_transform_A
 * @param {Vector2} p_motion_A
 * @param {Shape2DSW} p_shape_B
 * @param {Matrix} p_transform_B
 * @param {Vector2} p_motion_B
 * @param {import("./collision_solver_2d_sw").CallbackResult} p_result_callback
 * @param {any} p_userdata
 * @param {boolean} [p_swap]
 * @param {Vector2} [sep_axis]
 * @param {number} [p_margin_A]
 * @param {number} [p_margin_B]
 * @returns {boolean}
 */
export function sat_2d_calculate_penetration(p_shape_A, p_transform_A, p_motion_A, p_shape_B, p_transform_B, p_motion_B, p_result_callback, p_userdata, p_swap = false, sep_axis = null, p_margin_A = 0, p_margin_B = 0) {
    let type_A = p_shape_A.type;
    let type_B = p_shape_B.type;

    // TODO: cache the callback
    const callback = new _CollectorCallback2D();
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

    let collision_func = null;

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

    return callback.collided;
}

/**
 * @param {Vector2[]} p_points_A
 * @param {number} p_point_count_A
 * @param {Vector2[]} p_points_B
 * @param {number} p_point_count_B
 * @param {_CollectorCallback2D} p_collector
 */
function _generate_contacts_point_point(p_points_A, p_point_count_A, p_points_B, p_point_count_B, p_collector) {
    p_collector.call(p_points_A[0], p_points_B[0]);
}
/**
 * @param {Vector2[]} p_points_A
 * @param {number} p_point_count_A
 * @param {Vector2[]} p_points_B
 * @param {number} p_point_count_B
 * @param {_CollectorCallback2D} p_collector
 */
function _generate_contacts_point_edge(p_points_A, p_point_count_A, p_points_B, p_point_count_B, p_collector) {
    const closest_B = get_closest_point_to_segment_uncapped_2d(p_points_A[0], p_points_B);
    p_collector.call(p_points_A[0], closest_B);
    Vector2.delete(closest_B);
}
class _generate_contacts_Pair {
    constructor() {
        this.a = false;
        this.idx = 0;
        this.d = 0;
    }
}
/**
 * @param {Vector2[]} p_points_A
 * @param {number} p_point_count_A
 * @param {Vector2[]} p_points_B
 * @param {number} p_point_count_B
 * @param {_CollectorCallback2D} p_collector
 */
function _generate_contacts_edge_edge(p_points_A, p_point_count_A, p_points_B, p_point_count_B, p_collector) {
    const n = p_collector.normal.clone();
    const t = n.tangent();
    const dA = n.dot(p_points_A[0]);
    const dB = n.dot(p_points_B[0]);

    // TODO: cache this array
    const dvec = [
        new _generate_contacts_Pair(),
        new _generate_contacts_Pair(),
        new _generate_contacts_Pair(),
        new _generate_contacts_Pair(),
    ]

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

    dvec.sort((a, b) => (a.d - b.d));

    for (let i = 1; i <= 2; i++) {
        if (dvec[i].a) {
            const a = p_points_A[dvec[i].idx];
            const b = n.plane_project(dB, a);
            if (n.dot(a) > n.dot(b) - CMP_EPSILON)
                continue;
            p_collector.call(a, b);

            Vector2.delete(b);
        } else {
            const b = p_points_B[dvec[i].idx];
            const a = n.plane_project(dA, b);
            if (n.dot(a) > n.dot(b) - CMP_EPSILON)
                continue;
            p_collector.call(a, b);

            Vector2.delete(a);
        }
    }
}

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

/**
 * @param {Vector2[]} p_points_A
 * @param {number} p_point_count_A
 * @param {Vector2[]} p_points_B
 * @param {number} p_point_count_B
 * @param {_CollectorCallback2D} p_collector
 */
function _generate_contacts_from_supports(p_points_A, p_point_count_A, p_points_B, p_point_count_B, p_collector) {
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

    const version_A = (pointcount_A > 3 ? 3 : pointcount_A) - 1;
    const version_B = (pointcount_B > 3 ? 3 : pointcount_B) - 1;

    const contacts_func = generate_contacts_func_table[version_A][version_B];
    contacts_func(points_A, pointcount_A, points_B, pointcount_B, p_collector);
}

/**
 * @template ShapeA {Shape2DSW}
 * @template ShapeB {Shape2DSW}
 */
class SeparatorAxisTest2D {
    /**
     * @param {boolean} cast_A
     * @param {boolean} cast_B
     * @param {boolean} with_margin
     */
    constructor(cast_A, cast_B, with_margin) {
        this.cast_A = cast_A;
        this.cast_B = cast_B;
        this.with_margin = with_margin;

        this.margin_A = 0;
        this.margin_B = 0;
        this.best_depth = Number.MAX_VALUE;
        this.best_axis = new Vector2();
        this.shape_A = null;
        this.shape_B = null;
        this.transform_A = new Matrix();
        this.transform_B = new Matrix();
        this.motion_A = new Vector2();
        this.motion_B = new Vector2();

        this.callback = null;
    }
    /**
     * @param {ShapeA} p_shape_A
     * @param {Matrix} p_transform_A
     * @param {ShapeB} p_shape_B
     * @param {Matrix} p_transform_B
     * @param {_CollectorCallback2D} p_collector
     * @param {Vector2} p_motion_A
     * @param {Vector2} p_motion_B
     * @param {number} p_margin_A
     * @param {number} p_margin_B
     */
    init(p_shape_A, p_transform_A, p_shape_B, p_transform_B, p_collector, p_motion_A = Vector2.Zero, p_motion_B = Vector2.Zero, p_margin_A = 0, p_margin_B = 0) {
        this.margin_A = p_margin_A;
        this.margin_B = p_margin_B;
        this.best_depth = Number.MAX_VALUE;
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
    test_previous_axis() {
        if (this.callback && this.callback.sep_axis && !this.callback.sep_axis.is_zero()) {
            return this.test_axis(this.callback.sep_axis);
        }
        return true;
    }
    test_cast() {
        if (this.cast_A) {
            const na = this.motion_A.normalized();
            if (!this.test_axis(na)) {
                Vector2.delete(na);
                return false;
            }
            if (!this.test_axis(na.tangent())) {
                Vector2.delete(na);
                return false;
            }
        }

        if (this.cast_B) {
            const nb = this.motion_B.normalized();
            if (!this.test_axis(nb)) {
                Vector2.delete(nb);
                return false;
            }
            if (!this.test_axis(nb.tangent())) {
                Vector2.delete(nb);
                return false;
            }
        }

        return true;
    }
    /**
     * @param {Vector2} p_axis
     */
    test_axis(p_axis) {
        const axis = p_axis.clone();

        if (
            Math.abs(axis.x) < CMP_EPSILON
            &&
            Math.abs(axis.y) < CMP_EPSILON
        ) {
            axis.set(0, 1);
        }

        const res_A = { min: 0, max: 0 };
        const res_B = { min: 0, max: 0 };

        if (this.cast_A) {
            // @ts-ignore
            this.shape_A.project_range_cast(this.motion_A, axis, this.transform_A, res_A);
        } else {
            // @ts-ignore
            this.shape_A.project_range(axis, this.transform_A, res_A);
        }

        if (this.cast_B) {
            // @ts-ignore
            this.shape_B.project_range_cast(this.motion_B, axis, this.transform_B, res_B);
        } else {
            // @ts-ignore
            this.shape_B.project_range(axis, this.transform_B, res_B);
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
                this.callback.sep_axis.copy(axis);
            }

            Vector2.delete(axis);
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

        Vector2.delete(axis);
        return true;
    }
    generate_contacts() {
        // nothing to do, don't generate
        if (this.best_axis.equals(Vector2.Zero)) {
            return;
        }

        this.callback.collided = true;

        // only collide, no callback
        if (!this.callback.callback) {
            return;
        }

        const negate_best_axis = this.best_axis.clone();
        const supports_A = reset_vec_array(supports_vec_1);
        let support_count_A = 0;
        if (this.cast_A) {
            // @ts-ignore
            support_count_A = this.shape_A.get_supports_transformed_cast(this.motion_A, negate_best_axis, this.transform_A, supports_A);
            for (let i = 0; i < support_count_A; i++) {
                this.transform_A.xform(supports_A[i], supports_A[i]);
            }
        }

        if (this.with_margin) {
            for (let i = 0; i < support_count_A; i++) {
                supports_A[i].add(negate_best_axis.x * this.margin_A, negate_best_axis.y * this.margin_A);
            }
        }

        const supports_B = reset_vec_array(supports_vec_2);
        let support_count_B = 0;
        if (this.cast_B) {
            // @ts-ignore
            support_count_B = this.shape_B.get_supports_transformed_cast(this.motion_B, negate_best_axis, this.transform_B, supports_B);
            for (let i = 0; i < support_count_B; i++) {
                this.transform_B.xform(supports_B[i], supports_B[i]);
            }
        }

        if (this.with_margin) {
            for (let i = 0; i < support_count_B; i++) {
                supports_B[i].add(this.best_axis.x * this.margin_B, this.best_axis.y * this.margin_B);
            }
        }

        this.callback.normal.copy(this.best_axis);
        _generate_contacts_from_supports(supports_A, support_count_A, supports_B, support_count_B, this.callback);

        if (this.callback && this.callback.sep_axis && this.callback.sep_axis.is_zero()) {
            this.callback.sep_axis.set(0, 0); // invalidate previous axis (no test)
        }
    }
}

/**
 * @template ShapeA, ShapeB
 * @param {SeparatorAxisTest2D<ShapeA, ShapeB>} separator
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {Vector2} p_motion_A
 * @param {Vector2} p_motion_B
 * @param {Vector2} m_a
 * @param {Vector2} m_b
 */
const TEST_POINT = (separator, cast_A, cast_B, p_motion_A, p_motion_B, m_a, m_b) => {
    const vec = Vector2.create();
    const result = (
        (!separator.test_axis((vec.copy(m_a).subtract(m_b).normalize())))
        ||
        (cast_A && !separator.test_axis(vec.copy(m_a).add(p_motion_A).subtract(m_b).normalize()))
        ||
        (cast_B && !separator.test_axis(vec.copy(m_a).subtract(m_b).subtract(p_motion_B).normalize()))
        ||
        (cast_A && cast_B && !separator.test_axis(vec.copy(m_a).add(p_motion_A).subtract(m_b).subtract(p_motion_B).normalize()))
    );
    Vector2.delete(vec);
    return result;
}

/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_segment_segment = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_segment_circle = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_segment_rectangle = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_segment_capsule = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_segment_convex_polygon = (cast_A, cast_B, with_margin) => {
    return () => false;
}

/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_circle_circle = (cast_A, cast_B, with_margin) => {
    /** @type {SeparatorAxisTest2D<CircleShape2DSW, CircleShape2DSW>} */
    const separator = new SeparatorAxisTest2D(cast_A, cast_B, with_margin);

    /**
     * @param {CircleShape2DSW} p_circle_A
     * @param {Matrix} p_transform_A
     * @param {CircleShape2DSW} p_circle_B
     * @param {Matrix} p_transform_B
     * @param {_CollectorCallback2D} p_collector
     * @param {Vector2} p_motion_A
     * @param {Vector2} p_motion_B
     * @param {number} p_margin_A
     * @param {number} p_margin_B
     */
    const solve = (p_circle_A, p_transform_A, p_circle_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B) => {
        separator.init(p_circle_A, p_transform_A, p_circle_B, p_transform_B, p_collector, p_motion_A, p_motion_B, p_margin_A, p_margin_B);

        if (!separator.test_previous_axis()) {
            return;
        }

        if (!separator.test_cast()) {
            return;
        }

        if (TEST_POINT(separator, cast_A, cast_B, p_motion_A, p_motion_B, p_transform_A.origin, p_transform_B.origin)) {
            return;
        }

        separator.generate_contacts();
    }

    return solve;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_circle_rectangle = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_circle_capsule = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_circle_convex_polygon = (cast_A, cast_B, with_margin) => {
    return () => false;
}

/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_rectangle_rectangle = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_rectangle_capsule = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_rectangle_convex_polygon = (cast_A, cast_B, with_margin) => {
    return () => false;
}

/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_capsule_capsule = (cast_A, cast_B, with_margin) => {
    return () => false;
}
/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_capsule_convex_polygon = (cast_A, cast_B, with_margin) => {
    return () => false;
}

/**
 * @param {boolean} cast_A
 * @param {boolean} cast_B
 * @param {boolean} with_margin
 */
const _collision_convex_polygon_convex_polygon = (cast_A, cast_B, with_margin) => {
    return () => false;
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
    [],
    [],
    [],
    [],
    [],
]

const collision_table_castB = [
    [],
    [],
    [],
    [],
    [],
]

const collision_table_castA_castB = [
    [],
    [],
    [],
    [],
    [],
]

const collision_table_margin = [
    [],
    [],
    [],
    [],
    [],
]

const collision_table_castA_margin = [
    [],
    [],
    [],
    [],
    [],
]

const collision_table_castB_margin = [
    [],
    [],
    [],
    [],
    [],
]

const collision_table_castA_castB_margin = [
    [],
    [],
    [],
    [],
    [],
]
