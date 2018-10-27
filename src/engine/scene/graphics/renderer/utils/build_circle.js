import build_line from './build_line';
import { SHAPES } from 'engine/const';
import { hex2rgb } from 'engine/utils/index';
import GraphicsData from '../../GraphicsData';

/**
 * Builds a circle to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @param {GraphicsData} graphics_data - The graphics object to draw
 * @param {object} webGLData - an object containing all the webGL-specific information to create this shape
 * @param {object} webGLDataNativeLines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_circle(graphics_data, webGLData, webGLDataNativeLines) {
    // need to convert points to a nice regular data
    const circle_data = graphics_data.shape;
    // @ts-ignore
    const x = circle_data.x;
    // @ts-ignore
    const y = circle_data.y;
    let width;
    let height;

    // TODO - bit hacky??
    if (graphics_data.type === SHAPES.CIRC) {
        // @ts-ignore
        width = circle_data.radius;
        // @ts-ignore
        height = circle_data.radius;
    }
    else {
        // @ts-ignore
        width = circle_data.width;
        // @ts-ignore
        height = circle_data.height;
    }

    if (width === 0 || height === 0) {
        return;
    }

    // @ts-ignore
    const totalSegs = Math.floor(30 * Math.sqrt(circle_data.radius))
        // @ts-ignore
        || Math.floor(15 * Math.sqrt(circle_data.width + circle_data.height));

    const seg = (Math.PI * 2) / totalSegs;

    if (graphics_data.fill) {
        const color = hex2rgb(graphics_data.fillColor);
        const alpha = graphics_data.fill_alpha;

        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const verts = webGLData.points;
        const indices = webGLData.indices;

        let vecPos = verts.length / 6;

        indices.push(vecPos);

        for (let i = 0; i < totalSegs + 1; i++) {
            verts.push(x, y, r, g, b, alpha);

            verts.push(
                x + (Math.sin(seg * i) * width),
                y + (Math.cos(seg * i) * height),
                r, g, b, alpha
            );

            indices.push(vecPos++, vecPos++);
        }

        indices.push(vecPos - 1);
    }

    if (graphics_data.line_width) {
        const temp_points = graphics_data.points;

        graphics_data.points = [];

        for (let i = 0; i < totalSegs; i++) {
            graphics_data.points.push(
                x + (Math.sin(seg * -i) * width),
                y + (Math.cos(seg * -i) * height)
            );
        }

        graphics_data.points.push(
            graphics_data.points[0],
            graphics_data.points[1]
        );

        build_line(graphics_data, webGLData, webGLDataNativeLines);

        graphics_data.points = temp_points;
    }
}
