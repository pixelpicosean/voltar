import { Vector3, Vector3Like } from "./vector3";
import { Basis } from "./basis";
import { Plane } from "./plane";
import { AABB } from "./aabb";

/** @type {Transform[]} */
const pool = [];

export class Transform {
    static new() {
        let b = pool.pop();
        if (!b) b = new Transform;
        return b.set(
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
            0, 0, 0
        );
    }

    /**
     * @param {Transform} obj
     */
    static free(obj) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
        return Transform;
    }

    constructor() {
        this.basis = new Basis;
        this.origin = new Vector3;
    }

    /**
     * @param {number[]} [out]
     */
    as_array(out) {
        if (!out) out = Array(16);
        out[0] = this.basis.elements[0].x;
        out[1] = this.basis.elements[1].x;
        out[2] = this.basis.elements[2].x;
        out[3] = 0;
        out[4] = this.basis.elements[0].y;
        out[5] = this.basis.elements[1].y;
        out[6] = this.basis.elements[2].y;
        out[7] = 0;
        out[8] = this.basis.elements[0].z;
        out[9] = this.basis.elements[1].z;
        out[10] = this.basis.elements[2].z;
        out[11] = 0;
        out[12] = this.origin.x;
        out[13] = this.origin.y;
        out[14] = this.origin.z;
        out[15] = 1;
        return out;
    }

    /**
     * @param {number} xx
     * @param {number} xy
     * @param {number} xz
     * @param {number} yx
     * @param {number} yy
     * @param {number} yz
     * @param {number} zx
     * @param {number} zy
     * @param {number} zz
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set(xx, xy, xz, yx, yy, yz, zx, zy, zz, x, y, z) {
        this.basis.set(xx, xy, xz, yx, yy, yz, zx, zy, zz);
        this.origin.set(x, y, z);
        return this;
    }

    /**
     * @param {Transform} p_xform
     */
    copy(p_xform) {
        this.basis.copy(p_xform.basis);
        this.origin.copy(p_xform.origin);
        return this;
    }

    clone() {
        return Transform.new().copy(this);
    }

    affine_invert() {
        this.basis.invert();
        let v = this.origin.clone().negate();
        this.basis.xform(v, this.origin);
        Vector3.free(v);
        return this;
    }

    /**
     * @returns new Transform
     */
    affine_inverse() {
        return Transform.new().copy(this).affine_invert();
    }

    invert() {
        this.basis.transpose();
        this.basis.xform(this.origin.negate(), this.origin);
        return this;
    }

    /**
     * @returns new Transform
     */
    inverse() {
        return Transform.new().copy(this).invert();
    }

    /**
     * @param {Vector3Like} p_translation
     */
    translate(p_translation) {
        this.origin.x += this.basis.elements[0].dot(p_translation);
        this.origin.y += this.basis.elements[1].dot(p_translation);
        this.origin.z += this.basis.elements[2].dot(p_translation);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    translate_n(x, y, z) {
        let vec = Vector3.new(x, y, z);
        this.origin.x += this.basis.elements[0].dot(vec);
        this.origin.y += this.basis.elements[1].dot(vec);
        this.origin.z += this.basis.elements[2].dot(vec);
        Vector3.free(vec);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    scale_n(x, y, z) {
        this.basis.scale_n(x, y, z);
        this.origin.multiply(x, y, z);
    }

    /**
     * @param {Vector3Like} vec
     * @param {Vector3} [out]
     */
    xform(vec, out) {
        if (!out) out = Vector3.new();
        return out.set(
            this.basis.row_dot(0, vec) + this.origin.x,
            this.basis.row_dot(1, vec) + this.origin.y,
            this.basis.row_dot(2, vec) + this.origin.z
        );
    }

    /**
     * @param {Vector3Like} vec
     * @param {Vector3} [out]
     */
    xform_inv(vec, out) {
        if (!out) out = Vector3.new();
        let v = Vector3.new().copy(vec).subtract(this.origin);
        out.set(
            this.basis.elements[0].x * v.x + this.basis.elements[1].x * v.y + this.basis.elements[2].x * v.z,
            this.basis.elements[0].y * v.x + this.basis.elements[1].y * v.y + this.basis.elements[2].y * v.z,
            this.basis.elements[0].z * v.x + this.basis.elements[1].z * v.y + this.basis.elements[2].z * v.z
        );
        Vector3.free(v);
        return out;
    }

    /**
     * @param {Plane} p_plane
     * @param {Plane} [out]
     */
    xform_plane(p_plane, out) {
        if (!out) out = Plane.new();

        let point = p_plane.normal.clone().scale(p_plane.d);
        let point_dir = point.clone().add(p_plane.normal);
        this.xform(point, point);
        this.xform(point_dir, point_dir);

        let normal = point_dir.clone().subtract(point);
        normal.normalize();
        let d = normal.dot(point);

        out.set(normal.x, normal.y, normal.z, d);

        Vector3.free(point);
        Vector3.free(point_dir);
        Vector3.free(normal);

        return out;
    }

    /**
     * @param {AABB} p_aabb
     * @param {AABB} [out]
     */
    xform_aabb(p_aabb, out) {
        if (!out) out = AABB.new();
        let min = p_aabb.position;
        let max = p_aabb.position.clone().add(p_aabb.size);
        let tmin = [0, 0, 0], tmax = [0, 0, 0];
        let basis = [
            this.basis.elements[0].x, this.basis.elements[0].y, this.basis.elements[0].z,
            this.basis.elements[1].x, this.basis.elements[1].y, this.basis.elements[1].z,
            this.basis.elements[2].x, this.basis.elements[2].y, this.basis.elements[2].z,
        ]
        let origin = [this.origin.x, this.origin.y, this.origin.z];
        for (let i = 0; i < 3; i++) {
            tmin[i] = tmax[i] = origin[i];
            for (let j = 0; j < 3; j++) {
                let e = basis[i][j] * min[j];
                let f = basis[i][j] * max[j];
                if (e < f) {
                    tmin[i] += e;
                    tmax[i] += f;
                } else {
                    tmin[i] += f;
                    tmax[i] += e;
                }
            }
        }
        out.position.set(tmin[0], tmin[1], tmin[2]);
        out.size.set(tmax[0] - tmin[0], tmax[1] - tmin[1], tmax[2] - tmin[2]);
        Vector3.free(max);
        return out;
    }

    /**
     * @param {Transform} other
     */
    append(other) {
        this.xform(other.origin, this.origin);
        this.basis.append(other.basis);
        return this;
    }

    orthonormalize() {
        this.basis.orthonormalize();
        return this;
    }

    orthonormalized() {
        return Transform.new().copy(this).orthonormalize();
    }

    /**
     * @param {Transform} other
     */
    exact_equals(other) {
        return this.basis.exact_equals(other.basis) && this.origin.exact_equals(other.origin);
    }
}

Transform.IDENTITY = new Transform;
