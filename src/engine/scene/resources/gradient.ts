import { res_class_map } from "engine/registry";
import { VObject } from "engine/core/v_object";
import { Color, ColorLike } from "engine/core/color";
import { remove_items } from "engine/dep/index";


class Point {
    offset = 0;
    color = new Color;

    init() {
        this.offset = 0;
        this.color.set(1, 1, 1, 1);
        return this;
    }
}
const pool_Point: Point[] = [];
function Point_create() {
    const p = pool_Point.pop();
    if (p) return p.init();
    return new Point();
}
function Point_free(p: Point) {
    pool_Point.push(p);
}

/**
 * @param {Point} a
 * @param {Point} b
 */
function sort_point(a: Point, b: Point) {
    return a.offset - b.offset;
}

export class Gradient extends VObject {
    get class() { return 'Gradient' }

    /** @type {Point[]} */
    points: Point[] = [Point_create(), Point_create()];
    is_sorted = true;

    constructor() {
        super();

        this.points[0].color.set(0, 0, 0, 1);
        this.points[0].offset = 0;
        this.points[1].color.set(1, 1, 1, 1);
        this.points[1].offset = 1;
    }

    /* virtual */

    _load_data(p_data: any) {
        if (p_data.colors) {
            Point_free(this.points[0]);
            Point_free(this.points[1]);
            this.points.length = 0;

            for (let i = 0; i < p_data.colors.length; i++) {
                this.add_point(i, p_data.colors[i]);
            }
        }
        return this;
    }

    /* public */

    /**
     * @param {number} p_offset
     * @param {ColorLike} p_color
     */
    add_point(p_offset: number, p_color: ColorLike) {
        const p = Point_create();
        p.offset = p_offset;
        p.color.copy(p_color);
        this.is_sorted = false;
        this.points.push(p);
        this.emit_signal('changed');
    }
    /**
     * @param {number} p_index
     */
    remove_point(p_index: number) {
        const p = this.points[p_index];
        remove_items(this.points, p_index, 1);
        Point_free(p);
        this.emit_signal('changed');
    }

    /**
     * @param {number} pos
     * @param {number} offset
     */
    set_offset(pos: number, offset: number) { }
    /**
     * @param {number} pos
     */
    get_offset(pos: number) { }

    /**
     * @param {number} pos
     * @param {ColorLike} color
     */
    set_color(pos: number, color: ColorLike) { }
    /**
     * @param {number} pos
     */
    get_color(pos: number) { }

    get_points_count() { }

    /**
     * return new Color
     * @param {number} p_offset
     */
    interpolate(p_offset: number) {
        if (this.points.length === 0) {
            return Color.create(0, 0, 0, 1);
        }

        if (!this.is_sorted) {
            this.points.sort(sort_point);
            this.is_sorted = true;
        }

        let low = 0;
        let high = this.points.length - 1;
        let middle = 0;

        while (low <= high) {
            middle = Math.floor((low + high) / 2);
            const p = this.points[middle];
            if (p.offset > p_offset) {
                high = middle - 1;
            } else if (p.offset < p_offset) {
                low = middle + 1;
            } else {
                return p.color.clone();
            }
        }

        if (this.points[middle].offset > p_offset) {
            middle--;
        }
        const first = middle;
        const second = middle + 1;
        if (second >= this.points.length) {
            return this.points[this.points.length - 1].color.clone();
        }
        if (first < 0) {
            return this.points[0].color.clone();
        }
        const point_first = this.points[first];
        const point_second = this.points[second];
        return point_first.color.linear_interpolate(point_second.color, (p_offset - point_first.offset) / (point_second.offset - point_first.offset));
    }
}
res_class_map['Gradient'] = Gradient
