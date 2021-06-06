import { Vector3, Vector3Like } from "./vector3";
import { Basis, Quat } from "./basis";
import { Plane } from "./plane";
import { AABB } from "./aabb";

export class Transform {
    basis = new Basis;
    origin = new Vector3;

    _array: number[] = [];

    as_array(out?: number[]) {
        out = out || this._array;
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

    identity() {
        this.basis.set(
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        );
        this.origin.set(0, 0, 0);
        return this;
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
    set(xx: number, xy: number, xz: number, yx: number, yy: number, yz: number, zx: number, zy: number, zz: number, x: number, y: number, z: number) {
        this.basis.set(xx, xy, xz, yx, yy, yz, zx, zy, zz);
        this.origin.set(x, y, z);
        return this;
    }

    /**
     * @param {number[]} array
     */
    from_array(array: number[]) {
        this.basis.set(
            array[0],
            array[1],
            array[2],
            array[3],
            array[4],
            array[5],
            array[6],
            array[7],
            array[8]
        );
        this.origin.set(array[9], array[10], array[11]);
        return this;
    }

    /**
     * @param {Transform} p_xform
     */
    copy(p_xform: Transform) {
        this.basis.copy(p_xform.basis);
        this.origin.copy(p_xform.origin);
        return this;
    }

    clone() {
        return Transform.new().copy(this);
    }

    affine_invert() {
        this.basis.invert();
        let v = _i_affine_invert_vec3.copy(this.origin).negate();
        this.basis.xform(v, this.origin);
        return this;
    }

    /**
     * Returns new "Transform"
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
     * Returns new "Transform"
     */
    inverse() {
        return Transform.new().copy(this).invert();
    }

    /**
     * @param {Vector3Like} p_translation
     */
    translate(p_translation: Vector3Like) {
        this.origin.x += this.basis.elements[0].dot(p_translation);
        this.origin.y += this.basis.elements[1].dot(p_translation);
        this.origin.z += this.basis.elements[2].dot(p_translation);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    translate_n(x: number, y: number, z: number) {
        let vec = _i_translate_n_vec3.set(x, y, z);
        this.origin.x += this.basis.elements[0].dot(vec);
        this.origin.y += this.basis.elements[1].dot(vec);
        this.origin.z += this.basis.elements[2].dot(vec);
    }

    looking_at_n(x: number, y: number, z: number, up_x = 0, up_y = 1, up_z = 0) {
        let target = _i_looking_at_n_vec3_1.set(x, y, z);
        let up = _i_looking_at_n_vec3_2.set(up_x, up_y, up_z);
        this.set_look_at(this.origin, target, up);
        return this;
    }

    set_look_at(eye: Vector3Like, target: Vector3Like, up: Vector3Like) {
        let v_y = _i_set_look_at_vec3_1.set(0, 0, 0);
        let v_z = _i_set_look_at_vec3_2.set(0, 0, 0);

        v_z.copy(eye).subtract(target).normalize();

        v_y.copy(up);

        let v_x = v_y.cross(v_z, _i_set_look_at_vec3_3);
        let v_y2 = v_z.cross(v_x, _i_set_look_at_vec3_4);
        v_y = v_y2;

        v_x.normalize();
        v_y.normalize();

        this.basis.set(
            v_x.x, v_y.x, v_z.x,
            v_x.y, v_y.y, v_z.y,
            v_x.z, v_y.z, v_z.z
        );

        this.origin.copy(eye);

        return this;
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    scale_n(x: number, y: number, z: number) {
        this.basis.scale_n(x, y, z);
        this.origin.multiply(x, y, z);
    }

    /**
     * @param {Vector3Like} vec
     * @param {Vector3} [out]
     */
    xform(vec: Vector3Like, out: Vector3) {
        if (!out) out = Vector3.new();
        return out.set(
            this.basis.row_dot(0, vec) + this.origin.x,
            this.basis.row_dot(1, vec) + this.origin.y,
            this.basis.row_dot(2, vec) + this.origin.z
        );
    }

    xform_inv(vec: Vector3Like, r_out?: Vector3) {
        r_out = r_out || Vector3.new();
        let v = _i_xform_inv_vec3.copy(vec).subtract(this.origin);
        r_out.set(
            this.basis.elements[0].x * v.x + this.basis.elements[1].x * v.y + this.basis.elements[2].x * v.z,
            this.basis.elements[0].y * v.x + this.basis.elements[1].y * v.y + this.basis.elements[2].y * v.z,
            this.basis.elements[0].z * v.x + this.basis.elements[1].z * v.y + this.basis.elements[2].z * v.z
        );
        return r_out;
    }

    xform_plane(p_plane: Plane, r_out?: Plane) {
        if (!r_out) r_out = Plane.new();

        let point = _i_xform_plane_vec3_1.copy(p_plane.normal).scale(p_plane.d);
        let point_dir = _i_xform_plane_vec3_2.copy(point).add(p_plane.normal);
        this.xform(point, point);
        this.xform(point_dir, point_dir);

        let normal = _i_xform_plane_vec3_3.copy(point_dir).subtract(point);
        normal.normalize();
        let d = normal.dot(point);

        r_out.set(normal.x, normal.y, normal.z, d);

        return r_out;
    }

    xform_aabb(p_aabb: AABB, r_out?: AABB) {
        if (!r_out) r_out = AABB.new();
        let min = [p_aabb.position.x, p_aabb.position.y, p_aabb.position.z];
        let max_v = _i_xform_aabb_vec3.copy(p_aabb.position).add(p_aabb.size);
        let max = [max_v.x, max_v.y, max_v.z];
        let tmin = [0, 0, 0], tmax = [0, 0, 0];
        let basis = [
            [this.basis.elements[0].x, this.basis.elements[0].y, this.basis.elements[0].z],
            [this.basis.elements[1].x, this.basis.elements[1].y, this.basis.elements[1].z],
            [this.basis.elements[2].x, this.basis.elements[2].y, this.basis.elements[2].z],
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
        r_out.position.set(tmin[0], tmin[1], tmin[2]);
        r_out.size.set(tmax[0] - tmin[0], tmax[1] - tmin[1], tmax[2] - tmin[2]);
        return r_out;
    }

    append(other: Transform) {
        this.xform(other.origin, this.origin);
        this.basis.append(other.basis);
        return this;
    }

    orthonormalize() {
        this.basis.orthonormalize();
        return this;
    }

    /**
     * Returns new "Transform"
     */
    orthonormalized() {
        return Transform.new().copy(this).orthonormalize();
    }

    /**
     * @param {Transform} other
     */
    exact_equals(other: Transform) {
        return this.basis.exact_equals(other.basis) && this.origin.exact_equals(other.origin);
    }

    interpolate_with(p_transform: Transform, p_c: number, r_out?: Transform) {
        let interp = r_out || Transform.new();

        let src_scale = this.basis.get_scale(_i_interpolate_with_vec3_1);
        let src_rot = this.basis.get_rotation_quat(_i_interpolate_with_quat_1);
        let src_loc = this.origin;

        let dst_scale = p_transform.basis.get_scale(_i_interpolate_with_vec3_2);
        let dst_rot = p_transform.basis.get_rotation_quat(_i_interpolate_with_quat_2);
        let dst_loc = p_transform.origin;

        let i_rot = _i_interpolate_with_quat_3.set(0, 0, 0, 1);
        let i_scale = _i_interpolate_with_vec3_3.set(0, 0, 0);

        interp.basis.set_quat_scale(src_rot.slerp(dst_rot, p_c, i_rot).normalize(), src_scale.linear_interpolate(dst_scale, p_c, i_scale));
        src_loc.linear_interpolate(dst_loc, p_c, interp.origin);

        return interp;
    }

    static IDENTITY = Object.freeze(new Transform);

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

    static free(obj: Transform) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
        return Transform;
    }
}
const pool: Transform[] = [];


// tmp var used internally
const _i_affine_invert_vec3 = new Vector3;

const _i_translate_n_vec3 = new Vector3;

const _i_looking_at_n_vec3_1 = new Vector3;
const _i_looking_at_n_vec3_2 = new Vector3;

const _i_set_look_at_vec3_1 = new Vector3;
const _i_set_look_at_vec3_2 = new Vector3;
const _i_set_look_at_vec3_3 = new Vector3;
const _i_set_look_at_vec3_4 = new Vector3;

const _i_xform_inv_vec3 = new Vector3;

const _i_xform_plane_vec3_1 = new Vector3;
const _i_xform_plane_vec3_2 = new Vector3;
const _i_xform_plane_vec3_3 = new Vector3;

const _i_xform_aabb_vec3 = new Vector3;

const _i_interpolate_with_vec3_1 = new Vector3;
const _i_interpolate_with_vec3_2 = new Vector3;
const _i_interpolate_with_vec3_3 = new Vector3;
const _i_interpolate_with_quat_1 = new Quat;
const _i_interpolate_with_quat_2 = new Quat;
const _i_interpolate_with_quat_3 = new Quat;
