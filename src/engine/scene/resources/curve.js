import { remove_items } from 'engine/dep/index';
import { deg2rad, clamp, lerp } from 'engine/core/math/math_funcs';
import { CMP_EPSILON } from 'engine/core/math/math_defs';
import { Vector2 } from 'engine/core/math/vector2';
import { VObject } from 'engine/core/v_object';


/**
 * @param {number} t
 * @param {number} start
 * @param {number} control_1
 * @param {number} control_2
 * @param {number} end
 */
function _bezier_interp(t, start, control_1, control_2, end) {
    const omt = (1.0 - t);
    const omt2 = omt * omt;
    const omt3 = omt2 * omt;
    const t2 = t * t;
    const t3 = t2 * t;

    return start * omt3 + control_1 * omt2 * t * 3 + control_2 * omt * t2 * 3 + end * t3;
}

/**
 * @param {number} t
 * @param {Vector2} start
 * @param {Vector2} control_1
 * @param {Vector2} control_2
 * @param {Vector2} end
 */
function _bezier_interp_vec(t, start, control_1, control_2, end) {
    const omt = (1.0 - t);
    const omt2 = omt * omt;
    const omt3 = omt2 * omt;
    const t2 = t * t;
    const t3 = t2 * t;

    return start.clone().scale(omt3)
        .add(control_1.clone().scale(omt2).scale(t).scale(3))
        .add(control_2.clone().scale(omt).scale(t2).scale(3))
        .add(end.clone().scale(t3));
}

/**
 * @enum {number}
 */
const TangentMode = {
    FREE: 0,
    LINEAR: 1,
    MODE_COUNT: 2,
};

class C_Point {
    /**
     * @param {Vector2} p_pos
     * @param {number} [p_left]
     * @param {number} [p_right]
     * @param {TangentMode} [p_left_mode]
     * @param {TangentMode} [p_right_mode]
     */
    static new(
        p_pos,
        p_left = 0,
        p_right = 0,
        p_left_mode = TangentMode.FREE,
        p_right_mode = TangentMode.FREE
    ) {
        const p = C_PointCache.pop();
        if (!p) {
            return new C_Point(p_pos, p_left, p_right, p_left_mode, p_right_mode);
        } else {
            p.pos.set(p_pos.x, p_pos.y);
            p.left_tangent = p_left;
            p.right_tangent = p_right;
            p.left_mode = p_left_mode;
            p.right_mode = p_right_mode;
            return p;
        }
    }
    /**
     * @param {C_Point} p
     */
    static free(p) {
        if (p && C_PointCache.length < 2019) {
            C_PointCache.push(p);
        }
    }
    /**
     * @param {Vector2} p_pos
     * @param {number} [p_left]
     * @param {number} [p_right]
     * @param {TangentMode} [p_left_mode]
     * @param {TangentMode} [p_right_mode]
     */
    constructor(
        p_pos,
        p_left = 0,
        p_right = 0,
        p_left_mode = TangentMode.FREE,
        p_right_mode = TangentMode.FREE
    ) {
        this.pos = new Vector2(p_pos.x, p_pos.y);
        this.left_tangent = p_left;
        this.right_tangent = p_right;
        this.left_mode = p_left_mode;
        this.right_mode = p_right_mode;
    }
}
/** @type {C_Point[]} */
const C_PointCache = [];

const MIN_X = 0;
const MAX_X = 1;
const MIN_Y_RANGE = 0.01;

export class Curve extends VObject {
    get class() { return 'Curve' }

    constructor() {
        super();

        /** @type {C_Point[]} */
        this._points = [];
        this._baked_cache_dirty = false;
        /** @type {number[]} */
        this._baked_cache = [];
        this._bake_resolution = 100;
        this._min_value = 0;
        this._max_value = 1;
    }

    get_point_count() {
        return this._points.length;
    }

