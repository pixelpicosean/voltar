import Vector2 from './vector2';
import Transform from './transform';
import Rectangle from './shapes/rectangle';

/**
 * 'Builder' pattern for bounds rectangles
 * Axis-Aligned Bounding Box
 * It is not a shape! Its mutable thing, no 'EMPTY' or that kind of problems
 */
export default class Bounds {
    constructor() {
        /**
         * @member {number}
         * @default 0
         */
        this.min_x = Infinity;

        /**
         * @member {number}
         * @default 0
         */
        this.min_y = Infinity;

        /**
         * @member {number}
         * @default 0
         */
        this.max_x = -Infinity;

        /**
         * @member {number}
         * @default 0
         */
        this.max_y = -Infinity;

        /**
         * @member {Rectangle}
         * @private
         */
        this.rect = null;

        /**
         * @private
         */
        this.update_id = 0;
    }

    /**
     * Checks if bounds are empty.
     *
     * @return {boolean} True if empty.
     */
    is_empty() {
        return this.min_x > this.max_x || this.min_y > this.max_y;
    }

    /**
     * Clears the bounds and resets.
     */
    clear() {
        this.update_id++;

        this.min_x = Infinity;
        this.min_y = Infinity;
        this.max_x = -Infinity;
        this.max_y = -Infinity;
    }

    /**
     * Can return Rectangle.EMPTY constant, either construct new rectangle, either use your rectangle
     * It is not guaranteed that it will return tempRect
     *
     * @param {Rectangle} rect - temporary object will be used if AABB is not empty
     * @returns {Rectangle} A rectangle of the bounds
     */
    get_rectangle(rect) {
        if (this.min_x > this.max_x || this.min_y > this.max_y) {
            return Rectangle.EMPTY;
        }

        rect = rect || new Rectangle(0, 0, 1, 1);

        rect.x = this.min_x;
        rect.y = this.min_y;
        rect.width = this.max_x - this.min_x;
        rect.height = this.max_y - this.min_y;

        return rect;
    }

    /**
     * This function should be inlined when its possible.
     *
     * @param {Vector2} point - The point to add.
     */
    add_point(point) {
        this.min_x = Math.min(this.min_x, point.x);
        this.max_x = Math.max(this.max_x, point.x);
        this.min_y = Math.min(this.min_y, point.y);
        this.max_y = Math.max(this.max_y, point.y);
    }

    /**
     * Adds a quad, not transformed
     *
     * @param {Float32Array} vertices - The verts to add.
     */
    add_quad(vertices) {
        let min_x = this.min_x;
        let min_y = this.min_y;
        let max_x = this.max_x;
        let max_y = this.max_y;

        let x = vertices[0];
        let y = vertices[1];

        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        x = vertices[2];
        y = vertices[3];
        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        x = vertices[4];
        y = vertices[5];
        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        x = vertices[6];
        y = vertices[7];
        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        this.min_x = min_x;
        this.min_y = min_y;
        this.max_x = max_x;
        this.max_y = max_y;
    }

    /**
     * Adds sprite frame, transformed.
     *
     * @param {Transform} transform - TODO
     * @param {number} x0 - TODO
     * @param {number} y0 - TODO
     * @param {number} x1 - TODO
     * @param {number} y1 - TODO
     */
    add_frame(transform, x0, y0, x1, y1) {
        const matrix = transform.world_transform;
        const a = matrix.a;
        const b = matrix.b;
        const c = matrix.c;
        const d = matrix.d;
        const tx = matrix.tx;
        const ty = matrix.ty;

        let min_x = this.min_x;
        let min_y = this.min_y;
        let max_x = this.max_x;
        let max_y = this.max_y;

        let x = (a * x0) + (c * y0) + tx;
        let y = (b * x0) + (d * y0) + ty;

        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        x = (a * x1) + (c * y0) + tx;
        y = (b * x1) + (d * y0) + ty;
        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        x = (a * x0) + (c * y1) + tx;
        y = (b * x0) + (d * y1) + ty;
        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        x = (a * x1) + (c * y1) + tx;
        y = (b * x1) + (d * y1) + ty;
        min_x = x < min_x ? x : min_x;
        min_y = y < min_y ? y : min_y;
        max_x = x > max_x ? x : max_x;
        max_y = y > max_y ? y : max_y;

        this.min_x = min_x;
        this.min_y = min_y;
        this.max_x = max_x;
        this.max_y = max_y;
    }

