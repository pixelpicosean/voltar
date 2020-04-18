export class Basis {
    constructor() {
        this.elements = [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1,
        ];
    }

    /**
     * @param {import('./vector3').Vector3Like} p_axis
     * @param {number} p_phi
     */
    set(p_axis, p_phi) {

    }

    /**
     * @param {number} row
     * @param {import('./vector3').Vector3Like} vec
     */
    row_dot(row, vec) {
        return this.elements[row * 3 + 0] * vec.x
            +
            this.elements[row * 3 + 1] * vec.y
            +
            this.elements[row * 3 + 2] * vec.z
    }

    /**
     * @param {Basis} other
     */
    copy(other) {
        for (let i = 0; i < 9; i++) this.elements[i] = other.elements[i];
    }

    /**
     * @param {Basis} other
     */
    append(other) {
        let m11 = other.tdotx(this.elements[0], this.elements[1], this.elements[2]);
        let m12 = other.tdoty(this.elements[0], this.elements[1], this.elements[2]);
        let m13 = other.tdotz(this.elements[0], this.elements[1], this.elements[2]);
        let m21 = other.tdotx(this.elements[3], this.elements[4], this.elements[5]);
        let m22 = other.tdoty(this.elements[3], this.elements[4], this.elements[5]);
        let m23 = other.tdotz(this.elements[3], this.elements[4], this.elements[5]);
        let m31 = other.tdotx(this.elements[6], this.elements[7], this.elements[8]);
        let m32 = other.tdoty(this.elements[6], this.elements[7], this.elements[8]);
        let m33 = other.tdotz(this.elements[6], this.elements[7], this.elements[8]);
        this.elements[0] = m11;
        this.elements[1] = m12;
        this.elements[2] = m13;
        this.elements[3] = m21;
        this.elements[4] = m22;
        this.elements[5] = m23;
        this.elements[6] = m31;
        this.elements[7] = m32;
        this.elements[8] = m33;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    tdotx(x, y, z) {
        return this.elements[0] * x + this.elements[3] * y + this.elements[6] * z;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    tdoty(x, y, z) {
        return this.elements[1] * x + this.elements[4] * y + this.elements[7] * z;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    tdotz(x, y, z) {
        return this.elements[2] * x + this.elements[5] * y + this.elements[8] * z;
    }

    orthonormalize() {

    }

    invert() { }
    transpose() { }

    inverse() { }
    transposed() { }

    determinant() { }

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
     * @param {import('./vector3').Vector3Like} p_vector
     * @param {import('./vector3').Vector3Like} r_out
     */
    xform(p_vector, r_out) { }
}
