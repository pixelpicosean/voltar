import buildLine from './buildLine';
import { hex2rgb } from '../../../../utils';

/**
 * Builds a rectangle to draw
 *
 * Ignored from docs since it is not directly exposed.
 *
 * @ignore
 * @private
 * @param {V.WebGLGraphicsData} graphics_data - The graphics object containing all the necessary properties
 * @param {object} webGLData - an object containing all the webGL-specific information to create this shape
 * @param {object} webGLDataNativeLines - an object containing all the webGL-specific information to create native_lines
 */
export default function buildRectangle(graphics_data, webGLData, webGLDataNativeLines)
{
    // --- //
    // need to convert points to a nice regular data
    //
    const rectData = graphics_data.shape;
    const x = rectData.x;
    const y = rectData.y;
    const width = rectData.width;
    const height = rectData.height;

    if (graphics_data.fill)
    {
        const color = hex2rgb(graphics_data.fillColor);
        const alpha = graphics_data.fill_alpha;

        const r = color[0] * alpha;
        const g = color[1] * alpha;
        const b = color[2] * alpha;

        const verts = webGLData.points;
        const indices = webGLData.indices;

        const vertPos = verts.length / 6;

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
        indices.push(vertPos, vertPos, vertPos + 1, vertPos + 2, vertPos + 3, vertPos + 3);
    }

    if (graphics_data.line_width)
    {
        const tempPoints = graphics_data.points;

        graphics_data.points = [x, y,
            x + width, y,
            x + width, y + height,
            x, y + height,
            x, y];

        buildLine(graphics_data, webGLData, webGLDataNativeLines);

        graphics_data.points = tempPoints;
    }
}
