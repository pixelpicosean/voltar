import { CMP_EPSILON } from "./math_defs";
import { Vector3, Vector3Like } from "./vector3";


export class Plane {
    static new() {
        let obj = pool.pop();
        if (!obj) obj = new Plane;
        obj.set(0, 0, 0, 0);
        return obj;
    }

    static free(obj: Plane) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
    }

    normal = new Vector3;
    d = 0;

    set(x: number, y: number, z: number, d: number) {
        this.normal.set(x, y, z);
        this.d = d;
        return this;
    }

    set_point_and_normal(p_point: Vector3, p_normal: Vector3) {
        this.normal.copy(p_normal);
        this.d = p_normal.dot(p_point);
        return this;
    }

    copy(plane: Plane) {
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

    distance_to(p_point: Vector3Like) {
        return this.normal.dot(p_point) - this.d;
    }

    intersect_3(plane_1: Plane, plane_2: Plane, result: Vector3) {
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

    /**
     * @param {Vector3} p_begin
     * @param {Vector3} p_end
     * @param {Vector3} r_intersection result is saved in this vector
     */
    intersects_segment(p_begin: Vector3, p_end: Vector3, r_intersection: Vector3) {
        let segment = p_begin.clone().subtract(p_end);
        let den = this.normal.dot(segment);

        if (Math.abs(den) < CMP_EPSILON) {
            return false;
        }

        let dist = (this.normal.dot(p_begin) - this.d) / den;

        if (dist < -CMP_EPSILON || dist > (1 + CMP_EPSILON)) {
            return false;
        }

        dist = -dist;
        r_intersection.copy(segment).scale(dist).add(p_begin);
        return true;
    }

    is_point_over(p_point: Vector3Like) {
        return this.normal.dot(p_point) > this.d;
    }
}

const pool: Plane[] = [];
