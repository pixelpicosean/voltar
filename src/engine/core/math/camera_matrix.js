import { Vector2Like } from "./vector2";
import { Transform } from "./transform.js";
import { Plane } from "./plane.js";
import { rad2deg, deg2rad } from "./math_funcs.js";
import { Vector3 } from "./vector3.js";
import { Rect2 } from "./rect2.js";

/** @type {CameraMatrix[]} */
const pool = [];

const PLANE_NEAR = 0;
const PLANE_FAR = 1;
const PLANE_LEFT = 2;
const PLANE_TOP = 3;
const PLANE_RIGHT = 4;
const PLANE_BOTTOM = 5;

const intersections = [
    [PLANE_FAR, PLANE_LEFT, PLANE_TOP],
    [PLANE_FAR, PLANE_LEFT, PLANE_BOTTOM],
    [PLANE_FAR, PLANE_RIGHT, PLANE_TOP],
    [PLANE_FAR, PLANE_RIGHT, PLANE_BOTTOM],
    [PLANE_NEAR, PLANE_LEFT, PLANE_TOP],
    [PLANE_NEAR, PLANE_LEFT, PLANE_BOTTOM],
    [PLANE_NEAR, PLANE_RIGHT, PLANE_TOP],
    [PLANE_NEAR, PLANE_RIGHT, PLANE_BOTTOM],
]

export class CameraMatrix {
    static new() {
        let obj = pool.pop();
        if (!obj) obj = new CameraMatrix;
        return obj.set_identity();
    }

