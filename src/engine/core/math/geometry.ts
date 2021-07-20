import { clamp } from "./math_funcs";
import { CMP_EPSILON } from "./math_defs";
import { Vector2 } from "./vector2";

export function segment_intersects_segment_2d(p_from_a: Vector2, p_to_a: Vector2, p_from_b: Vector2, p_to_b: Vector2, r_result: Vector2[]) {
    const B = p_to_a.clone().subtract(p_from_a);
    const C = p_from_b.clone().subtract(p_from_a);
    const D = p_to_b.clone().subtract(p_from_a);

    const ABlen = B.dot(B);
    if (ABlen <= 0) {
        return false;
    }
    const Bn = B.clone().divide(ABlen, ABlen);
    C.set(C.x * Bn.x + C.y * Bn.y, C.y * Bn.x - C.x * Bn.y);
    D.set(D.x * Bn.x + D.y * Bn.y, D.y * Bn.x - D.x * Bn.y);

    if ((C.y < 0 && D.y < 0) || (C.y >= 0 && D.y >= 0)) {
        return false;
    }

    const ABpos = D.x + (C.x - D.x) * D.y / (D.y - C.y);

    // fail if segment C-D crosses line A-B outside of segment A-B
    if (ABpos < 0 || ABpos > 1) {
        return false;
    }

    // apply the discovered position to line A-B in the original coordinate system
    if (r_result) {
        r_result[0].copy(B).scale(ABpos).add(p_from_a);
    }

    return true;
}

/**
 * @param {Vector2} p1
 * @param {Vector2} q1
 * @param {Vector2} p2
 * @param {Vector2} q2
 * @param {Vector2} c1
 * @param {Vector2} c2
 */
export function get_closest_points_between_segments(p1: Vector2, q1: Vector2, p2: Vector2, q2: Vector2, c1: Vector2, c2: Vector2) {
    const d1 = _i_g_c_p_b_s_Vector2_1.copy(q1).subtract(p1);
    const d2 = _i_g_c_p_b_s_Vector2_2.copy(q2).subtract(p2);
    const r = _i_g_c_p_b_s_Vector2_3.copy(p1).subtract(p2);
    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);
    let s = 0, t = 0;
    // Check if either or both segments degenerate into points
    if (a <= CMP_EPSILON && e <= CMP_EPSILON) {
        // Both segments degenerate into points
        c1.copy(p1);
        c2.copy(p2);
        const c = _i_g_c_p_b_s_Vector2_4.copy(c1).subtract(c2);
        return Math.sqrt(c.dot(c));
    }
    if (a <= CMP_EPSILON) {
        // First segment degenerates into a point
        s = 0;
        t = f / e; // s = 0 => t = (b*s + f) / e = f / e
        t = clamp(t, 0, 1);
    } else {
        const c = d1.dot(r);
        if (e <= CMP_EPSILON) {
            // Second segment degenerates into a point
            t = 0.0;
            s = clamp(-c / a, 0, 1); // t = 0 => s = (b*t - c) / a = -c / a
        } else {
            // The general nondegenerate case starts here
            const b = d1.dot(d2);
            const denom = a * e - b * b; // Always nonnegative
            // If segments not parallel, compute closest point on L1 to L2 and
            // clamp to segment S1. Else pick arbitrary s (here 0)
            if (denom !== 0) {
                s = clamp((b * f - c * e) / denom, 0, 1);
            } else {
                s = 0;
            }
            // Compute point on L2 closest to S1(s) using
            // t = Dot((P1 + D1*s) - P2,D2) / Dot(D2,D2) = (b*s + f) / e
            t = (b * s + f) / e;

            //If t in [0,1] done. Else clamp t, recompute s for the new value
            // of t using s = Dot((P2 + D2*t) - P1,D1) / Dot(D1,D1)= (t*b - c) / a
            // and clamp s to [0, 1]
            if (t < 0) {
                t = 0;
                s = clamp(-c / a, 0, 1);
            } else if (t > 1) {
                t = 1;
                s = clamp((b - c) / a, 0, 1);
            }
        }
    }
    c1.copy(p1).add(d1.scale(s));
    c2.copy(p2).add(d2.scale(t));
    const c = _i_g_c_p_b_s_Vector2_5.copy(c1).subtract(c2);
    return Math.sqrt(c.dot(c));
}

export function get_closest_point_to_segment_uncapped_2d(p_point: Vector2, p_segment: Vector2[], r_out?: Vector2) {
    if (!r_out) r_out = Vector2.new();

    const p = _i_g_c_p_t_s_u_2_Vector2_1.copy(p_point).subtract(p_segment[0]);
    const n = _i_g_c_p_t_s_u_2_Vector2_2.copy(p_segment[1]).subtract(p_segment[0]);
    const l2 = n.length_squared();
    if (l2 < 1e-20) {
        return r_out.copy(p_segment[0]);
    }

    const d = n.dot(p) / l2;

    return r_out.copy(p_segment[0]).add(n.scale(d));
}

/**
 * @param {Vector2[]} p_polygon
 */
export function is_polygon_clockwise(p_polygon: Vector2[]) {
    const c = p_polygon.length;
    if (c < 3) {
        return false;
    }
    let sum = 0;
    /** @type {Vector2} */
    let v1: Vector2 = null;
    /** @type {Vector2} */
    let v2: Vector2 = null;
    for (let i = 0; i < c; i++) {
        v1 = p_polygon[i];
        v2 = p_polygon[(i + 1) % c];
        sum += (v2.x - v1.x) * (v2.y + v1.y);
    }

    return sum > 0;
}

/**
 * Returns a list of points on the convex hull in counter-clockwise order.
 * Note: the last point in the returned list is the same as the first one.
 */
export function convex_hull_2d(p: Vector2[]): Vector2[] {
    console.warn('"convex_hull_2d" is not supported yet!');
    return [];
}

const _i_g_c_p_b_s_Vector2_1 = new Vector2;
const _i_g_c_p_b_s_Vector2_2 = new Vector2;
const _i_g_c_p_b_s_Vector2_3 = new Vector2;
const _i_g_c_p_b_s_Vector2_4 = new Vector2;
const _i_g_c_p_b_s_Vector2_5 = new Vector2;

const _i_g_c_p_t_s_u_2_Vector2_1 = new Vector2;
const _i_g_c_p_t_s_u_2_Vector2_2 = new Vector2;
