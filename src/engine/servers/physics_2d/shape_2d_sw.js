import { Rectangle, Vector2, Matrix, CMP_EPSILON } from "engine/core/math/index";
import { ShapeType, CollisionObjectType } from "engine/scene/physics/const";
import { segment_intersects_segment_2d } from "engine/core/math/geometry";

const _SEGMENT_IS_VALID_SUPPORT_THRESHOLD = 0.99998;

const tmp_vec = new Vector2();

/**
 * @typedef ShapeOwner2DSW
 * @prop {() => void} _shape_changed
 * @prop {(p_shape: Shape2DSW) => void} remove_shape
 */

export class Shape2DSW {
    /**
     * @type {ShapeType}
     */
    get type() {
        return -1;
    }

    constructor() {
        this.self = this;
        this.aabb = new Rectangle();
        this.configured = false;
        this.custom_bias = 0;

        /**
         * @type {Map<ShapeOwner2DSW, number>}
         */
        this.owners = new Map();
    }

    /**
     * Configure this shape with AABB
     *
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    configure(x, y, width, height) {
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
    contains_point(p_point) {
        return false;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal, p_transform, r_result) {
        return null;
    }
    /**
     * @param {Vector2} p_cast
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range_castv(p_cast, p_normal, p_transform, r_result) {
        return null;
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2} [out]
     * @returns {Vector2}
     */
    get_support(p_normal, out = Vector2.new()) {
        const res = [out, tmp_vec.set(0, 0)];
        this.get_supports(p_normal, res);
        return out;
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} p_supports
     * @returns {number}
     */
    get_supports(p_normal, p_supports) {
        return 0;
    }

    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} p_point
     * @param {Vector2} p_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin, p_end, p_point, p_normal) {
        return false;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass, p_scale) {
        return 0;
    }
    set_data(p_data) { }
    get_data() { }

    /**
     * @param {ShapeOwner2DSW} p_owner
     */
    add_owner(p_owner) {
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
    remove_owner(p_owner) {
        const co = this.owners.get(p_owner);
        if (co - 1 === 0) {
            this.owners.delete(p_owner);
        } else {
            this.owners.set(p_owner, co - 1);
        }
    }
    /**
     * @param {ShapeOwner2DSW} p_owner
     */
    is_owner(p_owner) {
        return this.owners.has(p_owner);
    }

    /**
     * @param {Vector2} p_cast
     * @param {Vector2} p_normal
     * @param {Matrix} p_xform
     * @param {Vector2[]} r_supports
     * @returns {number}
     */
    get_supports_transformed_cast(p_cast, p_normal, p_xform, r_supports) {
        let r_amount = this.get_supports(p_xform.xform_inv(p_normal).normalize(), r_supports);
        for (let i = 0; i < r_amount; i++) {
            p_xform.xform(r_supports[i], r_supports[i]);
        }

        if (r_amount === 1) {
            if (Math.abs(p_normal.dot(p_cast.normalized())) < (1 - _SEGMENT_IS_VALID_SUPPORT_THRESHOLD)) {
                r_amount = 2;
                r_supports[1].copy(r_supports[0]).add(p_cast);
            } else if (p_cast.dot(p_normal) > 0) {
                r_supports[0].add(p_cast);
            }
        } else {
            if (Math.abs(p_normal.dot(p_cast.normalized())) < (1 - _SEGMENT_IS_VALID_SUPPORT_THRESHOLD)) {
                if (r_supports[1].clone().subtract(r_supports[0]).dot(p_cast) > 0) {
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
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    __default_project_range_cast(p_cast, p_normal, p_transform, r_result) {
        const res_a = { min: 0, max: 0 };
        const res_b = { min: 0, max: 0 };
        const ofsb = p_transform.clone().translate(p_cast.x, p_cast.y);
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

    /**
     * @param {import("engine/core/math/Vector2").Vector2Like} [p_a]
     * @param {import("engine/core/math/Vector2").Vector2Like} [p_b]
     * @param {import("engine/core/math/Vector2").Vector2Like} [p_normal]
     */
    constructor(p_a = Vector2.ZERO, p_b = Vector2.ZERO, p_normal = Vector2.ZERO) {
        super();

        this.a = new Vector2(p_a.x, p_a.y);
        this.b = new Vector2(p_b.x, p_b.y);
        this.normal = new Vector2(p_normal.x, p_normal.y);
    }

    /**
     * @param {Matrix} p_xform
     */
    get_xformed_normal(p_xform) {
        const aa = p_xform.xform(this.a);
        const bb = p_xform.xform(this.b);
        const res = bb.subtract(aa).normalize().tangent();
        Vector2.free(aa);
        Vector2.free(bb);
        return res;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal, p_transform, r_result) {
        return this.project_range(p_normal, p_transform, r_result);
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} r_supports
     * @returns {number}
     */
    get_supports(p_normal, r_supports) {
        if (Math.abs(p_normal.dot(this.normal)) > _SEGMENT_IS_VALID_SUPPORT_THRESHOLD) {
            r_supports[0].copy(this.a);
            r_supports[1].copy(this.b);
            return 2;
        }

        const sub = this.b.clone().subtract(this.a);
        const dp = p_normal.dot(sub);
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
    contains_point(p_point) {
        return false;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin, p_end, r_point, r_normal) {
        if (!segment_intersects_segment_2d(p_begin, p_end, this.a, this.b, r_point[0])) {
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
    get_moment_of_inertia(p_mass, p_scale) {
        const s = [this.a.clone().multiply(p_scale), this.b.clone().multiply(p_scale)];

        const l = s[1].distance_to(s[0]);
        const ofs = s[0].add(s[1]).scale(0.5);

        const len2 = ofs.length_squared();

        Vector2.free(s[0]);
        Vector2.free(s[1]);
        return p_mass * (l * l / 12 + len2);
    }

    /**
     * @param {Rectangle} p_data
     */
    set_data(p_data) {
        this.a.set(p_data.x, p_data.y);
        this.b.set(p_data.width, p_data.height);
        const sub = this.b.clone().subtract(this.a);
        const n = sub.tangent();
        this.normal.copy(n);

        const aabb = Rectangle.new(this.a.x, this.a.y);
        aabb.expand_to(this.b);
        if (aabb.width === 0) {
            aabb.width = 0.001;
        }
        if (aabb.height === 0) {
            aabb.height = 0.001;
        }
        this.configure(aabb.x, aabb.y, aabb.width, aabb.height);

        Vector2.free(sub);
        Vector2.free(n);
        Rectangle.free(aabb);
    }
    get_data() {
        return Rectangle.new(this.a.x, this.a.y, this.b.x, this.b.y);
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal, p_transform, r_result) {
        // real large
        const aa = p_transform.xform(this.a);
        const bb = p_transform.xform(this.b);
        r_result.max = p_normal.dot(aa);
        r_result.min = p_normal.dot(bb);
        if (r_result.max < r_result.min) {
            let tmp = r_result.max; r_result.max = r_result.min; r_result.min = tmp;
        }

        Vector2.free(aa);
        Vector2.free(bb);
        return r_result;
    }
}
SegmentShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
SegmentShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class RayShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.RAY;
    }

    /**
     * @param {number} [p_length]
     */
    constructor(p_length = 20) {
        super();

        this.length = p_length;
        this.slips_on_slope = false;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal, p_transform, r_result) {
        // real large
        const vec = Vector2.new(0, this.length);

        r_result.max = p_normal.dot(p_transform.origin);
        r_result.min = p_normal.dot(p_transform.xform(vec, vec));
        if (r_result.max < r_result.min) {
            let tmp = r_result.max; r_result.max = r_result.min; r_result.min = tmp;
        }

        return r_result;
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} r_supports
     * @returns {number}
     */
    get_supports(p_normal, r_supports) {
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
    contains_point(p_point) {
        return false;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin, p_end, r_point, r_normal) {
        return false;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass, p_scale) {
        return 0;
    }

    /**
     * @param {{ length: number, slips_on_slope: boolean }} p_data
     */
    set_data({ length, slips_on_slope }) {
        this.length = length;
        this.slips_on_slope = slips_on_slope;
        this.configure(0, 0, 0.001, length);
    }
    get_data() {
        return {
            length: this.length,
            slips_on_slope: this.slips_on_slope,
        };
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal, p_transform, r_result) {
        // real large
        const vec = Vector2.new(0, this.length);
        r_result.max = p_normal.dot(p_transform.origin);
        r_result.min = p_normal.dot(p_transform.xform(vec, vec));
        if (r_result.max < r_result.min) {
            let tmp = r_result.max; r_result.max = r_result.min; r_result.min = tmp;
        }

        Vector2.free(vec);
        return r_result;
    }
}
RayShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
RayShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class CircleShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.CIRCLE;
    }

    constructor() {
        super();

        this.radius = 0;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal, p_transform, r_result) {
        return this.project_range(p_normal, p_transform, r_result);
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} r_supports
     * @returns {number}
     */
    get_supports(p_normal, r_supports) {
        r_supports[0].copy(p_normal).scale(this.radius);
        return 1;
    }

    /**
     * @param {Vector2} point
     * @returns {boolean}
     */
    contains_point(point) {
        return point.length_squared() < this.radius * this.radius;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {boolean}
     */
    intersect_segment(p_begin, p_end, r_point, r_normal) {
        const line_vec = p_end.clone().subtract(p_begin);

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

        Vector2.free(line_vec);
        return true;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass, p_scale) {
        return (this.radius * this.radius) * (p_scale.x * 0.5 + p_scale.y * 0.5);
    }

    /**
     * @param {number} p_data
     */
    set_data(p_data) {
        this.radius = p_data;
        this.configure(-p_data, -p_data, p_data * 2, p_data * 2);
    }
    get_data() {
        return this.radius;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal, p_transform, r_result) {
        // real large
        const d = p_normal.dot(p_transform.origin);

        // figure out scale at point
        const local_normal = p_transform.basis_xform_inv(p_normal);
        const scale = local_normal.length();

        r_result.min = d - (this.radius) * scale;
        r_result.max = d + (this.radius) * scale;

        return r_result;
    }
}
CircleShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
CircleShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

export class RectangleShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.RECTANGLE;
    }

    constructor() {
        super();

        this.half_extents = new Vector2();
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal, p_transform, r_result) {
        return this.project_range(p_normal, p_transform, r_result);
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} r_supports
     * @returns {number}
     */
    get_supports(p_normal, r_supports) {
        const ag = Vector2.new();

        for (let i = 0; i < 2; i++) {
            if (i === 0) {
                ag.x = 1;
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
                ag.y = 1;
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
    contains_point(p_point) {
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
    intersect_segment(p_begin, p_end, r_point, r_normal) {
        return this.aabb.intersects_segment(p_begin, p_end, r_point, r_normal);
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass, p_scale) {
        const he2 = this.half_extents.clone().scale(2).multiply(p_scale);
        const res = p_mass * he2.dot(he2) / 12;
        Vector2.free(he2);
        return res;
    }

    /**
     * @param {Vector2} p_data
     */
    set_data(p_data) {
        this.half_extents.copy(p_data);
        this.configure(-p_data.x, -p_data.y, p_data.x * 2, p_data.y * 2);
    }
    get_data() {
        return this.half_extents;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal, p_transform, r_result) {
        if (r_result === undefined) {
            r_result = { min: 0, max: 0 };
        }
        r_result.min = Number.MAX_VALUE;
        r_result.max = -Number.MAX_VALUE;

        const local_normal = Vector2.new();
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
        Vector2.free(local_normal);

        return r_result;
    }

    /**
     * @param {Matrix} p_xform
     * @param {Matrix} p_xform_inv
     * @param {Vector2} p_circle
     */
    get_circle_axis(p_xform, p_xform_inv, p_circle) {
        const local_v = p_xform_inv.xform(p_circle);
        const he = Vector2.new(
            (local_v.x < 0) ? -this.half_extents.x : this.half_extents.x,
            (local_v.y < 0) ? -this.half_extents.y : this.half_extents.y
        );
        Vector2.free(local_v);
        return p_xform.xform(he, he).subtract(p_circle).normalize();
    }
    /**
     * @param {Matrix} p_xform
     * @param {Matrix} p_xform_inv
     * @param {RectangleShape2DSW} p_B
     * @param {Matrix} p_B_xform
     * @param {Matrix} p_B_xform_inv
     */
    get_box_axis(p_xform, p_xform_inv, p_B, p_B_xform, p_B_xform_inv) {
        const a = Vector2.new();
        const b = Vector2.new();

        {
            const local_v = Vector2.new();
            p_xform_inv.xform(p_B_xform.origin, local_v);

            const he = Vector2.new(
                (local_v.x < 0) ? -this.half_extents.x : this.half_extents.x,
                (local_v.y < 0) ? -this.half_extents.y : this.half_extents.y
            )

            p_xform.xform(he, a);

            Vector2.free(local_v);
            Vector2.free(he);
        }
        {
            const local_v = Vector2.new();
            p_B_xform_inv.xform(p_xform.origin, local_v);

            const he = Vector2.new(
                (local_v.x < 0) ? -p_B.half_extents.x : p_B.half_extents.x,
                (local_v.y < 0) ? -p_B.half_extents.y : p_B.half_extents.y
            )

            p_xform.xform(he, b);

            Vector2.free(local_v);
            Vector2.free(he);
        }

        a.subtract(b).normalize();

        Vector2.free(b);
        return a;
    }
}
RectangleShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
RectangleShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;

class Point {
    constructor(pos_x = 0, pos_y = 0, normal_x = 0, normal_y = 0) {
        this.pos = new Vector2(pos_x, pos_y);
        this.normal = new Vector2(normal_x, normal_y);
    }
}

export class ConvexPolygonShape2DSW extends Shape2DSW {
    get type() {
        return ShapeType.CONVEX_POLYGON;
    }

    get points() {
        return this._points;
    }
    /** @param {Point[]} value */
    set points(value) {
        // TODO: cache point array maybe? does it even improve performance?
        this._points = value.map(p => new Point(p.pos.x, p.pos.y, p.normal.x, p.normal.y))
    }

    constructor() {
        super();

        /**
         * @type {Point[]}
         */
        this._points = [];
    }

    get_point_count() {
        return this._points.length;
    }
    /**
     * @param {number} p_idx
     */
    get_point(p_idx) {
        return this._points[p_idx].pos;
    }
    /**
     * @param {number} p_idx
     */
    get_segment_normal(p_idx) {
        return this._points[p_idx].normal;
    }
    /**
     * @param {Matrix} p_xform
     * @param {number} p_idx
     */
    get_xformed_segment_normal(p_xform, p_idx) {
        const a = this._points[p_idx].pos.clone();
        p_idx++;
        const b = this._points[p_idx === this._points.length ? 0 : p_idx].pos.clone();

        const normal = p_xform.xform(b, b).subtract(p_xform.xform(a, a)).normalize().tangent();

        Vector2.free(a);
        Vector2.free(b);

        return normal;
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_rangev(p_normal, p_transform, r_result) {
        return this.project_range(p_normal, p_transform, r_result);
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} r_supports
     * @returns {number}
     */
    get_supports(p_normal, r_supports) {
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
    contains_point(p_point) {
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
    intersect_segment(p_begin, p_end, r_point, r_normal) {
        const n = p_end.clone().subtract(p_begin).normalize();
        let d = 1e10, nd = 0;
        let inters = false;

        const res = [Vector2.new()];
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

        Vector2.free(res[0]);
        return inters;
    }
    /**
     * @param {number} p_mass
     * @param {Vector2} p_scale
     * @returns {number}
     */
    get_moment_of_inertia(p_mass, p_scale) {
        const aabb = Rectangle.new();
        const pos = Vector2.new();
        const size = Vector2.new();

        aabb.x = this._points[0].pos.x * p_scale.x;
        aabb.y = this._points[0].pos.y * p_scale.y;
        for (let i = 0, len = this._points.length; i < len; i++) {
            aabb.expand_to(pos.copy(this._points[i].pos).multiply(p_scale));
        }

        const res = p_mass * size.set(aabb.width, aabb.height).dot(size) / 12.0 + p_mass * pos.set(aabb.x + aabb.width * 0.5, aabb.y + aabb.height * 0.5).length_squared();

        Vector2.free(size);
        Vector2.free(pos);
        Rectangle.free(aabb);
        return res;
    }

    /**
     * @param {Vector2[]} p_data
     */
    set_data(p_data) {
        const point_count = p_data.length;
        for (let i = 0; i < point_count; i++) {
            this._points[i] = new Point(p_data[i].x, p_data[i].y);
        }
        const n = Vector2.new(), t = Vector2.new();
        for (let i = 0; i < point_count; i++) {
            n.copy(this._points[(i + 1) % point_count].pos).subtract(this._points[i].pos);
            this._points[i].normal.copy(n.tangent(t).normalize());
        }
        Vector2.free(t);
        Vector2.free(n);

        const aabb = Rectangle.new();
        aabb.x = this._points[0].pos.x;
        aabb.y = this._points[0].pos.y;
        for (let i = 1; i < point_count; i++) {
            aabb.expand_to(this._points[i].pos);
        }

        this.configure(aabb.x, aabb.y, aabb.width, aabb.height);
    }
    get_data() {
        return this._points.map(p => new Point(p.pos.x, p.pos.y, p.normal.x, p.normal.y));
    }

    /**
     * @param {Vector2} p_normal
     * @param {Matrix} p_transform
     * @param {{min: number, max: number}} r_result
     * @return {{min: number, max: number}}
     */
    project_range(p_normal, p_transform, r_result) {
        // no matter the angle, the box is mirrored anyway

        const pos = Vector2.new();
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

        Vector2.free(pos);
        return r_result;
    }
}
ConvexPolygonShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
ConvexPolygonShape2DSW.prototype.project_range_cast = Shape2DSW.prototype.__default_project_range_cast;