    /**
     * @param {Vector2} p_pos
     * @param {number} [p_left]
     * @param {number} [p_right]
     * @param {TangentMode} [p_left_mode]
     * @param {TangentMode} [p_right_mode]
     */
    add_point(
        p_pos,
        p_left = 0,
        p_right = 0,
        p_left_mode = TangentMode.FREE,
        p_right_mode = TangentMode.FREE
    ) {
        // Add a point and preserve order

        // Curve bounds is in 0..1
        if (p_pos.x > MAX_X) {
            p_pos.x = MAX_X;
        } else if (p_pos.x < MIN_X) {
            p_pos.x = MIN_X;
        }

        let ret = -1;

        if (this._points.length === 0) {
            this._points.push(new C_Point(p_pos, p_left, p_right, p_left_mode, p_right_mode));
            ret = 0;
        } else if (this._points.length === 1) {
            let diff = p_pos.x - this._points[0].pos.x;

            if (diff > 0) {
                this._points.push(new C_Point(p_pos, p_left, p_right, p_left_mode, p_right_mode));
                ret = 1;
            } else {
                this._points.unshift(new C_Point(p_pos, p_left, p_right, p_left_mode, p_right_mode));
                ret = 0;
            }
        } else {
            let i = this.get_index(p_pos.x);

            if (i === 0 && p_pos.x < this._points[0].pos.x) {
                // Insert before anything else
                this._points.unshift(new C_Point(p_pos, p_left, p_right, p_left_mode, p_right_mode));
                ret = 0;
            } else {
                ++i;
                this._points.splice(i, 0, new C_Point(p_pos, p_left, p_right, p_left_mode, p_right_mode));
                ret = i;
            }
        }

        this.update_auto_tangents(ret);

        this.mark_dirty();

        return ret;
    }

    /**
     * @param {number} p_index
     */
    remove_point(p_index) {
        remove_items(this._points, p_index, 1);
        this.mark_dirty();
    }
    clear_points() {
        for (const p of this._points) {
            C_Point.free(p);
        }
        this._points.length = 0;
        this.mark_dirty();
    }

    /**
     * @param {number} offset
     */
    get_index(offset) {
        // Lower-bound float binary search

        let imin = 0;
        let imax = this._points.length - 1;

        while (imax - imin > 1) {
            let m = (imin + imax) / 2;

            let a = this._points[m].pos.x;
            let b = this._points[m + 1].pos.x;

            if (a < offset && b < offset) {
                imin = m;
            } else if (a > offset) {
                imax = m;
            } else {
                return m;
            }
        }

        // Will happen if the offset is out of bounds
        if (offset > this._points[imax].pos.x) {
            return imax;
        }
        return imin;
    }

    /**
     * @param {number} p_index
     * @param {number} pos
     */
    set_point_value(p_index, pos) {
        this._points[p_index].pos.y = pos;
        this.update_auto_tangents(p_index);
        this.mark_dirty();
    }
    /**
     * @param {number} p_index
     * @param {number} offset
     */
    set_point_offset(p_index, offset) {
        const p = this._points[p_index];
        this.remove_point(p_index);

        const pos = Vector2.new(offset, p.pos.y);
        let i = this.add_point(pos);
        this._points[i].left_tangent = p.left_tangent;
        this._points[i].right_tangent = p.right_tangent;
        this._points[i].left_mode = p.left_mode;
        this._points[i].right_mode = p.right_mode;
        if (p_index !== i) {
            this.update_auto_tangents(p_index);
        }
        this.update_auto_tangents(i);

        Vector2.free(pos);
        return i;
    }
    /**
     * @param {number} p_index
     */
    get_point_position(p_index) {
        return this._points[p_index].pos;
    }

    /**
     * @param {number} p_index
     */
    get_point(p_index) {
        return this._points[p_index];
    }

    get_min_value() { return this._min_value; }
    /**
     * @param {number} p_min
     */
    set_min_value(p_min) {
        if (p_min > this._max_value - MIN_Y_RANGE) {
            this._min_value = this._max_value - MIN_Y_RANGE;
        } else {
            this._min_value = p_min;
        }
        this.emit_signal('range_changed');
    }

    get_max_value() { return this._max_value; }
    /**
     * @param {number} p_max
     */
    set_max_value(p_max) {
        if (p_max < this._min_value + MIN_Y_RANGE) {
            this._max_value = this._min_value + MIN_Y_RANGE;
        } else {
            this._max_value = p_max;
        }
        this.emit_signal('range_changed');
    }

