import Vector2 from "./_vector2";
import { CMP_EPSILON } from "./const";
import { clamp } from "./index";

/**
 * @param {Vector2} p_from_a
 * @param {Vector2} p_to_a
 * @param {Vector2} p_from_b
 * @param {Vector2} p_to_b
 * @param {Vector2[]} r_result
 */
export function segment_intersects_segment_2d(p_from_a, p_to_a, p_from_b, p_to_b, r_result) {
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
export function get_closest_points_between_segments(p1, q1, p2, q2, c1, c2) {
    const d1 = q1.clone().subtract(p1);
    const d2 = q2.clone().subtract(p2);
    const r = p1.clone().subtract(p2);
    const a = d1.dot(d1);
    const e = d2.dot(d2);
    const f = d2.dot(r);
    let s = 0, t = 0;
    // Check if either or both segments degenerate into points
    if (a <= CMP_EPSILON && e <= CMP_EPSILON) {
        // Both segments degenerate into points
        c1.copy(p1);
        c2.copy(p2);
        const c = c1.clone().subtract(c2);
        const res = Math.sqrt(c.dot(c));

        Vector2.free(d1);
        Vector2.free(d2);
        Vector2.free(r);
        Vector2.free(c);

        return res;
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
    const c = c1.clone().subtract(c2);
    const res = Math.sqrt(c.dot(c));

    Vector2.free(d1);
    Vector2.free(d2);
    Vector2.free(r);
    Vector2.free(c);

    return res;
}

/**
 * @param {Vector2} p_point
 * @param {Vector2[]} p_segment
 */
export function get_closest_point_to_segment_uncapped_2d(p_point, p_segment) {
    const p = p_point.clone().subtract(p_segment[0]);
    const n = p_segment[1].clone().subtract(p_segment[0]);
    const l = n.length();
    if (l < 1e-10) {
        Vector2.free(p);
        Vector2.free(n);

        return p_segment[0];
    }
    n.divide(l, l);

    const d = n.dot(p);

    return p_segment[0].clone().add(n.scale(d));
}

/**
 * @param {Vector2[]} p_polygon
 */
export function is_polygon_clockwise(p_polygon) {
    const c = p_polygon.length;
    if (c < 3) {
        return false;
    }
    let sum = 0;
    /** @type {Vector2} */
    let v1 = null;
    /** @type {Vector2} */
    let v2 = null;
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
 * @param {Vector2[]} p
 */
export function convex_hull_2d(p) {
    console.warn('"convex_hull_2d" is not supported yet!');
    return [];
}
