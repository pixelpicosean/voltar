import earcut from 'earcut';
import buildLine from './build_line';
import { hex2rgb } from 'engine/utils/index';
import WebGLGraphicsData from '../WebGLGraphicsData';

/**
 * Builds a rounded rectangle to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @param {WebGLGraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {object} webgl_data - an object containing all the webGL-specific information to create this shape
 * @param {object} webgl_data_native_lines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_rounded_rectangle(graphics_data, webgl_data, webgl_data_native_lines) {
    const rect_data = graphics_data.shape;
    const x = rect_data.x;
    const y = rect_data.y;
    const width = rect_data.width;
    const height = rect_data.height;

    const radius = rect_data.radius;

    const rect_points = [];

    rect_points.push(x, y + radius);
    quadratic_bezier_curve(x, y + height - radius, x, y + height, x + radius, y + height, rect_points);
    quadratic_bezier_curve(x + width - radius, y + height, x + width, y + height, x + width, y + height - radius, rect_points);
    quadratic_bezier_curve(x + width, y + radius, x + width, y, x + width - radius, y, rect_points);
    quadratic_bezier_curve(x + radius, y, x, y, x, y + radius + 0.0000000001, rect_points);

    // this tiny number deals with the issue that occurs when points overlap and earcut fails to triangulate the item.
    // TODO - fix this properly, this is not very elegant.. but it works for now.

    if (graphics_data.fill) {
        const color = hex2rgb(graphics_data.fillColor);
        const alpha = graphics_data.fill_alpha;

        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const verts = webgl_data.points;
        const indices = webgl_data.indices;

        const vec_pos = verts.length / 6;

        const triangles = earcut(rect_points, null, 2);

        for (let i = 0, j = triangles.length; i < j; i += 3) {
            indices.push(triangles[i] + vec_pos);
            indices.push(triangles[i] + vec_pos);
            indices.push(triangles[i + 1] + vec_pos);
            indices.push(triangles[i + 2] + vec_pos);
            indices.push(triangles[i + 2] + vec_pos);
        }

        for (let i = 0, j = rect_points.length; i < j; i++) {
            verts.push(rect_points[i], rect_points[++i], r, g, b, alpha);
        }
    }

    if (graphics_data.line_width) {
        const temp_points = graphics_data.points;

        graphics_data.points = rect_points;

        buildLine(graphics_data, webgl_data, webgl_data_native_lines);

        graphics_data.points = temp_points;
    }
}

/**
 * Calculate a single point for a quadratic bezier curve.
 * Utility function used by quadraticBezierCurve.
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {number} n1 - first number
 * @param {number} n2 - second number
 * @param {number} perc - percentage
 * @return {number} the result
 *
 */
function get_point(n1, n2, perc) {
    const diff = n2 - n1;

    return n1 + (diff * perc);
}

/**
 * Calculate the points for a quadratic bezier curve. (helper function..)
 * Based on: https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {number} fromX - Origin point x
 * @param {number} fromY - Origin point x
 * @param {number} cpX - Control point x
 * @param {number} cpY - Control point y
 * @param {number} toX - Destination point x
 * @param {number} toY - Destination point y
 * @param {number[]} [out=[]] - The output array to add points into. If not passed, a new array is created.
 * @return {number[]} an array of points
 */
function quadratic_bezier_curve(fromX, fromY, cpX, cpY, toX, toY, out = []) {
    const n = 20;
    const points = out;

    let xa = 0;
    let ya = 0;
    let xb = 0;
    let yb = 0;
    let x = 0;
    let y = 0;

    for (let i = 0, j = 0; i <= n; ++i) {
        j = i / n;

        // The Green Line
        xa = get_point(fromX, cpX, j);
        ya = get_point(fromY, cpY, j);
        xb = get_point(cpX, toX, j);
        yb = get_point(cpY, toY, j);

        // The Black Dot
        x = get_point(xa, xb, j);
        y = get_point(ya, yb, j);

        points.push(x, y);
    }

    return points;
}
