import BaseTexture from '../textures/BaseTexture';
import Framebuffer from '../framebuffer/Framebuffer';
import { SCALE_MODES } from '../constants';

/**
 * A BaseRenderTexture is a special texture that allows any PixiJS display object to be rendered to it.
 *
 * __Hint__: All DisplayObjects (i.e. Sprites) that render to a BaseRenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * A BaseRenderTexture takes a snapshot of any Display Object given to its render method. The position
 * and rotation of the given Display Objects is ignored. For example:
 *
 * The Sprite in this case will be rendered using its local transform. To render this sprite at 0,0
 * you can clear the transform.
 */
export default class BaseRenderTexture extends BaseTexture
{
    /**
     * @param {object} [options]
     * @param {number} [options.width=100] - The width of the base render texture.
     * @param {number} [options.height=100] - The height of the base render texture.
     * @param {SCALE_MODES} [options.scaleMode] - See {@link SCALE_MODES} for possible values.
     * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the texture being generated.
     */
    constructor(options)
    {
        if (typeof options === 'number')
        {
            /* eslint-disable prefer-rest-params */
            // Backward compatibility of signature
            const width = arguments[0];
            const height = arguments[1];
            const scaleMode = arguments[2];
            const resolution = arguments[3];

            options = { width, height, scaleMode, resolution };
            /* eslint-enable prefer-rest-params */
        }

        super(null, options);

        // @ts-ignore
        const { width, height } = options || {};

        // Set defaults
        this.mipmap = false;
        this.width = Math.ceil(width) || 100;
        this.height = Math.ceil(height) || 100;
        this.valid = true;

        /**
         * A reference to the canvas render target (we only need one as this can be shared across renderers)
         *
         * @protected
         * @member {object}
         */
        this._canvasRenderTarget = null;

        this.clearColor = [0, 0, 0, 0];

        this.framebuffer = new Framebuffer(this.width * this.resolution, this.height * this.resolution)
            .addColorTexture(0, this)
            .enableStencil();

        // TODO - could this be added the systems?

        /**
         * The data structure for the stencil masks.
         *
         * @member {Graphics[]}
         */
        this.stencilMaskStack = [];

        /**
         * The data structure for the filters.
         *
         * @member {Graphics[]}
         */
        this.filterStack = [{}];
    }

    /**
     * Resizes the BaseRenderTexture.
     *
     * @param {number} width - The width to resize to.
     * @param {number} height - The height to resize to.
     */
    resize(width, height)
    {
        width = Math.ceil(width);
        height = Math.ceil(height);
        this.framebuffer.resize(width * this.resolution, height * this.resolution);
    }

    /**
     * Frees the texture and framebuffer from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     * @fires BaseTexture#dispose
     */
    dispose()
    {
        this.framebuffer.dispose();

        super.dispose();
    }

    /**
     * Destroys this texture.
     *
     */
    destroy()
    {
        super.destroy();

        this.framebuffer = null;
    }
}
