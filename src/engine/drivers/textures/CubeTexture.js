import BaseTexture from './BaseTexture';
import CubeResource from './resources/CubeResource';
import Resource from './resources/Resource';

/**
 * A Texture that depends on six other resources.
 */
export default class CubeTexture extends BaseTexture
{
    /**
     * Generate a new CubeTexture.
     * @static
     * @param {string[]|Resource[]} resources - Collection of 6 URLs or resources
     * @param {object} [options] - Optional options passed to the resources being loaded.
     *        See {@PIXI.resources.autoDetectResource autoDetectResource} for more info
     *        on the options available to each resource.
     */
    static from(resources, options)
    {
        return new CubeTexture(new CubeResource(resources, options));
    }
}
