import ObservableVector2 from './observable_vector2';
import Matrix from './matrix';

/**
 * Transform that takes care about its versions
 */
export default class Transform {
    constructor() {
        /**
         * The global matrix transform. It can be swapped temporarily by some functions like get_local_Bounds()
         *
         * @member {Matrix}
         */
        this.world_transform = new Matrix();

        /**
         * The local matrix transform
         *
         * @member {Matrix}
         */
        this.local_transform = new Matrix();

        /**
         * The coordinate of the object relative to the local coordinates of the parent.
         *
         * @member {ObservableVector2}
         */
        this.position = new ObservableVector2(this.on_change, this, 0, 0);

        /**
         * The scale factor of the object.
         *
         * @member {ObservableVector2}
         */
        this.scale = new ObservableVector2(this.on_change, this, 1, 1);

        /**
         * The pivot point of the node that it rotates around
         *
         * @member {ObservableVector2}
         */
        this.pivot = new ObservableVector2(this.on_change, this, 0, 0);

        /**
         * The skew amount, on the x and y axis.
         *
         * @member {ObservableVector2}
         */
        this.skew = new ObservableVector2(this.update_skew, this, 0, 0);

        this._rotation = 0;

        this._cx = 1; // cos rotation + skewY;
        this._sx = 0; // sin rotation + skewY;
        this._cy = 0; // cos rotation + Math.PI/2 - skewX;
        this._sy = 1; // sin rotation + Math.PI/2 - skewX;

        this._parent_id = 0;

        this._world_id = 0;
        this._local_id = 0;

        this._current_local_id = 0;
    }

    /**
     * Called when a value changes.
     *
     * @private
     */
    on_change() {
        this._local_id++;
    }

    /**
     * Called when skew or rotation changes
     *
     * @private
     */
    update_skew() {
        this._cx = Math.cos(this._rotation + this.skew._y);
        this._sx = Math.sin(this._rotation + this.skew._y);
        this._cy = -Math.sin(this._rotation - this.skew._x); // cos, added PI/2
        this._sy = Math.cos(this._rotation - this.skew._x); // sin, added PI/2

        this._local_id++;
    }

    /**
     * Updates only local matrix
     */
    update_local_transform() {
        const lt = this.local_transform;

        if (this._local_id !== this._current_local_id) {
            // get the matrix values of the displayobject based on its transform properties..
            lt.a = this._cx * this.scale._x;
            lt.b = this._sx * this.scale._x;
            lt.c = this._cy * this.scale._y;
            lt.d = this._sy * this.scale._y;

            lt.tx = this.position._x - ((this.pivot._x * lt.a) + (this.pivot._y * lt.c));
            lt.ty = this.position._y - ((this.pivot._x * lt.b) + (this.pivot._y * lt.d));
            this._current_local_id = this._local_id;

            // force an update..
            this._parent_id = -1;
        }
    }

    /**
     * Updates the values of the object and applies the parent's transform.
     *
     * @param {Transform} parent_transform - The transform of the parent of this object
     */
    update_transform(parent_transform) {
        const lt = this.local_transform;

        if (this._local_id !== this._current_local_id) {
            // get the matrix values of the displayobject based on its transform properties..
            lt.a = this._cx * this.scale._x;
            lt.b = this._sx * this.scale._x;
            lt.c = this._cy * this.scale._y;
            lt.d = this._sy * this.scale._y;

            lt.tx = this.position._x - ((this.pivot._x * lt.a) + (this.pivot._y * lt.c));
            lt.ty = this.position._y - ((this.pivot._x * lt.b) + (this.pivot._y * lt.d));
            this._current_local_id = this._local_id;

            // force an update..
            this._parent_id = -1;
        }

        if (this._parent_id !== parent_transform._world_id) {
            // concat the parent matrix with the objects transform.
            const pt = parent_transform.world_transform;
            const wt = this.world_transform;

            wt.a = (lt.a * pt.a) + (lt.b * pt.c);
            wt.b = (lt.a * pt.b) + (lt.b * pt.d);
            wt.c = (lt.c * pt.a) + (lt.d * pt.c);
            wt.d = (lt.c * pt.b) + (lt.d * pt.d);
            wt.tx = (lt.tx * pt.a) + (lt.ty * pt.c) + pt.tx;
            wt.ty = (lt.tx * pt.b) + (lt.ty * pt.d) + pt.ty;

            this._parent_id = parent_transform._world_id;

            // update the id of the transform..
            this._world_id++;
        }
    }

    /**
     * Decomposes a matrix and sets the transforms properties based on it.
     *
     * @param {Matrix} matrix - The matrix to decompose
     */
    set_from_matrix(matrix) {
        matrix.decompose(this);
        this._local_id++;
        return this;
    }

    /**
     * The rotation of the object in radians.
     *
     * @member {number}
     */
    get rotation() {
        return this._rotation;
    }

    set rotation(value) // eslint-disable-line require-jsdoc
    {
        if (this._rotation !== value) {
            this._rotation = value;
            this.update_skew();
        }
    }
}

export const IDENTITY = new Transform();
