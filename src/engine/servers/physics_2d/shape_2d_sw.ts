import { ShapeType } from "engine/scene/2d/const";
import { CMP_EPSILON } from "engine/core/math/math_defs";
import { Vector2, Vector2Like } from "engine/core/math/vector2";
import { Rect2 } from "engine/core/math/rect2";
import { Transform2D } from "engine/core/math/transform_2d";
import { segment_intersects_segment_2d } from "engine/core/math/geometry";


const _SEGMENT_IS_VALID_SUPPORT_THRESHOLD = 0.99998;

const support_vec2 = [new Vector2, new Vector2];
function get_support_vec2() {
    support_vec2[0].set(0, 0);
    support_vec2[1].set(0, 0);
    return support_vec2;
}


interface ShapeOwner2DSW {
    _shape_changed(): void;
    remove_shape(p_shape: Shape2DSW): void;
}

export class Shape2DSW {
    get type() { return -1 }

    self = this;
    aabb = new Rect2;
    configured = false;
    custom_bias = 0;

    owners: Map<ShapeOwner2DSW, number> = new Map;

    /**
     * Configure this shape with AABB
     *
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    configure(x: number, y: number, width: number, height: number) {
        this.aabb.x = x;
        this.aabb.y = y;
        this.aabb.width = width;
        this.aabb.height = height;

        this.configured = true;

        for (let [co] of this.owners) {
            co._shape_changed();
        }
    }

    /**
     * @param {Vector2} p_point
     * @returns {boolean}
     */
    contains_point(p_point: Vector2): boolean {
        return false;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return null;
    }
    /**
     * @param {Vector2} p_cast
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range_castv(p_cast: Vector2, p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return null;
    }
    get_support(p_normal: Vector2, r_out?: Vector2): Vector2 {
        if (!r_out) r_out = Vector2.new();

        let res = get_support_vec2();
        this.get_supports(p_normal, res, 0);
        return r_out.copy(res[0]);
    }
    get_supports(p_normal: Vector2, p_supports: Vector2[], r_amount: number): number {
        return 0;
    }

    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} p_point
     * @param {Vector2} p_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin: Vector2, p_end: Vector2, p_point: Vector2, p_normal: Vector2): boolean {
        return false;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        return 0;
    }
    set_data(p_data: any) { }

    /**
     * @param {ShapeOwner2DSW} p_owner
     */
    add_owner(p_owner: ShapeOwner2DSW) {
        const co = this.owners.get(p_owner);
        if (co !== undefined) {
            this.owners.set(p_owner, co + 1);
        } else {
            this.owners.set(p_owner, 1);
        }
    }
    /**
     * @param {ShapeOwner2DSW} p_owner
     */
    remove_owner(p_owner: ShapeOwner2DSW) {
        const co = this.owners.get(p_owner);
        if (co - 1 === 0) {
            this.owners.delete(p_owner);
        } else {
            this.owners.set(p_owner, co - 1);
        }
    }
    is_owner(p_owner: ShapeOwner2DSW) {
        return this.owners.has(p_owner);
    }

    get_supports_transformed_cast(p_cast: Vector2, p_normal: Vector2, p_xform: Transform2D, r_supports: Vector2[], r_amount: number): number {
        let inv_normal = p_xform.basis_xform_inv(p_normal, _i_g_s_t_c_Vector2_1).normalize();

        r_amount = this.get_supports(inv_normal, r_supports, r_amount);
        for (let i = 0; i < r_amount; i++) {
            p_xform.xform(r_supports[i], r_supports[i]);
        }

        if (r_amount === 1) {
            let cast_n = _i_g_s_t_c_Vector2_2.copy(p_cast).normalize();
            if (Math.abs(p_normal.dot(cast_n)) < (1 - _SEGMENT_IS_VALID_SUPPORT_THRESHOLD)) {
                r_amount = 2;
                r_supports[1].copy(r_supports[0]).add(p_cast);
            } else if (p_cast.dot(p_normal) > 0) {
                r_supports[0].add(p_cast);
            }
        } else {
            let cast_n = _i_g_s_t_c_Vector2_2.copy(p_cast).normalize();
            if (Math.abs(p_normal.dot(cast_n)) < (1 - _SEGMENT_IS_VALID_SUPPORT_THRESHOLD)) {
                let s_1_minus_0 = _i_g_s_t_c_Vector2_3.copy(r_supports[1]).subtract(r_supports[0]);
                if (s_1_minus_0.dot(p_cast) > 0) {
                    r_supports[1].add(p_cast);
                } else {
                    r_supports[0].add(p_cast);
                }
            } else if (p_cast.dot(p_normal) > 0) {
                r_supports[0].add(p_cast);
                r_supports[1].add(p_cast);
            }
        }

        return r_amount;
    }