    /**
     * @param {number} offset
     */
    interpolate(offset) {
        if (this._points.length === 0) {
            return 0;
        }
        if (this._points.length === 1) {
            return this._points[0].pos.y;
        }

        const i = this.get_index(offset);

        if (i === this._points.length - 1) {
            return this._points[i].pos.y;
        }

        const local = offset - this._points[i].pos.x;

        if (i === 0 && local <= 0) {
            return this._points[0].pos.y;
        }

        return this.interpolate_local_nocheck(i, local);
    }
    /**
     * @param {number} index
     * @param {number} local_offset
     */
    interpolate_local_nocheck(index, local_offset) {
        const a = this._points[index];
        const b = this._points[index + 1];

        /**
         * Cubic bezier
         *
         *       ac-----bc
         *      /         \
         *     /           \     Here with a.right_tangent > 0
         *    /             \    and b.left_tangent < 0
         *   /               \
         *  a                 b
         *
         *  |-d1--|-d2--|-d3--|
         *
         * d1 == d2 == d3 == d / 3
         */

        // Control points are chosen at equal distances
        let d = b.pos.x - a.pos.x;
        if (Math.abs(d) <= CMP_EPSILON) {
            return b.pos.y;
        }
        local_offset /= d;
        d /= 3;
        const yac = a.pos.y + d * a.right_tangent;
        const ybc = b.pos.y - d * b.left_tangent;

        return _bezier_interp(local_offset, a.pos.y, yac, ybc, b.pos.y);
    }

    clearn_dupes() {
        let dirty = false;

        for (let i = 1; i < this._points.length; i++) {
            let diff = this._points[i - 1].pos.x - this._points[i].pos.x;
            if (diff <= CMP_EPSILON) {
                remove_items(this._points, i, 1);
                --i;
                dirty = true;
            }
        }

        if (dirty) {
            this.mark_dirty();
        }
    }

    /**
     * @param {number} i
     * @param {number} tangent
     */
    set_point_left_tangent(i, tangent) {
        this._points[i].left_tangent = tangent;
        this._points[i].left_mode = TangentMode.FREE;
        this.mark_dirty();
    }
    /**
     * @param {number} i
     * @param {number} tangent
     */
    set_point_right_tangent(i, tangent) {
        this._points[i].right_tangent = tangent;
        this._points[i].right_mode = TangentMode.FREE;
        this.mark_dirty();
    }
    /**
     * @param {number} i
     * @param {number} p_mode
     */
    set_point_left_mode(i, p_mode) {
        this._points[i].left_mode = p_mode;
        if (i > 0) {
            if (p_mode === TangentMode.LINEAR) {
                const v = this._points[i - 1].pos.clone().subtract(this._points[i].pos).normalize();
                this._points[i].left_tangent = v.y / v.x;
                Vector2.free(v);
            }
        }
        this.mark_dirty();
    }
    /**
     * @param {number} i
     * @param {number} p_mode
     */
    set_point_right_mode(i, p_mode) {
        this._points[i].right_mode = p_mode;
        if (i + 1 < this._points.length) {
            if (p_mode === TangentMode.LINEAR) {
                const v = this._points[i + 1].pos.clone().subtract(this._points[i].pos).normalize();
                this._points[i].right_tangent = v.y / v.x;
                Vector2.free(v);
            }
        }
        this.mark_dirty();
    }

    /**
     * @param {number} i
     */
    get_point_left_tangent(i) {
        return this._points[i].left_tangent;
    }
    /**
     * @param {number} i
     */
    get_point_right_tangent(i) {
        return this._points[i].right_tangent;
    }
    /**
     * @param {number} i
     */
    get_point_left_mode(i) {
        return this._points[i].left_mode;
    }
    /**
     * @param {number} i
     */
    get_point_right_mode(i) {
        return this._points[i].right_mode;
    }

    /**
     * @param {number} i
     */
    update_auto_tangents(i) {
        const v = Vector2.new();

        const p = this._points[i];

        if (i > 0) {
            if (p.left_mode === TangentMode.LINEAR) {
                v.copy(this._points[i - 1].pos).subtract(p.pos).normalize();
                p.left_tangent = v.y / v.x;
            }
            if (this._points[i - 1].right_mode === TangentMode.LINEAR) {
                v.copy(this._points[i - 1].pos).subtract(p.pos).normalize();
                this._points[i - 1].right_tangent = v.y / v.x;
            }
        }

        if (i + 1 < this._points.length) {
            if (p.right_mode === TangentMode.LINEAR && i + 1 < this._points.length) {
                v.copy(this._points[i + 1].pos).subtract(p.pos).normalize();
                p.right_tangent = v.y / v.x;
            }
            if (this._points[i + 1].left_mode === TangentMode.LINEAR) {
                v.copy(this._points[i + 1].pos).subtract(p.pos).normalize();
                this._points[i + 1].left_tangent = v.y / v.x;
            }
        }

        Vector2.free(v);
    }

