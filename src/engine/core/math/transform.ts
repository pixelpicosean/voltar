import { Vector3, Vector3Like } from "./vector3";
import { Basis, Quat } from "./basis";
import { Plane } from "./plane";
import { AABB } from "./aabb";

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

    static free(obj: Transform) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
        return Transform;
    }

    basis = new Basis;
    origin = new Vector3;
    _array: number[] = null;

    as_array(r_out?: number[]) {
        if (!r_out && !this._array) {
            this._array = Array(16);
        }
        r_out = r_out || this._array;
        r_out[0] = this.basis.elements[0].x;
        r_out[1] = this.basis.elements[1].x;
        r_out[2] = this.basis.elements[2].x;
        r_out[3] = 0;
        r_out[4] = this.basis.elements[0].y;
        r_out[5] = this.basis.elements[1].y;
        r_out[6] = this.basis.elements[2].y;
        r_out[7] = 0;
        r_out[8] = this.basis.elements[0].z;
        r_out[9] = this.basis.elements[1].z;
        r_out[10] = this.basis.elements[2].z;
        r_out[11] = 0;
        r_out[12] = this.origin.x;
        r_out[13] = this.origin.y;
        r_out[14] = this.origin.z;
        r_out[15] = 1;
        return r_out;
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

    set(xx: number, xy: number, xz: number, yx: number, yy: number, yz: number, zx: number, zy: number, zz: number, x: number, y: number, z: number) {
        this.basis.set(xx, xy, xz, yx, yy, yz, zx, zy, zz);
        this.origin.set(x, y, z);
        return this;
    }

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
        this.basis.xform(this.origin.negate(), this.origin);
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

    translate(p_translation: Vector3Like) {
        this.origin.x += this.basis.elements[0].dot(p_translation);
        this.origin.y += this.basis.elements[1].dot(p_translation);
        this.origin.z += this.basis.elements[2].dot(p_translation);
        return this;
    }

    translate_n(x: number, y: number, z: number) {
        let vec = Vector3.new(x, y, z);
        this.origin.x += this.basis.elements[0].dot(vec);
        this.origin.y += this.basis.elements[1].dot(vec);
        this.origin.z += this.basis.elements[2].dot(vec);
        Vector3.free(vec);
        return this;
    }

    looking_at(target: Vector3Like, up: Vector3Like) {
        return this.set_look_at(this.origin, target, up);
    }

    looking_at_n(x: number, y: number, z: number, up_x = 0, up_y = 1, up_z = 0) {
        let target = Vector3.new(x, y, z);
        let up = Vector3.new(up_x, up_y, up_z);
        this.set_look_at(this.origin, target, up);
        Vector3.free(up);
        Vector3.free(target);
        return this;
    }

    set_look_at(eye: Vector3Like, target: Vector3Like, up: Vector3Like) {
        let v_y = Vector3.new();
        let v_z = Vector3.new();

        v_z.copy(eye).subtract(target).normalize();

        v_y.copy(up);

        let v_x = v_y.cross(v_z);
        let v_y2 = v_z.cross(v_x);
        Vector3.free(v_y);
        v_y = v_y2;

        v_x.normalize();
        v_y.normalize();

        this.basis.set(
            v_x.x, v_y.x, v_z.x,
            v_x.y, v_y.y, v_z.y,
            v_x.z, v_y.z, v_z.z
        );

        this.origin.copy(eye);

        Vector3.free(v_x);
        Vector3.free(v_y);
        Vector3.free(v_z);

        return this;
    }

    scale_n(x: number, y: number, z: number) {
        this.basis.scale_n(x, y, z);
        this.origin.multiply(x, y, z);
        return this;
    }

    xform(vec: Vector3Like, out?: Vector3) {
        if (!out) out = Vector3.new();
        return out.set(
            this.basis.row_dot(0, vec) + this.origin.x,
            this.basis.row_dot(1, vec) + this.origin.y,
            this.basis.row_dot(2, vec) + this.origin.z
        );
    }

    xform_inv(vec: Vector3Like, out?: Vector3) {
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

    xform_plane(p_plane: Plane, out?: Plane) {
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

    xform_aabb(p_aabb: AABB, out?: AABB) {
        if (!out) out = AABB.new();
        let min = [p_aabb.position.x, p_aabb.position.y, p_aabb.position.z];
        let max_v = p_aabb.position.clone().add(p_aabb.size);
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
        out.position.set(tmin[0], tmin[1], tmin[2]);
        out.size.set(tmax[0] - tmin[0], tmax[1] - tmin[1], tmax[2] - tmin[2]);
        Vector3.free(max_v);
        return out;
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

    orthonormalized() {
        return Transform.new().copy(this).orthonormalize();
    }

    exact_equals(other: Transform) {
        return this.basis.exact_equals(other.basis) && this.origin.exact_equals(other.origin);
    }

    /**
     * returns new Transform
     */
    interpolate_with(p_transform: Transform, p_c: number) {
        let src_scale = this.basis.get_scale();
        let src_rot = this.basis.get_rotation_quat();
        let src_loc = this.origin;

        let dst_scale = p_transform.basis.get_scale();
        let dst_rot = p_transform.basis.get_rotation_quat();
        let dst_loc = p_transform.origin;

        let i_rot = Quat.new();
        let i_scale = Vector3.new();

        let interp = Transform.new();
        interp.basis.set_quat_scale(src_rot.slerp(dst_rot, p_c, i_rot).normalize(), src_scale.linear_interpolate(dst_scale, p_c, i_scale));
        src_loc.linear_interpolate(dst_loc, p_c, interp.origin);

        Quat.free(i_rot);
        Vector3.free(i_scale);

        Quat.free(dst_rot);
        Vector3.free(dst_scale);

        Quat.free(src_rot);
        Vector3.free(src_scale);

        return interp;
    }

    static IDENTITY = new Transform;
}

const pool: Transform[] = [];
