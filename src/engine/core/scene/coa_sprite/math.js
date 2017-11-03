/**
 * Linear interpolation of two values for the give factor
 * @param {number} a 
 * @param {number} b 
 * @param {number} f 
 * @returns {number}
 */
export const linear = (a, b, f) => {
    return a + (b - a) * f;
};

/**
 * @param {number} a
 * @param {number} b 
 * @param {number} spin
 * @param {number} f 
 * @returns { number}
 */
export const angle_linear = (a, b, spin, f) => {
    if (spin === 0) {
        return a;
    }
    if (spin > 0 && (b - a) < 0) {
        b += 360;
    }
    if (spin < 0 && (b - a) > 0) {
        b -= 360;
    }
    return linear(a, b, f);
};

/**
 * @param {number} c0
 * @param {number} c1 
 * @param {number} c2
 * @param {number} f
 * @returns {number}
 */
export const bezier2 = (c0, c1, c2, f) => {
    return linear(linear(c0, c1, f), linear(c1, c2, f), f);
};
/**
 * @param {number} c0
 * @param {number} c1 
 * @param {number} c2
 * @param {number} c3
 * @param {number} f
 * @returns {number}
 */
export const bezier3 = (c0, c1, c2, c3, f) => {
    return linear(bezier2(c0, c1, c2, f), bezier2(c1, c2, c3, f), f);
};
/**
 * @param {number} c0
 * @param {number} c1 
 * @param {number} c2
 * @param {number} c3
 * @param {number} c4
 * @param {number} f
 * @returns {number}
 */
export const bezier4 = (c0, c1, c2, c3, c4, f) => {
    return linear(bezier3(c0, c1, c2, c3, f), bezier3(c1, c2, c3, c4, f), f);
};
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
export const bezier5 = (c0, c1, c2, c3, c4, c5, f) => {
    return linear(bezier4(c0, c1, c2, c3, c4, f), bezier4(c1, c2, c3, c4, c5, f), f);
};
/**
 * @param {number} x1
 * @param {number} y1 
 * @param {number} x2
 * @param {number} y2
 * @param {number} t
 * @returns {number}
 */
export const bezier2d = (x1, y1, x2, y2, t) => {
    // TODO
    return 0;
};
