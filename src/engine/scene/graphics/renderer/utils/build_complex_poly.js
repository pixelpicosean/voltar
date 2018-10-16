import { hex2rgb } from 'engine/utils/index';

/**
 * Builds a complex polygon to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @param {import('engine/index').Graphics} graphics_data - The graphics object containing all the necessary properties
 * @param {object} webgl_data - an object containing all the webGL-specific information to create this shape
 */
export default function build_complex_poly(graphics_data, webgl_data) {
    // TODO - no need to copy this as it gets turned into a Float32Array anyways..
    const points = graphics_data.points.slice();

    if (points.length < 6) {
        return;
    }

    // get first and last point.. figure out the middle!
    const indices = webgl_data.indices;

    webgl_data.points = points;
    webgl_data.alpha = graphics_data.fill_alpha;
    webgl_data.color = hex2rgb(graphics_data.fillColor);

    // calculate the bounds..
    let min_x = Infinity;
    let max_x = -Infinity;

    let min_y = Infinity;
    let max_y = -Infinity;

    let x = 0;
    let y = 0;

    // get size..
    for (let i = 0; i < points.length; i += 2) {
        x = points[i];
        y = points[i + 1];

        min_x = x < min_x ? x : min_x;
        max_x = x > max_x ? x : max_x;

        min_y = y < min_y ? y : min_y;
        max_y = y > max_y ? y : max_y;
    }

    // add a quad to the end cos there is no point making another buffer!
    points.push(min_x, min_y,
        max_x, min_y,
        max_x, max_y,
        min_x, max_y);

    // push a quad onto the end..

    // TODO - this aint needed!
    const length = points.length / 2;

    for (let i = 0; i < length; i++) {
        indices.push(i);
    }
}
