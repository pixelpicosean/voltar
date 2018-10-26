/**
 * Math classes and utilities mixed into v namespace.
 */
export { default as Vector2 } from './Vector2';
export { default as ObservablePoint } from './ObservablePoint';
export { default as Matrix } from './Matrix';
export { default as GroupD8 } from './GroupD8';
export { default as Bounds } from './Bounds';

export { default as TransformBase } from './TransformBase';
export { default as Transform } from './Transform';
export { default as TransformStatic } from './TransformStatic';

export { default as Circle } from './shapes/Circle';
export { default as Ellipse } from './shapes/Ellipse';
export { default as Polygon } from './shapes/Polygon';
export { default as Rectangle } from './shapes/Rectangle';
export { default as RoundedRectangle } from './shapes/RoundedRectangle';

export const PI = Math.PI;
export const PI2 = Math.PI * 2;
export const TAU = PI2;

/**
 * Conversion factor for converting radians to degrees.
 */
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Conversion factor for converting degrees to radians.
 */
export const DEG_TO_RAD = Math.PI / 180;

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

export const mod = (a, n) => (a % n + n) % n;

export const lerp = (a, b, fct) => a + (b - a) * fct;

/**
 * wrap to [-PI, +PI]
 */
export const wrap_angle = (a) => (a + PI) % PI2 - PI;

/**
 * Minimal difference between 2 angles
 */
export const angle_difference = (a, b) => mod((b - a + PI), PI2) - PI;

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
    r = (v > 0xFFFF) << 4; v >>>= r;
    shift = (v > 0xFF) << 3; v >>>= shift; r |= shift;
    shift = (v > 0xF) << 2; v >>>= shift; r |= shift;
    shift = (v > 0x3) << 1; v >>>= shift; r |= shift;
    return r | (v >> 1);
}
