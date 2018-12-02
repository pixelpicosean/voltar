import { SHAPES } from '../../const';
import Vector2 from '../Vector2';

/**
 * Rectangle object is an area defined by its position, as indicated by its top-left corner
 * point (x, y) and by its width and its height.
 */
export default class Rectangle {
    /**
     * @param {number} [x=0] - The X coordinate of the upper-left corner of the rectangle
     * @param {number} [y=0] - The Y coordinate of the upper-left corner of the rectangle
     * @param {number} [width=0] - The overall width of this rectangle
     * @param {number} [height=0] - The overall height of this rectangle
     */
    constructor(x = 0, y = 0, width = 0, height = 0) {
        /**
         * @type {number}
         */
        this.x = Number(x);

        /**
         * @type {number}
         */
        this.y = Number(y);

        /**
         * @type {number}
         */
        this.width = Number(width);

        /**
         * @type {number}
         */
        this.height = Number(height);

        /**
         * The type of the object, mainly used to avoid `instanceof` checks
         *
         * @type {number}
         * @readOnly
         */
        this.type = SHAPES.RECT;
    }

    /**
     * returns the left edge of the rectangle
     *
     * @member {number}
     */
    get left() {
        return this.x;
    }

    /**
     * returns the right edge of the rectangle
     *
     * @member {number}
     */
    get right() {
        return this.x + this.width;
    }

    /**
     * returns the top edge of the rectangle
     *
     * @member {number}
     */
    get top() {
        return this.y;
    }

    /**
     * returns the bottom edge of the rectangle
     *
     * @member {number}
     */
    get bottom() {
        return this.y + this.height;
    }

    /**
     * A constant empty rectangle.
     *
     * @static
     * @constant
     */
    static get EMPTY() {
        return new Rectangle(0, 0, 0, 0);
    }

    /**
     * Creates a clone of this Rectangle
     *
     * @return {Rectangle} a copy of the rectangle
     */
    clone() {
        return new Rectangle(this.x, this.y, this.width, this.height);
    }

    /**
     * Copies another rectangle to this one.
     *
     * @param {Rectangle} rectangle - The rectangle to copy.
     * @return {Rectangle} Returns itself.
     */
    copy(rectangle) {
        this.x = rectangle.x;
        this.y = rectangle.y;
        this.width = rectangle.width;
        this.height = rectangle.height;

        return this;
    }

    is_identity() {
        return this.x === 0 && this.y === 0 && this.width === 0 && this.height === 0;
    }

    /**
     * @param {Rectangle} rect
     */
    equal(rect) {
        return this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
    }

    /**
     * Checks whether the x and y coordinates given are contained within this Rectangle
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
     * @return {boolean} Whether the x/y coordinates are within this Rectangle
     */
    contains(x, y) {
        if (this.width <= 0 || this.height <= 0) {
            return false;
        }

        if (x >= this.x && x < this.x + this.width) {
            if (y >= this.y && y < this.y + this.height) {
                return true;
            }
        }

        return false;
    }

    /**
     * Pads the rectangle making it grow in all directions.
     *
     * @param {number} padding_x - The horizontal padding amount.
     * @param {number} [padding_y] - The vertical padding amount.
     */
    pad(padding_x, padding_y) {
        padding_x = padding_x || 0;
        padding_y = padding_y || ((padding_y !== 0) ? padding_x : 0);

        this.x -= padding_x;
        this.y -= padding_y;

        this.width += padding_x * 2;
        this.height += padding_y * 2;
    }

    /**
     * Fits this rectangle around the passed one.
     *
     * @param {Rectangle} rectangle - The rectangle to fit.
     */
    fit(rectangle) {
        if (this.x < rectangle.x) {
            this.width += this.x;
            if (this.width < 0) {
                this.width = 0;
            }

            this.x = rectangle.x;
        }

        if (this.y < rectangle.y) {
            this.height += this.y;
            if (this.height < 0) {
                this.height = 0;
            }
            this.y = rectangle.y;
        }

        if (this.x + this.width > rectangle.x + rectangle.width) {
            this.width = rectangle.width - this.x;
            if (this.width < 0) {
                this.width = 0;
            }
        }

        if (this.y + this.height > rectangle.y + rectangle.height) {
            this.height = rectangle.height - this.y;
            if (this.height < 0) {
                this.height = 0;
            }
        }
    }

    /**
     * Enlarges this rectangle to include the passed rectangle.
     *
     * @param {Rectangle} rectangle - The rectangle to include.
     */
    enlarge(rectangle) {
        const x1 = Math.min(this.x, rectangle.x);
        const x2 = Math.max(this.x + this.width, rectangle.x + rectangle.width);
        const y1 = Math.min(this.y, rectangle.y);
        const y2 = Math.max(this.y + this.height, rectangle.y + rectangle.height);

        this.x = x1;
        this.width = x2 - x1;
        this.y = y1;
        this.height = y2 - y1;
    }

    /**
     * @param {Rectangle} rectangle
     * @returns {boolean}
     */
    intersects(rectangle) {
        return !(
            this.bottom <= rectangle.top
            ||
            this.top >= rectangle.bottom
            ||
            this.left >= rectangle.right
            ||
            this.right <= rectangle.left
        );
    }

    /**
     * @param {Vector2} p_from
     * @param {Vector2} p_to
     * @returns {boolean}
     */
    intersects_segment(p_from, p_to) {
        let min = 0, max = 1;

        {
            let seg_from = p_from.x;
            let seg_to = p_to.x;
            let box_begin = this.x;
            let box_end = box_begin + this.width;
            let cmin = 0, cmax = 0;

            if (seg_from < seg_to) {
                if (seg_from > box_end || seg_to < box_begin) {
                    return false;
                }
                let length = seg_to - seg_from;
                cmin = (seg_from < box_begin) ? ((box_begin - seg_from) / length) : 0;
                cmax = (seg_to > box_end) ? ((box_end - seg_from) / length) : 1;
            } else {
                if (seg_to > box_end || seg_from < box_begin)
                    return false;
                let length = seg_to - seg_from;
                cmin = (seg_from > box_end) ? (box_end - seg_from) / length : 0;
                cmax = (seg_to < box_begin) ? (box_begin - seg_from) / length : 1;
            }

            if (cmin > min) {
                min = cmin;
            }
            if (cmax < max)
                max = cmax;
            if (max < min)
                return false;
        }
        {
            let seg_from = p_from.y;
            let seg_to = p_to.y;
            let box_begin = this.y;
            let box_end = box_begin + this.height;
            let cmin = 0, cmax = 0;

            if (seg_from < seg_to) {
                if (seg_from > box_end || seg_to < box_begin) {
                    return false;
                }
                let length = seg_to - seg_from;
                cmin = (seg_from < box_begin) ? ((box_begin - seg_from) / length) : 0;
                cmax = (seg_to > box_end) ? ((box_end - seg_from) / length) : 1;
            } else {
                if (seg_to > box_end || seg_from < box_begin)
                    return false;
                let length = seg_to - seg_from;
                cmin = (seg_from > box_end) ? (box_end - seg_from) / length : 0;
                cmax = (seg_to < box_begin) ? (box_begin - seg_from) / length : 1;
            }

            if (cmin > min) {
                min = cmin;
            }
            if (cmax < max)
                max = cmax;
            if (max < min)
                return false;
        }

        return true;
    }
}
