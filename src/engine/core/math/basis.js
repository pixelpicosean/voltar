import { Vector3, Vector3Like } from './vector3.js';
import { lerp } from './math_funcs.js';
import { CMP_EPSILON } from './math_defs.js';

/** @type {Quat[]} */
const quat_pool = [];

export class Quat {
    static new() {
        let b = quat_pool.pop();
        if (!b) b = new Quat;
        return b.set(0, 0, 0, 1);
    }

    /**
     * @param {Quat} obj
     */
    static free(obj) {
        if (obj && quat_pool.length < 2020) {
            quat_pool.push(obj);
        }
        return Quat;
    }

    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * @param {Quat} quat
     */
    copy(quat) {
        this.x = quat.x;
        this.y = quat.y;
        this.z = quat.z;
        this.w = quat.w;
        return this;
    }

    clone() {
        return Quat.new().copy(this);
    }

    /**
     * @param {Quat} q
     */
    dot(q) {
        return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
    }

    length_squared() {
        return this.dot(this);
    }

    length() {
        return Math.hypot(this.x, this.y, this.z, this.w);
    }

    normalize() {
        let len_inv = 1 / this.length();
        this.x *= len_inv;
        this.y *= len_inv;
        this.z *= len_inv;
        this.w *= len_inv;
        return this;
    }

    /**
     * @param {Quat} q
     * @param {number} t
     * @param {Quat} [out]
     */
    slerp(q, t, out) {
        let to1 = out;
        if (!to1) to1 = Quat.new();

        let omega = 0, cosom = 0, sinom = 0, scale0 = 0, scale1 = 0;

        cosom = this.dot(q);

        if (cosom < 0) {
            cosom = -cosom;
            to1.x = -q.x;
            to1.y = -q.y;
            to1.z = -q.z;
            to1.w = -q.w;
        } else {
            to1.x = q.x;
            to1.y = q.y;
            to1.z = q.z;
            to1.w = q.w;
        }

        if (1.0 - cosom > CMP_EPSILON) {
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            scale0 = 1.0 - t;
            scale1 = t;
        }
        return to1.set(
            scale0 * this.x + scale1 * to1.x,
            scale0 * this.y + scale1 * to1.y,
            scale0 * this.z + scale1 * to1.z,
            scale0 * this.w + scale1 * to1.w
        )
    }

    /**
     * @param {Quat | number} q
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    add(q, y, z, w) {
        if (y !== undefined) {
            this.x += q;
            this.y += y;
            this.z += z;
            this.w += w;
        } else {
            // @ts-ignore
            this.x += q.x;
            // @ts-ignore
            this.y += q.y;
            // @ts-ignore
            this.z += q.z;
            // @ts-ignore
            this.w += q.w;
        }
        return this;
    }

    /**
     * @param {Quat | number} q
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    subtract(q, y, z, w) {
        if (y !== undefined) {
            // @ts-ignore
            this.x -= q;
            this.y -= y;
            this.z -= z;
            this.w -= w;
        } else {
            // @ts-ignore
            this.x -= q.x;
            // @ts-ignore
            this.y -= q.y;
            // @ts-ignore
            this.z -= q.z;
            // @ts-ignore
            this.w -= q.w;
        }
        return this;
    }

    /**
     * @param {Quat | number} q
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    multiply(q, y, z, w) {
        if (y !== undefined) {
            // @ts-ignore
            this.x *= q;
            this.y *= y;
            this.z *= z;
            this.w *= w;
        } else {
            // @ts-ignore
            this.x *= q.x;
            // @ts-ignore
            this.y *= q.y;
            // @ts-ignore
            this.z *= q.z;
            // @ts-ignore
            this.w *= q.w;
        }
        return this;
    }

    /**
     * @param {Quat | number} q
     * @param {number} y
     * @param {number} z
     * @param {number} w
     */
    divide(q, y, z, w) {
        if (y !== undefined) {
            // @ts-ignore
            this.x /= q;
            this.y /= y;
            this.z /= z;
            this.w /= w;
        } else {
            // @ts-ignore
            this.x /= q.x;
            // @ts-ignore
            this.y /= q.y;
            // @ts-ignore
            this.z /= q.z;
            // @ts-ignore
            this.w /= q.w;
        }
        return this;
    }
}

/** @type {Basis[]} */
const basis_pool = [];

