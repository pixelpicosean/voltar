import BaseRenderTexture from './BaseRenderTexture';
import Texture from '../textures/Texture';
import { Rect2 } from 'engine/core/math/rect2';

/**
 * A RenderTexture is a special texture that allows any PixiJS display object to be rendered to it.
 *
 * __Hint__: All DisplayObjects (i.e. Sprites) that render to a RenderTexture should be preloaded
 * otherwise black rectangles will be drawn instead.
 *
 * __Hint-2__: The actual memory allocation will happen on first render.
 * You shouldn't create renderTextures each frame just to delete them after, try to reuse them.
 *
 * A RenderTexture takes a snapshot of any Display Object given to its render method. For example:
 */
export default class RenderTexture extends Texture
{
    /**
     * @param {BaseRenderTexture} baseRenderTexture - The base texture object that this texture uses
     * @param {Rect2} [frame] - The rectangle frame of the texture to show
     */
    constructor(baseRenderTexture, frame)
    {
        // support for legacy..
        let _legacyRenderer = null;

        if (!(baseRenderTexture instanceof BaseRenderTexture))
        {
            /* eslint-disable prefer-rest-params, no-console */
            const width = arguments[1];
            const height = arguments[2];
            const scaleMode = arguments[3];
            const resolution = arguments[4];

            // we have an old render texture..
            console.warn(`Please use RenderTexture.create(${width}, ${height}) instead of the ctor directly.`);
            _legacyRenderer = arguments[0];
            /* eslint-enable prefer-rest-params, no-console */

            frame = null;
            baseRenderTexture = new BaseRenderTexture({
                width,
                height,
                scaleMode,
                resolution,
            });
        }

        super(baseRenderTexture, frame);

        /** @type {BaseRenderTexture} */
        this.baseTexture;

        this.legacyRenderer = _legacyRenderer;

        /**
         * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
         *
         * @type {boolean}
         */
        this.valid = true;

        /**
         * Stores `sourceFrame` when this texture is inside current filter stack.
         * You can read it inside filters.
         *
         * @readonly
         * @type {Rect2}
         */
        this.filterFrame = null;

        /**
         * The key for pooled texture of FilterSystem
         * @protected
         * @type {string}
         */
        this.filterPoolKey = null;

        this.updateUvs();
    }

    /**
     * Resizes the RenderTexture.
     *
     * @param {number} width - The width to resize to.
     * @param {number} height - The height to resize to.
     * @param {boolean} [resizeBaseTexture=true] - Should the baseTexture.width and height values be resized as well?
     */
    resize(width, height, resizeBaseTexture = true)
    {
        width = Math.ceil(width);
        height = Math.ceil(height);

        // TODO - could be not required..
        this.valid = (width > 0 && height > 0);

        this._frame.width = this.orig.width = width;
        this._frame.height = this.orig.height = height;

        if (resizeBaseTexture)
        {
            this.baseTexture.resize(width, height);
        }

        this.updateUvs();
    }

    /**
     * Changes the resolution of baseTexture, but does not change framebuffer size.
     *
     * @param {number} resolution - The new resolution to apply to RenderTexture
     */
    setResolution(resolution)
    {
        const { baseTexture } = this;

        if (baseTexture.resolution === resolution)
        {
            return;
        }

        baseTexture.setResolution(resolution);
        this.resize(baseTexture.width, baseTexture.height, false);
    }

    /**
     * A short hand way of creating a render texture.
     *
     * @param {object} [options] - Options
     * @param {number} [options.width=100] - The width of the render texture
     * @param {number} [options.height=100] - The height of the render texture
     * @param {number} [options.scaleMode=settings.SCALE_MODE] - See {@link SCALE_MODES} for possible values
     * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the texture being generated
     * @return {RenderTexture} The new render texture
     */
    static create(options)
    {
        // fallback, old-style: create(width, height, scaleMode, resolution)
        if (typeof options === 'number')
        {
            /* eslint-disable prefer-rest-params */
            options = {
                width: options,
                height: arguments[1],
                scaleMode: arguments[2],
                resolution: arguments[3],
            };
            /* eslint-enable prefer-rest-params */
        }

        return new RenderTexture(new BaseRenderTexture(options));
    }
}
