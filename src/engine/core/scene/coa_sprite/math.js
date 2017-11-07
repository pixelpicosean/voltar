export const PI = Math.PI;
export const PI2 = PI * 2;

export const DegToRad = Math.PI / 180;
export const RadToDeg = 180 / Math.PI;

/**
 * Linear interpolation of two values for the give factor
 * @param {number} a
 * @param {number} b
 * @param {number} f
 * @returns {number}
 */
export function linear(a, b, f) {
    return a + (b - a) * f;
}

/**
 * Wrap angle to [0, PI2]
 * @param {number} angle
 * @returns {number}
 */
export function wrap_angle(angle) {
    return (angle === 0) ? angle : (
        (angle < 0) ? ((angle - PI) % PI2 + PI) : ((angle + PI) % PI2 - PI)
    );
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} spin
 * @param {number} f
 * @returns { number}
 */
export function angle_linear(a, b, spin, f) {
    if (spin === 0) {
        return a;
    }
    if (spin > 0 && (b - a) < 0) {
        b += PI2;
    }
    if (spin < 0 && (b - a) > 0) {
        b -= PI2;
    }
    return wrap_angle(a + wrap_angle(b - a) * f);
}

/**
 * Does a linear angle interpolation towards the closest direction
 * @param {number} a
 * @param {number} b
 * @param {number} f
 */
export function closer_angle_linear(a, b, f) {
    if (Math.abs(b - a) < PI) {
        return linear(a, b, f);
    }
    if (a < b) {
        a += PI2;
    }
    else {
        b += PI2;
    }
    return linear(a, b, f);
}

/**
 * @param {number} c0
 * @param {number} c1
 * @param {number} c2
 * @param {number} f
 * @returns {number}
 */
export function bezier2(c0, c1, c2, f) {
    return linear(linear(c0, c1, f), linear(c1, c2, f), f);
}
/**
 * @param {number} c0
 * @param {number} c1
 * @param {number} c2
 * @param {number} c3
 * @param {number} f
 * @returns {number}
 */
export function bezier3(c0, c1, c2, c3, f) {
    return linear(bezier2(c0, c1, c2, f), bezier2(c1, c2, c3, f), f);
}
/**
 * @param {number} c0
 * @param {number} c1
 * @param {number} c2
 * @param {number} c3
 * @param {number} c4
 * @param {number} f
 * @returns {number}
 */
export function bezier4(c0, c1, c2, c3, c4, f) {
    return linear(bezier3(c0, c1, c2, c3, f), bezier3(c1, c2, c3, c4, f), f);
}
/**
 * @param {number} c0
 * @param {number} c1
 * @param {number} c2
 * @param {number} c3
 * @param {number} c4
 * @param {number} c5
 * @param {number} f
 * @returns {number}
 */
export function bezier5(c0, c1, c2, c3, c4, c5, f) {
    return linear(bezier4(c0, c1, c2, c3, c4, f), bezier4(c1, c2, c3, c4, c5, f), f);
}
/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} t
 * @returns {number}
 */
export function bezier2d(x1, y1, x2, y2, t) {
    // TODO
    return 0;
}
/**
 * @param {number} ax
 * @param {number} bx
 * @param {number} cx
 * @param {number} ay
 * @param {number} by
 * @param {number} cy
 * @param {number} x
 * @param {number} epsilon
 * @returns {number}
 */
function solve(ax, bx, cx, ay, by, cy, x, epsilon) {
    return sample_curve(ay, by, cy, solve_curve_x(ax, bx, cx, x, epsilon));
}
/**
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @param {number} t
 * @returns {number}
 */
function sample_curve(a, b, c, t) {
    return ((a * t + b) * t + c) * t;
}
/**
 * @param {number} ax
 * @param {number} bx
 * @param {number} cx
 * @param {number} x
 * @param {number} epsilon
 * @returns {number}
 */
function solve_curve_x(ax, bx, cx, x, epsilon) {
    /** @type {number} */
    let t0;
    /** @type {number} */
    let t1;
    /** @type {number} */
    let t2;
    /** @type {number} */
    let x2;
    /** @type {number} */
    let d2;
    /** @type {number} */
    let i;

    for (t2 = x, i = 0; i < 8; i++) {
        x2 = sample_curve(ax, bx, cx, t2) - x;
        if (Math.abs(x2) < epsilon) {
            return t2;
        }

        d2 = sample_curve_derivative_x(ax, bx, cx, t2);
        if (Math.abs(d2) < 1e-6) {
            break;
        }

        t2 -= x2 / d2;
    }

    t0 = 0;
    t1 = 1;
    t2 = x;

    if (t2 < t0) {
        return t0;
    }
    if (t2 < t1) {
        return t1;
    }

    while (t0 < t1) {
        x2 = sample_curve(ax, bx, cx, t2);
        if (Math.abs(x2 - x) < epsilon) {
            return t2;
        }
        if (x > x2) {
            t0 = t2;
        }
        else {
            t1 = t2;
        }
        t2 = (t1 - t0) * 0.5 + t0;
    }

    return t2;
}
/**
 * @param {number} ax
 * @param {number} bx
 * @param {number} cx
 * @param {number} t
 * @returns {number}
 */
function sample_curve_derivative_x(ax, bx, cx, t) {
    return (3 * ax * t + 2 * bx) * t + cx;
}
