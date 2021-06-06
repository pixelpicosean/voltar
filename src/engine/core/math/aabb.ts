import { Vector3, Vector3Like } from "./vector3";

type Plane = import('./plane').Plane;

export class AABB {
    position = new Vector3;
    size = new Vector3;

    set(x: number, y: number, z: number, width: number, height: number, depth: number) {
        this.position.set(x, y, z);
        this.size.set(width, height, depth);
        return this;
    }

    copy(aabb: AABB) {
        this.position.copy(aabb.position);
        this.size.copy(aabb.size);
        return this;
    }

    clone() {
        return AABB.new().copy(this);
    }

    encloses(aabb: AABB) {
        let src_min = this.position;
        let src_max = _i_enclose_vec3_1.copy(this.position).add(this.size);
        let dst_min = aabb.position;
        let dst_max = _i_enclose_vec3_2.copy(aabb.position).add(aabb.size);

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

        return result;
    }

    expand(p_vec: Vector3Like) {
        return this.clone().expand_to(p_vec);
    }

    expand_to(p_vec: Vector3Like) {
        let begin = this.position;
        let end = _i_expand_to_vec3.copy(this.position).add(this.size);

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

        return this;
    }

    get_area() {
        return this.size.x * this.size.y * this.size.z;
    }

    get_endpoint(idx: number, r_out?: Vector3): Vector3 {
        if (!r_out) r_out = Vector3.new();
        switch (idx) {
            case 0: return r_out.set(this.position.x, this.position.y, this.position.z);
            case 1: return r_out.set(this.position.x, this.position.y, this.position.z + this.size.z);
            case 2: return r_out.set(this.position.x, this.position.y + this.size.y, this.position.z);
            case 3: return r_out.set(this.position.x, this.position.y + this.size.y, this.position.z + this.size.z);
            case 4: return r_out.set(this.position.x + this.size.x, this.position.y, this.position.z);
            case 5: return r_out.set(this.position.x + this.size.x, this.position.y, this.position.z + this.size.z);
            case 6: return r_out.set(this.position.x + this.size.x, this.position.y + this.size.y, this.position.z);
            case 7: return r_out.set(this.position.x + this.size.x, this.position.y + this.size.y, this.position.z + this.size.z);
        }
    }

    get_support(p_normal: Vector3Like, r_out?: Vector3): Vector3 {
        const half_extents = _i_get_support_vec3_1.copy(this.size).scale(0.5);
        const ofs = _i_get_support_vec3_2.copy(this.position).add(half_extents);
        return (r_out || Vector3.new()).set(
            (p_normal.x > 0) ? -half_extents.x : half_extents.x,
            (p_normal.y > 0) ? -half_extents.y : half_extents.y,
            (p_normal.z > 0) ? -half_extents.z : half_extents.z
        ).add(ofs);
    }

    /**
     * Returns new "AABB"
     */
    grow(p_by: number) {
        return this.clone().grow_by(p_by);
    }

    grow_by(p_by: number) {
        this.position.subtract(p_by, p_by, p_by);
        this.size.add(p_by * 2, p_by * 2, p_by * 2);
        return this;
    }

    /**
     * Returns new "AABB"
     */
    merged(aabb: AABB) {
        return this.clone().merge_with(aabb);
    }

