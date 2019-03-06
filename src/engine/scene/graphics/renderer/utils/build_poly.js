import earcut from 'earcut';
import { hex2rgb } from 'engine/utils/index';
import { Polygon } from 'engine/core/math/index';
import build_line from './build_line';
import GraphicsData from '../../graphics_data';
import WebGLGraphicsData from '../webgl_graphics_data';

/**
 * Builds a polygon to draw
 *
 * @param {GraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 * @param {WebGLGraphicsData} webgl_data_native_lines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_poly(graphics_data, webgl_data, webgl_data_native_lines) {
    graphics_data.points = /** @type {Polygon} */(graphics_data.shape).points.slice();

    let points = graphics_data.points;

    if (graphics_data.fill && points.length >= 6) {
        const hole_array = [];
        // Process holes..
        const holes = graphics_data.holes;

        for (let i = 0; i < holes.length; i++) {
            const hole = holes[i];

            hole_array.push(points.length / 2);

            points = points.concat(hole.points);
        }

        // get first and last point.. figure out the middle!
        const verts = webgl_data.points;
        const indices = webgl_data.indices;

        const length = points.length / 2;

        // sort color
        const color = hex2rgb(graphics_data.fill_color);
        const alpha = graphics_data.fill_alpha;
        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const triangles = earcut(points, hole_array, 2);

        if (!triangles) {
            return;
        }

        const vert_pos = verts.length / 6;

        for (let i = 0; i < triangles.length; i += 3) {
            indices.push(triangles[i] + vert_pos);
            indices.push(triangles[i] + vert_pos);
            indices.push(triangles[i + 1] + vert_pos);
            indices.push(triangles[i + 2] + vert_pos);
            indices.push(triangles[i + 2] + vert_pos);
        }

        for (let i = 0; i < length; i++) {
            verts.push(
                points[i * 2], points[(i * 2) + 1],
                r, g, b, alpha
            );
        }
    }

    if (graphics_data.line_width > 0) {
        build_line(graphics_data, webgl_data, webgl_data_native_lines);
    }
}
