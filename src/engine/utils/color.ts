/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @param hex - The number to convert
 * @param [out] If supplied, this array will be used rather than returning a new one
 * @return An array representing the [R, G, B] of the color.
 */
export function hex2rgb(hex: number, out: number[] | Float32Array): number[] | Float32Array {
    out = out || [];

    out[0] = ((hex >> 16) & 0xFF) / 255;
    out[1] = ((hex >> 8) & 0xFF) / 255;
    out[2] = (hex & 0xFF) / 255;

    return out;
}

/**
 * Converts a hex color number to a string.
 *
 * @param hex_num - Number in hex
 * @return The string color.
 */
export function hex2string(hex_num: number): string {
    let hex = hex_num.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;

    return `#${hex}`;
}

/**
 * Converts a color as an [R, G, B] array to a hex number
 *
 * @param rgb - rgb array
 * @return The color number
 */
export function rgb2hex(rgb: [number, number, number, number?] | Float32Array): number {
    return (((rgb[0] * 255) << 16) + ((rgb[1] * 255) << 8) + (rgb[2] * 255 | 0));
}