    merge_with(aabb: AABB) {
        let beg_1 = _i_merge_with_vec3_1.set(0, 0, 0), beg_2 = _i_merge_with_vec3_2.set(0, 0, 0);
        let end_1 = _i_merge_with_vec3_3.set(0, 0, 0), end_2 = _i_merge_with_vec3_4.set(0, 0, 0);
        let min = _i_merge_with_vec3_5.set(0, 0, 0), max = _i_merge_with_vec3_6.set(0, 0, 0);

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
    has_point(point: Vector3Like) {
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

    intersection(p_aabb: AABB, r_out?: AABB) {
        let result = r_out || AABB.new();

        let src_min = this.position;
        let src_max = _i_intersection_vec3_1.copy(this.position).add(this.size);
        let dst_min = p_aabb.position;
        let dst_max = _i_intersection_vec3_2.copy(p_aabb.position).add(p_aabb.size);

        let min = _i_intersection_vec3_3.set(0, 0, 0), max = _i_intersection_vec3_4.set(0, 0, 0);

        if (src_min.x > dst_max.x || src_max.x < dst_min.x) {
            return result.set(0, 0, 0, 0, 0, 0);
        } else {
            min.x = (src_min.x > dst_min.x) ? src_min.x : dst_min.x;
            max.x = (src_max.x < dst_max.x) ? src_max.x : dst_max.x;
        }

        if (src_min.y > dst_max.y || src_max.y < dst_min.y) {
            return result.set(0, 0, 0, 0, 0, 0);
        } else {
            min.y = (src_min.y > dst_min.y) ? src_min.y : dst_min.y;
            max.y = (src_max.y < dst_max.y) ? src_max.y : dst_max.y;
        }

        if (src_min.z > dst_max.z || src_max.z < dst_min.z) {
            return result.set(0, 0, 0, 0, 0, 0);
        } else {
            min.z = (src_min.z > dst_min.z) ? src_min.z : dst_min.z;
            max.z = (src_max.z < dst_max.z) ? src_max.z : dst_max.z;
        }

        result.position.copy(min)
        result.size.copy(max).subtract(min);

        return result;
    }

    intersects(p_aabb: AABB) {
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

    intersects_inclusive(p_aabb: AABB) {
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

    intersects_segment(from: Vector3Like, to: Vector3Like) {
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

    intersects_convex_shape(p_planes: Plane[], p_points: Vector3[]) {
        let half_extents = _i_intersects_convex_shape_vec3_1.copy(this.size).scale(0.5);
        let ofs = _i_intersects_convex_shape_vec3_2.copy(this.position).add(half_extents);

        let point = _i_intersects_convex_shape_vec3_3.set(0, 0, 0);

        for (let i = 0; i < p_planes.length; i++) {
            let p = p_planes[i];
            point.set(
                (p.normal.x > 0) ? -half_extents.x : half_extents.x,
                (p.normal.y > 0) ? -half_extents.y : half_extents.y,
                (p.normal.z > 0) ? -half_extents.z : half_extents.z
            ).add(ofs);
            if (p.is_point_over(point)) {
                return false;
            }
        }

        // reset bad_point_counts_xxx
        bad_point_counts_negative[0] = bad_point_counts_positive[0] = 0;
        bad_point_counts_negative[1] = bad_point_counts_positive[1] = 0;
        bad_point_counts_negative[2] = bad_point_counts_positive[2] = 0;

        // - x
        for (let i = 0; i < p_points.length; i++) {
            if (p_points[i].x > ofs.x + half_extents.x) {
                bad_point_counts_positive[0]++;
            }
            if (p_points[i].x < ofs.x - half_extents.x) {
                bad_point_counts_negative[0]++;
            }

            if (bad_point_counts_negative[0] === p_points.length) {
                return false;
            }
            if (bad_point_counts_positive[0] === p_points.length) {
                return false;
            }
        }
        // - y
        for (let i = 0; i < p_points.length; i++) {
            if (p_points[i].y > ofs.y + half_extents.y) {
                bad_point_counts_positive[1]++;
            }
            if (p_points[i].y < ofs.y - half_extents.y) {
                bad_point_counts_negative[1]++;
            }

            if (bad_point_counts_negative[1] === p_points.length) {
                return false;
            }
            if (bad_point_counts_positive[1] === p_points.length) {
                return false;
            }
        }
        // - z
        for (let i = 0; i < p_points.length; i++) {
            if (p_points[i].z > ofs.z + half_extents.z) {
                bad_point_counts_positive[2]++;
            }
            if (p_points[i].z < ofs.z - half_extents.z) {
                bad_point_counts_negative[2]++;
            }

            if (bad_point_counts_negative[2] === p_points.length) {
                return false;
            }
            if (bad_point_counts_positive[2] === p_points.length) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param {AABB} aabb
     */
    is_equal_approx(aabb: AABB) {
        return this.position.is_equal_approx(aabb.position)
            &&
            this.size.is_equal_approx(aabb.size);
    }

    project_range_in_plane(p_plane: Plane, result: { min: number; max: number; }) {
        let half_extents = _i_project_range_in_plane_vec3_1.copy(this.size).scale(0.5);
        let center = _i_project_range_in_plane_vec3_2.copy(this.position).add(half_extents);

        let normal_abs = _i_project_range_in_plane_vec3_3.copy(p_plane.normal).abs();
        let length = normal_abs.dot(half_extents);
        let distance = p_plane.distance_to(center);
        result.min = distance - length;
        result.max = distance + length;
    }

    static EMPTY = Object.freeze(new AABB);

    static new(x: number = 0, y: number = 0, z: number = 0, w: number = 0, h: number = 0, d: number = 0) {
        let obj = pool.pop();
        if (!obj) obj = new AABB;
        obj.set(x, y, z, w, h, d);
        return obj;
    }

    static free(aabb: AABB) {
        if (aabb && pool.length < 2020) {
            pool.push(aabb);
        }
        return AABB;
    }
}
const pool: AABB[] = [];

const bad_point_counts_positive = [0, 0, 0];
const bad_point_counts_negative = [0, 0, 0];

// tmp var used internally
const _i_enclose_vec3_1 = new Vector3;
const _i_enclose_vec3_2 = new Vector3;

const _i_expand_to_vec3 = new Vector3;

const _i_get_support_vec3_1 = new Vector3;
const _i_get_support_vec3_2 = new Vector3;

const _i_merge_with_vec3_1 = new Vector3;
const _i_merge_with_vec3_2 = new Vector3;
const _i_merge_with_vec3_3 = new Vector3;
const _i_merge_with_vec3_4 = new Vector3;
const _i_merge_with_vec3_5 = new Vector3;
const _i_merge_with_vec3_6 = new Vector3;

const _i_intersection_vec3_1 = new Vector3;
const _i_intersection_vec3_2 = new Vector3;
const _i_intersection_vec3_3 = new Vector3;
const _i_intersection_vec3_4 = new Vector3;

const _i_intersects_convex_shape_vec3_1 = new Vector3;
const _i_intersects_convex_shape_vec3_2 = new Vector3;
const _i_intersects_convex_shape_vec3_3 = new Vector3;

const _i_project_range_in_plane_vec3_1 = new Vector3;
const _i_project_range_in_plane_vec3_2 = new Vector3;
const _i_project_range_in_plane_vec3_3 = new Vector3;
