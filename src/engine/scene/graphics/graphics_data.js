import {
    Circle,
    Rectangle,
    Ellipse,
    Polygon,
    RoundedRectangle,
} from "engine/core/math/index";

/**
 * A GraphicsData object.
 */
export default class GraphicsData {
    /**
     * @param {number} line_width - the width of the line to draw
     * @param {number} line_color - the color of the line to draw
     * @param {number} line_alpha - the alpha of the line to draw
     * @param {number} fill_color - the color of the fill
     * @param {number} fill_alpha - the alpha of the fill
     * @param {boolean} fill - whether or not the shape is filled with a colour
     * @param {boolean} native_lines - the method for drawing lines
     * @param {Circle|Rectangle|Ellipse|Polygon|RoundedRectangle} shape - The shape object to draw.
     * @param {number} line_alignment - the alignment of the line.
     */
    constructor(line_width, line_color, line_alpha, fill_color, fill_alpha, fill, native_lines, shape, line_alignment) {
        /**
         * @type {number} the width of the line to draw
         */
        this.line_width = line_width;
        /**
         * The alignment of any lines drawn (0.5 = middle, 1 = outter, 0 = inner).
         *
         * @type {number}
         * @default 0
         */
        this.line_alignment = line_alignment;
        /**
         * @type {boolean} if true the liens will be draw using LINES instead of TRIANGLE_STRIP
         */
        this.native_lines = native_lines;

        /**
         * @type {number} the color of the line to draw
         */
        this.line_color = line_color;

        /**
         * @type {number} the alpha of the line to draw
         */
        this.line_alpha = line_alpha;

        /**
         * @type {number} cached tint of the line to draw
         */
        this._lineTint = line_color;

        /**
         * @type {number} the color of the fill
         */
        this.fill_color = fill_color;

        /**
         * @type {number} the alpha of the fill
         */
        this.fill_alpha = fill_alpha;

        /**
         * @type {number} cached tint of the fill
         */
        this._fill_tint = fill_color;

        /**
         * @type {boolean} whether or not the shape is filled with a colour
         */
        this.fill = fill;

        /**
         * @type {Polygon[]}
         */
        this.holes = [];

        /**
         * @type {Circle|Ellipse|Polygon|Rectangle|RoundedRectangle} The shape object to draw.
         */
        this.shape = shape;

        /**
         * @type {number} The type of the shape, see the Const.Shapes file for all the existing types,
         */
        this.type = shape.type;

        /**
         * @type {number[]}
         */
        this.points = [];
    }

    /**
     * Creates a new GraphicsData object with the same values as this one.
     */
    clone() {
        return new GraphicsData(
            this.line_width,
            this.line_color,
            this.line_alpha,
            this.fill_color,
            this.fill_alpha,
            this.fill,
            this.native_lines,
            this.shape,
            this.line_alignment
        );
    }

    /**
     * Adds a hole to the shape.
     *
     * @param {Polygon} shape - The shape of the hole.
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
