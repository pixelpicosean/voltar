import * as core from '../../core';
import BasePrepare from '../BasePrepare';

/**
 * The prepare manager provides functionality to upload content to the GPU.
 *
 * An instance of this class is automatically created by default, and can be found at renderer.plugins.prepare
 *
 * @class
 * @extends V.prepare.BasePrepare
 * @memberof V.prepare
 */
export default class WebGLPrepare extends BasePrepare
{
    /**
     * @param {V.WebGLRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer)
    {
        super(renderer);

        this.uploadHookHelper = this.renderer;

        // Add textures and graphics to upload
        this.registerFindHook(findGraphics);
        this.registerUploadHook(uploadBaseTextures);
        this.registerUploadHook(uploadGraphics);
    }
}
/**
 * Built-in hook to upload V.Texture objects to the GPU.
 *
 * @private
 * @param {V.WebGLRenderer} renderer - instance of the webgl renderer
 * @param {V.Node2D} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function uploadBaseTextures(renderer, item)
{
    if (item instanceof core.BaseTexture)
    {
        // if the texture already has a GL texture, then the texture has been prepared or rendered
        // before now. If the texture changed, then the changer should be calling texture.update() which
        // reuploads the texture without need for preparing it again
        if (!item._glTextures[renderer.CONTEXT_UID])
        {
            renderer.textureManager.updateTexture(item);
        }

        return true;
    }

    return false;
}

/**
 * Built-in hook to upload V.Graphics to the GPU.
 *
 * @private
 * @param {V.WebGLRenderer} renderer - instance of the webgl renderer
 * @param {V.Node2D} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function uploadGraphics(renderer, item)
{
    if (item instanceof core.Graphics)
    {
        // if the item is not dirty and already has webgl data, then it got prepared or rendered
        // before now and we shouldn't waste time updating it again
        if (item.dirty || item.clear_dirty || !item._webGL[renderer.plugins.graphics.CONTEXT_UID])
        {
            renderer.plugins.graphics.updateGraphics(item);
        }

        return true;
    }

    return false;
}

/**
 * Built-in hook to find graphics.
 *
 * @private
 * @param {V.Node2D} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a V.Graphics object was found.
 */
function findGraphics(item, queue)
{
    if (item instanceof core.Graphics)
    {
        queue.push(item);

        return true;
    }

    return false;
}

core.WebGLRenderer.registerPlugin('prepare', WebGLPrepare);
