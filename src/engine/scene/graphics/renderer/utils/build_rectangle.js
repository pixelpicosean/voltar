import build_line from './build_line';
import { hex2rgb } from 'engine/utils/index';
import { Rectangle } from 'engine/core/math/index';
import GraphicsData from '../../graphics_data';
import WebGLGraphicsData from '../webgl_graphics_data';

/**
 * Builds a rectangle to draw
 *
 * @param {GraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 * @param {WebGLGraphicsData} webgl_data_native_lines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_rectangle(graphics_data, webgl_data, webgl_data_native_lines) {
    //
    // need to convert points to a nice regular data
    //
    const rect_data = /** @type {Rectangle} */(graphics_data.shape);
    const x = rect_data.x;
    const y = rect_data.y;
    const width = rect_data.width;
    const height = rect_data.height;

    if (graphics_data.fill) {
        const color = hex2rgb(graphics_data.fill_color);
        const alpha = graphics_data.fill_alpha;

        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const verts = webgl_data.points;
        const indices = webgl_data.indices;

        const vert_pos = verts.length / 6;

        // start
        verts.push(x, y);
        verts.push(r, g, b, alpha);

        verts.push(x + width, y);
        verts.push(r, g, b, alpha);

        verts.push(x, y + height);
        verts.push(r, g, b, alpha);

        verts.push(x + width, y + height);
        verts.push(r, g, b, alpha);

        // insert 2 dead triangles..
        indices.push(vert_pos, vert_pos, vert_pos + 1, vert_pos + 2, vert_pos + 3, vert_pos + 3);
    }

    if (graphics_data.line_width) {
        const temp_points = graphics_data.points;

        graphics_data.points = [x, y,
            x + width, y          ,
            x + width, y + height ,
            x,         y + height ,
            x,         y          ,
        ];

        build_line(graphics_data, webgl_data, webgl_data_native_lines);

        graphics_data.points = temp_points;
    }
}