export class Basis {
    static new() {
        let b = basis_pool.pop();
        if (!b) b = new Basis;
        return b.set(
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        );
    }

    /**
     * @param {Basis} obj
     */
    static free(obj) {
        if (obj && basis_pool.length < 2020) {
            basis_pool.push(obj);
        }
        return Basis;
    }

    constructor() {
        this.elements = [
            new Vector3(1, 0, 0),
            new Vector3(0, 1, 0),
            new Vector3(0, 0, 1),
        ]
    }

    /**
     * @param {Basis} other
     */
    exact_equals(other) {
        return this.elements[0].exact_equals(other.elements[0])
            &&
            this.elements[1].exact_equals(other.elements[1])
            &&
            this.elements[2].exact_equals(other.elements[2])
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
     */
    set(xx, xy, xz, yx, yy, yz, zx, zy, zz) {
        this.elements[0].set(xx, xy, xz);
        this.elements[1].set(yx, yy, yz);
        this.elements[2].set(zx, zy, zz);
        return this;
    }

    /**
     * @param {Quat} p_quat
     */
    set_quat(p_quat) {
        let d = p_quat.length_squared();
        let s = 2.0 / d;
        let xs = p_quat.x * s, ys = p_quat.y * s, zs = p_quat.z * s;
        let wx = p_quat.w * xs, wy = p_quat.w * ys, wz = p_quat.w * zs;
        let xx = p_quat.x * xs, xy = p_quat.x * ys, xz = p_quat.x * zs;
        let yy = p_quat.y * ys, yz = p_quat.y * zs, zz = p_quat.z * zs;
        return this.set(
            1.0 - (yy + zz), xy - wz, xz + wy,
            xy + wz, 1.0 - (xx + zz), yz - wx,
            xz - wy, yz + wx, 1.0 - (xx + yy)
        );
    }

    /**
     * @param {Quat} p_quat
     * @param {Vector3Like} p_scale
     */
    set_quat_scale(p_quat, p_scale) {
        this.set_diagonal(p_scale);
        this.rotate_quat(p_quat);
    }

    /**
     * @param {Vector3Like} p_euler
     */
    set_euler(p_euler) {
        let c = 0.0, s = 0.0;

        c = Math.cos(p_euler.x);
        s = Math.sin(p_euler.x);
        let xmat = Basis.new().set(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);

        c = Math.cos(p_euler.y);
        s = Math.sin(p_euler.y);
        let ymat = Basis.new().set(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);

        c = Math.cos(p_euler.z);
        s = Math.sin(p_euler.z);
        let zmat = Basis.new().set(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);

        return this.copy(ymat).append(xmat).append(zmat);
    }

    /**
     * @param {Vector3Like} p_axis
     * @param {number} p_phi
     */
    set_axis_angle(p_axis, p_phi) {
        let axis_sq = Vector3.new(
            p_axis.x * p_axis.x,
            p_axis.y * p_axis.y,
            p_axis.z * p_axis.z
        );
        let c = Math.cos(p_phi);
        this.elements[0].x = axis_sq.x + c * (1 - axis_sq.x);
        this.elements[1].y = axis_sq.y + c * (1 - axis_sq.y);
        this.elements[2].z = axis_sq.z + c * (1 - axis_sq.z);

        let s = Math.sin(p_phi);
        let t = 1 - c;

        let xyzt = p_axis.x * p_axis.y * t;
        let zyxs = p_axis.z * s;
        this.elements[0].y = xyzt - zyxs;
        this.elements[1].x = xyzt + zyxs;

        xyzt = p_axis.x * p_axis.z * t;
        zyxs = p_axis.y * s;
        this.elements[0].z = xyzt + zyxs;
        this.elements[2].x = xyzt - zyxs;

        xyzt = p_axis.y * p_axis.z * t;
        zyxs = p_axis.x * s;
        this.elements[1].z = xyzt - zyxs;
        this.elements[2].y = xyzt + zyxs;

        return this;
    }

    /**
     * @param {number} p_axis
     * @returns new Vector3.
     */
    get_axis(p_axis) {
        switch (p_axis) {
            case 0: return Vector3.new(this.elements[0].x, this.elements[1].x, this.elements[2].x);
            case 1: return Vector3.new(this.elements[0].y, this.elements[1].y, this.elements[2].y);
            case 2: return Vector3.new(this.elements[0].z, this.elements[1].z, this.elements[2].z);
        }
    }

    /**
     * @param {number} p_axis
     * @param {Vector3Like} p_value
     */
    set_axis(p_axis, p_value) {
        switch (p_axis) {
            case 0: {
                this.elements[0].x = p_value.x;
                this.elements[1].x = p_value.y;
                this.elements[2].x = p_value.z;
            } break;
            case 1: {
                this.elements[0].y = p_value.x;
                this.elements[1].y = p_value.y;
                this.elements[2].y = p_value.z;
            } break;
            case 2: {
                this.elements[0].z = p_value.x;
                this.elements[1].z = p_value.y;
                this.elements[2].z = p_value.z;
            } break;
        }

        return this;
    }

    /**
     * @param {number} row
     * @param {Vector3Like} vec
     */
    row_dot(row, vec) {
        return this.elements[row].x * vec.x
            +
            this.elements[row].y * vec.y
            +
            this.elements[row].z * vec.z
    }

    /**
     * @param {Basis} p_basis
     */
    copy(p_basis) {
        this.elements[0].copy(p_basis.elements[0]);
        this.elements[1].copy(p_basis.elements[1]);
        this.elements[2].copy(p_basis.elements[2]);
        return this;
    }

    clone() {
        return Basis.new().copy(this);
    }

    /**
     * @param {Basis} p_matrix
     */
    append(p_matrix) {
        return this.set(
            p_matrix.tdotx(this.elements[0]), p_matrix.tdoty(this.elements[0]), p_matrix.tdotz(this.elements[0]),
            p_matrix.tdotx(this.elements[1]), p_matrix.tdoty(this.elements[1]), p_matrix.tdotz(this.elements[1]),
            p_matrix.tdotx(this.elements[2]), p_matrix.tdoty(this.elements[2]), p_matrix.tdotz(this.elements[2])
        )
    }

    /**
     * @returns new Vector3
     */
    get_scale() {
        let det = this.determinant();
        let det_sign = det < 0 ? -1 : 1;
        return Vector3.new(
            Math.hypot(this.elements[0].x, this.elements[1].x, this.elements[2].x),
            Math.hypot(this.elements[0].y, this.elements[1].y, this.elements[2].y),
            Math.hypot(this.elements[0].z, this.elements[1].z, this.elements[2].z)
        ).scale(det_sign);
    }

    /**
     * @returns new Vector3
     */
    get_rotation() {
        let m = this.clone().orthonormalize();
        let det = m.determinant();
        if (det < 0) {
            let s = Vector3.new(-1, -1, -1);
            m.scale(s);
            Vector3.free(s);
        }

        return m.get_euler();
    }

    /**
     * @param {Vector3Like} vec
     */
    tdotx(vec) {
        return this.elements[0].x * vec.x + this.elements[1].x * vec.y + this.elements[2].x * vec.z;
    }
    /**
     * @param {Vector3Like} vec
     */
    tdoty(vec) {
        return this.elements[0].y * vec.x + this.elements[1].y * vec.y + this.elements[2].y * vec.z;
    }
    /**
     * @param {Vector3Like} vec
     */
    tdotz(vec) {
        return this.elements[0].z * vec.x + this.elements[1].z * vec.y + this.elements[2].z * vec.z;
    }

    orthonormalize() {
        let x = this.get_axis(0);
        let y = this.get_axis(1);
        let z = this.get_axis(2);

        x.normalize();
        let x_dot_y = x.dot(y);
        y.set(
            y.x - x.x * x_dot_y,
            y.y - x.y * x_dot_y,
            y.z - x.z * x_dot_y
        )
        y.normalize();
        let x_dot_z = x.dot(z);
        let y_dot_z = y.dot(z);
        z.set(
            z.x - x.x * x_dot_z - y.x * y_dot_z,
            z.y - x.y * x_dot_z - y.y * y_dot_z,
            z.z - x.z * x_dot_z - y.z * y_dot_z
        )
        z.normalize();

        this.set_axis(0, x);
        this.set_axis(1, y);
        this.set_axis(2, z);

        Vector3.free(x);
        Vector3.free(y);
        Vector3.free(z);

        return this;
    }

    invert() {
        let e = [
            [this.elements[0].x, this.elements[0].y, this.elements[0].z],
            [this.elements[1].x, this.elements[1].y, this.elements[1].z],
            [this.elements[2].x, this.elements[2].y, this.elements[2].z],
        ]
        let c0 = cofac(e, 1, 1, 2, 2),
            c1 = cofac(e, 1, 2, 2, 0),
            c2 = cofac(e, 1, 0, 2, 1)
        let det = this.elements[0].x * c0
            +
            this.elements[0].y * c1
            +
            this.elements[0].z * c2
        let s = 1.0 / det;
        return this.set(
            c0 * s, cofac(e, 0, 2, 2, 1) * s, cofac(e, 0, 1, 1, 2) * s,
            c1 * s, cofac(e, 0, 0, 2, 2) * s, cofac(e, 0, 2, 1, 0) * s,
            c2 * s, cofac(e, 0, 1, 2, 0) * s, cofac(e, 0, 0, 1, 1) * s
        );
    }

    transpose() {
        let t = 0.0;
        t = this.elements[0].y;
        this.elements[0].y = this.elements[1].x;
        this.elements[1].x = t;

        t = this.elements[0].z;
        this.elements[0].z = this.elements[2].x;
        this.elements[2].x = t;

        t = this.elements[1].z;
        this.elements[1].z = this.elements[2].y;
        this.elements[2].y = t;

        return this;
    }

    determinant() {
        return this.elements[0].x * (this.elements[1].y * this.elements[2].z - this.elements[2].y * this.elements[1].z)
            -
            this.elements[1].x * (this.elements[0].y * this.elements[2].z - this.elements[2].y * this.elements[0].z)
            +
            this.elements[2].x * (this.elements[0].y * this.elements[1].z - this.elements[1].y * this.elements[0].z)
    }

    /**
     * @param {Vector3Like} p_axis
     * @param {number} p_phi
     */
    rotate(p_axis, p_phi) {
        let b = Basis.new().set_axis_angle(p_axis, p_phi).append(this);
        this.copy(b);
        Basis.free(b);
        return this;
    }

    /**
     * @param {Vector3Like} p_euler
     */
    rotate_euler(p_euler) {
        let b = Basis.new().set_euler(p_euler).append(this);
        this.copy(b);
        Basis.free(b);
        return this;
    }

    /**
     * @param {Quat} p_quat
     */
    rotate_quat(p_quat) {
        let b = Basis.new().set_quat(p_quat).append(this);
        this.copy(b);
        Basis.free(b);
        return this;
    }

    /**
     * @returns new Vector3
     */
    get_euler() {
        let euler = Vector3.new();
        let m12 = this.elements[1].z;

        if (m12 < (1 - CMP_EPSILON)) {
            if (m12 > -(1 - CMP_EPSILON)) {
                if (this.elements[1].x === 0 && this.elements[0].y === 0 && this.elements[0].z === 0 && this.elements[2].x === 0 && this.elements[0].x === 1) {
                    euler.x = Math.atan2(-m12, this.elements[1].y);
                    euler.y = 0;
                    euler.z = 0;
                } else {
                    euler.x = Math.asin(-m12);
                    euler.y = Math.atan2(this.elements[0].z, this.elements[2].z);
                    euler.z = Math.atan2(this.elements[1].x, this.elements[1].y);
                }
            } else {
                euler.x = Math.PI * 0.5;
                euler.y = Math.atan2(this.elements[0].y, this.elements[0].x);
                euler.z = 0;
            }
        } else {
            euler.x = -Math.PI * 0.5;
            euler.y = -Math.atan2(this.elements[0].y, this.elements[0].x);
            euler.z = 0;
        }

        return euler;
    }

    /**
     * @returns new Quat
     */
    get_quat() {
        /** @type {number[][]} */
        let m = [
            [this.elements[0].x, this.elements[0].y, this.elements[0].z],
            [this.elements[1].x, this.elements[1].y, this.elements[1].z],
            [this.elements[2].x, this.elements[2].y, this.elements[2].z],
        ]
        let trace = m[0][0] + m[1][1] + m[2][2];
        let temp = [0, 0, 0, 0];

        if (trace > 0) {
            let s = Math.sqrt(trace + 1.0);
            temp[3] = s * 0.5;
            s = 0.5 / s;

            temp[0] = (m[2][1] - m[1][2]) * s;
            temp[1] = (m[0][2] - m[2][0]) * s;
            temp[2] = (m[1][0] - m[0][1]) * s;
        } else {
            let i = m[0][0] < m[1][1] ?
                (m[1][1] < m[2][2] ? 2 : 1) :
                (m[0][0] < m[2][2] ? 2 : 0)
            let j = (i + 1) % 3;
            let k = (i + 2) % 3;

            let s = Math.sqrt(m[i][i] - m[j][j] - m[k][k] + 1.0);
            temp[i] = s * 0.5;
            s = 0.5 / s;

            temp[3] = (m[k][j] - m[j][k]) * s;
            temp[j] = (m[j][i] - m[i][j]) * s;
            temp[k] = (m[k][i] - m[i][k]) * s;
        }
        return Quat.new().set(temp[0], temp[1], temp[2], temp[3]);
    }

    /**
     * returns new Quat
     */
    get_rotation_quat() {
        let m = this.clone().orthonormalize();
        let det = m.determinant();
        if (det < 0) {
            m.scale({ x: -1, y: -1, z: -1 });
        }
        return m.get_quat();
    }

    /**
     * @param {Vector3Like} p_scale
     */
    scale(p_scale) {
        this.elements[0].scale(p_scale.x);
        this.elements[1].scale(p_scale.y);
        this.elements[2].scale(p_scale.z);
        return this;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    scale_n(x, y, z) {
        this.elements[0].scale(x);
        this.elements[1].scale(y);
        this.elements[2].scale(z);
        return this;
    }

    /**
     * @param {Basis} target
     * @param {number} t
     */
    slerp(target, t) {
        let from = this.get_quat();
        let to = target.get_quat();

        let b = Basis.new().set_quat(from.slerp(to, t));
        b.elements[0].scale(lerp(this.elements[0].length(), target.elements[0].length(), t));
        b.elements[1].scale(lerp(this.elements[1].length(), target.elements[1].length(), t));
        b.elements[2].scale(lerp(this.elements[2].length(), target.elements[2].length(), t));

        Quat.free(from);
        Quat.free(to);

        return b;
    }

    /**
     * @param {Vector3Like} p_euler
     * @param {Vector3Like} p_scale
     */
    set_euler_scale(p_euler, p_scale) {
        this.set_diagonal(p_scale);
        this.rotate_euler(p_euler);
        return this;
    }

    /**
     * @param {Vector3Like} p_diag
     */
    set_diagonal(p_diag) {
        this.elements[0].set(p_diag.x, 0, 0);
        this.elements[1].set(0, p_diag.y, 0);
        this.elements[2].set(0, 0, p_diag.z);
        return this;
    }

    /**
     * @param {Vector3Like} p_vector
     * @param {Vector3} [r_out]
     */
    xform(p_vector, r_out) {
        if (!r_out) r_out = Vector3.new();
        let x = this.elements[0].dot(p_vector);
        let y = this.elements[1].dot(p_vector);
        let z = this.elements[2].dot(p_vector);
        r_out.x = x;
        r_out.y = y;
        r_out.z = z;
        return r_out;
    }

    /**
     * @param {Vector3Like} p_vector
     * @param {Vector3} [r_out]
     */
    xform_inv(p_vector, r_out) {
        if (!r_out) r_out = Vector3.new();
        let x = this.elements[0].x * p_vector.x + this.elements[1].x * p_vector.y + this.elements[2].x * p_vector.z;
        let y = this.elements[0].y * p_vector.x + this.elements[1].y * p_vector.y + this.elements[2].y * p_vector.z;
        let z = this.elements[0].z * p_vector.x + this.elements[1].z * p_vector.y + this.elements[2].z * p_vector.z;
        r_out.x = x;
        r_out.y = y;
        r_out.z = z;
        return r_out;
    }

    /**
     * @param {Basis} b
     * @param {number} [eps]
     */
    is_equal_approx(b, eps = 1e-05) {
        return b.elements[0].is_equal_approx(this.elements[0], eps)
            &&
            b.elements[1].is_equal_approx(this.elements[1], eps)
            &&
            b.elements[2].is_equal_approx(this.elements[0], eps)
    }
}

/**
 * @param {number[][]} elements
 * @param {number} row1
 * @param {number} col1
 * @param {number} row2
 * @param {number} col2
 */
function cofac(elements, row1, col1, row2, col2) {
    return elements[row1][col1] * elements[row2][col2] - elements[row1][col2] * elements[row2][col1];
}