    /**
     * @param {Vector2} p_cast
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    __default_project_range_cast(p_cast: Vector2, p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        const ofsb = _i_d_p_r_c_Transform2D_1.copy(p_transform).translate(p_cast.x, p_cast.y);
        res_a.min = res_a.max = 0;
        res_b.min = res_b.max = 0;
        // @ts-ignore
        this.project_range(p_normal, p_transform, res_a);
        // @ts-ignore
        this.project_range(p_normal, ofsb, res_b);
        r_result.min = Math.min(res_a.min, res_b.min);
        r_result.max = Math.max(res_a.max, res_b.max);
        return r_result;
    }
}

export class SegmentShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.SEGMENT;
    }

    a = new Vector2;
    b = new Vector2;
    normal = new Vector2;

    constructor(p_a: Vector2Like = Vector2.ZERO, p_b: Vector2Like = Vector2.ZERO, p_normal: Vector2Like = Vector2.ZERO) {
        super();

        this.a.copy(p_a);
        this.b.copy(p_b);
        this.normal.copy(p_normal);
    }

    get_xformed_normal(p_xform: Transform2D, r_out?: Vector2) {
        if (!r_out) r_out = Vector2.new();

        const aa = p_xform.xform(this.a, _i_g_x_n_Vector2_1);
        const bb = p_xform.xform(this.b, _i_g_x_n_Vector2_2);
        const res = bb.subtract(aa).normalize().tangent(r_out);
        return res;
    }

    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return this.project_range(p_normal, p_transform, r_result);
    }
    get_supports(p_normal: Vector2, r_supports: Vector2[], r_amount: number): number {
        if (Math.abs(p_normal.dot(this.normal)) > _SEGMENT_IS_VALID_SUPPORT_THRESHOLD) {
            r_supports[0].copy(this.a);
            r_supports[1].copy(this.b);
            return 2;
        }

        let sub = _i_g_s_Vector2_1.copy(this.b).subtract(this.a);
        let dp = p_normal.dot(sub);
        if (dp > 0) {
            r_supports[0].copy(this.b);
        } else {
            r_supports[0].copy(this.a);
        }
        return 1;
    }

    /**
     * @param {Vector2} p_point
     * @returns {boolean}
     */
    contains_point(p_point: Vector2): boolean {
        return false;
    }
    intersect_segment(p_begin: Vector2, p_end: Vector2, r_point: Vector2, r_normal: Vector2): boolean {
        if (!segment_intersects_segment_2d(p_begin, p_end, this.a, this.b, [r_point])) {
            return false;
        }

        if (this.normal.dot(p_begin) > this.normal.dot(this.a)) {
            r_normal.copy(this.normal);
        } else {
            r_normal.copy(this.normal).negate();
        }

        return true;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        const s = [
            _i_g_m_o_i_Vector2_1.copy(this.a).multiply(p_scale),
            _i_g_m_o_i_Vector2_2.copy(this.b).multiply(p_scale),
        ];

        const l = s[1].distance_to(s[0]);
        const ofs = s[0].add(s[1]).scale(0.5);

        const len2 = ofs.length_squared();

        return p_mass * (l * l / 12 + len2);
    }

