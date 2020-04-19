import { Vector2Like } from "./vector2";
import { Transform } from "./transform";
import { Plane } from "./plane";

export class CameraMatrix {
    constructor() {
        this.matrix = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];
    }

    set_identity() { }
    set_zero() { }

    /**
     * @param {number} fov_degress
     * @param {number} aspect
     * @param {number} z_near
     * @param {number} z_far
     * @param {boolean} [flip_fov]
     */
    set_perspective(fov_degress, aspect, z_near, z_far, flip_fov = false) { }

    /**
     * @param {number} size
     * @param {number} aspect
     * @param {number} z_near
     * @param {number} z_far
     * @param {boolean} [flip_fov]
     */
    set_orthogonal(size, aspect, z_near, z_far, flip_fov = false) { }

    /**
     * @param {number} size
     * @param {number} aspect
     * @param {Vector2Like} offset
     * @param {number} z_near
     * @param {number} z_far
     * @param {boolean} [flip_fov]
     */
    set_frustum(size, aspect, offset, z_near, z_far, flip_fov = false) { }

    get_z_far() {
        let new_plane = Plane.new().set(
            this.matrix[0][3] - this.matrix[0][2],
            this.matrix[1][3] - this.matrix[1][2],
            this.matrix[2][3] - this.matrix[2][2],
            this.matrix[3][3] - this.matrix[3][2]
        );
        new_plane.normal.negate();
        new_plane.normalize();
        let d = new_plane.d;
        Plane.free(new_plane);
        return d;
    }

    /**
     * @param {Transform} p_transform
     */
    get_projection_planes(p_transform) {
        /** @type {Plane[]} */
        let planes = [];

        let m = this.matrix;
        let new_plane = Plane.new();

        // near plane
        new_plane.set(
            m[0][3] + m[0][2],
            m[1][3] + m[1][2],
            m[2][3] + m[2][2],
            m[3][3] + m[3][2]
        );

        new_plane.normal.negate();
        new_plane.normalize();

        planes.push(p_transform.xform_plane(new_plane));

        // far plane
        new_plane.set(
            m[0][3] - m[0][2],
            m[1][3] - m[1][2],
            m[2][3] - m[2][2],
            m[3][3] - m[3][2]
        );

        new_plane.normal.negate();
        new_plane.normalize();

        planes.push(p_transform.xform_plane(new_plane));

        // left plane
        new_plane.set(
            m[0][3] + m[0][0],
            m[1][3] + m[1][0],
            m[2][3] + m[2][0],
            m[3][3] + m[3][0]
        );

        new_plane.normal.negate();
        new_plane.normalize();

        planes.push(p_transform.xform_plane(new_plane));

        // top plane
        new_plane.set(
            m[0][3] - m[0][1],
            m[1][3] - m[1][1],
            m[2][3] - m[2][1],
            m[3][3] - m[3][1]
        );

        new_plane.normal.negate();
        new_plane.normalize();

        planes.push(p_transform.xform_plane(new_plane));

        // right plane
        new_plane.set(
            m[0][3] - m[0][0],
            m[1][3] - m[1][0],
            m[2][3] - m[2][0],
            m[3][3] - m[3][0]
        );

        new_plane.normal.negate();
        new_plane.normalize();

        planes.push(p_transform.xform_plane(new_plane));

        // bottom plane
        new_plane.set(
            m[0][3] + m[0][1],
            m[1][3] + m[1][1],
            m[2][3] + m[2][1],
            m[3][3] + m[3][1]
        );

        new_plane.normal.negate();
        new_plane.normalize();

        planes.push(p_transform.xform_plane(new_plane));

        return planes;
    }
}