    get_data() {
        const ELEMS = 5;
        const output = new Array(this._points.length * ELEMS);

        for (let j = 0; j < this._points.length; j++) {
            const p = this._points[j];
            const i = j * ELEMS;

            output[i] = p.pos.clone();
            output[i + 1] = p.left_tangent;
            output[i + 2] = p.right_tangent;
            output[i + 3] = p.left_mode;
            output[i + 4] = p.right_mode;
        }

        return output;
    }
    /**
     * @param {any[]} input
     */
    set_data(input) {
        const ELEMS = 5;

        for (const p of this._points) {
            C_Point.free(p);
        }

        this._points.length = input.length / ELEMS;

        const vec = Vector2.new();
        for (let j = 0; j < this._points.length; j++) {
            const p = this._points[j] = new C_Point(vec.set(0, 0));
            const i = j * ELEMS;

            p.pos.copy(input[i]);
            p.left_tangent = input[i + 1];
            p.right_tangent = input[i + 2];
            p.left_mode = input[i + 3];
            p.right_mode = input[i + 4];
        }
        Vector2.free(vec);

        this.mark_dirty();

        return this;
    }

    bake() {
        this._baked_cache.length = 0;

        this._baked_cache.length = this._bake_resolution;

        for (let i = 1; i < this._bake_resolution - 1; i++) {
            const x = i / this._bake_resolution;
            const y = this.interpolate(x);
            this._baked_cache[i] = y;
        }

        if (this._points.length !== 0) {
            this._baked_cache[0] = this._points[0].pos.y;
            this._baked_cache[this._baked_cache.length - 1] = this._points[this._points.length - 1].pos.y;
        }

        this._baked_cache_dirty = false;
    }

    get_bake_resolution() {
        this._bake_resolution;
    }

    /**
     * @param {number} p_resolution
     */
    set_bake_resolution(p_resolution) {
        this._bake_resolution = p_resolution;
        this._baked_cache_dirty = true;
    }

    /**
     * @param {number} offset
     */
    interpolate_baked(offset) {
        if (this._baked_cache_dirty) {
            this.bake();
        }

        // special cases if the cache is too small
        if (this._baked_cache.length === 0) {
            if (this._points.length === 0) {
                return 0;
            }
            return this._points[0].pos.y;
        } else if (this._baked_cache.length === 1) {
            return this._baked_cache[0];
        }

        // get interpolation index
        let fi = offset * this._baked_cache.length;
        let i = Math.floor(fi);
        if (i < 0) {
            i = 0;
            fi = 0;
        } else if (i >= this._baked_cache.length) {
            i = this._baked_cache.length - 1;
            fi = 0;
        }

        // interpolate
        if (i + 1 < this._baked_cache.length) {
            const t = fi - i;
            return lerp(this._baked_cache[i], this._baked_cache[i + 1], t);
        } else {
            return this._baked_cache[this._baked_cache.length - 1];
        }
    }

    /**
     * @param {number} p_min
     * @param {number} p_max
     */
    ensure_default_setup(p_min, p_max) {
        const vec = Vector2.new();
        if (this._points.length === 0 && this._min_value === 0 && this._max_value === 1) {
            this.add_point(vec.set(0, 1));
            this.add_point(vec.set(1, 1));
            this.set_min_value(p_min);
            this.set_max_value(p_max);
        }
        Vector2.free(vec);
    }

    mark_dirty() {
        this._baked_cache_dirty = true;
        this.emit_signal('changed');
    }
}

const PointPool = [];
class Point {
    static new() {
        const p = PointPool.pop();
        if (p) {
            return p;
        } else {
            return new Point();
        }
    }
    /**
     * @param {Point} p
     */
    static free(p) {
        PointPool.push(p);
    }
    constructor() {
        this.in = new Vector2();
        this.out = new Vector2();
        this.pos = new Vector2();
    }
}

class BakedPoint {
    constructor() {
        this.ofs = 0;
        this.point = new Vector2();
    }
}

export class Curve2D extends VObject {
    get class() { return 'Curve2D' }

