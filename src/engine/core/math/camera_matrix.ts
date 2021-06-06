import { Vector2Like } from "./vector2";
import { Transform } from "./transform";
import { Plane } from "./plane";
import { rad2deg, deg2rad } from "./math_funcs";
import { Vector3 } from "./vector3";
import { Rect2 } from "./rect2";

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
    matrix = [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1],
    ];
    _array: number[] = Array(16);

    as_array(r_out?: number[]) {
        r_out = r_out || this._array;
        let m = this.matrix;
        r_out[ 0] = m[0][0];
        r_out[ 1] = m[0][1];
        r_out[ 2] = m[0][2];
        r_out[ 3] = m[0][3];

        r_out[ 4] = m[1][0];
        r_out[ 5] = m[1][1];
        r_out[ 6] = m[1][2];
        r_out[ 7] = m[1][3];

        r_out[ 8] = m[2][0];
        r_out[ 9] = m[2][1];
        r_out[10] = m[2][2];
        r_out[11] = m[2][3];

        r_out[12] = m[3][0];
        r_out[13] = m[3][1];
        r_out[14] = m[3][2];
        r_out[15] = m[3][3];
        return r_out;
    }

    /**
     * @param {CameraMatrix} other
     */
    copy(other: CameraMatrix) {
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
    append(p_matrix: CameraMatrix) {
        let new_m = _i_append_camera_matrix.identity();

        for (let j = 0; j < 4; j++) {
            for (let i = 0; i < 4; i++) {
                let ab = 0;
                for (let k = 0; k < 4; k++)
                ab += this.matrix[k][i] * p_matrix.matrix[j][k];
                new_m.matrix[j][i] = ab;
            }
        }

        this.copy(new_m);

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
     * Returns new "CameraMatrix"
     */
    inverse() {
        return CameraMatrix.new().copy(this).invert();
    }

    identity() {
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
    set_transform(p_transform: Transform) {
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
    set_perspective(fov_degress: number, aspect: number, z_near: number, z_far: number, flip_fov: boolean = false) {
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

        this.identity();

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
    set_orthogonal(size: number, aspect: number, z_near: number, z_far: number, flip_fov: boolean = false) {
        this.identity();

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
    set_orthogonal_d(left: number, right: number, bottom: number, top: number, z_near: number, z_far: number) {
        this.identity();

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
    set_frustum(size: number, aspect: number, offset: Vector2Like, z_near: number, z_far: number, flip_fov: boolean = false) {
        this.identity();

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
    set_light_atlas_rect(p_rect: Rect2) {
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
    get_fovy(p_fovx: number, p_aspect: number) {
        return rad2deg(Math.atan(p_aspect * Math.tan(deg2rad(p_fovx) * 0.5)) * 2.0);
    }

    get_fov() {
        let right_plane = _i_get_fov_plane_1.set(
            this.matrix[0][3] - this.matrix[0][0],
            this.matrix[1][3] - this.matrix[1][0],
            this.matrix[2][3] - this.matrix[2][0],
            -this.matrix[3][3] + this.matrix[3][0]
        );
        right_plane.normalize();

        if (this.matrix[2][0] === 0 && this.matrix[2][1] === 0) {
            return rad2deg(Math.acos(Math.abs(right_plane.normal.x))) * 2;
        } else {
            let left_plane = _i_get_fov_plane_2.set(
                this.matrix[0][3] + this.matrix[0][0],
                this.matrix[1][3] + this.matrix[1][0],
                this.matrix[2][3] + this.matrix[2][0],
                this.matrix[3][3] + this.matrix[3][0]
            );
            left_plane.normalize();

            return rad2deg(Math.acos(Math.abs(left_plane.normal.x))) + rad2deg(Math.acos(Math.abs(right_plane.normal.x)));
        }
    }

    get_z_far() {
        let new_plane = _i_get_z_far_plane.set(
            this.matrix[0][3] - this.matrix[0][2],
            this.matrix[1][3] - this.matrix[1][2],
            this.matrix[2][3] - this.matrix[2][2],
            this.matrix[3][3] - this.matrix[3][2]
        );
        new_plane.normal.negate();
        new_plane.normalize();
        return new_plane.d;
    }

    get_z_near() {
        let new_plane = _i_get_z_near_plane.set(
            this.matrix[0][3] + this.matrix[0][2],
            this.matrix[1][3] + this.matrix[1][2],
            this.matrix[2][3] + this.matrix[2][2],
            -this.matrix[3][3] - this.matrix[3][2]
        );
        new_plane.normalize();
        return new_plane.d;
    }

    get_aspect() {
        let e = this.get_viewport_half_extents();
        let res = e.x / e.y;
        Vector3.free(e);
        return res;
    }

    get_viewport_half_extents(r_out?: Vector3) {
        let near_plane = _i_get_viewport_half_extents_plane_1.set(
            this.matrix[0][3] + this.matrix[0][2],
            this.matrix[1][3] + this.matrix[1][2],
            this.matrix[2][3] + this.matrix[2][2],
            -this.matrix[3][3] - this.matrix[3][2]
        );
        near_plane.normalize();

        let right_plane = _i_get_viewport_half_extents_plane_2.set(
            this.matrix[0][3] - this.matrix[0][0],
            this.matrix[1][3] - this.matrix[1][0],
            this.matrix[2][3] - this.matrix[2][0],
            -this.matrix[3][3] + this.matrix[3][0]
        );
        right_plane.normalize();

        let top_plane = _i_get_viewport_half_extents_plane_3.set(
            this.matrix[0][3] - this.matrix[0][1],
            this.matrix[1][3] - this.matrix[1][1],
            this.matrix[2][3] - this.matrix[2][1],
            -this.matrix[3][3] + this.matrix[3][1]
        );
        top_plane.normalize();

        let res = r_out || Vector3.new();
        near_plane.intersect_3(right_plane, top_plane, res);

        return res;
    }

    /**
     * @param {Transform} p_transform
     * @param {Vector3[]} p_points
     */
    get_endpoints(p_transform: Transform, p_points: Vector3[]) {
        let planes = this.get_projection_planes(Transform.IDENTITY);

        let point = _i_get_endpoints_vec3.set(0, 0, 0);
        for (let i = 0; i < 8; i++) {
            planes[intersections[i][0]].intersect_3(
                planes[intersections[i][1]],
                planes[intersections[i][2]],
                point
            );
            p_transform.xform(point, p_points[i]);
        }

        return true;
    }

    /**
     * @param {Transform} p_transform
     */
    get_projection_planes(p_transform: Transform) {
        /** @type {Plane[]} */
        let planes: Plane[] = [];

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

    static new() {
        let obj = pool.pop();
        if (!obj) obj = new CameraMatrix;
        return obj.identity();
    }

    static free(obj: CameraMatrix) {
        if (obj && pool.length < 2020) {
            pool.push(obj);
        }
    }
}
const pool: CameraMatrix[] = [];

const _i_append_camera_matrix = new CameraMatrix;

const _i_get_fov_plane_1 = new Plane;
const _i_get_fov_plane_2 = new Plane;

const _i_get_z_far_plane = new Plane;

const _i_get_z_near_plane = new Plane;

const _i_get_viewport_half_extents_plane_1 = new Plane;
const _i_get_viewport_half_extents_plane_2 = new Plane;
const _i_get_viewport_half_extents_plane_3 = new Plane;

const _i_get_endpoints_vec3 = new Vector3;
