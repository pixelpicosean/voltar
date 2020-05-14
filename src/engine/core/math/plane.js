import { Vector3, Vector3Like } from "./vector3";
import { CMP_EPSILON } from "./math_defs";

/** @type {Plane[]} */
const pool = [];

export class Plane {
    static new() {
        let obj = pool.pop();
        if (!obj) obj = new Plane;
        obj.set(0, 0, 0, 0);
        return obj;
    }

    /**
     * @param {Plane} obj
     */
    static free(obj) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
    }

    constructor() {
        this.normal = new Vector3;
        /** @type {number} */
        this.d = 0;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} d
     */
    set(x, y, z, d) {
        this.normal.set(x, y, z);
        this.d = d;
        return this;
    }

    /**
     * @param {Vector3} p_point
     * @param {Vector3} p_normal
     */
    set_point_and_normal(p_point, p_normal) {
        this.normal.copy(p_normal);
        this.d = p_normal.dot(p_point);
        return this;
    }

    /**
     * @param {Plane} plane
     */
    copy(plane) {
        this.normal.copy(plane.normal);
        this.d = plane.d;
        return this;
    }

    clone() {
        return Plane.new().copy(this);
    }

    normalize() {
        let l = this.normal.length();
        if (l === 0) {
            this.normal.set(0, 0, 0);
            this.d = 0;
            return this;
        }
        this.normal.scale(1.0 / l);
        this.d /= l;
        return this;
    }

    /**
     * @param {Vector3Like} p_point
     */
    distance_to(p_point) {
        return this.normal.dot(p_point) - this.d;
    }

    /**
     * @param {Plane} plane_1
     * @param {Plane} plane_2
     * @param {Vector3} [result]
     */
    intersect_3(plane_1, plane_2, result) {
        let plane_0 = this;
        let n0 = plane_0.normal;
        let n1 = plane_1.normal;
        let n2 = plane_2.normal;

        let denom = n0.cross(n1).dot(n2);

        if (Math.abs(denom) < CMP_EPSILON) {
            return false;
        }

        if (result) {
            result.copy(
                n1.cross(n2).scale(plane_0.d)
                .add(
                    n2.cross(n0).scale(plane_1.d)
                )
                .add(
                    n0.cross(n1).scale(plane_2.d)
                )
            ).scale(1 / denom);
        }

        return true;
    }
}