    set bake_interval(p_tolerance) {
        this._bake_interval = p_tolerance;
        this.baked_cache_dirty = true;
    }
    get bake_interval() {
        return this._bake_interval;
    }

    constructor() {
        super();

        /**
         * @type {Point[]}
         */
        this.points = [];

        this.baked_cache_dirty = false;
        /**
         * @type {Vector2[]}
         */
        this.baked_point_cache = [];
        this.baked_max_ofs = 0;

        this._bake_interval = 5;
    }

    _load_data(data) {
        if (data.points !== undefined) {
            const points = data.points;
            const pc = points.length / 6;

            // Recycle points
            for (const p of this.points) {
                Point.free(p);
            }

            // Add new ones
            this.points.length = pc;
            for (let i = 0; i < pc; i++) {
                const p = Point.new();
                p.in.set(points[i * 6 + 0], points[i * 6 + 1]);
                p.out.set(points[i * 6 + 2], points[i * 6 + 3]);
                p.pos.set(points[i * 6 + 4], points[i * 6 + 5]);
                this.points[i] = p;
            }

            this.baked_cache_dirty = true;
        }
    }

    get_point_count() {
        return this.points.length;
    }
    /**
     * @param {Vector2} p_pos
     * @param {Vector2} p_in
     * @param {Vector2} p_out
     * @param {number} [p_atpos]
     */
    add_point(p_pos, p_in, p_out, p_atpos = -1) {
        const n = new Point();
        n.pos.copy(p_pos);
        n.in.copy(p_in);
        n.out.copy(p_out);
        if (p_atpos >= 0 && p_atpos < this.points.length) {
            this.points.splice(p_atpos, 0, n);
        } else {
            this.points.push(n);
        }

        this.baked_cache_dirty = true;
    }
    /**
     * @param {number} p_index
     * @param {Vector2} p_pos
     */
    set_point_position(p_index, p_pos) {
        this.points[p_index].pos.copy(p_pos);
        this.baked_cache_dirty = true;
    }
    /**
     * @param {number} p_index
     */
    get_point_position(p_index) {
        return this.points[p_index].pos;
    }
    /**
     * @param {number} p_index
     * @param {Vector2} p_in
     */
    set_point_in(p_index, p_in) {
        this.points[p_index].in.copy(p_in);
        this.baked_cache_dirty = true;
    }
    /**
     * @param {number} p_index
     */
    get_point_in(p_index) {
        return this.points[p_index].in;
    }
    /**
     * @param {number} p_index
     * @param {Vector2} p_out
     */
    set_point_out(p_index, p_out) {
        this.points[p_index].out.copy(p_out);
        this.baked_cache_dirty = true;
    }
    /**
     * @param {number} p_index
     */
    get_point_out(p_index) {
        return this.points[p_index].out;
    }
    /**
     * @param {number} p_index
     */
    remove_point(p_index) {
        remove_items(this.points, p_index, 1);
        this.baked_cache_dirty = true;
    }
    clear_points() {
        if (this.points.length > 0) {
            this.points.length = 0;
            this.baked_cache_dirty = true;
        }
    }

    /**
     * @param {number} p_index
     * @param {number} p_offset
     */
    interpolate(p_index, p_offset) {
        const pc = this.points.length;

        if (p_index >= pc - 1) {
            return this.points[pc - 1].pos;
        } else if (p_index < 0) {
            return this.points[0].pos;
        }

        const p0 = this.points[p_index].pos;
        const p1 = p0.clone().add(this.points[p_index].out);
        const p3 = this.points[p_index + 1].pos;
        const p2 = p3.clone().add(this.points[p_index + 1].in);

        const res = _bezier_interp_vec(p_offset, p0, p1, p2, p3);

        Vector2.free(p0);
        Vector2.free(p1);
        Vector2.free(p2);
        Vector2.free(p3);

        return res;
    }
    /**
     * @param {number} p_index
     */
    interpolatef(p_index) {
        if (p_index < 0) {
            p_index = 0;
        } else if (p_index >= this.points.length) {
            p_index = this.points.length;
        }

        return this.interpolate(Math.floor(p_index), p_index % 1.0);
    }

