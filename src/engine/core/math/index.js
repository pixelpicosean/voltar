import { PI, PI2, DEG_TO_RAD, RAD_TO_DEG } from './const';

/**
 * Math classes and utilities mixed into v namespace.
 */
export { default as Vector2 } from './_vector2';
export { default as ObservableVector2 } from './observable_vector2';
export { default as Matrix } from './_matrix';
export { default as GroupD8 } from './group_d8';
export { default as Bounds } from './_bounds';

export { default as Transform } from './_transform';

export { default as Circle } from './shapes/circle';
export { default as Ellipse } from './shapes/ellipse';
export { default as Polygon } from './shapes/polygon';
export { default as Rectangle } from './shapes/rectangle';
export { default as RoundedRectangle } from './shapes/rounded_rectangle';

export * from './const';

/**
 * Force a value within the boundaries by clamping `x` to the range `[a, b]`.
 *
 * @param {number} x Target value to clamp
 * @param {number} a Min value
 * @param {number} b Max value
 * @return {number} Clamped value
 */
export function clamp(x, a, b) {
    return (x < a) ? a : ((x > b) ? b : x);
}

/**
 * Bring the value between min and max.
 *
 * Values larger than `max` are wrapped back to `min`
 * and vice-versa.
 *
 * @param {number}  value value to process
 * @param {number}  min lowest valid value
 * @param {number}  max largest valid value
 * @return {number} result
 */
export const wrap = (value, min, max) => (value - min) % (max - min) + min;

/**
 * @param {number} a
 * @param {number} n
 * @returns {number}
 */
export const mod = (a, n) => a % n;

/**
 * @param {number} p_x
 * @param {number} p_y
 * @returns {number}
 */
export const posmod = (p_x, p_y) => {
    let value = p_x % p_y;
    if ((value < 0 && p_y > 0) || (value > 0 && p_y < 0)) {
        value += p_y;
    }
    value += 0.0;
    return value;
};

/**
 * @param {number} a
 * @param {number} b
 * @param {number} fct
 * @returns {number}
 */
export const lerp = (a, b, fct) => a + (b - a) * fct;

/**
 * wrap to [-PI, +PI]
 */
export const wrap_angle = (a) => (a + PI) % PI2 - PI;

/**
 * Minimal difference between 2 angles
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export const angle_difference = (a, b) => mod((b - a + PI), PI2) - PI;

/**
 * @param {number} p_x
 * @param {number} p_c
 * @returns {number}
 */
export function ease(p_x, p_c) {
    if (p_x < 0) {
        p_x = 0;
    }
    else if (p_x > 1) {
        p_x = 1;
    }
    if (p_c > 0) {
        if (p_c < 1) {
            return 1 - Math.pow(1 - p_x, 1.0 / p_c);
        }
        else {
            return Math.pow(p_x, p_c);
        }
    }
    else if (p_c < 0) {
        //inout ease

        if (p_x < 0.5) {
            return Math.pow(p_x * 2, -p_c) * 0.5;
        } else {
            return (1 - Math.pow(1 - (p_x - 0.5) * 2, -p_c)) * 0.5 + 0.5;
        }
    }
    else {
        return 0; // no ease (raw)
    }
}

export function deg2rad(deg) {
    return DEG_TO_RAD * deg;
}

export function rad2deg(rad) {
    return RAD_TO_DEG * rad;
}

/**
 * Returns the nearest larger power of 2 for integer value.
 *
 * @param {number} v
 * @return {number}
 */
export function nearest_po2(v) {
    // @ts-ignore
    v += v === 0;
    --v;
    v |= v >>> 1;
    v |= v >>> 2;
    v |= v >>> 4;
    v |= v >>> 8;
    v |= v >>> 16;
    return v + 1;
}

/**
 * Returns whether the value is power of 2
 *
 * @param {number} v
 * @returns {boolean}
 */
export function is_po2(v) {
    return !(v & (v - 1)) && (!!v);
}
/**
 * Computes log base 2 of v
 *
 * @param {number} v
 * @returns {number}
 */
export function log_base_2(v) {
    let r, shift;
    // @ts-ignore
    r = (v > 0xFFFF) << 4; v >>>= r;
    // @ts-ignore
    shift = (v > 0xFF) << 3; v >>>= shift; r |= shift;
    // @ts-ignore
    shift = (v > 0xF) << 2; v >>>= shift; r |= shift;
    // @ts-ignore
    shift = (v > 0x3) << 1; v >>>= shift; r |= shift;
    return r | (v >> 1);
}