    /**
     * @param {Rect2} p_data
     */
    set_data(p_data: Rect2) {
        this.a.set(p_data.x, p_data.y);
        this.b.set(p_data.width, p_data.height);
        const sub = _i_s_d_Vector2_1.copy(this.b).subtract(this.a);
        const n = sub.tangent(_i_s_d_Vector2_2);
        this.normal.copy(n);

        const aabb = _i_s_d_Rect2_1.set(this.a.x, this.a.y, 0, 0);
        aabb.expand_to(this.b);
        if (aabb.width === 0) {
            aabb.width = 0.001;
        }
        if (aabb.height === 0) {
            aabb.height = 0.001;
        }
        this.configure(aabb.x, aabb.y, aabb.width, aabb.height);
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        // real large
        const aa = p_transform.xform(this.a, _i_p_r_Vector2_1);
        const bb = p_transform.xform(this.b, _i_p_r_Vector2_2);
        r_result.max = p_normal.dot(aa);
        r_result.min = p_normal.dot(bb);
        if (r_result.max < r_result.min) {
            let tmp = r_result.max; r_result.max = r_result.min; r_result.min = tmp;
        }
        return r_result;
    }
}
SegmentShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
// @ts-ignore
SegmentShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class RayShape2DSW extends Shape2DSW {
    get type() { return ShapeType.RAY }

    length: number;
    slips_on_slope = false;

    constructor(p_length: number = 20) {
        super();

        this.length = p_length;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        // real large
        const vec = _i_p_rv_Vector2_1.set(0, this.length);

        const origin = p_transform.get_origin(_i_p_rv_Vector2_2);
        r_result.max = p_normal.dot(origin);
        r_result.min = p_normal.dot(p_transform.xform(vec, vec));
        if (r_result.max < r_result.min) {
            let tmp = r_result.max; r_result.max = r_result.min; r_result.min = tmp;
        }

        return r_result;
    }
    get_supports(p_normal: Vector2, r_supports: Vector2[], r_amount: number): number {
        if (p_normal.y > 0) {
            r_supports[0].set(0, this.length);
        } else {
            r_supports[0].set(0, 0);
        }

        return 1;
    }

    /**
     * @param {Vector2} p_point
     * @returns {boolean}
     */
    contains_point(p_point: Vector2): boolean {
        return false;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin: Vector2, p_end: Vector2, r_point: Vector2, r_normal: Vector2): boolean {
        return false;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        return 0;
    }

    set_data({ length, slips_on_slope }: { length: number; slips_on_slope: boolean; }) {
        this.length = length;
        this.slips_on_slope = slips_on_slope;
        this.configure(0, 0, 0.001, length);
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        // real large
        const vec = _i_rs_p_r_Vector2_1.set(0, this.length);
        const origin = p_transform.get_origin(_i_rs_p_r_Vector2_2);
        r_result.max = p_normal.dot(origin);
        r_result.min = p_normal.dot(p_transform.xform(vec, vec));
        if (r_result.max < r_result.min) {
            let tmp = r_result.max; r_result.max = r_result.min; r_result.min = tmp;
        }
        return r_result;
    }
}
RayShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
// @ts-ignore
RayShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class CircleShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.CIRCLE;
    }

    radius = 0;

    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return this.project_range(p_normal, p_transform, r_result);
    }
    get_supports(p_normal: Vector2, r_supports: Vector2[]): number {
        r_supports[0].copy(p_normal).scale(this.radius);
        return 1;
    }

    /**
     * @param {Vector2} point
     * @returns {boolean}
     */
    contains_point(point: Vector2): boolean {
        return point.length_squared() < this.radius * this.radius;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin: Vector2, p_end: Vector2, r_point: Vector2, r_normal: Vector2): boolean {
        const line_vec = _i_i_s_Vector2_1.copy(p_end).subtract(p_begin);

        const a = line_vec.dot(line_vec);
        const b = 2 * p_begin.dot(line_vec);
        const c = p_begin.dot(p_begin) - this.radius * this.radius;

        let sqrtterm = b * b - 4 * a * c;

        if (sqrtterm < 0) {
            return false;
        }
        sqrtterm = Math.sqrt(sqrtterm);
        const res = (-b - sqrtterm) / (2 * a);

        if (res < 0 || res > 1 + CMP_EPSILON) {
            return false;
        }

        r_point.copy(p_begin).add(line_vec.x * res, line_vec.y * res);
        r_normal.copy(r_point).normalize();

        return true;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        return (this.radius * this.radius) * (p_scale.x * 0.5 + p_scale.y * 0.5);
    }

    set_data(p_data: number) {
        this.radius = p_data;
        this.configure(-p_data, -p_data, p_data * 2, p_data * 2);
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        const origin = p_transform.get_origin(_i_cs_p_r_Vector2_1);

        // real large
        const d = p_normal.dot(origin);

        // figure out scale at point
        const local_normal = p_transform.basis_xform_inv(p_normal, _i_cs_p_r_Vector2_2);
        const scale = local_normal.length();

        r_result.min = d - (this.radius) * scale;
        r_result.max = d + (this.radius) * scale;

        return r_result;
    }
}
CircleShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
// @ts-ignore
CircleShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class RectangleShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.RECTANGLE;
    }

    half_extents = new Vector2;

    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return this.project_range(p_normal, p_transform, r_result);
    }
    get_supports(p_normal: Vector2, r_supports: Vector2[], r_amount: number): number {
        let ag = _i_rs_g_s_Vector2_1.set(0, 0);

        for (let i = 0; i < 2; i++) {
            if (i === 0) {
                ag.set(1, 0);

                const dp = ag.dot(p_normal);
                if (Math.abs(dp) < _SEGMENT_IS_VALID_SUPPORT_THRESHOLD) {
                    continue;
                }

                const sgn = dp > 0 ? 1 : -1;

                r_supports[0].x = this.half_extents.x * sgn;
                r_supports[0].y = this.half_extents.y;

                r_supports[1].x = this.half_extents.x * sgn;
                r_supports[1].y = -this.half_extents.y;

                return 2;
            } else {
                ag.set(0, 1);

                const dp = ag.dot(p_normal);
                if (Math.abs(dp) < _SEGMENT_IS_VALID_SUPPORT_THRESHOLD) {
                    continue;
                }

                const sgn = dp > 0 ? 1 : -1;

                r_supports[0].y = this.half_extents.y * sgn;
                r_supports[0].x = this.half_extents.x;

                r_supports[1].y = this.half_extents.y * sgn;
                r_supports[1].x = -this.half_extents.x;

                return 2;
            }
        }

        r_supports[0].set(
            (p_normal.x < 0) ? -this.half_extents.x : this.half_extents.x,
            (p_normal.y < 0) ? -this.half_extents.y : this.half_extents.y
        );

        return 1;
    }

    /**
     * @param {Vector2} p_point
     * @returns {boolean}
     */
    contains_point(p_point: Vector2): boolean {
        const x = p_point.x;
        const y = p_point.y;
        const edge_x = this.half_extents.x;
        const edge_y = this.half_extents.y;
        return (x >= -edge_x) && (x < edge_x) && (y >= -edge_y) && (y < edge_y);
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin: Vector2, p_end: Vector2, r_point: Vector2, r_normal: Vector2): boolean {
        return this.aabb.intersects_segment(p_begin, p_end, r_point, r_normal);
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        const he2 = _i_rs_g_m_o_i_Vector2_1.copy(this.half_extents).scale(2).multiply(p_scale);
        return p_mass * he2.dot(he2) / 12;
    }

    set_data(p_data: Vector2) {
        this.half_extents.copy(p_data);
        this.configure(-p_data.x, -p_data.y, p_data.x * 2, p_data.y * 2);
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        if (!r_result) {
            r_result = { min: 0, max: 0 };
        }
        r_result.max = -1e20;
        r_result.min = 1e20;

        const local_normal = _i_rects_p_r_Vector2_1;
        for (let i = 0; i < 4; i++) {
            local_normal.set(
                ((i & 1) * 2 - 1) * this.half_extents.x,
                ((i >> 1) * 2 - 1) * this.half_extents.y
            );

            const d = p_normal.dot(p_transform.xform(local_normal, local_normal));

            if (d > r_result.max) {
                r_result.max = d;
            }
            if (d < r_result.min) {
                r_result.min = d;
            }
        }

        return r_result;
    }

    get_circle_axis(p_xform: Transform2D, p_xform_inv: Transform2D, p_circle: Vector2, r_out?: Vector2) {
        if (!r_out) r_out = Vector2.new();
        const local_v = p_xform_inv.xform(p_circle, _i_g_c_a_Vector2_1);
        const he = r_out.set(
            (local_v.x < 0) ? -this.half_extents.x : this.half_extents.x,
            (local_v.y < 0) ? -this.half_extents.y : this.half_extents.y
        );
        return p_xform.xform(he, he).subtract(p_circle).normalize();
    }
    get_box_axis(p_xform: Transform2D, p_xform_inv: Transform2D, p_B: RectangleShape2DSW, p_B_xform: Transform2D, p_B_xform_inv: Transform2D, r_out?: Vector2) {
        if (!r_out) r_out = Vector2.new();

        const a = _i_g_b_a_Vector2_1.set(0, 0);
        const b = _i_g_b_a_Vector2_2.set(0, 0);

        {
            const local_v = _i_g_b_a_Vector2_3.set(0, 0);
            const B_origin = p_B_xform.get_origin(_i_g_b_a_Vector2_4);
            p_xform_inv.xform(B_origin, local_v);

            const he = _i_g_b_a_Vector2_5.set(
                (local_v.x < 0) ? -this.half_extents.x : this.half_extents.x,
                (local_v.y < 0) ? -this.half_extents.y : this.half_extents.y
            )

            p_xform.xform(he, a);
        }
        {
            const local_v = _i_g_b_a_Vector2_6.set(0, 0);
            const origin = p_xform.get_origin(_i_g_b_a_Vector2_7);
            p_B_xform_inv.xform(origin, local_v);

            const he = _i_g_b_a_Vector2_8.set(
                (local_v.x < 0) ? -p_B.half_extents.x : p_B.half_extents.x,
                (local_v.y < 0) ? -p_B.half_extents.y : p_B.half_extents.y
            )

            p_xform.xform(he, b);
        }

        return a.subtract(b).normalize();
    }
}
RectangleShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
// @ts-ignore
RectangleShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class CapsuleShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.CAPSULE;
    }

    radius = 0;
    height = 0;

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return this.project_range(p_normal, p_transform, r_result);
    }
    get_supports(p_normal: Vector2, r_supports: Vector2[], r_amount: number): number {
        let n = _i_cap_g_p_Vector2_1.copy(p_normal);

        let d = n.y;

        if (Math.abs(d) < (1 - _SEGMENT_IS_VALID_SUPPORT_THRESHOLD)) {
            n.y = 0;
            n.normalize();
            n.scale(this.radius);

            r_amount = 2;
            r_supports[0].copy(n);
            r_supports[0].y += this.height * 0.5;
            r_supports[1].copy(n);
            r_supports[1].y -= this.height * 0.5;
        } else {
            let h = (d > 0) ? this.height : -this.height;

            n.scale(this.radius);
            n.y += h * 0.5;
            r_amount = 1;
            r_supports[0].copy(n);
        }

        return r_amount;
    }
    contains_point(p_point: Vector2): boolean {
        let p = _i_cap_c_p_Vector2_1.copy(p_point);
        p.y = Math.abs(p.y);
        p.y -= this.height * 0.5;
        if (p.y < 0) {
            p.y = 0;
        }

        return p.length_squared() < this.radius * this.radius;
    }
    intersect_segment(p_begin: Vector2, p_end: Vector2, r_point: Vector2, r_normal: Vector2): boolean {
        let d = 1e10;
        let n = _i_cap_i_s_Vector2_1.copy(p_end).subtract(p_begin).normalize();
        let collided = false;

        let begin = _i_cap_i_s_Vector2_2.set(0, 0);
        let end = _i_cap_i_s_Vector2_3.set(0, 0);
        let line_vec = _i_cap_i_s_Vector2_4.set(0, 0);
        let point = _i_cap_i_s_Vector2_5.set(0, 0);
        let pointf = _i_cap_i_s_Vector2_6.set(0, 0);
        for (let i = 0; i < 2; i++) {
            begin.copy(p_begin);
            end.copy(p_end);
            let ofs = (i === 0) ? -this.height * 0.5 : this.height * 0.5;
            begin.y += ofs;
            end.y += ofs;

            line_vec.copy(end).subtract(begin);

            let a = line_vec.dot(line_vec);
            let b = 2 * begin.dot(line_vec);
            let c = begin.dot(begin) - this.radius * this.radius;

            let sqrtterm = b * b - 4 * a * c;

            if (sqrtterm < 0) {
                continue;
            }

            sqrtterm = Math.sqrt(sqrtterm);
            let res = (-b - sqrtterm) / (2 * a);

            if (res < 0 || res > 1 + CMP_EPSILON) {
                continue;
            }

            point.copy(begin).subtract(line_vec.scale(res));
            pointf.set(point.x, point.y - ofs);
            let pd = n.dot(pointf);
            if (pd < d) {
                r_point.copy(pointf);
                r_normal.copy(point).normalize();
                d = pd;
                collided = true;
            }
        }

        let rpos = _i_cap_i_s_Vector2_7.set(0, 0);
        let rnorm = _i_cap_i_s_Vector2_8.set(0, 0);
        let rect = _i_cap_i_s_Rect2_1.set(-this.radius, -this.height * 0.5, this.radius * 2, this.height);
        if (rect.intersects_segment(p_begin, p_end, rpos, rnorm)) {
            let pd = n.dot(rpos);
            if (pd < d) {
                r_point.copy(rpos);
                r_normal.copy(rnorm);
                d = pd;
                collided = true;
            }
        }

        return collided;
    }
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        let he2 = _i_cap_g_m_o_i_Vector2_1.set(this.radius * 2, this.height + this.radius * 2).multiply(p_scale);
        return p_mass * he2.dot(he2) / 12.0;
    }
    set_data(p_data: Vector2) {
        this.radius = p_data.x;
        this.height = p_data.y;
        this.configure(-this.radius, -(this.height * 0.5 + this.radius), this.radius * 2, (this.height * 0.5 + this.radius) * 2);
    }

    project_range(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        if (!r_result) {
            r_result = { min: 0, max: 0 };
        }
        r_result.min = Number.MAX_VALUE;
        r_result.max = -Number.MAX_VALUE;

        let n = p_transform.basis_xform_inv(p_normal, _i_cap_p_r_Vector2_1).normalize();
        let h = (n.y > 0) ? this.height : -this.height;

        n.scale(this.radius);
        n.y += h * 0.5;

        let nn = _i_cap_p_r_Vector2_2;
        r_result.max = p_normal.dot(p_transform.xform(n, nn));
        r_result.min = p_normal.dot(p_transform.xform(n.negate(), nn));

        if (r_result.max < r_result.min) {
            let tmp = r_result.max;
            r_result.max = r_result.min;
            r_result.min = tmp;
        }

        return r_result;
    }
}
CapsuleShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
// @ts-ignore
CapsuleShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

