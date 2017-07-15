import * as core from '../core';

/**
 * The instance name of the object.
 *
 * @memberof V.Node2D#
 * @member {string}
 */
core.Node2D.prototype.name = null;

/**
 * Returns the display object in the container
 *
 * @memberof V.Node2D#
 * @param {string} name - instance name
 * @return {V.Node2D} The child with the specified name.
 */
core.Node2D.prototype.getChildByName = function getChildByName(name)
{
    for (let i = 0; i < this.children.length; i++)
    {
        if (this.children[i].name === name)
        {
            return this.children[i];
        }
    }

    return null;
};
