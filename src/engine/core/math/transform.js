import { Vector3, Vector3Like } from "./vector3";
import { Basis } from "./basis";
import { Plane } from "./plane";
import { AABB } from "./aabb";

/**
 * @param {number[]} out
 */
export function identity_mat4(out) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
}

/**
 * @param {number[]} out
 * @param {number[]} a
 * @param {number[]} v
 */
export function translate_mat4(out, a, v) {
    const x = v[0],
        y = v[1],
        z = v[2];

    if (a === out) {
        out[12] += (a[0] * x + a[4] * y + a[8] * z);
        out[13] += (a[1] * x + a[5] * y + a[9] * z);
        out[14] += (a[2] * x + a[6] * y + a[10] * z);
        out[15] += (a[3] * x + a[7] * y + a[11] * z);
    } else {
        const a00 = a[0];
        const a01 = a[1];
        const a02 = a[2];
        const a03 = a[3];
        const a10 = a[4];
        const a11 = a[5];
        const a12 = a[6];
        const a13 = a[7];
        const a20 = a[8];
        const a21 = a[9];
        const a22 = a[10];
        const a23 = a[11];
        out[0] = a00;
        out[1] = a01;
        out[2] = a02;
        out[3] = a03;
        out[4] = a10;
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        out[8] = a20;
        out[9] = a21;
        out[10] = a22;
        out[11] = a23;
        out[12] = a00 * x + a10 * y + a20 * z + a[12];
        out[13] = a01 * x + a11 * y + a21 * z + a[13];
        out[14] = a02 * x + a12 * y + a22 * z + a[14];
        out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }

    return out;
}

/**
 * @param {number[]} out
 * @param {number[]} a
 * @param {number[]} v
 */
export function scale_mat4(out, a, v) {
    const x = v[0],
        y = v[1],
        z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12] * x;
    out[13] = a[13] * y;
    out[14] = a[14] * z;
    out[15] = a[15];
    return out;
}

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
        out[1] = this.basis.elements[0].y;
        out[2] = this.basis.elements[0].z;
        out[3] = 0;
        out[4] = this.basis.elements[1].x;
        out[5] = this.basis.elements[1].y;
        out[6] = this.basis.elements[1].z;
        out[7] = 0;
        out[8] = this.basis.elements[2].x;
        out[9] = this.basis.elements[2].y;
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
