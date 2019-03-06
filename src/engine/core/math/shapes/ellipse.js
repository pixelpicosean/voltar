import Rectangle from './rectangle';
import { SHAPES } from 'engine/const';

/**
 * The Ellipse object can be used to specify a hit area for displayObjects
 */
export default class Ellipse {
    /**
     * @param {number} [x] - The X coordinate of the center of this circle
     * @param {number} [y] - The Y coordinate of the center of this circle
     * @param {number} [width] - The half width of this ellipse
     * @param {number} [height] - The half height of this ellipse
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        /**
         * @type {number}
         * @default 0
         */
        this.x = x;

        /**
         * @type {number}
         * @default 0
         */
        this.y = y;

        /**
         * @type {number}
         * @default 0
         */
        this.width = width;

        /**
         * @type {number}
         * @default 0
         */
        this.height = height;

        /**
         * The type of the object, mainly used to avoid `instanceof` checks
         *
         * @type {number}
         * @readOnly
         */
        this.type = SHAPES.ELIP;
    }

    /**
     * Creates a clone of this Ellipse instance
     */
    clone() {
        return new Ellipse(this.x, this.y, this.width, this.height);
    }

    /**
     * Checks whether the x and y coordinates given are contained within this ellipse
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
     */
    contains(x, y) {
        if (this.width <= 0 || this.height <= 0) {
            return false;
        }

        // normalize the coords to an ellipse with center 0,0
        let normx = ((x - this.x) / this.width);
        let normy = ((y - this.y) / this.height);

        normx *= normx;
        normy *= normy;

        return (normx + normy <= 1);
    }

    /**
     * Returns the framing rectangle of the ellipse as a Rectangle object
     */
    get_bounds() {
        return new Rectangle(this.x - this.width, this.y - this.height, this.width, this.height);
    }
}
