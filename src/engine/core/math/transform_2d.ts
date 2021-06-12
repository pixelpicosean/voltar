import { Math_PI } from './math_defs';
import { Vector2, Vector2Like } from './vector2';
import { Rect2 } from './rect2';


const Math_PI2 = Math_PI * 2;

/**
 * The Matrix class as an object, which makes it a lot faster,
 * here is a representation of it :
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export class Transform2D {
    /**
     * @param {number} [a=1] - x scale
     * @param {number} [b=0] - x skew
     * @param {number} [c=0] - y skew
     * @param {number} [d=1] - y scale
     * @param {number} [tx=0] - x translation
     * @param {number} [ty=0] - y translation
     */
    static new(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0) {
        const m = pool.pop();
        if (m) {
            return m.set(a, b, c, d, tx, ty);
        } else {
            return new Transform2D(a, b, c, d, tx, ty);
        }
    }
    static free(m: Transform2D) {
        if (m && pool.length < 2019) {
            pool.push(m);
        }
        return Transform2D;
    }

    a = 1;
    b = 0;
    c = 0;
    d = 1;
    tx = 0;
    ty = 0;
    _array: number[] = null;

    /**
     * returns new Vector2
     */
    get_origin(out?: Vector2) {
        out = out || Vector2.new();
        return out.set(this.tx, this.ty);
    }
    set_origin(value: Vector2Like) {
        this.tx = value.x;
        this.ty = value.y;
        return this;
    }
    set_origin_n(x: number, y: number) {
        this.tx = x;
        this.ty = y;
        return this;
    }

    get_rotation() {
        return Math.atan2(this.b, this.a);
    }
    set_rotation(value: number) {
        const scale = this.get_scale();
        const cr = Math.cos(value);
        const sr = Math.sin(value);
        this.a = cr;
        this.b = sr;
        this.c = -sr;
        this.d = cr;
        Vector2.free(scale);
        return this;
    }

    /**
     * returns new Vector2
     */
    get_scale(out?: Vector2) {
        const basis_determinant = Math.sign(this.a * this.d - this.b * this.c);
        out = out || Vector2.new();
        out.x = Math.sqrt(this.a * this.a + this.b * this.b)
        out.y = Math.sqrt(this.c * this.c + this.d * this.d) * basis_determinant;
        return out;
    }
    /**
     * @param {Vector2Like} scale
     */
    set_scale(scale: Vector2Like) {
        let vec = Vector2.new();
        vec.set(this.a, this.b).normalize();
        this.a = vec.x * scale.x;
        this.b = vec.y * scale.x;
        vec.set(this.c, this.d).normalize();
        this.c = vec.x * scale.y;
        this.d = vec.y * scale.y;
        Vector2.free(vec);
        return this;
    }
    set_scale_n(x: number, y: number) {
        let vec = Vector2.new();
        vec.set(this.a, this.b).normalize();
        this.a = vec.x * x;
        this.b = vec.y * x;
        vec.set(this.c, this.d).normalize();
        this.c = vec.x * y;
        this.d = vec.y * y;
        Vector2.free(vec);
        return this;
    }

    set_rotation_and_scale(p_rot: number, p_scale: Vector2Like) {
        const c = Math.cos(p_rot);
        const s = Math.sin(p_rot);
        this.a = c * p_scale.x;
        this.d = c * p_scale.y;
        this.c = -s * p_scale.y;
        this.b = s * p_scale.x;
        return this;
    }

    get_skew() {
        let vec = Vector2.new();
        let vec2 = Vector2.new();
        let det = this.basis_determinant();
        let res = Math.acos(
            vec.set(this.a, this.b).normalize().dot(
                vec.set(this.c, this.d).normalize().scale(Math.sign(det))
            )
        ) - Math.PI * 0.5;
        Vector2.free(vec2);
        Vector2.free(vec);
        return res;
    }

    set_skew(p_angle: number) {
        let vec = Vector2.new();
        let det = this.basis_determinant();
        vec.set(this.a, this.b)
            .rotate(Math.PI * 0.5 + p_angle)
            .normalize()
            .scale(Math.sign(det) * Math.hypot(this.c, this.d))
        this.c = vec.x;
        this.d = vec.y;
        Vector2.free(vec);
        return this;
    }

    set_rotation_scale_and_skew(p_rot: number, p_scale: Vector2Like, p_skew: number) {
        this.a = Math.cos(p_rot) * p_scale.x;
        this.d = Math.cos(p_rot + p_skew) * p_scale.y;
        this.c = -Math.sin(p_rot + p_skew) * p_scale.y;
        this.b = Math.sin(p_rot) * p_scale.x;
        return this;
    }

    /**
     * @param {number} [a=1] - x scale
     * @param {number} [b=0] - x skew
     * @param {number} [c=0] - y skew
     * @param {number} [d=1] - y scale
     * @param {number} [tx=0] - x translation
     * @param {number} [ty=0] - y translation
     */
    constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, tx: number = 0, ty: number = 0) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
    }

    /**
     * Creates a Matrix object based on the given array. The Element to Matrix mapping order is as follows:
     *
     * a = array[0]
     * b = array[1]
     * c = array[3]
     * d = array[4]
     * tx = array[2]
     * ty = array[5]
     *
     * @param {number[]} array - The array that the matrix will be populated from.
     */
    from_array(array: number[]) {
        this.a = array[0];
        this.b = array[1];
        this.c = array[2];
        this.d = array[3];
        this.tx = array[4];
        this.ty = array[5];
    }

    reset() {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;
        return this;
    }

    /**
     * sets the matrix properties
     *
     * @param {number} a - Matrix component
     * @param {number} b - Matrix component
     * @param {number} c - Matrix component
     * @param {number} d - Matrix component
     * @param {number} tx - Matrix component
     * @param {number} ty - Matrix component
     *
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    set(a: number, b: number, c: number, d: number, tx: number, ty: number): Transform2D {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.tx = tx;
        this.ty = ty;
        return this;
    }

    /**
     * Creates an array from the current Matrix object.
     *
     * @param {boolean} p_transpose - Whether we need to transpose the matrix or not
     * @param {number[]} [r_out] - If provided the array will be assigned to out
     * @return {number[]} the newly created array which contains the matrix
     */
    as_array(p_transpose: boolean, r_out?: number[]): number[] {
        if (!r_out && !this._array) {
            this._array = new Array(9);
        }
        r_out = r_out || this._array;
        if (p_transpose) {
            r_out[0] = this.a;
            r_out[1] = this.b;
            r_out[2] = 0;
            r_out[3] = this.c;
            r_out[4] = this.d;
            r_out[5] = 0;
            r_out[6] = this.tx;
            r_out[7] = this.ty;
            r_out[8] = 1;
        } else {
            r_out[0] = this.a;
            r_out[1] = this.c;
            r_out[2] = this.tx;
            r_out[3] = this.b;
            r_out[4] = this.d;
            r_out[5] = this.ty;
            r_out[6] = 0;
            r_out[7] = 0;
            r_out[8] = 1;
        }

        return r_out;
    }

    get_elements(p_row: number) {
        switch (p_row) {
            case 0: return Vector2.new(this.a, this.b);
            case 1: return Vector2.new(this.c, this.d);
            case 2: return Vector2.new(this.tx, this.ty);
        }
    }

    get_axis(p_axis: number) {
        switch (p_axis) {
            case 0: return Vector2.new(this.a, this.b);
            case 1: return Vector2.new(this.c, this.d);
            case 2: return Vector2.new(this.tx, this.ty);
        }
    }

    basis_determinant() {
        return this.a * this.d - this.b * this.c;
    }

    equals(p_matrix: Transform2D) {
        return (
            this.a === p_matrix.a
            &&
            this.b === p_matrix.b
            &&
            this.c === p_matrix.c
            &&
            this.d === p_matrix.d
            &&
            this.tx === p_matrix.tx
            &&
            this.ty === p_matrix.ty
        );
    }

    /**
     * @param {Vector2Like} p_vec - The origin
     * @param {Vector2} [r_out] - The point that the new position is assigned to (allowed to be same as input)
     * @return {Vector2} The new point, transformed through this matrix
     */
    basis_xform(p_vec: Vector2Like, r_out?: Vector2): Vector2 {
        r_out = r_out || Vector2.new();
        const x = (this.a * p_vec.x) + (this.c * p_vec.y);
        const y = (this.b * p_vec.x) + (this.d * p_vec.y);
        return r_out.set(x, y);
    }

    /**
     * @param {Vector2Like} p_vec - The origin
     * @param {Vector2} [r_out] - The point that the new position is assigned to (allowed to be same as input)
     * @return {Vector2} The new point, inverse-transformed through this matrix
     */
    basis_xform_inv(p_vec: Vector2Like, r_out?: Vector2): Vector2 {
        r_out = r_out || Vector2.new();
        const x = (this.a * p_vec.x) + (this.b * p_vec.y);
        const y = (this.c * p_vec.x) + (this.d * p_vec.y);
        return r_out.set(x, y);
    }

    /**
     * Get a new position with the current transformation applied.
     * Can be used to go from a child's coordinate space to the world coordinate space. (e.g. rendering)
     *
     * @param {Vector2Like} p_vec - The origin
     * @param {Vector2} [r_out] - The point that the new position is assigned to (allowed to be same as input)
     * @return {Vector2} The new point, transformed through this matrix
     */
    xform(p_vec: Vector2Like, r_out?: Vector2): Vector2 {
        r_out = r_out || Vector2.new();
        const x = (this.a * p_vec.x) + (this.c * p_vec.y) + this.tx;
        const y = (this.b * p_vec.x) + (this.d * p_vec.y) + this.ty;
        return r_out.set(x, y);
    }

    /**
     * Get a new position with the inverse of the current transformation applied.
     * Can be used to go from the world coordinate space to a child's coordinate space. (e.g. input)
     *
     * @param {Vector2Like} p_vec - The origin
     * @param {Vector2} [r_out] - The point that the new position is assigned to (allowed to be same as input)
     * @return {Vector2} The new point, inverse-transformed through this matrix
     */
    xform_inv(p_vec: Vector2Like, r_out?: Vector2): Vector2 {
        r_out = r_out || Vector2.new();
        const x = this.a * (p_vec.x - this.tx) + this.b * (p_vec.y - this.ty);
        const y = this.c * (p_vec.x - this.tx) + this.d * (p_vec.y - this.ty);
        return r_out.set(x, y);
    }

    /**
     * @param {Rect2} p_rect
     * @param {Rect2} [r_out]
     */
    xform_rect(p_rect: Rect2, r_out?: Rect2) {
        r_out = r_out || Rect2.new();
        const x = Vector2.new(this.a * p_rect.width, this.b * p_rect.width);
        const y = Vector2.new(this.c * p_rect.height, this.d * p_rect.height);
        const pos = Vector2.new(p_rect.x, p_rect.y);
        this.xform(pos, pos);

        r_out.x = pos.x;
        r_out.y = pos.y;
        const vec = Vector2.new();
        r_out.expand_to(vec.copy(pos).add(x));
        r_out.expand_to(vec.copy(pos).add(y));
        r_out.expand_to(vec.copy(pos).add(x).add(y));

        Vector2.free(x);
        Vector2.free(y);
        Vector2.free(pos);
        Vector2.free(vec);

        return r_out;
    }

    /**
     * @param {Rect2} p_rect
     * @param {Rect2} [r_out]
     */
    xform_inv_rect(p_rect: Rect2, r_out?: Rect2) {
        r_out = r_out || Rect2.new();
        const ends_0 = Vector2.new(p_rect.x, p_rect.y);
        const ends_1 = Vector2.new(p_rect.x, p_rect.y + p_rect.height);
        const ends_2 = Vector2.new(p_rect.x + p_rect.width, p_rect.y + p_rect.height);
        const ends_3 = Vector2.new(p_rect.x + p_rect.width, p_rect.y);

        this.xform_inv(ends_0, ends_0);
        this.xform_inv(ends_1, ends_1);
        this.xform_inv(ends_2, ends_2);
        this.xform_inv(ends_3, ends_3);

        r_out.x = ends_0.x;
        r_out.y = ends_0.y;
        r_out.expand_to(ends_1);
        r_out.expand_to(ends_2);
        r_out.expand_to(ends_3);

        Vector2.free(ends_0);
        Vector2.free(ends_1);
        Vector2.free(ends_2);
        Vector2.free(ends_3);

        return r_out;
    }

    /**
     * Translates the matrix on the x and y.
     *
     * @param {number} x How much to translate x by
     * @param {number} y How much to translate y by
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    translate(x: number, y: number): Transform2D {
        this.tx += x;
        this.ty += y;

        return this;
    }

    /**
     * Return a new Matrix that not translated.
     */
    untranslated() {
        const copy = this.clone();
        copy.tx = copy.ty = 0;
        return copy;
    }

    /**
     * Applies a scale transformation to the matrix.
     *
     * @param {number} x The amount to scale horizontally
     * @param {number} y The amount to scale vertically
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    scale(x: number, y: number): Transform2D {
        this.a *= x;
        this.d *= y;
        this.c *= x;
        this.b *= y;
        this.tx *= x;
        this.ty *= y;
        return this;
    }

    scale_basis(x: number, y: number) {
        this.a *= x;
        this.b *= y;
        this.c *= x;
        this.d *= y;
        return this;
    }

    /**
     * Applies a rotation transformation to the matrix.
     *
     * @param {number} angle - The angle in radians.
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    rotate(angle: number): Transform2D {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const a1 = this.a;
        const c1 = this.c;
        const tx1 = this.tx;

        this.a = (a1 * cos) - (this.b * sin);
        this.b = (a1 * sin) + (this.b * cos);
        this.c = (c1 * cos) - (this.d * sin);
        this.d = (c1 * sin) + (this.d * cos);
        this.tx = (tx1 * cos) - (this.ty * sin);
        this.ty = (tx1 * sin) + (this.ty * cos);

        return this;
    }

    /**
     * Invert this matrix.
     * This method assumes the basis is a rotation matrix, with no scaling.
     * Use affine_inverse instead if scaling is required.
     */
    invert() {
        let tmp = this.a; this.a = this.c; this.c = tmp;
        const tx = this.a * (-this.tx) + this.c * (-this.ty);
        const ty = this.b * (-this.tx) + this.d * (-this.ty);
        this.tx = tx;
        this.ty = ty;
        return this;
    }

    /**
     * Return a inverted matrix
     */
    inverse() {
        const inv = this.clone();
        return inv.invert();
    }

    orthonormalize() {
        const x = Vector2.new(this.a, this.b);
        const y = Vector2.new(this.c, this.d);

        x.normalize();
        this.a = x.x;
        this.b = x.y;

        y.subtract(x.scale(x.dot(y)));
        y.normalize();

        this.c = y.x;
        this.d = y.y;

        Vector2.free(x);
        Vector2.free(y);

        return this;
    }

    orthonormalized() {
        const on = this.clone();
        return on.orthonormalize();
    }

    /**
     * Appends the given Matrix to this Matrix.
     *
     * @param {Transform2D} matrix - The matrix to append.
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    append(matrix: Transform2D): Transform2D {
        const a1 = this.a;
        const b1 = this.b;
        const c1 = this.c;
        const d1 = this.d;

        this.a = (matrix.a * a1) + (matrix.b * c1);
        this.b = (matrix.a * b1) + (matrix.b * d1);
        this.c = (matrix.c * a1) + (matrix.d * c1);
        this.d = (matrix.c * b1) + (matrix.d * d1);

        this.tx = (matrix.tx * a1) + (matrix.ty * c1) + this.tx;
        this.ty = (matrix.tx * b1) + (matrix.ty * d1) + this.ty;

        return this;
    }

    /**
     * Sets the matrix based on all the available properties
     *
     * @param {number} x - Position on the x axis
     * @param {number} y - Position on the y axis
     * @param {number} pivot_x - Pivot on the x axis
     * @param {number} pivot_y - Pivot on the y axis
     * @param {number} scale_x - Scale on the x axis
     * @param {number} scale_y - Scale on the y axis
     * @param {number} rotation - Rotation in radians
     * @param {number} skew_x - Skew on the x axis
     * @param {number} skew_y - Skew on the y axis
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    set_transform(x: number, y: number, pivot_x: number, pivot_y: number, scale_x: number, scale_y: number, rotation: number, skew_x: number, skew_y: number): Transform2D {
        this.a = Math.cos(rotation + skew_y) * scale_x;
        this.b = Math.sin(rotation + skew_y) * scale_x;
        this.c = -Math.sin(rotation - skew_x) * scale_y;
        this.d = Math.cos(rotation - skew_x) * scale_y;

        this.tx = x - ((pivot_x * this.a) + (pivot_y * this.c));
        this.ty = y - ((pivot_x * this.b) + (pivot_y * this.d));

        return this;
    }

    /**
     * Prepends the given Matrix to this Matrix (`Matrix_A *= Matrix_B` in Godot)
     *
     * @param {Transform2D} matrix - The matrix to prepend
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    prepend(matrix: Transform2D): Transform2D {
        const tx1 = this.tx;

        if (matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) {
            const a1 = this.a;
            const c1 = this.c;

            this.a = (a1 * matrix.a) + (this.b * matrix.c);
            this.b = (a1 * matrix.b) + (this.b * matrix.d);
            this.c = (c1 * matrix.a) + (this.d * matrix.c);
            this.d = (c1 * matrix.b) + (this.d * matrix.d);
        }

        this.tx = (tx1 * matrix.a) + (this.ty * matrix.c) + matrix.tx;
        this.ty = (tx1 * matrix.b) + (this.ty * matrix.d) + matrix.ty;

        return this;
    }

    /**
     * Inverts this matrix
     *
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    affine_inverse(): Transform2D {
        const det = (this.a * this.d) - (this.b * this.c);
        const idet = 1.0 / det;

        const tmp = this.d;
        this.d = this.a;
        this.a = tmp;

        this.a *= idet;
        this.b *= -idet;
        this.c *= -idet;
        this.d *= idet;

        const tx = (this.a * -this.tx) + (this.c * -this.ty);
        const ty = (this.b * -this.tx) + (this.d * -this.ty);

        this.tx = tx;
        this.ty = ty;

        return this;
    }

    /**
     * Resets this Matix to an identity (default) matrix.
     *
     * @return {Transform2D} This matrix. Good for chaining method calls.
     */
    identity(): Transform2D {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.tx = 0;
        this.ty = 0;

        return this;
    }

    /**
     * Creates a new Matrix object with the same values as this one.
     *
     * @return {Transform2D} A copy of this matrix. Good for chaining method calls.
     */
    clone(): Transform2D {
        return Transform2D.new(
            this.a,
            this.b,
            this.c,
            this.d,
            this.tx,
            this.ty
        );
    }

    /**
     * Copy the values of given matrix to this one.
     *
     * @param {Transform2D} matrix - The matrix to copy from.
     * @return {Transform2D} The matrix given in parameter with its values updated.
     */
    copy(matrix: Transform2D): Transform2D {
        this.a = matrix.a;
        this.b = matrix.b;
        this.c = matrix.c;
        this.d = matrix.d;
        this.tx = matrix.tx;
        this.ty = matrix.ty;

        return this;
    }

    static IDENTITY = new Transform2D;
}

/**
 * @type {Transform2D[]}
 */
const pool: Transform2D[] = [];