    /**
     * @param {CameraMatrix} obj
     */
    static free(obj) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
    }

    constructor() {
        this.matrix = [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ];
    }

    /**
     * @param {number[]} [out]
     */
    as_array(out) {
        if (!out) out = Array(16);
        let m = this.matrix;
        out[ 0] = m[0][0];
        out[ 1] = m[0][1];
        out[ 2] = m[0][2];
        out[ 3] = m[0][3];

        out[ 4] = m[1][0];
        out[ 5] = m[1][1];
        out[ 6] = m[1][2];
        out[ 7] = m[1][3];

        out[ 8] = m[2][0];
        out[ 9] = m[2][1];
        out[10] = m[2][2];
        out[11] = m[2][3];

        out[12] = m[3][0];
        out[13] = m[3][1];
        out[14] = m[3][2];
        out[15] = m[3][3];
        return out;
    }

    /**
     * @param {CameraMatrix} other
     */
    copy(other) {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                this.matrix[i][j] = other.matrix[i][j];
            }
        }
        return this;
    }

    clone() {
        return CameraMatrix.new().copy(this);
    }

    is_orthogonal() {
        return this.matrix[3][3] === 1;
    }

    /**
     * @param {CameraMatrix} p_matrix
     */
    append(p_matrix) {
        let new_m = CameraMatrix.new();

        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 4; i++) {
                let ab = 0;
                for (let k = 0; k < 4; k++)
                ab += this.matrix[k][i] * p_matrix.matrix[j][k];
                new_m.matrix[j][i] = ab;
            }
        }

        this.copy(new_m);
        CameraMatrix.free(new_m);

        return this;
    }

    invert() {
        let m = this.matrix;

        let i = 0, j = 0, k = 0;
        let pvt_i = [0, 0, 0, 0];
        let pvt_j = [0, 0, 0, 0];
        let pvt_val = 0.0;
        let hold = 0.0;
        let determinat = 1.0;

        for (k = 0; k < 4; k++) {
            pvt_val = m[k][k];
            pvt_i[k] = k;
            pvt_j[k] = k;
            for (i = k; i < 4; i++) {
                for (j = k; j < 4; j++) {
                    if (Math.abs(m[i][j]) > Math.abs(pvt_val)) {
                        pvt_i[k] = i;
                        pvt_j[k] = j;
                        pvt_val = m[i][j];
                    }
                }
            }

            determinat *= pvt_val;
            if (Math.abs(determinat) < 1e-7) {
                return this;
            }

            i = pvt_i[k];
            if (i !== k) {
                for (j = 0; j < 4; j++) {
                    hold = -m[k][j];
                    m[k][j] = m[i][j];
                    m[i][j] = hold;
                }
            }

            j = pvt_j[k];
            if (j !== k) {
                for (i = 0; i < 4; i++) {
                    hold = -m[i][k];
                    m[i][k] = m[i][j];
                    m[i][j] = hold;
                }
            }

            for (i = 0; i < 4; i++) {
                if (i !== k) m[i][k] /= (-pvt_val);
            }

            for (i = 0; i < 4; i++) {
                hold = m[i][k];
                for (j = 0; j < 4; j++) {
                    if (i !== k && j !== k) m[i][j] += hold * m[k][j];
                }
            }

            for (j = 0; j < 4; j++) {
                if (j !== k) m[k][j] /= pvt_val;
            }

            m[k][k] = 1.0 / pvt_val;
        }

        for (k = 4 - 2; k >= 0; k--) {
            i = pvt_j[k];
            if (i !== k) {
                for (j = 0; j < 4; j++) {
                    hold = m[k][j];
                    m[k][j] = -m[i][j];
                    m[i][j] = hold;
                }
            }

            j = pvt_i[k];
            if (j !== k) {
                for (i = 0; i < 4; i++) {
                    hold = m[i][k];
                    m[i][k] = -m[i][j];
                    m[i][j] = hold;
                }
            }
        }

        return this;
    }

    /**
     * @returns new CameraMatrix
     */
    inverse() {
        return CameraMatrix.new().copy(this).invert();
    }

    set_identity() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                this.matrix[i][j] = (i === j) ? 1 : 0;
            }
        }
        return this;
    }

    set_zero() {
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                this.matrix[i][j] = 0;
            }
        }
        return this;
    }

    /**
     * @param {Transform} p_transform
     */
    set_transform(p_transform) {
        this.matrix[0][0] = p_transform.basis.elements[0].x;
        this.matrix[0][1] = p_transform.basis.elements[1].x;
        this.matrix[0][2] = p_transform.basis.elements[2].x;
        this.matrix[0][3] = 0.0;
        this.matrix[1][0] = p_transform.basis.elements[0].y;
        this.matrix[1][1] = p_transform.basis.elements[1].y;
        this.matrix[1][2] = p_transform.basis.elements[2].y;
        this.matrix[1][3] = 0.0;
        this.matrix[2][0] = p_transform.basis.elements[0].z;
        this.matrix[2][1] = p_transform.basis.elements[1].z;
        this.matrix[2][2] = p_transform.basis.elements[2].z;
        this.matrix[2][3] = 0.0;
        this.matrix[3][0] = p_transform.origin.x;
        this.matrix[3][1] = p_transform.origin.y;
        this.matrix[3][2] = p_transform.origin.z;
        this.matrix[3][3] = 1.0;
        return this;
    }

    /**
     * @param {number} fov_degress
     * @param {number} aspect
     * @param {number} z_near
     * @param {number} z_far
     * @param {boolean} [flip_fov]
     */
    set_perspective(fov_degress, aspect, z_near, z_far, flip_fov = false) {
        if (flip_fov) {
            fov_degress = this.get_fovy(fov_degress, 1.0 / aspect);
        }

        let sin = 0, cot = 0, delta_z = 0;
        let radians = fov_degress / 2.0 * Math.PI / 180.0;

        delta_z = z_far - z_near;
        sin = Math.sin(radians);

        if (delta_z === 0 || sin === 0 || aspect === 0) {
            return;
        }
        cot = Math.cos(radians) / sin;

        this.set_identity();

        this.matrix[0][0] = cot / aspect;
        this.matrix[1][1] = cot;
        this.matrix[2][2] = -(z_far + z_near) / delta_z;
        this.matrix[2][3] = -1.0;
        this.matrix[3][2] = -2.0 * z_near * z_far / delta_z;
        this.matrix[3][3] = 0.0;
        return this;
    }

    /**
     * @param {number} size
     * @param {number} aspect
     * @param {number} z_near
     * @param {number} z_far
     * @param {boolean} [flip_fov]
     */
    set_orthogonal(size, aspect, z_near, z_far, flip_fov = false) {
        this.set_identity();

        if (!flip_fov) {
            size *= aspect;
        }

        return this.set_orthogonal_d(-size / 2, size / 2, -size / aspect / 2, size / aspect / 2, z_near, z_far);
    }

    /**
     * @param {number} left
     * @param {number} right
     * @param {number} bottom
     * @param {number} top
     * @param {number} z_near
     * @param {number} z_far
     */
    set_orthogonal_d(left, right, bottom, top, z_near, z_far) {
        this.set_identity();

        this.matrix[0][0] = 2.0 / (right - left);
        this.matrix[1][1] = 2.0 / (top - bottom);
        this.matrix[2][2] = -2.0 / (z_far - z_near);
        this.matrix[3][0] = -((right + left) / (right - left));
        this.matrix[3][1] = -((top + bottom) / (top - bottom));
        this.matrix[3][2] = -((z_far + z_near) / (z_far - z_near));
        this.matrix[3][3] = 1.0;
        return this;
    }

    /**
     * @param {number} size
     * @param {number} aspect
     * @param {Vector2Like} offset
     * @param {number} z_near
     * @param {number} z_far
     * @param {boolean} [flip_fov]
     */
    set_frustum(size, aspect, offset, z_near, z_far, flip_fov = false) {
        this.set_identity();

        if (!flip_fov) {
            size *= aspect;
        }

        let left = -size / 2 + offset.x;
        let right = size / 2 + offset.x;
        let bottom = -size / aspect / 2 + offset.y;
        let top = size / aspect / 2 + offset.y;

        let x = 2 * z_near / (right - left);
        let y = 2 * z_near / (top - bottom);

        let a = (right + left) / (right - left);
        let b = (top + bottom) / (top - bottom);
        let c = (z_far + z_near) / (z_far - z_near);
        let d = -2 * z_far * z_near / (z_far - z_near);

        this.matrix[0][0] = x;
        this.matrix[0][1] = 0;
        this.matrix[0][2] = 0;
        this.matrix[0][3] = 0;
        this.matrix[1][0] = 0;
        this.matrix[1][1] = y;
        this.matrix[1][2] = 0;
        this.matrix[1][3] = 0;
        this.matrix[2][0] = a;
        this.matrix[2][1] = b;
        this.matrix[2][2] = c;
        this.matrix[2][3] = -1;
        this.matrix[3][0] = 0;
        this.matrix[3][1] = 0;
        this.matrix[3][2] = d;
        this.matrix[3][3] = 0;

        return this;
    }

    set_light_bias() {
        this.matrix[0][0] = 0.5;
        this.matrix[0][1] = 0.0;
        this.matrix[0][2] = 0.0;
        this.matrix[0][3] = 0.0;

        this.matrix[1][0] = 0.0;
        this.matrix[1][1] = 0.5;
        this.matrix[1][2] = 0.0;
        this.matrix[1][3] = 0.0;

        this.matrix[2][0] = 0.0;
        this.matrix[2][1] = 0.0;
        this.matrix[2][2] = 0.5;
        this.matrix[2][3] = 0.0;

        this.matrix[3][0] = 0.5;
        this.matrix[3][1] = 0.5;
        this.matrix[3][2] = 0.5;
        this.matrix[3][3] = 1.0;

        return this;
    }

    /**
     * @param {Rect2} p_rect
     */
    set_light_atlas_rect(p_rect) {
        this.matrix[0][0] = p_rect.width;
        this.matrix[0][1] = 0.0;
        this.matrix[0][2] = 0.0;
        this.matrix[0][3] = 0.0;

        this.matrix[1][0] = 0.0;
        this.matrix[1][1] = p_rect.height;
        this.matrix[1][2] = 0.0;
        this.matrix[1][3] = 0.0;

        this.matrix[2][0] = 0.0;
        this.matrix[2][1] = 0.0;
        this.matrix[2][2] = 1.0;
        this.matrix[2][3] = 0.0;

        this.matrix[3][0] = p_rect.x;
        this.matrix[3][1] = p_rect.y;
        this.matrix[3][2] = 0.0;
        this.matrix[3][3] = 1.0;

        return this;
    }

    /**
     * @param {number} p_fovx
     * @param {number} p_aspect
     */
    get_fovy(p_fovx, p_aspect) {
        return rad2deg(Math.atan(p_aspect * Math.tan(deg2rad(p_fovx) * 0.5)) * 2.0);
    }

    get_fov() {
        let right_plane = Plane.new().set(
            this.matrix[0][3] - this.matrix[0][0],
            this.matrix[1][3] - this.matrix[1][0],
            this.matrix[2][3] - this.matrix[2][0],
            -this.matrix[3][3] + this.matrix[3][0]
        );
        right_plane.normalize();

        if (this.matrix[2][0] === 0 && this.matrix[2][1] === 0) {
            let res = rad2deg(Math.acos(Math.abs(right_plane.normal.x))) * 2;
            Plane.free(right_plane);
            return res;
        } else {
            let left_plane = Plane.new().set(
                this.matrix[0][3] + this.matrix[0][0],
                this.matrix[1][3] + this.matrix[1][0],
                this.matrix[2][3] + this.matrix[2][0],
                this.matrix[3][3] + this.matrix[3][0]
            );
            left_plane.normalize();

            let res = rad2deg(Math.acos(Math.abs(left_plane.normal.x))) + rad2deg(Math.acos(Math.abs(right_plane.normal.x)));

            Plane.free(right_plane);
            Plane.free(left_plane);

            return res;
        }
    }

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

    get_z_near() {
        let new_plane = Plane.new().set(
            this.matrix[0][3] + this.matrix[0][2],
            this.matrix[1][3] + this.matrix[1][2],
            this.matrix[2][3] + this.matrix[2][2],
            -this.matrix[3][3] - this.matrix[3][2]
        );
        new_plane.normalize();
        let d = new_plane.d;
        Plane.free(new_plane);
        return d;
    }

    get_aspect() {
        let e = this.get_viewport_half_extents();
        let res = e.x / e.y;
        Vector3.free(e);
        return res;
    }

    get_viewport_half_extents() {
        let near_plane = Plane.new().set(
            this.matrix[0][3] + this.matrix[0][2],
            this.matrix[1][3] + this.matrix[1][2],
            this.matrix[2][3] + this.matrix[2][2],
            -this.matrix[3][3] - this.matrix[3][2]
        );
        near_plane.normalize();

        let right_plane = Plane.new().set(
            this.matrix[0][3] - this.matrix[0][0],
            this.matrix[1][3] - this.matrix[1][0],
            this.matrix[2][3] - this.matrix[2][0],
            -this.matrix[3][3] + this.matrix[3][0]
        );
        right_plane.normalize();

        let top_plane = Plane.new().set(
            this.matrix[0][3] - this.matrix[0][1],
            this.matrix[1][3] - this.matrix[1][1],
            this.matrix[2][3] - this.matrix[2][1],
            -this.matrix[3][3] + this.matrix[3][1]
        );
        top_plane.normalize();

        let res = Vector3.new();
        near_plane.intersect_3(right_plane, top_plane, res);

        Plane.free(near_plane);
        Plane.free(right_plane);
        Plane.free(top_plane);

        return res;
    }

    /**
     * @param {Transform} p_transform
     * @param {Vector3[]} p_points
     */
    get_endpoints(p_transform, p_points) {
        let planes = this.get_projection_planes(Transform.IDENTITY);

        let point = Vector3.new();
        for (let i = 0; i < 8; i++) {
            planes[intersections[i][0]].intersect_3(
                planes[intersections[i][1]],
                planes[intersections[i][2]],
                point
            );
            p_transform.xform(point, p_points[i]);
        }
        Vector3.free(point);

        return true;
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
