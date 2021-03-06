import { Vector2, Vector2Like } from './vector2';

/**
 * Rectangle object is an area defined by its position, as indicated by its top-left corner
 * point (x, y) and by its width and its height.
 */
export class Rect2 {
    static new(p_x: number = 0, p_y: number = 0, p_width: number = 0, p_height: number = 0) {
        const r = pool.pop();
        if (!r) {
            return new Rect2(p_x, p_y, p_width, p_height);
        } else {
            return r.set(p_x, p_y, p_width, p_height);
        }
    }
    static free(p_rect: Rect2) {
        if (p_rect && pool.length < 2019) {
            pool.push(p_rect);
        }
        return Rect2;
    }

    /**
     * A constant empty rectangle.
     */
    static get EMPTY() {
        return Object.freeze(new Rect2(0, 0, 0, 0));
    }

    x: number;
    y: number;
    width: number;
    height: number;

    /**
     * @param {number} [x=0] - The X coordinate of the upper-left corner of the rectangle
     * @param {number} [y=0] - The Y coordinate of the upper-left corner of the rectangle
     * @param {number} [width=0] - The overall width of this rectangle
     * @param {number} [height=0] - The overall height of this rectangle
     */
    constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    set(p_x: number, p_y: number, p_width: number, p_height: number) {
        this.x = p_x;
        this.y = p_y;
        this.width = p_width;
        this.height = p_height;
        return this;
    }

    get left() {
        return this.x;
    }

    get right() {
        return this.x + this.width;
    }

    get top() {
        return this.y;
    }

    get bottom() {
        return this.y + this.height;
    }

    clone() {
        return Rect2.new(this.x, this.y, this.width, this.height);
    }

    /**
     * Copies another rectangle to this one.
     * @param {Rect2} rectangle - The rectangle to copy.
     */
    copy(rectangle: Rect2) {
        this.x = rectangle.x;
        this.y = rectangle.y;
        this.width = rectangle.width;
        this.height = rectangle.height;

        return this;
    }

    is_zero() {
        return this.x === 0 && this.y === 0 && this.width === 0 && this.height === 0;
    }

    equals(rect: Rect2) {
        return this.x === rect.x && this.y === rect.y && this.width === rect.width && this.height === rect.height;
    }

    /**
     * Checks whether the x and y coordinates given are contained within this Rectangle
     *
     * @param {number} x - The X coordinate of the point to test
     * @param {number} y - The Y coordinate of the point to test
     */
    contains(x: number, y: number) {
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

    has_no_area() {
        return this.width <= 0 || this.height <= 0;
    }
    has_point(p_point: Vector2Like) {
        if (p_point.x < this.x) {
            return false;
        }
        if (p_point.y < this.y) {
            return false;
        }

        if (p_point.x >= (this.x + this.width)) {
            return false;
        }
        if (p_point.y >= (this.y + this.height)) {
            return false;
        }

        return true;
    }

    get_area() {
        return this.width * this.height;
    }

    /**
     * Returns new Rect2 with absolute values.
     */
    abs() {
        return this.clone().abs_to();
    }

    abs_to() {
        this.x = this.x + Math.min(this.width, 0);
        this.y = this.y + Math.min(this.height, 0);
        this.width = Math.abs(this.width);
        this.height = Math.abs(this.height);
    }

    /**
     * Returns new Rect2.
     */
    clip(p_rect: Rect2) {
        return this.clone().clip_by(p_rect);
    }

    clip_by(p_rect: Rect2) {
        if (!this.intersects(p_rect)) {
            return this.set(0, 0, 0, 0);
        }

        const x = Math.max(p_rect.x, this.x);
        const y = Math.max(p_rect.y, this.y);

        const p_rect_end_x = p_rect.x + p_rect.width;
        const p_rect_end_y = p_rect.y + p_rect.height;
        const end_x = this.x + this.width;
        const end_y = this.y + this.height;

        this.x = x;
        this.y = y;
        this.width = Math.min(p_rect_end_x, end_x) - x;
        this.height = Math.min(p_rect_end_y, end_y) - y;

        return this;
    }

    encloses(p_rect: Rect2) {
        return (p_rect.x >= this.x) && (p_rect.y >= this.y)
            &&
            ((p_rect.x + p_rect.width) < (this.x + this.width))
            &&
            ((p_rect.y + p_rect.height) < (this.y + this.height))
    }

    /**
     * Pads the rectangle making it grow in all directions.
     * Returns new Rect2.
     *
     * @param {number} p_by - The horizontal padding amount.
     */
    grow(p_by: number) {
        return this.clone().grow_by(p_by);
    }

    /**
     * Pads the rectangle making it grow in all directions.
     *
     * @param {number} p_by - The horizontal padding amount.
     */
    grow_by(p_by: number) {
        this.x -= p_by;
        this.y -= p_by;
        this.width += p_by * 2;
        this.height += p_by * 2;
        return this;
    }

    grow_individual(p_left: number, p_top: number, p_right: number, p_bottom: number) {
        const g = this.clone();
        g.x -= p_left;
        g.y -= p_top;
        g.width += (p_left + p_right);
        g.height += (p_top + p_bottom);
        return g;
    }

    /**
     * Returns new Rect2.
     */
    expand(p_vector: Vector2) {
        return this.clone().expand_to(p_vector);
    }

    expand_to(p_vector: Vector2) {
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
     * @param {Rect2} p_rect - The rectangle to fit.
     */
    fit_to(p_rect: Rect2) {
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
     * Returns new Rect2.
     *
     * @param {Rect2} p_rect - The rectangle to merge.
     */
    merge(p_rect: Rect2) {
        return this.clone().merge_with(p_rect);
    }

    /**
     * Merge this rectangle with the passed rectangle
     *
     * @param {Rect2} p_rect - The rectangle to merge.
     */
    merge_with(p_rect: Rect2) {
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

    intersects(p_rect: Rect2) {
        if (this.x >= p_rect.x + p_rect.width) {
            return false;
        }
        if (this.x + this.width <= p_rect.x) {
            return false;
        }
        if (this.y >= p_rect.y + p_rect.height) {
            return false;
        }
        if (this.y + this.height <= p_rect.y) {
            return false;
        }
        return true;
    }

    intersects_segment(p_from: Vector2, p_to: Vector2, r_pos: Vector2 = undefined, r_normal: Vector2 = undefined) {
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

const pool: Rect2[] = [];
