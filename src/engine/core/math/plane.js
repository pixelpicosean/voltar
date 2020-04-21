import { Vector3, Vector3Like } from "./vector3";

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
}