    get_baked_length() {
        if (this.baked_cache_dirty) {
            this._bake();
        }
        return this.baked_max_ofs;
    }
    /**
     * @param {number} p_offset
     * @param {boolean} [p_cubic]
     */
    interpolate_baked(p_offset, p_cubic = false) {
        if (this.baked_cache_dirty) {
            this._bake();
        }

        const pc = this.baked_point_cache.length;

        if (pc === 1) {
            return this.baked_point_cache[0];
        }

        const bpc = this.baked_point_cache.length;
        const r = this.baked_point_cache;

        if (p_offset < 0) {
            return r[0];
        }
        if (p_offset >= this.baked_max_ofs) {
            return r[bpc - 1];
        }

        const idx = Math.floor(p_offset / this._bake_interval);
        let frac = p_offset % this._bake_interval;

        if (idx >= bpc - 1) {
            return r[bpc - 1];
        } else if (idx === bpc - 2) {
            frac /= (this.baked_max_ofs % this._bake_interval);
        } else {
            frac /= this._bake_interval;
        }

        if (p_cubic) {
            const pre = idx > 0 ? r[idx - 1] : r[idx];
            const post = (idx < (bpc - 2)) ? r[idx + 2] : r[idx + 1];
            return r[idx].cubic_interpolate(r[idx + 1], pre, post, frac);
        } else {
            return r[idx].linear_interpolate(r[idx + 1], frac);
        }
    }
    get_baked_points() {
        if (this.baked_cache_dirty) {
            this._bake();
        }
        return this.baked_point_cache;
    }
    /**
     * @param {Vector2} p_to_point
     */
    get_closest_point(p_to_point) {
        // Brute force

        if (this.baked_cache_dirty) {
            this._bake();
        }

        const pc = this.baked_point_cache.length;
        if (pc === 1) {
            return this.baked_point_cache[0];
        }

        const r = this.baked_point_cache;

        const nearest = new Vector2();
        let nearest_dist = -1;

        const origin = Vector2.new();
        const direction = Vector2.new();
        const proj = Vector2.new();
        const tmp = Vector2.new();
        for (let i = 0; i < pc - 1; i++) {
            origin.copy(r[i]);
            direction.copy(r[i + 1]).subtract(origin).scale(1 / this._bake_interval);

            const d = clamp(tmp.copy(p_to_point).subtract(origin).dot(direction), 0, this._bake_interval);
            proj.copy(direction).scale(d).add(origin);

            const dist = proj.distance_squared_to(p_to_point);

            if (nearest_dist < 0 || dist < nearest_dist) {
                nearest.copy(proj);
                nearest_dist = dist;
            }
        }

        Vector2.free(origin);
        Vector2.free(direction);
        Vector2.free(proj);
        Vector2.free(tmp);

        return nearest;
    }
    /**
     * @param {Vector2} p_to_point
     */
    get_closest_offset(p_to_point) {
        if (this.baked_cache_dirty) {
            this._bake();
        }

        const pc = this.baked_point_cache.length;

        if (pc === 1) {
            return 0;
        }

        const r = this.baked_point_cache;

        let nearest = 0;
        let nearest_dist = -1;
        let offset = 0;

        const origin = Vector2.new();
        const direction = Vector2.new();
        const proj = Vector2.new();
        const tmp = Vector2.new();
        for (let i = 0; i < pc - 1; i++) {
            origin.copy(r[i]);
            direction.copy(r[i + 1]).subtract(origin).scale(1 / this._bake_interval);

            const d = clamp(tmp.copy(p_to_point).subtract(origin).dot(direction), 0, this._bake_interval);
            proj.copy(direction).scale(d).add(origin);

            const dist = proj.distance_squared_to(p_to_point);

            if (nearest_dist < 0 || dist < nearest_dist) {
                nearest = offset + d;
                nearest_dist = dist;
            }

            offset += this._bake_interval;
        }

        Vector2.free(origin);
        Vector2.free(direction);
        Vector2.free(proj);
        Vector2.free(tmp);

        return nearest;
    }

