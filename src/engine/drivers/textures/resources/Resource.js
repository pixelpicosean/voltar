import { Runner } from '../../runner';

/**
 * Base resource class for textures that manages validation and uploading, depending on its type.
 *
 * Uploading of a base texture to the GPU is required.
 */
export default class Resource
{
    /**
     * @param {number} [width=0] Width of the resource
     * @param {number} [height=0] Height of the resource
     */
    constructor(width = 0, height = 0)
    {
        /**
         * Internal width of the resource
         * @type {number}
         * @protected
         */
        this._width = width;

        /**
         * Internal height of the resource
         * @type {number}
         * @protected
         */
        this._height = height;

        /**
         * If resource has been destroyed
         * @type {boolean}
         * @readonly
         * @default false
         */
        this.destroyed = false;

        /**
         * `true` if resource is created by BaseTexture
         * useful for doing cleanup with BaseTexture destroy
         * and not cleaning up resources that were created
         * externally.
         * @type {boolean}
         * @protected
         */
        this.internal = false;

        /**
         * Mini-runner for handling resize events
         *
         * @type {Runner}
         * @private
         */
        this.onResize = new Runner('setRealSize');

        /**
         * Mini-runner for handling update events
         *
         * @type {Runner}
         * @private
         */
        this.onUpdate = new Runner('update');
    }

    /**
     * Bind to a parent BaseTexture
     *
     * @param {BaseTexture} baseTexture - Parent texture
     */
    bind(baseTexture)
    {
        this.onResize.add(baseTexture);
        this.onUpdate.add(baseTexture);

        // Call a resize immediate if we already
        // have the width and height of the resource
        if (this._width || this._height)
        {
            this.onResize.run(this._width, this._height);
        }
    }

    /**
     * Unbind to a parent BaseTexture
     *
     * @param {BaseTexture} baseTexture - Parent texture
     */
    unbind(baseTexture)
    {
        this.onResize.remove(baseTexture);
        this.onUpdate.remove(baseTexture);
    }

    /**
     * Trigger a resize event
     */
    resize(width, height)
    {
        if (width !== this._width || height !== this._height)
        {
            this._width = width;
            this._height = height;
            this.onResize.run(width, height);
        }
    }

    /**
     * Has been validated
     * @readonly
     * @type {boolean}
     */
    get valid()
    {
        return !!this._width && !!this._height;
    }

    /**
     * Has been updated trigger event
     */
    update()
    {
        if (!this.destroyed)
        {
            this.onUpdate.run();
        }
    }

    /**
     * This can be overridden to start preloading a resource
     * or do any other prepare step.
     * @protected
     * @return {Promise<void>} Handle the validate event
     */
    load()
    {
        return Promise.resolve();
    }

    /**
     * The width of the resource.
     *
     * @type {number}
     * @readonly
     */
    get width()
    {
        return this._width;
    }

    /**
     * The height of the resource.
     *
     * @type {number}
     * @readonly
     */
    get height()
    {
        return this._height;
    }

    /**
     * Uploads the texture or returns false if it cant for some reason. Override this.
     *
     * @param {import('../../rasterizer_canvas').RasterizerCanvas} renderer - yeah, renderer!
     * @param {BaseTexture} baseTexture - the texture
     * @param {GLTexture} glTexture - texture instance for this webgl context
     * @returns {boolean} true is success
     */
    upload(renderer, baseTexture, glTexture) // eslint-disable-line no-unused-vars
    {
        return false;
    }

    /**
     * Set the style, optional to override
     *
     * @param {import('../../rasterizer_canvas').RasterizerCanvas} renderer - yeah, renderer!
     * @param {BaseTexture} baseTexture - the texture
     * @param {GLTexture} glTexture - texture instance for this webgl context
     * @returns {boolean} `true` is success
     */
    style(renderer, baseTexture, glTexture) // eslint-disable-line no-unused-vars
    {
        return false;
    }

    /**
     * Clean up anything, this happens when destroying is ready.
     *
     * @protected
     */
    dispose()
    {
        // override
    }

    /**
     * Call when destroying resource, unbind any BaseTexture object
     * before calling this method, as reference counts are maintained
     * internally.
     */
    destroy()
    {
        if (!this.destroyed)
        {
            this.onResize.removeAll();
            this.onResize = null;
            this.onUpdate.removeAll();
            this.onUpdate = null;
            this.destroyed = true;
            this.dispose();
        }
    }
}
