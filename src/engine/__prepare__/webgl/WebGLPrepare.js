import BasePrepare from '../BasePrepare';
import WebGLRenderer from 'engine/renderers/webgl/WebGLRenderer';
import Node2D from 'engine/scene/Node2D';
import BaseTexture from 'engine/textures/BaseTexture';
import Graphics from 'engine/scene/graphics/Graphics';

/**
 * The prepare manager provides functionality to upload content to the GPU.
 *
 * An instance of this class is automatically created by default, and can be found at renderer.plugins.prepare
 */
export default class WebGLPrepare extends BasePrepare {
    /**
     * @param {WebGLRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer) {
        super(renderer);

        this.upload_hook_helper = this.renderer;

        // Add textures and graphics to upload
        this.register_find_hook(find_graphics);
        this.register_upload_hook(upload_base_textures);
        this.register_upload_hook(upload_graphics);
    }
}
/**
 * Built-in hook to upload Texture objects to the GPU.
 *
 * @private
 * @param {WebGLRenderer} renderer - instance of the webgl renderer
 * @param {Node2D} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function upload_base_textures(renderer, item) {
    if (item instanceof BaseTexture) {
        // if the texture already has a GL texture, then the texture has been prepared or rendered
        // before now. If the texture changed, then the changer should be calling texture.update() which
        // reuploads the texture without need for preparing it again
        if (!item._gl_textures[renderer.CONTEXT_UID]) {
            renderer.texture_manager.update_texture(item);
        }

        return true;
    }

    return false;
}

/**
 * Built-in hook to upload Graphics to the GPU.
 *
 * @private
 * @param {WebGLRenderer} renderer - instance of the webgl renderer
 * @param {Node2D} item - Item to check
 * @return {boolean} If item was uploaded.
 */
function upload_graphics(renderer, item) {
    if (item instanceof Graphics) {
        // if the item is not dirty and already has webgl data, then it got prepared or rendered
        // before now and we shouldn't waste time updating it again
        if (item.dirty || item.clear_dirty || !item._webGL[renderer.plugins.graphics.CONTEXT_UID]) {
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
 * @param {Node2D} item - Display object to check
 * @param {Array<*>} queue - Collection of items to upload
 * @return {boolean} if a Graphics object was found.
 */
function find_graphics(item, queue) {
    if (item instanceof Graphics) {
        queue.push(item);

        return true;
    }

    return false;
}

WebGLRenderer.register_plugin('prepare', WebGLPrepare);
