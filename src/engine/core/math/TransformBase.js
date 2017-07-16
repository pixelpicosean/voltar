import Matrix from './Matrix';

/**
 * Generic class to deal with traditional 2D matrix transforms
 *
 * @class
 * @memberof V
 */
export default class TransformBase
{
    /**
     *
     */
    constructor()
    {
        /**
         * The global matrix transform. It can be swapped temporarily by some functions like get_local_Bounds()
         *
         * @member {V.Matrix}
         */
        this.world_transform = new Matrix();

        /**
         * The local matrix transform
         *
         * @member {V.Matrix}
         */
        this.local_transform = new Matrix();

        this._worldID = 0;
        this._parentID = 0;
    }

    /**
     * TransformBase does not have decomposition, so this function wont do anything
     */
    updateLocalTransform()
    {
        // empty
    }

    /**
     * Updates the values of the object and applies the parent's transform.
     *
     * @param {V.TransformBase} parentTransform - The transform of the parent of this object
     */
    update_transform(parentTransform)
    {
        const pt = parentTransform.world_transform;
        const wt = this.world_transform;
        const lt = this.local_transform;

        // concat the parent matrix with the objects transform.
        wt.a = (lt.a * pt.a) + (lt.b * pt.c);
        wt.b = (lt.a * pt.b) + (lt.b * pt.d);
        wt.c = (lt.c * pt.a) + (lt.d * pt.c);
        wt.d = (lt.c * pt.b) + (lt.d * pt.d);
        wt.tx = (lt.tx * pt.a) + (lt.ty * pt.c) + pt.tx;
        wt.ty = (lt.tx * pt.b) + (lt.ty * pt.d) + pt.ty;

        this._worldID ++;
    }

}

/**
 * Updates the values of the object and applies the parent's transform.
 * @param  parentTransform {V.Transform} The transform of the parent of this object
 *
 */
TransformBase.prototype.updateWorldTransform = TransformBase.prototype.update_transform;

TransformBase.IDENTITY = new TransformBase();
