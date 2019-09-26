import { res_class_map } from "engine/registry";
import { VObject } from "engine/core/v_object";
import { Color, ColorLike } from "engine/core/color";
import { remove_items } from "engine/dep/index";


class Point {
    constructor() {
        this.offset = 0;
        this.color = new Color();
    }
    init() {
        this.offset = 0;
        this.color.set(1, 1, 1, 1);
        return this;
    }
}
/** @type {Point[]} */
const Point_pool = [];
function new_Point() {
    const p = Point_pool.pop();
    if (p) return p.init();
    return new Point();
}
/**
 * @param {Point} p
 */
function free_Point(p) {
    Point_pool.push(p);
}

/**
 * @param {Point} a
 * @param {Point} b
 */
function sort_point(a, b) {
    return a.offset - b.offset;
}

export class Gradient extends VObject {
    get class() { return 'Gradient' }

    constructor() {
        super();

        /** @type {Point[]} */
        this.points = [new_Point(), new_Point()];
        this.is_sorted = true;

        this.points[0].color.set(0, 0, 0, 1);
        this.points[0].offset = 0;
        this.points[1].color.set(1, 1, 1, 1);
        this.points[1].offset = 1;
    }

    /* virtual */

    _load_data(p_data) {
        if (p_data.colors) {
            free_Point(this.points[0]);
            free_Point(this.points[1]);
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
    add_point(p_offset, p_color) {
        const p = new_Point();
        p.offset = p_offset;
        p.color.copy(p_color);
        this.is_sorted = false;
        this.points.push(p);
        this.emit_signal('changed');
    }
    /**
     * @param {number} p_index
     */
    remove_point(p_index) {
        const p = this.points[p_index];
        remove_items(this.points, p_index, 1);
        free_Point(p);
        this.emit_signal('changed');
    }

    /**
     * @param {number} pos
     * @param {number} offset
     */
    set_offset(pos, offset) { }
    /**
     * @param {number} pos
     */
    get_offset(pos) { }

    /**
     * @param {number} pos
     * @param {ColorLike} color
     */
    set_color(pos, color) { }
    /**
     * @param {number} pos
     */
    get_color(pos) { }

    get_points_count() { }

    /**
     * return new Color
     * @param {number} p_offset
     */
    interpolate(p_offset) {
        if (this.points.length === 0) {
            return Color.new(0, 0, 0, 1);
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

    /* privarte */

    set_points(p_points) { }
}
res_class_map['Gradient'] = Gradient
