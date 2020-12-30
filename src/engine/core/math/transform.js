import { Vector3, Vector3Like } from "./vector3.js";
import { Basis, Quat } from "./basis.js";
import { Plane } from "./plane.js";
import { AABB } from "./aabb.js";

/** @type {Transform[]} */
const pool = [];

export class Transform {
    static create() {
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

        this._array = [];
    }

    /**
     * @param {number[]} [out]
     */
    as_array(out) {
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
    set(xx, xy, xz, yx, yy, yz, zx, zy, zz, x, y, z) {
        this.basis.set(xx, xy, xz, yx, yy, yz, zx, zy, zz);
        this.origin.set(x, y, z);
        return this;
    }

    /**
     * @param {number[]} array
     */
    from_array(array) {
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
    copy(p_xform) {
        this.basis.copy(p_xform.basis);
        this.origin.copy(p_xform.origin);
        return this;
    }

    clone() {
        return Transform.create().copy(this);
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
        return Transform.create().copy(this).affine_invert();
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
        return Transform.create().copy(this).invert();
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
        let vec = Vector3.create(x, y, z);
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
        if (!out) out = Vector3.create();
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
        if (!out) out = Vector3.create();
        let v = Vector3.create().copy(vec).subtract(this.origin);
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
        if (!out) out = Plane.create();

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
        if (!out) out = AABB.create();
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
        return Transform.create().copy(this).orthonormalize();
    }

    /**
     * @param {Transform} other
     */
    exact_equals(other) {
        return this.basis.exact_equals(other.basis) && this.origin.exact_equals(other.origin);
    }

    /**
     * returns new Transform
     * @param {Transform} p_transform
     * @param {number} p_c
     */
    interpolate_with(p_transform, p_c) {
        let src_scale = this.basis.get_scale();
        let src_rot = this.basis.get_rotation_quat();
        let src_loc = this.origin;

        let dst_scale = p_transform.basis.get_scale();
        let dst_rot = p_transform.basis.get_rotation_quat();
        let dst_loc = p_transform.origin;

        let i_rot = Quat.create();
        let i_scale = Vector3.create();

        let interp = Transform.create();
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
}

Transform.IDENTITY = new Transform;
