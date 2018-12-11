import Vector2 from "./Vector2";
import { CMP_EPSILON } from "./const";
import { clamp } from "./index";

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

        Vector2.delete(d1);
        Vector2.delete(d2);
        Vector2.delete(r);
        Vector2.delete(c);

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

    Vector2.delete(d1);
    Vector2.delete(d2);
    Vector2.delete(r);
    Vector2.delete(c);

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
        Vector2.delete(p);
        Vector2.delete(n);

        return p_segment[0];
    }
    n.divide(l, l);

    const d = n.dot(p);

    return p_segment[0].clone().add(n.scale(d));
}
