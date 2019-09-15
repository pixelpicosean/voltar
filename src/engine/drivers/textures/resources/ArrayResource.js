import TextureResource from './Resource';
import BaseTexture from '../BaseTexture';
import { TARGETS } from '../../constants';
import { autoDetectResource } from './autoDetectResource';
import GLTexture from '../GLTexture';

/**
 * A resource that contains a number of sources.
 *
 * @param {number|Array<*>} source - Number of items in array or the collection
 *        of image URLs to use. Can also be resources, image elements, canvas, etc.
 * @param {object} [options] Options to apply to {@link autoDetectResource}
 * @param {number} [options.width] - Width of the resource
 * @param {number} [options.height] - Height of the resource
 */
export default class ArrayResource extends TextureResource
{
    constructor(source, options)
    {
        options = options || {};

        let urls;
        let length = source;

        if (Array.isArray(source))
        {
            urls = source;
            length = source.length;
        }

        super(options.width, options.height);

        /**
         * Collection of resources.
         * @member {Array<PIXI.BaseTexture>}
         * @readonly
         */
        this.items = [];

        /**
         * Dirty IDs for each part
         * @member {Array<number>}
         * @readonly
         */
        this.itemDirtyIds = [];

        for (let i = 0; i < length; i++)
        {
            const partTexture = new BaseTexture();

            this.items.push(partTexture);
            this.itemDirtyIds.push(-1);
        }

        /**
         * Number of elements in array
         *
         * @member {number}
         * @readonly
         */
        this.length = length;

        /**
         * Promise when loading
         * @member {Promise}
         * @private
         * @default null
         */
        this._load = null;

        if (urls)
        {
            for (let i = 0; i < length; i++)
            {
                this.addResourceAt(autoDetectResource(urls[i], options), i);
            }
        }
    }

    /**
     * Destroy this BaseImageResource
     * @override
     */
    dispose()
    {
        for (let i = 0, len = this.length; i < len; i++)
        {
            this.items[i].destroy();
        }
        this.items = null;
        this.itemDirtyIds = null;
        this._load = null;
    }

    /**
     * Set a resource by ID
     *
     * @param {TextureResource} resource
     * @param {number} index - Zero-based index of resource to set
     * @return {ArrayResource} Instance for chaining
     */
    addResourceAt(resource, index)
    {
        const baseTexture = this.items[index];

        if (!baseTexture)
        {
            throw new Error(`Index ${index} is out of bounds`);
        }

        // Inherit the first resource dimensions
        if (resource.valid && !this.valid)
        {
            this.resize(resource.width, resource.height);
        }

        this.items[index].setResource(resource);

        return this;
    }

    /**
     * Set the parent base texture
     * @member {PIXI.BaseTexture}
     * @override
     */
    bind(baseTexture)
    {
        super.bind(baseTexture);

        baseTexture.target = TARGETS.TEXTURE_2D_ARRAY;

        for (let i = 0; i < this.length; i++)
        {
            this.items[i].on('update', baseTexture.update, baseTexture);
        }
    }

    /**
     * Unset the parent base texture
     * @member {PIXI.BaseTexture}
     * @override
     */
    unbind(baseTexture)
    {
        super.unbind(baseTexture);

        for (let i = 0; i < this.length; i++)
        {
            this.items[i].off('update', baseTexture.update, baseTexture);
        }
    }

    /**
     * Load all the resources simultaneously
     * @override
     * @return {Promise<void>} When load is resolved
     */
    load()
    {
        if (this._load)
        {
            return this._load;
        }

        const resources = this.items.map((item) => item.resource);

        // TODO: also implement load part-by-part strategy
        const promises = resources.map((item) => item.load());

        this._load = Promise.all(promises)
            .then(() =>
            {
                const { width, height } = resources[0];

                this.resize(width, height);

                return Promise.resolve(this);
            }
            );

        return this._load;
    }

    /**
     * Upload the resources to the GPU.
     * @param {import('../../rasterizer_canvas').RasterizerCanvas} renderer
     * @param {BaseTexture} texture
     * @param {GLTexture} glTexture
     * @returns {boolean} whether texture was uploaded
     */
    upload(renderer, texture, glTexture)
    {
        const { length, itemDirtyIds, items } = this;
        const { gl } = renderer;

        if (glTexture.dirtyId < 0)
        {
            // @ts-ignore
            gl.texImage3D(
                // @ts-ignore
                gl.TEXTURE_2D_ARRAY,
                0,
                texture.format,
                this._width,
                this._height,
                length,
                0,
                texture.format,
                texture.type,
                null
            );
        }

        for (let i = 0; i < length; i++)
        {
            const item = items[i];

            if (itemDirtyIds[i] < item.dirtyId)
            {
                itemDirtyIds[i] = item.dirtyId;
                if (item.valid)
                {
                    // @ts-ignore
                    gl.texSubImage3D(
                        // @ts-ignore
                        gl.TEXTURE_2D_ARRAY,
                        0,
                        0, // xoffset
                        0, // yoffset
                        i, // zoffset
                        item.resource.width,
                        item.resource.height,
                        1,
                        texture.format,
                        texture.type,
                        item.resource.source
                    );
                }
            }
        }

        return true;
    }
}
