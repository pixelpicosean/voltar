import earcut from 'earcut';
import { Rectangle, Circle } from 'engine/math/index';
import { hex2rgb } from 'engine/utils/index';
import GraphicsData from '../../GraphicsData';
import WebGLGraphicsData from '../WebGLGraphicsData';
import build_line from './build_line';

/**
 * Builds a rounded rectangle to draw
 *
 * @param {GraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 * @param {WebGLGraphicsData} webgl_data_native_lines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_rounded_rectangle(graphics_data, webgl_data, webgl_data_native_lines) {
    const circ_data = /** @type {Circle} */(graphics_data.shape);
    const rect_data = /** @type {Rectangle} */(graphics_data.shape);

    const radius = circ_data.radius;

    const x = rect_data.x;
    const y = rect_data.y;
    const width = rect_data.width;
    const height = rect_data.height;

    /** @type {number[]} */
    const rect_points = [];

    rect_points.push(x, y + radius);
    quadratic_bezier_curve(x, y + height - radius, x, y + height, x + radius, y + height, rect_points);
    quadratic_bezier_curve(x + width - radius, y + height, x + width, y + height, x + width, y + height - radius, rect_points);
    quadratic_bezier_curve(x + width, y + radius, x + width, y, x + width - radius, y, rect_points);
    quadratic_bezier_curve(x + radius, y, x, y, x, y + radius + 0.0000000001, rect_points);

    // this tiny number deals with the issue that occurs when points overlap and earcut fails to triangulate the item.
    // TODO - fix this properly, this is not very elegant.. but it works for now.

    if (graphics_data.fill) {
        const color = hex2rgb(graphics_data.fill_color);
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

        build_line(graphics_data, webgl_data, webgl_data_native_lines);

        graphics_data.points = temp_points;
    }
}

/**
 * Calculate a single point for a quadratic bezier curve.
 * Utility function used by quadraticBezierCurve.
 * Ignored from docs since it is not directly exposed.
 *
 * @param {number} n1 - first number
 * @param {number} n2 - second number
 * @param {number} perc - percentage
 */
function get_point(n1, n2, perc) {
    const diff = n2 - n1;
    return n1 + (diff * perc);
}

/**
 * Calculate the points for a quadratic bezier curve. (helper function..)
 * Based on: https://stackoverflow.com/questions/785097/how-do-i-implement-a-bezier-curve-in-c
 *
 * @param {number} from_x - Origin point x
 * @param {number} from_y - Origin point x
 * @param {number} cp_x - Control point x
 * @param {number} cp_y - Control point y
 * @param {number} to_x - Destination point x
 * @param {number} to_y - Destination point y
 * @param {number[]} [out] - The output array to add points into. If not passed, a new array is created.
 */
function quadratic_bezier_curve(from_x, from_y, cp_x, cp_y, to_x, to_y, out = []) {
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
        xa = get_point(from_x, cp_x, j);
        ya = get_point(from_y, cp_y, j);
        xb = get_point(cp_x, to_x, j);
        yb = get_point(cp_y, to_y, j);

        // The Black Dot
        x = get_point(xa, xb, j);
        y = get_point(ya, yb, j);

        points.push(x, y);
    }

    return points;
}
