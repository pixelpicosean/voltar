import { Vector2, deg2rad, clamp } from 'engine/math/index';
import { VObject, remove_items } from 'engine/dep/index';

/**
 * @param {number} t
 * @param {Vector2} start
 * @param {Vector2} control_1
 * @param {Vector2} control_2
 * @param {Vector2} end
 */
function _bezier_interp(t, start, control_1, control_2, end) {
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

            // TODO: cache exist points
            this.points.length = pc;
            for (let i = 0; i < pc; i++) {
                const p = new Point();
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

        const res = _bezier_interp(p_offset, p0, p1, p2, p3);

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

                let npp = _bezier_interp(np, this.points[i].pos, this.points[i].pos.clone().add(this.points[i].out), this.points[i + 1].pos.clone().add(this.points[i + 1].in), this.points[i + 1].pos);
                let d = pos.distance_to(npp);

                if (d > this._bake_interval) {
                    let interations = 10;

                    let low = p;
                    let hi = np;
                    let mid = low + (hi - low) * 0.5;

                    for (let j = 0; j < interations; j++) {
                        npp = _bezier_interp(mid, this.points[i].pos, this.points[i].pos.clone().add(this.points[i].out), this.points[i + 1].pos.clone().add(this.points[i + 1].in), this.points[i + 1].pos);
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
        const beg = _bezier_interp(p_begin, p_a, p_a.clone().add(p_out), p_b.clone().add(p_in), p_b);
        const mid = _bezier_interp(mp, p_a, p_a.clone().add(p_out), p_b.clone().add(p_in), p_b);
        const end = _bezier_interp(p_end, p_a, p_a.clone().add(p_out), p_b.clone().add(p_in), p_b);

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
