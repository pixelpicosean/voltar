import { Vector3, Vector3Like } from "./vector3";

/** @type {AABB[]} */
const pool = [];

export class AABB {
    static new() {
        let obj = pool.pop();
        if (!obj) obj = new AABB;
        obj.set(0, 0, 0, 0, 0, 0);
        return obj;
    }

    /**
     * @param {AABB} aabb
     */
    static free(aabb) {
        if (aabb && pool.length < 2020) {
            pool.push(aabb);
        }
    }

    constructor() {
        this.position = new Vector3;
        this.size = new Vector3;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} width
     * @param {number} height
     * @param {number} depth
     */
    set(x, y, z, width, height, depth) {
        this.position.set(x, y, z);
        this.size.set(width, height, depth);
        return this;
    }

    /**
     * @param {AABB} aabb
     */
    copy(aabb) {
        this.position.copy(aabb.position);
        this.size.copy(aabb.size);
        return this;
    }

    clone() {
        return AABB.new().copy(this);
    }

    /**
     * @param {AABB} aabb
     */
    encloses(aabb) {
        let src_min = this.position;
        let src_max = this.position.clone().add(this.size);
        let dst_min = aabb.position;
        let dst_max = aabb.position.clone().add(aabb.size);

        let result = (
            src_min.x <= dst_min.x
            &&
            src_max.x > dst_max.x
            &&
            src_min.y <= dst_min.y
            &&
            src_max.y > dst_max.y
            &&
            src_min.z <= dst_min.z
            &&
            src_max.z > dst_max.z
        );

        Vector3.free(src_max);
        Vector3.free(dst_max);

        return result;
    }

    /**
     * @param {Vector3Like} p_vec
     */
    expand(p_vec) {
        return this.clone().expand_to(p_vec);
    }

    /**
     * @param {Vector3Like} p_vec
     */
    expand_to(p_vec) {
        let begin = this.position;
        let end = this.position.clone().add(this.size);

        if (p_vec.x < begin.x) {
            begin.x = p_vec.x;
        }
        if (p_vec.y < begin.y) {
            begin.y = p_vec.y;
        }
        if (p_vec.z < begin.z) {
            begin.z = p_vec.z;
        }

        if (p_vec.x > end.x) {
            end.x = p_vec.x;
        }
        if (p_vec.y > end.y) {
            end.y = p_vec.y;
        }
        if (p_vec.z > end.z) {
            end.z = p_vec.z;
        }

        this.size.copy(end).subtract(begin);

        Vector3.free(end);

        return this;
    }

    get_area() {
        return this.size.x * this.size.y * this.size.z;
    }

    /**
     * @param {number} idx
     */
    get_endpoint(idx) {
        switch (idx) {
            case 0: return Vector3.new(this.position.x, this.position.y, this.position.z);
            case 1: return Vector3.new(this.position.x, this.position.y, this.position.z + this.size.z);
            case 2: return Vector3.new(this.position.x, this.position.y + this.size.y, this.position.z);
            case 3: return Vector3.new(this.position.x, this.position.y + this.size.y, this.position.z + this.size.z);
            case 4: return Vector3.new(this.position.x + this.size.x, this.position.y, this.position.z);
            case 5: return Vector3.new(this.position.x + this.size.x, this.position.y, this.position.z + this.size.z);
            case 6: return Vector3.new(this.position.x + this.size.x, this.position.y + this.size.y, this.position.z);
            case 7: return Vector3.new(this.position.x + this.size.x, this.position.y + this.size.y, this.position.z + this.size.z);
        }
    }

    /**
     * @param {Vector3Like} p_normal
     */
    get_support(p_normal) {
        let half_extents = this.size.clone().scale(0.5);
        let ofs = this.position.clone().add(half_extents);
        let result = Vector3.new(
            (p_normal.x > 0) ? -half_extents.x : half_extents.x,
            (p_normal.y > 0) ? -half_extents.y : half_extents.y,
            (p_normal.z > 0) ? -half_extents.z : half_extents.z
        ).add(ofs);
        Vector3.free(half_extents);
        Vector3.free(ofs);
        return result;
    }

    /**
     * @param {number} p_by
     */
    grow(p_by) {
        return this.clone().grow_by(p_by);
    }

    /**
     * @param {number} p_by
     */
    grow_by(p_by) {
        this.position.subtract(p_by, p_by, p_by);
        this.size.add(p_by * 2, p_by * 2, p_by * 2);
        return this;
    }

