import Vector2 from './Vector2';
import { PI2 } from '../index';

/**
 * The pixi Matrix class as an object, which makes it a lot faster,
 * here is a representation of it :
 * | a | c | tx|
 * | b | d | ty|
 * | 0 | 0 | 1 |
 */
export default class Matrix {
    get origin() {
        return this._origin.set(this.tx, this.ty);
    }
    set origin(value) {
        this._origin.copy(value);
    }
    set_origin(value) {
        this._origin.copy(value);
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
    constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
        /**
         * @type {number}
         * @default 1
         */
        this.a = a;

        /**
         * @type {number}
         * @default 0
         */
        this.b = b;

        /**
         * @type {number}
         * @default 0
         */
        this.c = c;

        /**
         * @type {number}
         * @default 1
         */
        this.d = d;

        /**
         * @type {number}
         * @default 0
         */
        this.tx = tx;

        /**
         * @type {number}
         * @default 0
         */
        this.ty = ty;

        /**
         * @type {Float32Array}
         * @private
         */
        this.array = null;
        /**
         * @type {Vector2}
         * @private
         */
        this._origin = new Vector2();
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
    from_array(array) {
        this.a = array[0];
        this.b = array[1];
        this.c = array[3];
        this.d = array[4];
        this.tx = array[2];
        this.ty = array[5];
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
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    set(a, b, c, d, tx, ty) {
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
     * @param {boolean} transpose - Whether we need to transpose the matrix or not
     * @param {Float32Array} [out=new Float32Array(9)] - If provided the array will be assigned to out
     * @return {Float32Array} the newly created array which contains the matrix
     */
    to_array(transpose, out) {
        if (!this.array) {
            this.array = new Float32Array(9);
        }

        const array = out || this.array;

        if (transpose) {
            array[0] = this.a;
            array[1] = this.b;
            array[2] = 0;
            array[3] = this.c;
            array[4] = this.d;
            array[5] = 0;
            array[6] = this.tx;
            array[7] = this.ty;
            array[8] = 1;
        }
        else {
            array[0] = this.a;
            array[1] = this.c;
            array[2] = this.tx;
            array[3] = this.b;
            array[4] = this.d;
            array[5] = this.ty;
            array[6] = 0;
            array[7] = 0;
            array[8] = 1;
        }

        return array;
    }

    /**
     * Get a new position with the current transformation applied.
     * Can be used to go from a child's coordinate space to the world coordinate space. (e.g. rendering)
     *
     * @param {import('./Vector2').Vector2Like} pos - The origin
     * @param {import('./Vector2').Vector2Like} [new_pos] - The point that the new position is assigned to (allowed to be same as input)
     * @return {import('./Vector2').Vector2Like} The new point, transformed through this matrix
     */
    basis_xform(pos, new_pos) {
        new_pos = new_pos || new Vector2();

        const x = pos.x;
        const y = pos.y;

        new_pos.x = (this.a * x) + (this.c * y) + this.tx;
        new_pos.y = (this.b * x) + (this.d * y) + this.ty;

        return new_pos;
    }

    /**
     * Get a new position with the inverse of the current transformation applied.
     * Can be used to go from the world coordinate space to a child's coordinate space. (e.g. input)
     *
     * @param {Vector2} pos - The origin
     * @param {Vector2} [new_pos] - The point that the new position is assigned to (allowed to be same as input)
     * @return {Vector2} The new point, inverse-transformed through this matrix
     */
    basis_xform_inv(pos, new_pos) {
        new_pos = new_pos || new Vector2();

        const id = 1 / ((this.a * this.d) + (this.c * -this.b));

        const x = pos.x;
        const y = pos.y;

        new_pos.x = (this.d * id * x) + (-this.c * id * y) + (((this.ty * this.c) - (this.tx * this.d)) * id);
        new_pos.y = (this.a * id * y) + (-this.b * id * x) + (((-this.ty * this.a) + (this.tx * this.b)) * id);

        return new_pos;
    }

    /**
     * Translates the matrix on the x and y.
     *
     * @param {number} x How much to translate x by
     * @param {number} y How much to translate y by
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    translate(x, y) {
        this.tx += x;
        this.ty += y;

        return this;
    }

    /**
     * Applies a scale transformation to the matrix.
     *
     * @param {number} x The amount to scale horizontally
     * @param {number} y The amount to scale vertically
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    scale(x, y) {
        this.a *= x;
        this.d *= y;
        this.c *= x;
        this.b *= y;
        this.tx *= x;
        this.ty *= y;

        return this;
    }

    /**
     * Applies a rotation transformation to the matrix.
     *
     * @param {number} angle - The angle in radians.
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    rotate(angle) {
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
     * Appends the given Matrix to this Matrix.
     *
     * @param {Matrix} matrix - The matrix to append.
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    append(matrix) {
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
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    set_transform(x, y, pivot_x, pivot_y, scale_x, scale_y, rotation, skew_x, skew_y) {
        this.a = Math.cos(rotation + skew_y) * scale_x;
        this.b = Math.sin(rotation + skew_y) * scale_x;
        this.c = -Math.sin(rotation - skew_x) * scale_y;
        this.d = Math.cos(rotation - skew_x) * scale_y;

        this.tx = x - ((pivot_x * this.a) + (pivot_y * this.c));
        this.ty = y - ((pivot_x * this.b) + (pivot_y * this.d));

        return this;
    }

    /**
     * Prepends the given Matrix to this Matrix.
     *
     * @param {Matrix} matrix - The matrix to prepend
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    prepend(matrix) {
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
     * Decomposes the matrix (x, y, scaleX, scaleY, and rotation) and sets the properties on to a transform.
     *
     * @param {import('./Transform').default} transform - The transform to apply the properties to.
     * @return {import('./Transform').default} The transform with the newly applied properties
     */
    decompose(transform) {
        // sort out rotation / skew..
        const a = this.a;
        const b = this.b;
        const c = this.c;
        const d = this.d;

        const skew_x = -Math.atan2(-c, d);
        const skew_y = Math.atan2(b, a);

        const delta = Math.abs(skew_x + skew_y);

        if (delta < 0.00001 || Math.abs(PI2 - delta) < 0.00001) {
            transform.rotation = skew_y;

            if (a < 0 && d >= 0) {
                transform.rotation += (transform.rotation <= 0) ? Math.PI : -Math.PI;
            }

            transform.skew.x = transform.skew.y = 0;
        }
        else {
            transform.rotation = 0;
            transform.skew.x = skew_x;
            transform.skew.y = skew_y;
        }

        // next set scale
        transform.scale.x = Math.sqrt((a * a) + (b * b));
        transform.scale.y = Math.sqrt((c * c) + (d * d));

        // next set position
        transform.position.x = this.tx;
        transform.position.y = this.ty;

        return transform;
    }

    /**
     * Inverts this matrix
     *
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    affine_inverse() {
        const a1 = this.a;
        const b1 = this.b;
        const c1 = this.c;
        const d1 = this.d;
        const tx1 = this.tx;
        const n = (a1 * d1) - (b1 * c1);

        this.a = d1 / n;
        this.b = -b1 / n;
        this.c = -c1 / n;
        this.d = a1 / n;
        this.tx = ((c1 * this.ty) - (d1 * tx1)) / n;
        this.ty = -((a1 * this.ty) - (b1 * tx1)) / n;

        return this;
    }

    /**
     * Resets this Matix to an identity (default) matrix.
     *
     * @return {Matrix} This matrix. Good for chaining method calls.
     */
    identity() {
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
     * @return {Matrix} A copy of this matrix. Good for chaining method calls.
     */
    clone() {
        const matrix = new Matrix();

        matrix.a = this.a;
        matrix.b = this.b;
        matrix.c = this.c;
        matrix.d = this.d;
        matrix.tx = this.tx;
        matrix.ty = this.ty;

        return matrix;
    }

    /**
     * Changes the values of the given matrix to be the same as the ones in this matrix
     *
     * @param {Matrix} matrix - The matrix to copy from.
     * @return {Matrix} The matrix given in parameter with its values updated.
     */
    copy(matrix) {
        matrix.a = this.a;
        matrix.b = this.b;
        matrix.c = this.c;
        matrix.d = this.d;
        matrix.tx = this.tx;
        matrix.ty = this.ty;

        return matrix;
    }

    /**
     * A default (identity) matrix
     *
     * @static
     * @const
     */
    static get IDENTITY() {
        return new Matrix();
    }

    /**
     * A temp matrix
     *
     * @static
     * @const
     */
    static get TEMP_MATRIX() {
        return new Matrix();
    }
}