    /**
     * @param {number} p_max_stages
     * @param {number} p_tolerance
     */
    tessellate(p_max_stages = 5, p_tolerance = 4) {
        /** @type {Vector2[]} */
        const tess = [];

        if (this.points.length === 0) {
            return tess;
        }

        const len = this.points.length - 1;
        /** @type {Map<number, Vector2>[]} */
        const midpoints = new Array(len);

        let pc = 1;
        for (let i = 0; i < len; i++) {
            midpoints[i] = new Map();
            this._bake_segment2d(midpoints[i], 0, 1, this.points[i].pos, this.points[i].out, this.points[i + 1].pos, this.points[i + 1].in, 0, p_max_stages, p_tolerance);
            pc++;
            pc += midpoints[i].size;
        }

        tess.length = pc;
        const bpw = tess;
        bpw[0] = new Vector2().copy(this.points[0].pos);
        let pidx = 0;

        for (let i = 0; i < this.points.length - 1; i++) {
            for (let [_, E] of midpoints[i]) {
                pidx++;
                bpw[pidx] = new Vector2().copy(E);
            }

            pidx++;
            bpw[pidx] = new Vector2().copy(this.points[i + 1].pos);
        }

        return tess;
    }

    _bake() {
        if (!this.baked_cache_dirty) {
            return;
        }

        this.baked_max_ofs = 0;
        this.baked_cache_dirty = false;

        if (this.points.length === 0) {
            this.baked_point_cache.length = 0;
            return;
        }

        if (this.points.length === 1) {
            this.baked_point_cache.length = 1;
            this.baked_point_cache[0] = this.points[0].pos.clone();
            return;
        }

        let pos = this.points[0].pos.clone();
        const pointlist = [];

        pointlist.push(pos); // start always from origin

        for (let i = 0; i < this.points.length - 1; i++) {
            const step = 0.1; // at least 10 substeps ought to be enough?
            let p = 0;

            while (p < 1) {
                let np = p + step;
                if (np > 1) {
                    np = 1;
                }

                let npp = _bezier_interp_vec(np, this.points[i].pos, this.points[i].pos.clone().add(this.points[i].out), this.points[i + 1].pos.clone().add(this.points[i + 1].in), this.points[i + 1].pos);
                let d = pos.distance_to(npp);

                if (d > this._bake_interval) {
                    let interations = 10;

                    let low = p;
                    let hi = np;
                    let mid = low + (hi - low) * 0.5;

                    for (let j = 0; j < interations; j++) {
                        npp = _bezier_interp_vec(mid, this.points[i].pos, this.points[i].pos.clone().add(this.points[i].out), this.points[i + 1].pos.clone().add(this.points[i + 1].in), this.points[i + 1].pos);
                        d = pos.distance_to(npp);

                        if (this._bake_interval < d) {
                            hi = mid;
                        } else {
                            low = mid;
                        }
                        mid = low + (hi - low) * 0.5;
                    }

                    pos = npp;
                    p = mid;
                    pointlist.push(pos);
                } else {
                    p = np;
                }
            }
        }

        const lastpos = this.points[this.points.length - 1].pos;

        const rem = pos.distance_to(lastpos);
        this.baked_max_ofs = (pointlist.length - 1) * this._bake_interval + rem;
        pointlist.push(lastpos);

        this.baked_point_cache = pointlist;
    }

    /**
     * @param {Map<number, Vector2>} r_bake
     * @param {number} p_begin
     * @param {number} p_end
     * @param {Vector2} p_a
     * @param {Vector2} p_out
     * @param {Vector2} p_b
     * @param {Vector2} p_in
     * @param {number} p_depth
     * @param {number} p_max_depth
     * @param {number} p_tol
     */
    _bake_segment2d(r_bake, p_begin, p_end, p_a, p_out, p_b, p_in, p_depth, p_max_depth, p_tol) {
        const mp = p_begin + (p_end - p_begin) * 0.5;
        const beg = _bezier_interp_vec(p_begin, p_a, p_a.clone().add(p_out), p_b.clone().add(p_in), p_b);
        const mid = _bezier_interp_vec(mp, p_a, p_a.clone().add(p_out), p_b.clone().add(p_in), p_b);
        const end = _bezier_interp_vec(p_end, p_a, p_a.clone().add(p_out), p_b.clone().add(p_in), p_b);

        const na = mid.clone().subtract(beg).normalize();
        const nb = end.clone().subtract(mid).normalize();
        const dp = na.dot(nb);

        if (dp < Math.cos(deg2rad(p_tol))) {
            r_bake.set(mp, mid);
        }

        if (p_depth < p_max_depth) {
            this._bake_segment2d(r_bake, p_begin, mp, p_a, p_out, p_b, p_in, p_depth + 1, p_max_depth, p_tol);
            this._bake_segment2d(r_bake, mp, p_end, p_a, p_out, p_b, p_in, p_depth + 1, p_max_depth, p_tol);
        }
    }
}