    /**
     * @param {AABB} aabb
     */
    merge(aabb) {
        return this.clone().merge_with(aabb);
    }

    /**
     * @param {AABB} aabb
     */
    merge_with(aabb) {
        let beg_1 = Vector3.new(), beg_2 = Vector3.new();
        let end_1 = Vector3.new(), end_2 = Vector3.new();
        let min = Vector3.new(), max = Vector3.new();

        beg_1.copy(this.position);
        beg_2.copy(aabb.position);
        end_1.set(this.size.x, this.size.y, this.size.z).add(beg_1);
        end_2.set(aabb.size.x, aabb.size.y, aabb.size.z).add(beg_2);

        min.x = (beg_1.x < beg_2.x) ? beg_1.x : beg_2.x;
        min.y = (beg_1.y < beg_2.y) ? beg_1.y : beg_2.y;
        min.z = (beg_1.z < beg_2.z) ? beg_1.z : beg_2.z;

        max.x = (end_1.x > end_2.x) ? end_1.x : end_2.x;
        max.y = (end_1.y > end_2.y) ? end_1.y : end_2.y;
        max.z = (end_1.z > end_2.z) ? end_1.z : end_2.z;

        this.position.copy(min);
        this.size.copy(max).subtract(min);

        Vector3.free(beg_1);
        Vector3.free(beg_2);
        Vector3.free(end_1);
        Vector3.free(end_2);
        Vector3.free(min);
        Vector3.free(max);

        return this;
    }

    has_no_area() {
        return this.size.x <= 0 || this.size.y <= 0 || this.size.z <= 0;
    }

    has_no_surface() {
        return this.size.x <= 0 && this.size.y <= 0 && this.size.z <= 0;
    }

    /**
     * @param {Vector3Like} point
     */
    has_point(point) {
        if (point.x < this.position.x) return false;
        if (point.y < this.position.y) return false;
        if (point.z < this.position.z) return false;
        if (point.x > this.position.x + this.size.x) return false;
        if (point.y > this.position.y + this.size.y) return false;
        if (point.z > this.position.z + this.size.z) return false;
        return true;
    }

    get_longest_axis_size() {
        let max_size = this.size.x;
        if (this.size.y > max_size) {
            max_size = this.size.y;
        }
        if (this.size.z > max_size) {
            max_size = this.size.z;
        }
        return max_size;
    }

    /**
     * @param {AABB} p_aabb
     */
    intersection(p_aabb) {
        let src_min = this.position;
        let src_max = this.position.clone().add(this.size);
        let dst_min = p_aabb.position;
        let dst_max = p_aabb.position.add(p_aabb.size);

        let min = Vector3.new(), max = Vector3.new();

        if (src_min.x > dst_max.x || src_max.x < dst_min.x) {
            Vector3.free(src_max);
            Vector3.free(dst_max);
            Vector3.free(min);
            Vector3.free(max);
            return AABB.new();
        } else {
            min.x = (src_min.x > dst_min.x) ? src_min.x : dst_min.x;
            max.x = (src_max.x < dst_max.x) ? src_max.x : dst_max.x;
        }

        if (src_min.y > dst_max.y || src_max.y < dst_min.y) {
            Vector3.free(src_max);
            Vector3.free(dst_max);
            Vector3.free(min);
            Vector3.free(max);
            return AABB.new();
        } else {
            min.y = (src_min.y > dst_min.y) ? src_min.y : dst_min.y;
            max.y = (src_max.y < dst_max.y) ? src_max.y : dst_max.y;
        }

        if (src_min.z > dst_max.z || src_max.z < dst_min.z) {
            Vector3.free(src_max);
            Vector3.free(dst_max);
            Vector3.free(min);
            Vector3.free(max);
            return AABB.new();
        } else {
            min.z = (src_min.z > dst_min.z) ? src_min.z : dst_min.z;
            max.z = (src_max.z < dst_max.z) ? src_max.z : dst_max.z;
        }

        let result = AABB.new();
        result.position.copy(min)
        result.size.copy(max).subtract(min);

        Vector3.free(src_max);
        Vector3.free(dst_max);
        Vector3.free(min);
        Vector3.free(max);

        return result;
    }

    /**
     * @param {AABB} p_aabb
     */
    intersects(p_aabb) {
        if (this.position.x >= (p_aabb.position.x + p_aabb.size.x))
            return false;
        if ((this.position.x + this.size.x) <= p_aabb.position.x)
            return false;
        if (this.position.y >= (p_aabb.position.y + p_aabb.size.y))
            return false;
        if ((this.position.y + this.size.y) <= p_aabb.position.y)
            return false;
        if (this.position.z >= (p_aabb.position.z + p_aabb.size.z))
            return false;
        if ((this.position.z + this.size.z) <= p_aabb.position.z)
            return false;

        return true;
    }

