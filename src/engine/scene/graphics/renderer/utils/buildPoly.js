import buildLine from './buildLine';
import { hex2rgb } from '../../../../utils';
import earcut from 'earcut';

/**
 * Builds a polygon to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {V.WebGLGraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {object} webGLData - an object containing all the webGL-specific information to create this shape
 * @param {object} webGLDataNativeLines - an object containing all the webGL-specific information to create native_lines
 */
export default function buildPoly(graphics_data, webGLData, webGLDataNativeLines)
{
    graphics_data.points = graphics_data.shape.points.slice();

    let points = graphics_data.points;

    if (graphics_data.fill && points.length >= 6)
    {
        const holeArray = [];
        // Process holes..
        const holes = graphics_data.holes;

        for (let i = 0; i < holes.length; i++)
        {
            const hole = holes[i];

            holeArray.push(points.length / 2);

            points = points.concat(hole.points);
        }

        // get first and last point.. figure out the middle!
        const verts = webGLData.points;
        const indices = webGLData.indices;

        const length = points.length / 2;

        // sort color
        const color = hex2rgb(graphics_data.fillColor);
        const alpha = graphics_data.fill_alpha;
        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const triangles = earcut(points, holeArray, 2);

        if (!triangles)
        {
            return;
        }

        const vertPos = verts.length / 6;

        for (let i = 0; i < triangles.length; i += 3)
        {
            indices.push(triangles[i] + vertPos);
            indices.push(triangles[i] + vertPos);
            indices.push(triangles[i + 1] + vertPos);
            indices.push(triangles[i + 2] + vertPos);
            indices.push(triangles[i + 2] + vertPos);
        }

        for (let i = 0; i < length; i++)
        {
            verts.push(points[i * 2], points[(i * 2) + 1],
                r, g, b, alpha);
        }
    }

    if (graphics_data.line_width > 0)
    {
        buildLine(graphics_data, webGLData, webGLDataNativeLines);
    }
}
