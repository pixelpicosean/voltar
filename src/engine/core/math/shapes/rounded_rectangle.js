import { SHAPES } from 'engine/const';

/**
 * The Rounded Rectangle object is an area that has nice rounded corners, as indicated by its
 * top-left corner point (x, y) and by its width and its height and its radius.
 */
export default class RoundedRectangle {
    /**
     * @param {number} [x] - The X coordinate of the upper-left corner of the rounded rectangle
     * @param {number} [y] - The Y coordinate of the upper-left corner of the rounded rectangle
     * @param {number} [width] - The overall width of this rounded rectangle
     * @param {number} [height] - The overall height of this rounded rectangle
     * @param {number} [radius] - Controls the radius of the rounded corners
     */
    constructor(x = 0, y = 0, width = 0, height = 0, radius = 20) {
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
         * @type {number}
         * @default 20
         */
        this.radius = radius;

        /**
         * The type of the object, mainly used to avoid `instanceof` checks
         *
         * @type {number}
         * @readonly
         */
        this.type = SHAPES.RREC;
    }

    /**
     * Creates a clone of this Rounded Rectangle
     */
    clone() {
        return new RoundedRectangle(this.x, this.y, this.width, this.height, this.radius);
    }

    /**
     * Checks whether the x and y coordinates given are contained within this Rounded Rectangle
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
     */
    contains(x, y) {
        if (this.width <= 0 || this.height <= 0) {
            return false;
        }
        if (x >= this.x && x <= this.x + this.width) {
            if (y >= this.y && y <= this.y + this.height) {
                if ((y >= this.y + this.radius && y <= this.y + this.height - this.radius)
                    || (x >= this.x + this.radius && x <= this.x + this.width - this.radius)) {
                    return true;
                }
                let dx = x - (this.x + this.radius);
                let dy = y - (this.y + this.radius);
                const radius2 = this.radius * this.radius;

                if ((dx * dx) + (dy * dy) <= radius2) {
                    return true;
                }
                dx = x - (this.x + this.width - this.radius);
                if ((dx * dx) + (dy * dy) <= radius2) {
                    return true;
                }
                dy = y - (this.y + this.height - this.radius);
                if ((dx * dx) + (dy * dy) <= radius2) {
                    return true;
                }
                dx = x - (this.x + this.radius);
                if ((dx * dx) + (dy * dy) <= radius2) {
                    return true;
                }
            }
        }

        return false;
    }
}