    /**
     * @param {AABB} p_aabb
     */
    intersects_inclusive(p_aabb) {
        if (this.position.x > (p_aabb.position.x + p_aabb.size.x))
            return false;
        if ((this.position.x + this.size.x) < p_aabb.position.x)
            return false;
        if (this.position.y > (p_aabb.position.y + p_aabb.size.y))
            return false;
        if ((this.position.y + this.size.y) < p_aabb.position.y)
            return false;
        if (this.position.z > (p_aabb.position.z + p_aabb.size.z))
            return false;
        if ((this.position.z + this.size.z) < p_aabb.position.z)
            return false;

        return true;
    }

    /**
     * @param {Vector3Like} from
     * @param {Vector3Like} to
     */
    intersects_segment(from, to) {
        let min = 0, max = 1;
        let axis = 0;
        let sign = 0;

        for (let i = 0; i < 3; i++) {
            let seg_from = 0, seg_to = 0;
            let box_begin = 0, box_end = 0;
            let cmin = 0, cmax = 0;
            let csign = 0;

            switch (i) {
                case 0: {
                    seg_from = from.x;
                    seg_to = to.x;
                    box_begin = this.position.x;
                    box_end = box_begin + this.size.x;
                } break;
                case 1: {
                    seg_from = from.y;
                    seg_to = to.y;
                    box_begin = this.position.y;
                    box_end = box_begin + this.size.y;
                } break;
                case 2: {
                    seg_from = from.z;
                    seg_to = to.z;
                    box_begin = this.position.z;
                    box_end = box_begin + this.size.z;
                } break;
            }

            if (seg_from < seg_to) {
                if (seg_from > box_end || seg_to < box_begin) {
                    return false;
                }
                let length = seg_to - seg_from;
                cmin = (seg_from < box_begin) ? ((box_begin - seg_from) / length) : 0;
                cmax = (seg_to > box_end) ? ((box_end - seg_from) / length) : 1;
                csign = -1.0;
            } else {
                if (seg_to > box_end || seg_from < box_begin)
                    return false;
                let length = seg_to - seg_from;
                cmin = (seg_from > box_end) ? (box_end - seg_from) / length : 0;
                cmax = (seg_to < box_begin) ? (box_begin - seg_from) / length : 1;
                csign = 1.0;
            }

            if (cmin > min) {
                min = cmin;
                axis = i;
                sign = csign;
            }
            if (cmax < max)
                max = cmax;
            if (max < min)
                return false;
        }

        return true;
    }

    /**
     * @param {import('./plane').Plane[]} p_planes
     */
    intersects_convex_shape(p_planes) {
        let half_extents = this.size.clone().scale(0.5);
        let ofs = this.position.clone().add(half_extents);

        let point = Vector3.new();

        for (let i = 0; i < p_planes.length; i++) {
            let p = p_planes[i];
            point.set(
                (p.normal.x > 0) ? -half_extents.x : half_extents.x,
                (p.normal.y > 0) ? -half_extents.y : half_extents.y,
                (p.normal.z > 0) ? -half_extents.z : half_extents.z
            ).add(ofs);
            if (p.is_point_over(point)) {
                Vector3.free(ofs);
                Vector3.free(half_extents);
                Vector3.free(point);
                return false;
            }
        }

        Vector3.free(ofs);
        Vector3.free(half_extents);
        Vector3.free(point);
        return true;
    }

    /**
     * @param {AABB} aabb
     */
    is_equal_approx(aabb) {
        return this.position.is_equal_approx(aabb.position)
            &&
            this.size.is_equal_approx(aabb.size);
    }

    /**
     * @param {import('./plane').Plane} p_plane
     * @param {{ min: number, max: number }} result
     */
    project_range_in_plane(p_plane, result) {
        let half_extents = this.size.clone().scale(0.5);
        let center = this.position.clone().add(half_extents);

        let normal_abs = p_plane.normal.clone().abs();
        let length = normal_abs.dot(half_extents);
        let distance = p_plane.distance_to(center);
        result.min = distance - length;
        result.max = distance + length;

        Vector3.free(half_extents);
        Vector3.free(center);
        Vector3.free(normal_abs);
    }
}
