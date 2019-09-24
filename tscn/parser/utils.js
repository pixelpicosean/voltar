/**
 * @param {string} str
 * @returns {string}
 */
const remove_first = module.exports.remove_first = (str) => str.substring(1, str.length);

/**
 * @param {string} str
 * @returns {string}
 */
const remove_last = module.exports.remove_last = (str) => str.substring(0, str.length - 1);

/**
 * @param {string} str
 * @returns {string}
 */
const remove_first_n_last = module.exports.remove_first_n_last = (str) => str.substring(1, str.length - 1);

/**
 * @param {string} str
 * @returns {string}
 */
const trim_string = module.exports.trim_string = (str) => str.trim();

/**
 * Converts a color {r, g, b, a} to a hex number
 *
 * @param {{r: number, g: number, b: number, a: number}} color
 * @return {number} The hex color number
 */
const color2hex = module.exports.color2hex = ({ r, g, b }) => (((r * 255) << 16) + ((g * 255) << 8) + (b * 255 | 0));
