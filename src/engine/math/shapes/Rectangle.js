import { SHAPES } from '../../const';
import Vector2 from '../Vector2';

/**
 * @type {Rectangle[]}
 */
const pool = [];

/**
 * Rectangle object is an area defined by its position, as indicated by its top-left corner
 * point (x, y) and by its width and its height.
 */
export default class Rectangle {
    /**
     * @param {number} p_x
     * @param {number} p_y
     * @param {number} p_width
     * @param {number} p_height
     */
    static new(p_x = 0, p_y = 0, p_width = 0, p_height = 0) {
        const r = pool.pop();
        if (!r) {
            return new Rectangle(p_x, p_y, p_width, p_height);
        } else {
            return r.set(p_x, p_y, p_width, p_height);
        }
    }
    /**
     * @param {Rectangle} p_rect
     */
    static free(p_rect) {
        if (p_rect) {
            pool.push(p_rect);
        }
        return Rectangle;
    }

    /**
     * A constant empty rectangle.
     *
     * @static
     * @constant
     */
    static get EMPTY() {
        return Object.freeze(new Rectangle(0, 0, 0, 0));
    }

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
     * @param {number} p_x
     * @param {number} p_y
     * @param {number} p_width
     * @param {number} p_height
     */
    set(p_x, p_y, p_width, p_height) {
        this.x = p_x;
        this.y = p_y;
        this.width = p_width;
        this.height = p_height;
        return this;
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
     * Creates a clone of this Rectangle
     *
     * @return {Rectangle} a copy of the rectangle
     */
    clone() {
        return Rectangle.new(this.x, this.y, this.width, this.height);
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

    is_zero() {
        return this.x === 0 && this.y === 0 && this.width === 0 && this.height === 0;
    }

    /**
     * @param {Rectangle} rect
     */
    equals(rect) {
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
     * @param {number} p_by - The horizontal padding amount.
     */
    grow(p_by) {
        return this.clone().grow_to(p_by);
    }

    /**
     * Pads the rectangle making it grow in all directions.
     *
     * @param {number} p_by - The horizontal padding amount.
     */
    grow_to(p_by) {
        this.x -= p_by;
        this.y -= p_by;
        this.width += p_by * 2;
        this.height += p_by * 2;
        return this;
    }

    /**
     * @param {number} p_left
     * @param {number} p_top
     * @param {number} p_right
     * @param {number} p_bottom
     */
    grow_individual(p_left, p_top, p_right, p_bottom) {
        const g = this.clone();
        g.x -= p_left;
        g.y -= p_top;
        g.width += (p_left + p_right);
        g.height += (p_top + p_bottom);
        return g;
    }

    /**
     * @param {Vector2} p_vector
     */
    expand(p_vector) {
        return this.clone().expand_to(p_vector);
    }

    /**
     * @param {Vector2} p_vector
     */
    expand_to(p_vector) {
        const begin = Vector2.new(this.x, this.y);
        const end = Vector2.new(this.x + this.width, this.y + this.height);

        if (p_vector.x < begin.x) {
            begin.x = p_vector.x;
        }
        if (p_vector.y < begin.y) {
            begin.y = p_vector.y;
        }

        if (p_vector.x > end.x) {
            end.x = p_vector.x;
        }
        if (p_vector.y > end.y) {
            end.y = p_vector.y;
        }

        this.x = begin.x;
        this.y = begin.y;
        this.width = end.x - begin.x;
        this.height = end.y - begin.y;

        Vector2.free(begin);
        Vector2.free(end);

        return this;
    }

    /**
     * Fits this rectangle around the passed one.
     *
     * @param {Rectangle} p_rect - The rectangle to fit.
     */
    fit_to(p_rect) {
        if (this.x < p_rect.x) {
            this.width += this.x;
            if (this.width < 0) {
                this.width = 0;
            }

            this.x = p_rect.x;
        }

        if (this.y < p_rect.y) {
            this.height += this.y;
            if (this.height < 0) {
                this.height = 0;
            }
            this.y = p_rect.y;
        }

        if (this.x + this.width > p_rect.x + p_rect.width) {
            this.width = p_rect.width - this.x;
            if (this.width < 0) {
                this.width = 0;
            }
        }

        if (this.y + this.height > p_rect.y + p_rect.height) {
            this.height = p_rect.height - this.y;
            if (this.height < 0) {
                this.height = 0;
            }
        }
    }

    /**
     * Merge the given rectangle and return a new one.
     *
     * @param {Rectangle} p_rect - The rectangle to merge.
     */
    merge(p_rect) {
        return this.clone().merge_to(p_rect);
    }

    /**
     * Merge this rectangle with the passed rectangle
     *
     * @param {Rectangle} p_rect - The rectangle to merge.
     */
    merge_to(p_rect) {
        const x1 = Math.min(this.x, p_rect.x);
        const x2 = Math.max(this.x + this.width, p_rect.x + p_rect.width);
        const y1 = Math.min(this.y, p_rect.y);
        const y2 = Math.max(this.y + this.height, p_rect.y + p_rect.height);

        this.x = x1;
        this.width = x2 - x1;
        this.y = y1;
        this.height = y2 - y1;

        return this;
    }

    /**
     * @param {Rectangle} p_rect
     * @returns {boolean}
     */
    intersects(p_rect) {
        return !(
            this.bottom <= p_rect.top
            ||
            this.top >= p_rect.bottom
            ||
            this.left >= p_rect.right
            ||
            this.right <= p_rect.left
        );
    }

    /**
     * @param {Vector2} p_from
     * @param {Vector2} p_to
     * @param {Vector2} [r_pos]
     * @param {Vector2} [r_normal]
     * @returns {boolean}
     */
    intersects_segment(p_from, p_to, r_pos = undefined, r_normal = undefined) {
        let min = 0, max = 1;
        let axis = 0;
        let sign = 0;

        {
            let seg_from = p_from.x;
            let seg_to = p_to.x;
            let box_begin = this.x;
            let box_end = box_begin + this.width;
            let cmin = 0, cmax = 0;
            let csign = 0;

            if (seg_from < seg_to) {
                if (seg_from > box_end || seg_to < box_begin) {
                    return false;
                }
                let length = seg_to - seg_from;
                cmin = (seg_from < box_begin) ? ((box_begin - seg_from) / length) : 0;
                cmax = (seg_to > box_end) ? ((box_end - seg_from) / length) : 1;
                csign = -1;
            } else {
                if (seg_to > box_end || seg_from < box_begin)
                    return false;
                let length = seg_to - seg_from;
                cmin = (seg_from > box_end) ? (box_end - seg_from) / length : 0;
                cmax = (seg_to < box_begin) ? (box_begin - seg_from) / length : 1;
                csign = 1;
            }

            if (cmin > min) {
                min = cmin;
                axis = 0;
                sign = csign;
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
            let csign = 0;

            if (seg_from < seg_to) {
                if (seg_from > box_end || seg_to < box_begin) {
                    return false;
                }
                let length = seg_to - seg_from;
                cmin = (seg_from < box_begin) ? ((box_begin - seg_from) / length) : 0;
                cmax = (seg_to > box_end) ? ((box_end - seg_from) / length) : 1;
                csign = -1;
            } else {
                if (seg_to > box_end || seg_from < box_begin)
                    return false;
                let length = seg_to - seg_from;
                cmin = (seg_from > box_end) ? (box_end - seg_from) / length : 0;
                cmax = (seg_to < box_begin) ? (box_begin - seg_from) / length : 1;
                csign = 1;
            }

            if (cmin > min) {
                min = cmin;
                axis = 1;
                sign = csign;
            }
            if (cmax < max)
                max = cmax;
            if (max < min)
                return false;
        }

        const rel = p_to.clone().subtract(p_from);

        if (r_normal) {
            r_normal.set(0, 0);
            if (axis === 0) {
                r_normal.x = sign;
            } else {
                r_normal.y = sign;
            }
        }

        if (r_pos) {
            r_pos.copy(p_from).add(rel.scale(min));
        }

        Vector2.free(rel);

        return true;
    }
}
