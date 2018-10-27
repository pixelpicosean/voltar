import { Circle, Rectangle, Ellipse, Polygon } from "engine/math/index";

/**
 * A GraphicsData object.
 */
export default class GraphicsData {
    /**
     *
     * @param {number} line_width - the width of the line to draw
     * @param {number} line_color - the color of the line to draw
     * @param {number} line_alpha - the alpha of the line to draw
     * @param {number} fillColor - the color of the fill
     * @param {number} fill_alpha - the alpha of the fill
     * @param {boolean} fill - whether or not the shape is filled with a colour
     * @param {boolean} native_lines - the method for drawing lines
     * @param {Circle|Rectangle|Ellipse|Polygon} shape - The shape object to draw.
     * @param {number} lineAlignment - the alignment of the line.
     */
    constructor(line_width, line_color, line_alpha, fillColor, fill_alpha, fill, native_lines, shape, lineAlignment) {
        /**
         * @member {number} the width of the line to draw
         */
        this.line_width = line_width;
        /**
         * The alignment of any lines drawn (0.5 = middle, 1 = outter, 0 = inner).
         *
         * @member {number}
         * @default 0
         */
        this.lineAlignment = lineAlignment;
        /**
         * @member {boolean} if true the liens will be draw using LINES instead of TRIANGLE_STRIP
         */
        this.native_lines = native_lines;

        /**
         * @member {number} the color of the line to draw
         */
        this.line_color = line_color;

        /**
         * @member {number} the alpha of the line to draw
         */
        this.line_alpha = line_alpha;

        /**
         * @member {number} cached tint of the line to draw
         */
        this._lineTint = line_color;

        /**
         * @member {number} the color of the fill
         */
        this.fillColor = fillColor;

        /**
         * @member {number} the alpha of the fill
         */
        this.fill_alpha = fill_alpha;

        /**
         * @member {number} cached tint of the fill
         */
        this._fillTint = fillColor;

        /**
         * @member {boolean} whether or not the shape is filled with a colour
         */
        this.fill = fill;

        this.holes = [];

        /**
         * @member {Circle|Ellipse|Polygon|Rectangle|RoundedRectangle} The shape object to draw.
         */
        this.shape = shape;

        /**
         * @member {number} The type of the shape, see the Const.Shapes file for all the existing types,
         */
        this.type = shape.type;
    }

    /**
     * Creates a new GraphicsData object with the same values as this one.
     *
     * @return {GraphicsData} Cloned GraphicsData object
     */
    clone() {
        return new GraphicsData(
            this.line_width,
            this.line_color,
            this.line_alpha,
            this.fillColor,
            this.fill_alpha,
            this.fill,
            this.native_lines,
            this.shape,
            this.lineAlignment
        );
    }

    /**
     * Adds a hole to the shape.
     *
     * @param {Rectangle|Circle} shape - The shape of the hole.
     */
    add_hole(shape) {
        this.holes.push(shape);
    }

    /**
     * Destroys the Graphics data.
     */
    destroy() {
        this.shape = null;
        this.holes = null;
    }
}
