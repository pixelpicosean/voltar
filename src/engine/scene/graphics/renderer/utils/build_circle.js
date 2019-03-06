import { SHAPES } from 'engine/const';
import { hex2rgb } from 'engine/utils/index';
import { Circle, Rectangle } from 'engine/core/math/index';
import GraphicsData from '../../graphics_data';
import WebGLGraphicsData from '../webgl_graphics_data';
import build_line from './build_line';

/**
 * Builds a circle to draw
 *
 * @param {GraphicsData} graphics_data - The graphics object to draw
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 * @param {WebGLGraphicsData} webgl_data_native_lines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_circle(graphics_data, webgl_data, webgl_data_native_lines) {
    // need to convert points to a nice regular data
    const circle_data = /** @type {Circle} */(graphics_data.shape);
    const rect_data = /** @type {Rectangle} */(graphics_data.shape);
    const x = circle_data.x;
    const y = circle_data.y;
    let width = 0;
    let height = 0;

    // TODO - bit hacky??
    if (graphics_data.type === SHAPES.CIRC) {
        width = circle_data.radius;
        height = circle_data.radius;
    } else {
        width = rect_data.width;
        height = rect_data.height;
    }

    if (width === 0 || height === 0) {
        return;
    }

    const total_segs = Math.floor(30 * Math.sqrt(circle_data.radius))
        ||
        Math.floor(15 * Math.sqrt(rect_data.width + rect_data.height));

    const seg = (Math.PI * 2) / total_segs;

    if (graphics_data.fill) {
        const color = hex2rgb(graphics_data.fill_color);
        const alpha = graphics_data.fill_alpha;

        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const verts = webgl_data.points;
        const indices = webgl_data.indices;

        let vec_pos = verts.length / 6;

        indices.push(vec_pos);

        for (let i = 0; i < total_segs + 1; i++) {
            verts.push(x, y, r, g, b, alpha);

            verts.push(
                x + (Math.sin(seg * i) * width),
                y + (Math.cos(seg * i) * height),
                r, g, b, alpha
            );

            indices.push(vec_pos++, vec_pos++);
        }

        indices.push(vec_pos - 1);
    }

    if (graphics_data.line_width) {
        const temp_points = graphics_data.points;

        graphics_data.points = [];

        for (let i = 0; i < total_segs; i++) {
            graphics_data.points.push(
                x + (Math.sin(seg * -i) * width),
                y + (Math.cos(seg * -i) * height)
            );
        }

        graphics_data.points.push(
            graphics_data.points[0],
            graphics_data.points[1]
        );

        build_line(graphics_data, webgl_data, webgl_data_native_lines);

        graphics_data.points = temp_points;
    }
}
