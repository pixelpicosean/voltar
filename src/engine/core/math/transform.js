import { Vector3, Vector3Like } from "./vector3";
import { Basis } from "./basis";

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

export class Transform {
    constructor() {
        this.basis = new Basis;
        this.origin = new Vector3;
    }

    /**
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set(m11, m12, m13, m21, m22, m23, m31, m32, m33, x, y, z) {
        this.basis.elements[0] = m11;
        this.basis.elements[1] = m12;
        this.basis.elements[2] = m13;
        this.basis.elements[3] = m21;
        this.basis.elements[4] = m22;
        this.basis.elements[5] = m23;
        this.basis.elements[6] = m31;
        this.basis.elements[7] = m32;
        this.basis.elements[8] = m33;
        this.origin.set(x, y, z);
    }

    /**
     * @param {Transform} other
     */
    copy(other) {
        this.basis.copy(other.basis);
        this.origin.copy(other.origin);
        return this;
    }

    /**
     * Returns new Vector3.
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
     * @param {Transform} other
     */
    append(other) {
        this.xform(other.origin, this.origin);
        this.basis.append(other.basis);
    }

    orthonormalized() {
        return new Transform;
    }
}