    /**
     * Add an array of vertices
     *
     * @param {Transform} transform - TODO
     * @param {Float32Array} vertices - TODO
     * @param {number} beginOffset - TODO
     * @param {number} endOffset - TODO
     */
    add_vertices(transform, vertices, beginOffset, endOffset) {
        const matrix = transform.world_transform;
        const a = matrix.a;
        const b = matrix.b;
        const c = matrix.c;
        const d = matrix.d;
        const tx = matrix.tx;
        const ty = matrix.ty;

        let min_x = this.min_x;
        let min_y = this.min_y;
        let max_x = this.max_x;
        let max_y = this.max_y;

        for (let i = beginOffset; i < endOffset; i += 2) {
            const rawX = vertices[i];
            const rawY = vertices[i + 1];
            const x = (a * rawX) + (c * rawY) + tx;
            const y = (d * rawY) + (b * rawX) + ty;

            min_x = x < min_x ? x : min_x;
            min_y = y < min_y ? y : min_y;
            max_x = x > max_x ? x : max_x;
            max_y = y > max_y ? y : max_y;
        }

        this.min_x = min_x;
        this.min_y = min_y;
        this.max_x = max_x;
        this.max_y = max_y;
    }

    /**
     * Adds other Bounds
     *
     * @param {Bounds} bounds - TODO
     */
    add_bounds(bounds) {
        const min_x = this.min_x;
        const min_y = this.min_y;
        const max_x = this.max_x;
        const max_y = this.max_y;

        this.min_x = bounds.min_x < min_x ? bounds.min_x : min_x;
        this.min_y = bounds.min_y < min_y ? bounds.min_y : min_y;
        this.max_x = bounds.max_x > max_x ? bounds.max_x : max_x;
        this.max_y = bounds.max_y > max_y ? bounds.max_y : max_y;
    }

    /**
     * Adds other Bounds, masked with Bounds
     *
     * @param {Bounds} bounds - TODO
     * @param {Bounds} mask - TODO
     */
    add_bounds_mask(bounds, mask) {
        const _min_x = bounds.min_x > mask.min_x ? bounds.min_x : mask.min_x;
        const _min_y = bounds.min_y > mask.min_y ? bounds.min_y : mask.min_y;
        const _max_x = bounds.max_x < mask.max_x ? bounds.max_x : mask.max_x;
        const _max_y = bounds.max_y < mask.max_y ? bounds.max_y : mask.max_y;

        if (_min_x <= _max_x && _min_y <= _max_y) {
            const min_x = this.min_x;
            const min_y = this.min_y;
            const max_x = this.max_x;
            const max_y = this.max_y;

            this.min_x = _min_x < min_x ? _min_x : min_x;
            this.min_y = _min_y < min_y ? _min_y : min_y;
            this.max_x = _max_x > max_x ? _max_x : max_x;
            this.max_y = _max_y > max_y ? _max_y : max_y;
        }
    }

    /**
     * Adds other Bounds, masked with Rectangle
     *
     * @param {Bounds} bounds - TODO
     * @param {Rectangle} area - TODO
     */
    add_bounds_area(bounds, area) {
        const _min_x = bounds.min_x > area.x ? bounds.min_x : area.x;
        const _min_y = bounds.min_y > area.y ? bounds.min_y : area.y;
        const _max_x = bounds.max_x < area.x + area.width ? bounds.max_x : (area.x + area.width);
        const _max_y = bounds.max_y < area.y + area.height ? bounds.max_y : (area.y + area.height);

        if (_min_x <= _max_x && _min_y <= _max_y) {
            const min_x = this.min_x;
            const min_y = this.min_y;
            const max_x = this.max_x;
            const max_y = this.max_y;

            this.min_x = _min_x < min_x ? _min_x : min_x;
            this.min_y = _min_y < min_y ? _min_y : min_y;
            this.max_x = _max_x > max_x ? _max_x : max_x;
            this.max_y = _max_y > max_y ? _max_y : max_y;
        }
    }
}
