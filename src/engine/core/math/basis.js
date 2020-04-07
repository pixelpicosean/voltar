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
