import { Vector2 } from 'engine/core/math/index';
import { hex2rgb } from 'engine/utils/index';
import GraphicsData from '../../graphics_data';
import WebGLGraphicsData from '../webgl_graphics_data';

/**
 * Builds a line to draw
 *
 * @param {GraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 * @param {WebGLGraphicsData} webgl_data_native_lines - an object containing all the webGL-specific information to create native_lines
 */
export default function build_line(graphics_data, webgl_data, webgl_data_native_lines) {
    if (graphics_data.native_lines) {
        _build_native_line(graphics_data, webgl_data_native_lines);
    } else {
        _build_line(graphics_data, webgl_data);
    }
}

/**
 * Builds a line to draw using the polygon method.
 *
 * @param {GraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 */
function _build_line(graphics_data, webgl_data) {
    // TODO: OPTIMISE!
    let points = graphics_data.points;

    if (points.length === 0) {
        return;
    }
    // if the line width is an odd number add 0.5 to align to a whole pixel
    // commenting this out fixes #711 and #1620
    // if (graphics_data.line_width%2)
    // {
    //     for (i = 0; i < points.length; i++)
    //     {
    //         points[i] += 0.5;
    //     }
    // }

    // get first and last point.. figure out the middle!
    const first_point = Vector2.new(points[0], points[1]);
    const last_point = Vector2.new(points[points.length - 2], points[points.length - 1]);

    // if the first point is the last point - gonna have issues :)
    if (first_point.x === last_point.x && first_point.y === last_point.y) {
        // need to clone as we are going to slightly modify the shape..
        points = points.slice();

        points.pop();
        points.pop();

        last_point.set(points[points.length - 2], points[points.length - 1]);

        const mid_point_x = last_point.x + ((first_point.x - last_point.x) * 0.5);
        const mid_point_y = last_point.y + ((first_point.y - last_point.y) * 0.5);

        points.unshift(mid_point_x, mid_point_y);
        points.push(mid_point_x, mid_point_y);
    }

    Vector2.free(first_point);
    Vector2.free(last_point);

    const verts = webgl_data.points;
    const indices = webgl_data.indices;
    const length = points.length / 2;
    let index_count = points.length;
    let index_start = verts.length / 6;

    // DRAW the Line
    const width = graphics_data.line_width / 2;

    // sort color
    const color = hex2rgb(graphics_data.line_color);
    const alpha = graphics_data.line_alpha;
    const r = color[0] * alpha;
    const g = color[1] * alpha;
    const b = color[2] * alpha;

    let p1x = points[0];
    let p1y = points[1];
    let p2x = points[2];
    let p2y = points[3];
    let p3x = 0;
    let p3y = 0;

    let perpx = -(p1y - p2y);
    let perpy = p1x - p2x;
    let perp2x = 0;
    let perp2y = 0;
    let perp3x = 0;
    let perp3y = 0;

    let dist = Math.sqrt((perpx * perpx) + (perpy * perpy));

    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    const ratio = graphics_data.line_alignment; // 0.5
    const r1 = (1 - ratio) * 2;
    const r2 = ratio * 2;

    // start
    verts.push(
        p1x - (perpx * r1),
        p1y - (perpy * r1),
        r, g, b, alpha
    );

    verts.push(
        p1x + (perpx * r2),
        p1y + (perpy * r2),
        r, g, b, alpha
    );

    for (let i = 1; i < length - 1; ++i) {
        p1x = points[(i - 1) * 2];
        p1y = points[((i - 1) * 2) + 1];

        p2x = points[i * 2];
        p2y = points[(i * 2) + 1];

        p3x = points[(i + 1) * 2];
        p3y = points[((i + 1) * 2) + 1];

        perpx = -(p1y - p2y);
        perpy = p1x - p2x;

        dist = Math.sqrt((perpx * perpx) + (perpy * perpy));
        perpx /= dist;
        perpy /= dist;
        perpx *= width;
        perpy *= width;

        perp2x = -(p2y - p3y);
        perp2y = p2x - p3x;

        dist = Math.sqrt((perp2x * perp2x) + (perp2y * perp2y));
        perp2x /= dist;
        perp2y /= dist;
        perp2x *= width;
        perp2y *= width;

        const a1 = (-perpy + p1y) - (-perpy + p2y);
        const b1 = (-perpx + p2x) - (-perpx + p1x);
        const c1 = ((-perpx + p1x) * (-perpy + p2y)) - ((-perpx + p2x) * (-perpy + p1y));
        const a2 = (-perp2y + p3y) - (-perp2y + p2y);
        const b2 = (-perp2x + p2x) - (-perp2x + p3x);
        const c2 = ((-perp2x + p3x) * (-perp2y + p2y)) - ((-perp2x + p2x) * (-perp2y + p3y));

        let denom = (a1 * b2) - (a2 * b1);

        if (Math.abs(denom) < 0.1) {
            denom += 10.1;
            verts.push(
                p2x - (perpx * r1),
                p2y - (perpy * r1),
                r, g, b, alpha
            );

            verts.push(
                p2x + (perpx * r2),
                p2y + (perpy * r2),
                r, g, b, alpha
            );

            continue;
        }

        const px = ((b1 * c2) - (b2 * c1)) / denom;
        const py = ((a2 * c1) - (a1 * c2)) / denom;
        const pdist = ((px - p2x) * (px - p2x)) + ((py - p2y) * (py - p2y));

        if (pdist > (196 * width * width)) {
            perp3x = perpx - perp2x;
            perp3y = perpy - perp2y;

            dist = Math.sqrt((perp3x * perp3x) + (perp3y * perp3y));
            perp3x /= dist;
            perp3y /= dist;
            perp3x *= width;
            perp3y *= width;

            verts.push(p2x - (perp3x * r1), p2y - (perp3y * r1));
            verts.push(r, g, b, alpha);

            verts.push(p2x + (perp3x * r2), p2y + (perp3y * r2));
            verts.push(r, g, b, alpha);

            verts.push(p2x - (perp3x * r2 * r1), p2y - (perp3y * r1));
            verts.push(r, g, b, alpha);

            index_count++;
        } else {
            verts.push(p2x + ((px - p2x) * r1), p2y + ((py - p2y) * r1));
            verts.push(r, g, b, alpha);

            verts.push(p2x - ((px - p2x) * r2), p2y - ((py - p2y) * r2));
            verts.push(r, g, b, alpha);
        }
    }

    p1x = points[(length - 2) * 2];
    p1y = points[((length - 2) * 2) + 1];

    p2x = points[(length - 1) * 2];
    p2y = points[((length - 1) * 2) + 1];

    perpx = -(p1y - p2y);
    perpy = p1x - p2x;

    dist = Math.sqrt((perpx * perpx) + (perpy * perpy));
    perpx /= dist;
    perpy /= dist;
    perpx *= width;
    perpy *= width;

    verts.push(p2x - (perpx * r1), p2y - (perpy * r1));
    verts.push(r, g, b, alpha);

    verts.push(p2x + (perpx * r2), p2y + (perpy * r2));
    verts.push(r, g, b, alpha);

    indices.push(index_start);

    for (let i = 0; i < index_count; ++i) {
        indices.push(index_start++);
    }

    indices.push(index_start - 1);
}

/**
 * Builds a line to draw using the gl.drawArrays(gl.LINES) method
 *
 * @param {GraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {WebGLGraphicsData} webgl_data - an object containing all the webGL-specific information to create this shape
 */
function _build_native_line(graphics_data, webgl_data) {
    let i = 0;
    const points = graphics_data.points;

    if (points.length === 0) return;

    const verts = webgl_data.points;
    const length = points.length / 2;

    // sort color
    const color = hex2rgb(graphics_data.line_color);
    const alpha = graphics_data.line_alpha;
    const r = color[0] * alpha;
    const g = color[1] * alpha;
    const b = color[2] * alpha;

    for (i = 1; i < length; i++) {
        const p1x = points[(i - 1) * 2];
        const p1y = points[((i - 1) * 2) + 1];

        const p2x = points[i * 2];
        const p2y = points[(i * 2) + 1];

        verts.push(p1x, p1y);
        verts.push(r, g, b, alpha);

        verts.push(p2x, p2y);
        verts.push(r, g, b, alpha);
    }
}
