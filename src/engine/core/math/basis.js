import { Vector3, Vector3Like } from './vector3';

/** @type {Basis[]} */
const pool = [];

export class Basis {
    static new() {
        let b = pool.pop();
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
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
        return Basis;
    }

    constructor() {
        this.elements = [
            new Vector3,
            new Vector3,
            new Vector3,
        ]
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
     */
    set(m11, m12, m13, m21, m22, m23, m31, m32, m33) {
        this.elements[0].set(m11, m12, m13);
        this.elements[1].set(m21, m22, m23);
        this.elements[2].set(m31, m32, m33);
        return this;
    }

    /**
     * @param {number} p_axis
     * @returns new Vector3.
     */
    get_axis(p_axis) {
        switch (p_axis) {
            case 0: return Vector3.new(this.elements[0].x, this.elements[1].x, this.elements[2].x);
            case 0: return Vector3.new(this.elements[0].y, this.elements[1].y, this.elements[2].y);
            case 0: return Vector3.new(this.elements[0].z, this.elements[1].z, this.elements[2].z);
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

        let x1 = Vector3.new();
        let y1 = Vector3.new();
        let z1 = Vector3.new();

        x.normalize();
        y1.copy(y).subtract(x1.copy(x).scale(x.dot(y)));
        y.normalize();
        z1.copy(z).subtract(x1.copy(x).scale(x.dot(z))).subtract(y1.copy(y).scale(y.dot(z)));
        z.normalize();

        this.set_axis(0, x);
        this.set_axis(1, y);
        this.set_axis(2, z);

        Vector3.free(x);
        Vector3.free(y);
        Vector3.free(z);
        Vector3.free(x1);
        Vector3.free(y1);
        Vector3.free(z1);

        return this;
    }
    orthonormalized() {
        return Basis.new().copy(this).orthonormalize();
    }

    invert() { }
    transpose() { }

    inverse() { }
    transposed() { }

    determinant() {
        return this.elements[0].x * (this.elements[1].y * this.elements[2].z - this.elements[2].y * this.elements[1].z)
            -
            this.elements[1].x * (this.elements[0].y * this.elements[2].z - this.elements[2].y * this.elements[0].z)
            +
            this.elements[2].x * (this.elements[0].y * this.elements[1].z - this.elements[1].y * this.elements[0].z)
    }

    from_z() { }

    rotate(p_axis, p_phi) { }
    rotate_local(p_axis, p_phi) { }

    rotate_euler(p_euler) { }
    rotate_quat(p_euler) { }

    get_rotation_euler() { }
    get_rotation_axis_angle(p_axis, p_angle) { }
    get_rotation_axis_angle_local(p_axis, p_angle) { }
    get_rotation_quat() { }
    get_rotation() { }

    rotref_posscale_decomposition(rotref) { }

    get_euler_xyz() { }
    set_euler_xyz() { }

    get_quat() { }
    set_quat(p_quat) { }

    get_euler() { }
    set_euler(p_euler) { }

    get_axis_angle() { }
    set_axis_angle() { }

    scale(p_scale) { }
    scale_local(p_scale) { }
    get_scale() { }
    get_scale_abs() { }
    get_scale_local() { }

    set_axis_angle_scale() { }
    set_euler_scale() { }
    set_quat_scale() { }

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
}
