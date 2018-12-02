import { Rectangle, Matrix, Vector2 } from "engine/math/index";
import { ShapeType } from "./const";
import { remove_items } from "engine/dep/index";

// TODO: move the CMP_EPSILON to math const
const CMP_EPSILON = 0.00001;

export class Shape2D {
    constructor() {
        this.type = -1;

        /* Shape2DSW API */
        this.self = this;
        this.aabb = new Rectangle();
        this.configured = false;
        this.custom_bias = 0;

        /**
         * @type {Array<{count: number, owner: any}>}
         */
        this.owners = [];

        /* CollisionObject2DSW::Shape API */
        this.xform = new Matrix();
        this.xform_inv = new Matrix();
        this.bpid = -1;
        this.aabb_cache = new Rectangle();
        this.metadata = null;
        this.disabled = false;
        this.one_way_collision = false;
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

        for (let co of this.owners) {
            // TODO: add `_shape_changed` to shape owner
            co.owner._shape_changed();
        }
    }

    /**
     * @param {Vector2} normal
     * @param {Matrix} transform
     * @param {{min: number, max: number}} result
     * @return {{min: number, max: number}}
     */
    project_rangev(normal, transform, result) {
        return null;
    }
    /**
     * @param {Vector2} normal
     * @param {Vector2} supports
     * @returns {Number}
     */
    get_supports(normal, supports) {
        return 0;
    }

    /**
     * @param {Vector2} point
     * @returns {Boolean}
     */
    contains_point(point) {
        return false;
    }
    /**
     * @param {Vector2} begin
     * @param {Vector2} end
     * @param {Vector2} point
     * @param {Vector2} normal
     * @returns {Boolean}
     */
    intersect_segment(begin, end, point, normal) {
        return false;
    }
    /**
     * @param {Number} mass
     * @param {Vector2} scale
     * @returns {Number}
     */
    get_moment_of_inertia(mass, scale) {
        return 0;
    }

    add_owner(owner) {
        let E;
        for (let co of this.owners) {
            if (co.owner === owner) {
                E = co;
                break;
            }
        }
        if (E) {
            E.count++;
        } else {
            this.owners.push({
                count: 1,
                owner: owner,
            });
        }
    }
    remove_owner(owner) {
        for (let i = 0; i < this.owners.length; i++) {
            if (this.owners[i].owner === owner) {
                const E = this.owners[i];
                E.count--;
                if (E.count === 0) {
                    remove_items(this.owners, i, 1);
                }
                break;
            }
        }
    }
    is_owner(owner) {
        for (let co of this.owners) {
            if (co.owner === owner) {
                return true;
            }
        }
    }
}

export class CircleShape2D extends Shape2D {
    get radius() {
        return this._radius;
    }
    /**
     * @param {Number} value
     */
    set radius(value) {
        this._radius = value;
        this._update_shape();
    }
    /**
     * @param {Number} value
     * @returns {this}
     */
    set_radius(value) {
        this.radius = value;
        return this;
    }

    constructor() {
        super();

        this.type = ShapeType.CIRCLE;

        this._radius = 10;
        this._update_shape();
    }
    /**
     * @param {Rectangle} rect
     * @returns {Rectangle}
     */
    get_rect(rect) {
        return rect.copy(this.aabb);
    }
    _update_shape() {
        this.configure(-this._radius, -this._radius, this._radius * 2, this._radius * 2);
    }

    /**
     * @param {Vector2} normal
     * @param {Matrix} transform
     * @param {{min: number, max: number}} result
     * @return {{min: number, max: number}}
     */
    project_rangev(normal, transform, result) {
        if (result === undefined) {
            result = { min: 0, max: 0 };
        }

        const d = normal.dot(transform.origin);

        // TODO: cache a vector instead of creating new one
        const local_normal = transform.basis_xform_inv(normal);
        const scale = local_normal.length();

        result.min = d - this._radius * scale;
        result.max = d + this._radius * scale;

        return result;
    }
    /**
     * @param {Vector2} normal
     * @param {Vector2} supports
     * @returns {Number}
     */
    get_supports(normal, supports) {
        supports.copy(normal).scale(this._radius);
        return 1;
    }

    /**
     * @param {Vector2} point
     * @returns {Boolean}
     */
    contains_point(point) {
        return point.length_squared() < this._radius * this._radius;
    }
    /**
     * @param {Vector2} begin
     * @param {Vector2} end
     * @param {Vector2} point
     * @param {Vector2} normal
     * @returns {Boolean}
     */
    intersect_segment(begin, end, point, normal) {
        const line_vec = end.clone().subtract(begin);

        // TODO: replace method call to expressions, performance boost?
        const a = line_vec.dot(line_vec);
        const b = 2 * begin.dot(line_vec);
        const c = begin.dot(begin) - this._radius * this._radius;

        let sqrtterm = b * b - 4 * a * c;

        if (sqrtterm < 0) {
            return false;
        }
        sqrtterm = Math.sqrt(sqrtterm);
        const res = (-b - sqrtterm) / (2 * a);

        if (res < 0 || res > 1 + CMP_EPSILON) {
            return false;
        }

        point.copy(begin).add(line_vec.x * res, line_vec.y * res);
        normal.copy(point).normalize();
        return true;
    }
    /**
     * @param {Number} mass
     * @param {Vector2} scale
     * @returns {Number}
     */
    get_moment_of_inertia(mass, scale) {
        return (this._radius * this._radius) * (scale.x * 0.5 + scale.y * 0.5);
    }
}
