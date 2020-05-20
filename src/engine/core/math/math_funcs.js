import {
    Math_PI,
    DEG_TO_RAD,
    RAD_TO_DEG,
    CMP_EPSILON,
} from './math_defs';
import { RandomDataGenerator } from './random_pcg';

const Math_PI2 = Math_PI * 2;

/**
 * @param {number} a
 * @param {number} b
 */
export function is_equal_approx(a, b) {
    if (a === b) return true;
    let tolerance = CMP_EPSILON * Math.abs(a);
    if (tolerance < CMP_EPSILON) {
        tolerance = CMP_EPSILON;
    }
    return Math.abs(a - b) < tolerance;
}

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
 * @param {number} a
 * @param {number} b
 * @param {number} fct
 */
export const lerp_angle = (a, b, fct) => {
    if (Math.abs(a - b) >= Math_PI) {
        if (a > b) {
            a = wrap_angle(a) - 2.0 * Math_PI;
        } else {
            b = wrap_angle(b) - 2.0 * Math_PI;
        }
    }
    return lerp(a, b, fct);
}

/**
 * wrap to [-PI, +PI]
 * @param {number} a
 */
export const wrap_angle = (a) => (a + Math_PI) % Math_PI2 - Math_PI;

/**
 * Minimal difference between 2 angles
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export const angle_difference = (a, b) => mod((b - a + Math_PI), Math_PI2) - Math_PI;

/**
 * @param {number} value
 * @param {number} step
 */
export const stepify = (value, step) => {
    if (step !== 0) {
        value = Math.floor(value / step + 0.5) * step;
    }
    return value;
}

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
    if (v === 0) return 0;
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

/**
 * Returns sign of number
 *
 * @param {number} n - the number to check the sign of
 * @returns 0 if `n` is 0, -1 if `n` is negative, 1 if `n` is positive
 */
export function sign(n) {
    if (n === 0) return 0;

    return n < 0 ? -1 : 1;
}

/** @type {RandomDataGenerator} */
let rnd = new RandomDataGenerator();

/**
 * Initialize with current time as seed.
 */
export function randomize() {
    rnd = new RandomDataGenerator((Date.now() * Math.random()).toString());
}

/**
 * Random range, any floating point value between `from` and `to`.
 *
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function rand_range(from, to) {
    return rnd.frac() * (to - from) + from;
}

/**
 * Random range, any integer value between `from` and `to`.
 *
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function rand_range_i(from, to) {
    return Math.floor(rand_range(0, to - from + 1) + from);
}

/**
 * Returns a random floating point value between 0 and 1.
 *
 * @returns {number}
 */
export function randf() {
    return rnd.frac();
}

/**
 * Returns a random integer between 0 and 2^32.
 *
 * @return {number} A random integer between 0 and 2^32.
 */
export function randi() {
    return rnd.rnd.apply(rnd) * 0x100000000;// 2^32
}

/**
 * Returns a valid RFC4122 version4 ID hex string from https://gist.github.com/1308368
 *
 * @return {string} A valid RFC4122 version4 ID hex string
 */
export function uuid() {
    let a = '', b = '';

    // @ts-ignore
    for (b = a = ''; a++ < 36; b += ~a % 5 | a * 3 & 4 ? (a ^ 15 ? 8 ^ rnd.frac() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-') { }

    return b;
}

/**
 * Returns a random member of `array`.
 *
 * @template T
 * @param {Array<T>} ary - An Array to pick a random member of.
 * @return {T} A random member of the array.
 */
export function pick(ary) {
    return ary[rand_range_i(0, ary.length - 1)];
}

/**
 * Returns a random member of `array`, favoring the earlier entries.
 *
 * @template T
 * @param {Array<T>} ary - An Array to pick a random member of.
 * @return {T} A random member of the array.
 */
export function weighted_pick(ary) {
    return ary[~~(Math.pow(rnd.frac(), 2) * (ary.length - 1) + 0.5)];
}

const int8 = new Int8Array(4)
const int32 = new Int32Array(int8.buffer, 0, 1)
const float32 = new Float32Array(int8.buffer, 0, 1)
/**
 * @param {number} i
 */
const int_bits_to_float = (i) => {
    int32[0] = i
    return float32[0]
}
/**
 * @param {number} value
 */
const int_to_float_color = (value) => {
    return int_bits_to_float(value & 0xfeffffff)
}

/**
 * Pack float color (1.0, 1.0, 1.0, 1.0) into a f32
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
export function pack_color_f(r, g, b, a) {
    var bits = (((a * 255) | 0) << 24 | ((b * 255) | 0) << 16 | ((g * 255) | 0) << 8 | ((r * 255) | 0))
    return int_to_float_color(bits)
}
/**
 * Pack u8 color (255, 255, 255, 255) into a f32
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
export function pack_color_u(r, g, b, a) {
    var bits = (a << 24 | b << 16 | g << 8 | r)
    return int_to_float_color(bits)
}
