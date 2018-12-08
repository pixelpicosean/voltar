import { Rectangle, Vector2, Matrix, CMP_EPSILON } from "engine/math/index";
import { ShapeType, Type } from "engine/scene/physics/const";

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
     * @param {Number} x
     * @param {Number} y
     * @param {Number} width
     * @param {Number} height
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
     * @returns {Boolean}
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
    get_support(p_normal, out = Vector2.create()) {
        const res = [out, tmp_vec.set(0, 0)];
        this.get_supports(p_normal, res);
        return out;
    }
    /**
     * @param {Vector2} p_normal
     * @param {Vector2[]} p_supports
     * @returns {Number}
     */
    get_supports(p_normal, p_supports) {
        return 0;
    }

    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} p_point
     * @param {Vector2} p_normal
     * @returns {Boolean}
     */
    intersect_segment(p_begin, p_end, p_point, p_normal) {
        return false;
    }
    /**
     * @param {Number} p_mass
     * @param {Vector2} p_scale
     * @returns {Number}
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
     * @returns {Number}
     */
    get_supports(p_normal, r_supports) {
        r_supports[0].copy(p_normal).scale(this.radius);
        return 1;
    }

    /**
     * @param {Vector2} point
     * @returns {Boolean}
     */
    contains_point(point) {
        return point.length_squared() < this.radius * this.radius;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {Boolean}
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

        Vector2.delete(line_vec);
        return true;
    }
    /**
     * @param {Number} p_mass
     * @param {Vector2} p_scale
     * @returns {Number}
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
     * @returns {Number}
     */
    get_supports(p_normal, r_supports) {
        const ag = Vector2.create();

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
                r_supports[1].y = this.half_extents.y;

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
     * @returns {Boolean}
     */
    contains_point(p_point) {
        return Math.abs(p_point.x) < this.half_extents.x && Math.abs(p_point.y) < this.half_extents.y;
    }
    /**
     * @param {Vector2} p_begin
     * @param {Vector2} p_end
     * @param {Vector2} r_point
     * @param {Vector2} r_normal
     * @returns {Boolean}
     */
    intersect_segment(p_begin, p_end, r_point, r_normal) {
        return this.aabb.intersects_segment(p_begin, p_end, r_point, r_normal);
    }
    /**
     * @param {Number} p_mass
     * @param {Vector2} p_scale
     * @returns {Number}
     */
    get_moment_of_inertia(p_mass, p_scale) {
        const he2 = this.half_extents.clone().scale(2).multiply(p_scale);
        const res = p_mass * he2.dot(he2) / 12;
        Vector2.delete(he2);
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

        const local_normal = Vector2.create();
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
        Vector2.delete(local_normal);

        return r_result;
    }

    /**
     * @param {Matrix} p_xform
     * @param {Matrix} p_xform_inv
     * @param {Vector2} p_circle
     */
    get_circle_axis(p_xform, p_xform_inv, p_circle) {
        const local_v = p_xform_inv.xform(p_circle);
        const he = Vector2.create(
            (local_v.x < 0) ? -this.half_extents.x : this.half_extents.x,
            (local_v.y < 0) ? -this.half_extents.y : this.half_extents.y
        );
        Vector2.delete(local_v);
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
        const a = Vector2.create();
        const b = Vector2.create();

        {
            const local_v = Vector2.create();
            p_xform_inv.xform(p_B_xform.origin, local_v);

            const he = Vector2.create(
                (local_v.x < 0) ? -this.half_extents.x : this.half_extents.x,
                (local_v.y < 0) ? -this.half_extents.y : this.half_extents.y
            )

            p_xform.xform(he, a);

            Vector2.delete(local_v);
            Vector2.delete(he);
        }
        {
            const local_v = Vector2.create();
            p_B_xform_inv.xform(p_xform.origin, local_v);

            const he = Vector2.create(
                (local_v.x < 0) ? -p_B.half_extents.x : p_B.half_extents.x,
                (local_v.y < 0) ? -p_B.half_extents.y : p_B.half_extents.y
            )

            p_xform.xform(he, b);

            Vector2.delete(local_v);
            Vector2.delete(he);
        }

        a.subtract(b).normalize();

        Vector2.delete(b);
        return a;
    }
}
RectangleShape2DSW.prototype.project_range_castv = Shape2DSW.prototype.__default_project_range_cast;
