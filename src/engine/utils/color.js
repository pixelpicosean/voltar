/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @param {number} hex - The number to convert
 * @param  {number[] | Float32Array} [out] If supplied, this array will be used rather than returning a new one
 * @return {number[] | Float32Array} An array representing the [R, G, B] of the color.
 */
export function hex2rgb(hex, out) {
    out = out || [];

    out[0] = ((hex >> 16) & 0xFF) / 255;
    out[1] = ((hex >> 8) & 0xFF) / 255;
    out[2] = (hex & 0xFF) / 255;

    return out;
}

/**
 * Converts a hex color number to a string.
 *
 * @param {number} hex_num - Number in hex
 * @return {string} The string color.
 */
export function hex2string(hex_num) {
    let hex = hex_num.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;

    return `#${hex}`;
}

/**
 * Converts a color as an [R, G, B] array to a hex number
 *
 * @param {number[] | Float32Array} rgb - rgb array
 * @return {number} The color number
 */
export function rgb2hex(rgb) {
    return (((rgb[0] * 255) << 16) + ((rgb[1] * 255) << 8) + (rgb[2] * 255 | 0));
}
