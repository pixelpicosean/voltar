/**
 * Math classes and utilities mixed into v namespace.
 */
export { default as Point } from './Point';
export { default as Vector } from './Point';
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
