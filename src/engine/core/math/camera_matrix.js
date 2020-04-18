import { Vector2Like } from "./vector2";

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
}
