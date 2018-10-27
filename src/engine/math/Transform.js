import Vector2 from './Vector2';
import ObservableVector2 from './ObservableVector2';
import TransformBase from './TransformBase';
import Matrix from './Matrix';

/**
 * Generic class to deal with traditional 2D matrix transforms
 * local transformation is calculated from position,scale,skew and rotation
 */
export default class Transform extends TransformBase {
    constructor() {
        super();

        /**
         * The coordinate of the object relative to the local coordinates of the parent.
         *
         * @member {Vector2}
         */
        this.position = new Vector2(0, 0);

        /**
         * The scale factor of the object.
         *
         * @member {Vector2}
         */
        this.scale = new Vector2(1, 1);

        /**
         * The skew amount, on the x and y axis.
         *
         * @member {ObservableVector2}
         */
        this.skew = new ObservableVector2(this.update_skew, this, 0, 0);

        /**
         * The pivot point of the node that it rotates around
         *
         * @member {Vector2}
         */
        this.pivot = new Vector2(0, 0);

        /**
         * The rotation value of the object, in radians
         *
         * @member {Number}
         * @private
         */
        this._rotation = 0;

        this._cx = 1; // cos rotation + skewY;
        this._sx = 0; // sin rotation + skewY;
        this._cy = 0; // cos rotation + Math.PI/2 - skewX;
        this._sy = 1; // sin rotation + Math.PI/2 - skewX;
    }

    /**
     * Updates the skew values when the skew or rotation changes.
     *
     * @private
     */
    update_skew() {
        this._cx = Math.cos(this._rotation + this.skew._y);
        this._sx = Math.sin(this._rotation + this.skew._y);
        this._cy = -Math.sin(this._rotation - this.skew._x); // cos, added PI/2
        this._sy = Math.cos(this._rotation - this.skew._x); // sin, added PI/2
    }

    /**
     * Updates only local matrix
     */
    update_local_transform() {
        const lt = this.local_transform;

        lt.a = this._cx * this.scale.x;
        lt.b = this._sx * this.scale.x;
        lt.c = this._cy * this.scale.y;
        lt.d = this._sy * this.scale.y;

        lt.tx = this.position.x - ((this.pivot.x * lt.a) + (this.pivot.y * lt.c));
        lt.ty = this.position.y - ((this.pivot.x * lt.b) + (this.pivot.y * lt.d));
    }

    /**
     * Updates the values of the object and applies the parent's transform.
     *
     * @param {Transform} parent_transform - The transform of the parent of this object
     */
    update_transform(parent_transform) {
        const lt = this.local_transform;

        lt.a = this._cx * this.scale.x;
        lt.b = this._sx * this.scale.x;
        lt.c = this._cy * this.scale.y;
        lt.d = this._sy * this.scale.y;

        lt.tx = this.position.x - ((this.pivot.x * lt.a) + (this.pivot.y * lt.c));
        lt.ty = this.position.y - ((this.pivot.x * lt.b) + (this.pivot.y * lt.d));

        // concat the parent matrix with the objects transform.
        const pt = parent_transform.world_transform;
        const wt = this.world_transform;

        wt.a = (lt.a * pt.a) + (lt.b * pt.c);
        wt.b = (lt.a * pt.b) + (lt.b * pt.d);
        wt.c = (lt.c * pt.a) + (lt.d * pt.c);
        wt.d = (lt.c * pt.b) + (lt.d * pt.d);
        wt.tx = (lt.tx * pt.a) + (lt.ty * pt.c) + pt.tx;
        wt.ty = (lt.tx * pt.b) + (lt.ty * pt.d) + pt.ty;

        this._world_id++;
    }

    /**
     * Decomposes a matrix and sets the transforms properties based on it.
     *
     * @param {Matrix} matrix - The matrix to decompose
     */
    set_from_matrix(matrix) {
        matrix.decompose(this);
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
        this._rotation = value;
        this.update_skew();
    }
}