class Point {
    pos = new Vector2;
    normal = new Vector2;

    constructor(pos_x = 0, pos_y = 0, normal_x = 0, normal_y = 0) {
        this.pos.set(pos_x, pos_y);
        this.normal.set(normal_x, normal_y);
    }
}

export class ConvexPolygonShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.CONVEX_POLYGON;
    }

    get points() {
        return this._points;
    }
    set points(value: Point[]) {
        // TODO: cache point array maybe? does it even improve performance?
        this._points = value.map(p => new Point(p.pos.x, p.pos.y, p.normal.x, p.normal.y))
    }

    _points: Point[] = [];

    get_point_count() {
        return this._points.length;
    }
    /**
     * @param {number} p_idx
     */
    get_point(p_idx: number) {
        return this._points[p_idx].pos;
    }
    /**
     * @param {number} p_idx
     */
    get_segment_normal(p_idx: number) {
        return this._points[p_idx].normal;
    }
    get_xformed_segment_normal(p_xform: Transform2D, p_idx: number, r_out?: Vector2) {
        if (!r_out) r_out = Vector2.new();

        const a = _i_g_x_s_n_Vector2_1.copy(this._points[p_idx].pos);
        p_idx++;
        const b = _i_g_x_s_n_Vector2_2.copy(this._points[p_idx === this._points.length ? 0 : p_idx].pos);

        return p_xform.xform(b, b).subtract(p_xform.xform(a, a)).normalize().tangent(r_out);
    }

    project_rangev(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        return this.project_range(p_normal, p_transform, r_result);
    }
    get_supports(p_normal: Vector2, r_supports: Vector2[], r_amount: number): number {
        let support_idx = -1;
        let d = -1e10;

        let i = 0, ld = 0, len = this._points.length;
        for (i = 0; i < len; i++) {
            // test point
            ld = p_normal.dot(this._points[i].pos);
            if (ld > d) {
                support_idx = i;
                d = ld;
            }

            // test segment
            if (this._points[i].normal.dot(p_normal) > _SEGMENT_IS_VALID_SUPPORT_THRESHOLD) {
                r_supports[0].copy(this._points[i].pos);
                r_supports[1].copy(this._points[(i + 1) % len].pos);
                return 2;
            }
        }

        r_supports[0].copy(this._points[support_idx].pos);
        return 1;
    }

    /**
     * @param {Vector2} p_point
     * @returns {boolean}
     */
    contains_point(p_point: Vector2): boolean {
        let out_ = false, in_ = false;

        let d = 0;
        for (let i = 0, len = this._points.length; i < len; i++) {
            d = this._points[i].normal.dot(p_point) - this._points[i].normal.dot(this._points[i].pos);
            if (d > 0) {
                out_ = true;
            } else {
                in_ = true;
            }
        }

        return (in_ && !out_) || (!in_ && out_);
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin: Vector2, p_end: Vector2, r_point: Vector2, r_normal: Vector2): boolean {
        const n = _i_con_i_s_Vector2_1.copy(p_end).subtract(p_begin).normalize();
        let d = 1e10, nd = 0;
        let inters = false;

        const res = _i_con_i_s_res;
        res[0].set(0, 0);

        for (let i = 0, len = this._points.length; i < len; i++) {
            if (!segment_intersects_segment_2d(p_begin, p_end, this._points[i].pos, this._points[(i + 1) % len].pos, res)) {
                continue;
            }

            nd = n.dot(res[0]);
            if (nd < d) {
                d = nd;
                r_point.copy(res[0]);
                r_normal.copy(this._points[i].normal);
                inters = true;
            }
        }

        if (inters) {
            if (n.dot(r_normal) > 0) {
                r_normal.negate();
            }
        }

        return inters;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass: number, p_scale: Vector2): number {
        const aabb = _i_con_g_m_o_i_Rect2_1.set(0, 0, 0, 0);
        const pos = _i_con_g_m_o_i_Vector2_1.set(0, 0);
        const size = _i_con_g_m_o_i_Vector2_2.set(0, 0);

        aabb.x = this._points[0].pos.x * p_scale.x;
        aabb.y = this._points[0].pos.y * p_scale.y;
        for (let i = 0, len = this._points.length; i < len; i++) {
            aabb.expand_to(pos.copy(this._points[i].pos).multiply(p_scale));
        }

        return p_mass * size.set(aabb.width, aabb.height).dot(size) / 12.0 + p_mass * pos.set(aabb.x + aabb.width * 0.5, aabb.y + aabb.height * 0.5).length_squared();
    }

    set_data(p_data: Vector2[]) {
        const point_count = p_data.length;
        for (let i = 0; i < point_count; i++) {
            this._points[i] = new Point(p_data[i].x, p_data[i].y);
        }
        const n = _i_con_s_d_Vector2_1.set(0, 0), t = _i_con_s_d_Vector2_2.set(0, 0);
        for (let i = 0; i < point_count; i++) {
            n.copy(this._points[(i + 1) % point_count].pos).subtract(this._points[i].pos);
            this._points[i].normal.copy(n.tangent(t).normalize());
        }

        let aabb = _i_con_s_d_Rect2_1.set(0, 0, 0, 0);
        aabb.x = this._points[0].pos.x;
        aabb.y = this._points[0].pos.y;
        for (let i = 1; i < point_count; i++) {
            aabb.expand_to(this._points[i].pos);
        }

        this.configure(aabb.x, aabb.y, aabb.width, aabb.height);
    }

    /**
     * @param {Vector2} p_normal
     * @param {Transform2D} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal: Vector2, p_transform: Transform2D, r_result: { min: number; max: number; }): { min: number; max: number; } {
        // no matter the angle, the box is mirrored anyway

        const pos = _i_con_p_r_Vector2_1;
        r_result.min = r_result.max = p_normal.dot(p_transform.xform(this._points[0].pos, pos));

        let i = 0, d = 0, len = this._points.length;
        for (i = 1; i < len; i++) {
            d = p_normal.dot(p_transform.xform(this._points[i].pos, pos));
            if (d > r_result.max) {
                r_result.max = d;
            }
            if (d < r_result.min) {
                r_result.min = d;
            }
        }

        return r_result;
    }
}
ConvexPolygonShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
// @ts-ignore
ConvexPolygonShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

const _i_g_x_n_Vector2_1 = new Vector2;
const _i_g_x_n_Vector2_2 = new Vector2;

const _i_g_c_a_Vector2_1 = new Vector2;

const _i_g_b_a_Vector2_1 = new Vector2;
const _i_g_b_a_Vector2_2 = new Vector2;
const _i_g_b_a_Vector2_3 = new Vector2;
const _i_g_b_a_Vector2_4 = new Vector2;
const _i_g_b_a_Vector2_5 = new Vector2;
const _i_g_b_a_Vector2_6 = new Vector2;
const _i_g_b_a_Vector2_7 = new Vector2;
const _i_g_b_a_Vector2_8 = new Vector2;

const _i_g_x_s_n_Vector2_1 = new Vector2;
const _i_g_x_s_n_Vector2_2 = new Vector2;

const _i_g_s_t_c_Vector2_1 = new Vector2;
const _i_g_s_t_c_Vector2_2 = new Vector2;
const _i_g_s_t_c_Vector2_3 = new Vector2;

const _i_d_p_r_c_Transform2D_1 = new Transform2D;

const res_a = { min: 0, max: 0 };
const res_b = { min: 0, max: 0 };

const _i_g_s_Vector2_1 = new Vector2;

const _i_g_m_o_i_Vector2_1 = new Vector2;
const _i_g_m_o_i_Vector2_2 = new Vector2;

const _i_s_d_Vector2_1 = new Vector2;
const _i_s_d_Vector2_2 = new Vector2;
const _i_s_d_Rect2_1 = new Rect2;

const _i_p_r_Vector2_1 = new Vector2;
const _i_p_r_Vector2_2 = new Vector2;

const _i_p_rv_Vector2_1 = new Vector2;
const _i_p_rv_Vector2_2 = new Vector2;

const _i_rs_p_r_Vector2_1 = new Vector2;
const _i_rs_p_r_Vector2_2 = new Vector2;

const _i_i_s_Vector2_1 = new Vector2;

const _i_cs_p_r_Vector2_1 = new Vector2;
const _i_cs_p_r_Vector2_2 = new Vector2;

const _i_rs_g_s_Vector2_1 = new Vector2;

const _i_rs_g_m_o_i_Vector2_1 = new Vector2;

const _i_rects_p_r_Vector2_1 = new Vector2;

const _i_cap_g_p_Vector2_1 = new Vector2;

const _i_cap_c_p_Vector2_1 = new Vector2;

const _i_cap_i_s_Vector2_1 = new Vector2;
const _i_cap_i_s_Vector2_2 = new Vector2;
const _i_cap_i_s_Vector2_3 = new Vector2;
const _i_cap_i_s_Vector2_4 = new Vector2;
const _i_cap_i_s_Vector2_5 = new Vector2;
const _i_cap_i_s_Vector2_6 = new Vector2;
const _i_cap_i_s_Vector2_7 = new Vector2;
const _i_cap_i_s_Vector2_8 = new Vector2;
const _i_cap_i_s_Rect2_1 = new Rect2;

const _i_cap_g_m_o_i_Vector2_1 = new Vector2;

const _i_cap_p_r_Vector2_1 = new Vector2;
const _i_cap_p_r_Vector2_2 = new Vector2;

const _i_con_i_s_Vector2_1 = new Vector2;
const _i_con_i_s_res = [new Vector2];

const _i_con_g_m_o_i_Vector2_1 = new Vector2;
const _i_con_g_m_o_i_Vector2_2 = new Vector2;
const _i_con_g_m_o_i_Rect2_1 = new Rect2;

const _i_con_s_d_Vector2_1 = new Vector2;
const _i_con_s_d_Vector2_2 = new Vector2;
const _i_con_s_d_Rect2_1 = new Rect2;

const _i_con_p_r_Vector2_1 = new Vector2;
