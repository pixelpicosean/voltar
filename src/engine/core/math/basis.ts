import { Vector3, Vector3Like } from './vector3';
import { lerp } from './math_funcs';
import { CMP_EPSILON } from './math_defs';

export class Quat {
    x = 0;
    y = 0;
    z = 0;
    w = 1;

    set(x: number, y: number, z: number, w: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    /**
     * @param {Quat} quat
     */
    copy(quat: Quat) {
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
    dot(q: Quat) {
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

    slerp(q: Quat, t: number, r_out?: Quat) {
        let to1 = r_out || Quat.new();

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

    add(q: Quat) {
        this.x += q.x;
        this.y += q.y;
        this.z += q.z;
        this.w += q.w;
        return this;
    }
    add_n(x: number, y: number, z: number, w: number) {
        this.x += x;
        this.y += y;
        this.z += z;
        this.w += w;
        return this;
    }

    subtract(q: Quat) {
        this.x -= q.x;
        this.y -= q.y;
        this.z -= q.z;
        this.w -= q.w;
        return this;
    }
    subtract_n(x: number, y: number, z: number, w: number) {
        this.x -= x;
        this.y -= y;
        this.z -= z;
        this.w -= w;
        return this;
    }

    multiply(q: Quat) {
        this.x *= q.x;
        this.y *= q.y;
        this.z *= q.z;
        this.w *= q.w;
        return this;
    }
    multiply_n(x: number, y: number, z: number, w: number) {
        this.x *= x;
        this.y *= y;
        this.z *= z;
        this.w *= w;
        return this;
    }

    divide(q: Quat) {
        this.x /= q.x;
        this.y /= q.y;
        this.z /= q.z;
        this.w /= q.w;
        return this;
    }
    divide_n(x: number, y: number, z: number, w: number) {
        this.x /= x;
        this.y /= y;
        this.z /= z;
        this.w /= w;
        return this;
    }

    static new(): Quat {
        let b = quat_pool.pop();
        if (!b) b = new Quat;
        return b.set(0, 0, 0, 1);
    }

    static free(obj: Quat) {
        if (obj && quat_pool.length < 2020) {
            quat_pool.push(obj);
        }
        return Quat;
    }
}
const quat_pool: Quat[] = [];


export class Basis {
    elements = [
        new Vector3(1, 0, 0),
        new Vector3(0, 1, 0),
        new Vector3(0, 0, 1),
    ]

    /**
     * @param {Basis} other
     */
    exact_equals(other: Basis) {
        return this.elements[0].exact_equals(other.elements[0])
            &&
            this.elements[1].exact_equals(other.elements[1])
            &&
            this.elements[2].exact_equals(other.elements[2])
    }

    set(xx: number, xy: number, xz: number, yx: number, yy: number, yz: number, zx: number, zy: number, zz: number) {
        this.elements[0].set(xx, xy, xz);
        this.elements[1].set(yx, yy, yz);
        this.elements[2].set(zx, zy, zz);
        return this;
    }

    identity() {
        this.elements[0].set(1, 0, 0);
        this.elements[1].set(0, 1, 0);
        this.elements[2].set(0, 0, 1);
        return this;
    }

    /**
     * @param {Quat} p_quat
     */
    set_quat(p_quat: Quat) {
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
    set_quat_scale(p_quat: Quat, p_scale: Vector3Like) {
        this.set_diagonal(p_scale);
        this.rotate_quat(p_quat);
    }

    set_euler(p_euler: Vector3Like) {
        let c = 0.0, s = 0.0;

        c = Math.cos(p_euler.x);
        s = Math.sin(p_euler.x);
        let xmat = _i_set_euler_basis_1.set(1.0, 0.0, 0.0, 0.0, c, -s, 0.0, s, c);

        c = Math.cos(p_euler.y);
        s = Math.sin(p_euler.y);
        let ymat = _i_set_euler_basis_2.set(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);

        c = Math.cos(p_euler.z);
        s = Math.sin(p_euler.z);
        let zmat = _i_set_euler_basis_3.set(c, -s, 0.0, s, c, 0.0, 0.0, 0.0, 1.0);

        return this.copy(ymat).append(xmat).append(zmat);
    }

    set_axis_angle(p_axis: Vector3Like, p_phi: number) {
        let axis_sq = _i_set_axis_angle_vec3.set(
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

    get_axis(p_axis: number, r_out?: Vector3) {
        if (!r_out) r_out = Vector3.new();
        switch (p_axis) {
            case 0: return r_out.set(this.elements[0].x, this.elements[1].x, this.elements[2].x);
            case 1: return r_out.set(this.elements[0].y, this.elements[1].y, this.elements[2].y);
            case 2: return r_out.set(this.elements[0].z, this.elements[1].z, this.elements[2].z);
            default: return r_out.set(0, 0, 0);
        }
    }

    /**
     * @param {number} p_axis
     * @param {Vector3Like} p_value
     */
    set_axis(p_axis: number, p_value: Vector3Like) {
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
    row_dot(row: number, vec: Vector3Like) {
        return this.elements[row].x * vec.x
            +
            this.elements[row].y * vec.y
            +
            this.elements[row].z * vec.z
    }

    /**
     * @param {Basis} p_basis
     */
    copy(p_basis: Basis) {
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
    append(p_matrix: Basis) {
        return this.set(
            p_matrix.tdotx(this.elements[0]), p_matrix.tdoty(this.elements[0]), p_matrix.tdotz(this.elements[0]),
            p_matrix.tdotx(this.elements[1]), p_matrix.tdoty(this.elements[1]), p_matrix.tdotz(this.elements[1]),
            p_matrix.tdotx(this.elements[2]), p_matrix.tdoty(this.elements[2]), p_matrix.tdotz(this.elements[2])
        )
    }

    get_scale(r_out?: Vector3) {
        if (!r_out) r_out = Vector3.new();
        let det = this.determinant();
        let det_sign = det < 0 ? -1 : 1;
        return r_out.set(
            Math.hypot(this.elements[0].x, this.elements[1].x, this.elements[2].x),
            Math.hypot(this.elements[0].y, this.elements[1].y, this.elements[2].y),
            Math.hypot(this.elements[0].z, this.elements[1].z, this.elements[2].z)
        ).scale(det_sign);
    }

    get_rotation(r_out?: Vector3) {
        let m = _i_get_rotation_basis.copy(this).orthonormalize();
        let det = m.determinant();
        if (det < 0) {
            let s = Vector3.new(-1, -1, -1);
            m.scale(s);
            Vector3.free(s);
        }
        m.get_euler(r_out);
        return r_out;
    }

    /**
     * @param {Vector3Like} vec
     */
    tdotx(vec: Vector3Like) {
        return this.elements[0].x * vec.x + this.elements[1].x * vec.y + this.elements[2].x * vec.z;
    }
    /**
     * @param {Vector3Like} vec
     */
    tdoty(vec: Vector3Like) {
        return this.elements[0].y * vec.x + this.elements[1].y * vec.y + this.elements[2].y * vec.z;
    }
    /**
     * @param {Vector3Like} vec
     */
    tdotz(vec: Vector3Like) {
        return this.elements[0].z * vec.x + this.elements[1].z * vec.y + this.elements[2].z * vec.z;
    }

    orthonormalize() {
        let x = this.get_axis(0, _i_orthonormalize_vec3_1);
        let y = this.get_axis(1, _i_orthonormalize_vec3_2);
        let z = this.get_axis(2, _i_orthonormalize_vec3_3);

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
    rotate(p_axis: Vector3Like, p_phi: number) {
        let b = _i_rotate_basis.set_axis_angle(p_axis, p_phi).append(this);
        this.copy(b);
        return this;
    }

    /**
     * @param {Vector3Like} p_euler
     */
    rotate_euler(p_euler: Vector3Like) {
        let b = _i_rotate_euler_basis.set_euler(p_euler).append(this);
        this.copy(b);
        return this;
    }

    /**
     * @param {Quat} p_quat
     */
    rotate_quat(p_quat: Quat) {
        let b = _i_rotate_quat_basis.set_quat(p_quat).append(this);
        this.copy(b);
        return this;
    }

    get_euler(r_out?: Vector3) {
        let euler = r_out || Vector3.new();
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

    get_quat(r_out?: Quat) {
        let m: number[][] = [
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
        return (r_out || Quat.new()).set(temp[0], temp[1], temp[2], temp[3]);
    }

    get_rotation_quat(r_out?: Quat) {
        let m = _i_get_rotation_quat_basis.copy(this).orthonormalize();
        let det = m.determinant();
        if (det < 0) {
            m.scale({ x: -1, y: -1, z: -1 });
        }
        return m.get_quat(r_out);
    }

    /**
     * @param {Vector3Like} p_scale
     */
    scale(p_scale: Vector3Like) {
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
    scale_n(x: number, y: number, z: number) {
        this.elements[0].scale(x);
        this.elements[1].scale(y);
        this.elements[2].scale(z);
        return this;
    }

    slerp(target: Basis, t: number, r_out?: Basis) {
        let from = this.get_quat(_i_slerp_quat_1);
        let to = target.get_quat(_i_slerp_quat_2);

        let b = r_out || Basis.new();

        b.set_quat(from.slerp(to, t));
        b.elements[0].scale(lerp(this.elements[0].length(), target.elements[0].length(), t));
        b.elements[1].scale(lerp(this.elements[1].length(), target.elements[1].length(), t));
        b.elements[2].scale(lerp(this.elements[2].length(), target.elements[2].length(), t));

        return b;
    }

    /**
     * @param {Vector3Like} p_euler
     * @param {Vector3Like} p_scale
     */
    set_euler_scale(p_euler: Vector3Like, p_scale: Vector3Like) {
        this.set_diagonal(p_scale);
        this.rotate_euler(p_euler);
        return this;
    }

    /**
     * @param {Vector3Like} p_diag
     */
    set_diagonal(p_diag: Vector3Like) {
        this.elements[0].set(p_diag.x, 0, 0);
        this.elements[1].set(0, p_diag.y, 0);
        this.elements[2].set(0, 0, p_diag.z);
        return this;
    }

    xform(p_vector: Vector3Like, r_out?: Vector3) {
        r_out = r_out || Vector3.new();
        let x = this.elements[0].dot(p_vector);
        let y = this.elements[1].dot(p_vector);
        let z = this.elements[2].dot(p_vector);
        r_out.x = x;
        r_out.y = y;
        r_out.z = z;
        return r_out;
    }

    xform_inv(p_vector: Vector3Like, r_out?: Vector3) {
        r_out = r_out || Vector3.new();
        let x = this.elements[0].x * p_vector.x + this.elements[1].x * p_vector.y + this.elements[2].x * p_vector.z;
        let y = this.elements[0].y * p_vector.x + this.elements[1].y * p_vector.y + this.elements[2].y * p_vector.z;
        let z = this.elements[0].z * p_vector.x + this.elements[1].z * p_vector.y + this.elements[2].z * p_vector.z;
        r_out.x = x;
        r_out.y = y;
        r_out.z = z;
        return r_out;
    }

    is_equal_approx(b: Basis, eps: number = 1e-05) {
        return b.elements[0].is_equal_approx(this.elements[0], eps)
            &&
            b.elements[1].is_equal_approx(this.elements[1], eps)
            &&
            b.elements[2].is_equal_approx(this.elements[0], eps)
    }

    static new() {
        let b = basis_pool.pop();
        if (!b) b = new Basis;
        return b.set(
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        );
    }

    static free(obj: Basis) {
        if (obj && basis_pool.length < 2020) {
            basis_pool.push(obj);
        }
        return Basis;
    }
}
const basis_pool: Basis[] = [];


/**
 * @param {number[][]} elements
 * @param {number} row1
 * @param {number} col1
 * @param {number} row2
 * @param {number} col2
 */
function cofac(elements: number[][], row1: number, col1: number, row2: number, col2: number) {
    return elements[row1][col1] * elements[row2][col2] - elements[row1][col2] * elements[row2][col1];
}

const _i_get_rotation_basis = new Basis;

const _i_get_rotation_quat_basis = new Basis;

const _i_set_euler_basis_1 = new Basis;
const _i_set_euler_basis_2 = new Basis;
const _i_set_euler_basis_3 = new Basis;

const _i_set_axis_angle_vec3 = new Vector3;

const _i_orthonormalize_vec3_1 = new Vector3;
const _i_orthonormalize_vec3_2 = new Vector3;
const _i_orthonormalize_vec3_3 = new Vector3;

const _i_rotate_basis = new Basis;

const _i_rotate_euler_basis = new Basis;

const _i_rotate_quat_basis = new Basis;

const _i_slerp_quat_1 = new Quat;
const _i_slerp_quat_2 = new Quat;
