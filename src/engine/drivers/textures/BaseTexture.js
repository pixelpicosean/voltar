import { VObject } from 'engine/core/v_object';
import { FORMATS, SCALE_MODES, TARGETS, TYPES, MIPMAP_MODES, WRAP_MODES } from '../constants';

import Resource from './resources/Resource';
import BufferResource from './resources/BufferResource';
import { autoDetectResource } from './resources/autoDetectResource';

import * as settings from '../settings';
import { uid } from '../utils/uid';
import { isPow2 } from '../utils/pow2';
import { BaseTextureCache, TextureCache } from '../utils/caches';

const defaultBufferOptions = {
    scaleMode: SCALE_MODES.NEAREST,
    format: FORMATS.RGBA,
    premultiplyAlpha: false,
};

/**
 * A Texture stores the information that represents an image.
 * All textures have a base texture, which contains information about the source.
 * Therefore you can have many textures all using a single BaseTexture
 *
 * @param {Resource|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement} [resource=null]
 *        The current resource to use, for things that aren't Resource objects, will be converted
 *        into a Resource.
 * @param {Object} [options] - Collection of options
 * @param {MIPMAP_MODES} [options.mipmap=settings.MIPMAP_TEXTURES] - If mipmapping is enabled for texture
 * @param {number} [options.anisotropicLevel=settings.ANISOTROPIC_LEVEL] - Anisotropic filtering level of texture
 * @param {WRAP_MODES} [options.wrapMode=settings.WRAP_MODE] - Wrap mode for textures
 * @param {SCALE_MODES} [options.scaleMode=settings.SCALE_MODE] - Default scale mode, linear, nearest
 * @param {FORMATS} [options.format=FORMATS.RGBA] - GL format type
 * @param {TYPES} [options.type=TYPES.UNSIGNED_BYTE] - GL data type
 * @param {TARGETS} [options.target=TARGETS.TEXTURE_2D] - GL texture target
 * @param {boolean} [options.premultiplyAlpha=true] - Pre multiply the image alpha
 * @param {number} [options.width=0] - Width of the texture
 * @param {number} [options.height=0] - Height of the texture
 * @param {number} [options.resolution] - Resolution of the base texture
 * @param {object} [options.resourceOptions] - Optional resource options,
 *        see {@link autoDetectResource autoDetectResource}
 */
export default class BaseTexture extends VObject
{
    constructor(resource = null, options = null)
    {
        super();

        options = options || {};

        const { premultiplyAlpha, mipmap, anisotropicLevel, scaleMode, width, height,
            wrapMode, format, type, target, resolution, resourceOptions } = options;

        // Convert the resource to a Resource object
        if (resource && !(resource instanceof Resource))
        {
            resource = autoDetectResource(resource, resourceOptions);
            resource.internal = true;
        }

        /**
         * The width of the base texture set when the image has loaded
         *
         * @readonly
         * @member {number}
         */
        this.width = width || 0;

        /**
         * The height of the base texture set when the image has loaded
         *
         * @readonly
         * @member {number}
         */
        this.height = height || 0;

        /**
         * The resolution / device pixel ratio of the texture
         *
         * @member {number}
         * @default settings.RESOLUTION
         */
        this.resolution = resolution || settings.RESOLUTION;

        /**
         * Mipmap mode of the texture, affects downscaled images
         *
         * @member {MIPMAP_MODES}
         * @default settings.MIPMAP_TEXTURES
         */
        this.mipmap = mipmap !== undefined ? mipmap : settings.MIPMAP_TEXTURES;

        /**
         * Anisotropic filtering level of texture
         *
         * @member {number}
         * @default settings.ANISOTROPIC_LEVEL
         */
        this.anisotropicLevel = anisotropicLevel !== undefined ? anisotropicLevel : settings.ANISOTROPIC_LEVEL;

        /**
         * How the texture wraps
         * @member {number}
         */
        this.wrapMode = wrapMode || settings.WRAP_MODE;

        /**
         * The scale mode to apply when scaling this texture
         *
         * @member {SCALE_MODES}
         * @default settings.SCALE_MODE
         */
        this.scaleMode = scaleMode !== undefined ? scaleMode : settings.SCALE_MODE;

        /**
         * The pixel format of the texture
         *
         * @member {FORMATS}
         * @default FORMATS.RGBA
         */
        this.format = format || FORMATS.RGBA;

        /**
         * The type of resource data
         *
         * @member {TYPES}
         * @default TYPES.UNSIGNED_BYTE
         */
        this.type = type || TYPES.UNSIGNED_BYTE;

        /**
         * The target type
         *
         * @member {TARGETS}
         * @default TARGETS.TEXTURE_2D
         */
        this.target = target || TARGETS.TEXTURE_2D;

        /**
         * Set to true to enable pre-multiplied alpha
         *
         * @member {boolean}
         * @default true
         */
        this.premultiplyAlpha = premultiplyAlpha !== false;

        /**
         * Global unique identifier for this BaseTexture
         *
         * @member {string}
         * @protected
         */
        this.uid = uid();

        /**
         * Used by automatic texture Garbage Collection, stores last GC tick when it was bound
         *
         * @member {number}
         * @protected
         */
        this.touched = 0;

        /**
         * Whether or not the texture is a power of two, try to use power of two textures as much
         * as you can
         *
         * @readonly
         * @member {boolean}
         * @default false
         */
        this.isPowerOfTwo = false;
        this._refreshPOT();

        /**
         * The map of render context textures where this is bound
         *
         * @member {Object}
         * @private
         */
        this._glTextures = {};

        /**
         * Used by TextureSystem to only update texture to the GPU when needed.
         * Please call `update()` to increment it.
         *
         * @readonly
         * @member {number}
         */
        this.dirtyId = 0;

        /**
         * Used by TextureSystem to only update texture style when needed.
         *
         * @protected
         * @member {number}
         */
        this.dirtyStyleId = 0;

        /**
         * Currently default cache ID.
         *
         * @member {string}
         */
        this.cacheId = null;

        /**
         * Generally speaking means when resource is loaded.
         * @readonly
         * @member {boolean}
         */
        this.valid = width > 0 && height > 0;

        /**
         * The collection of alternative cache ids, since some BaseTextures
         * can have more than one ID, short name and longer full URL
         *
         * @member {Array<string>}
         * @readonly
         */
        this.textureCacheIds = [];

        /**
         * Flag if BaseTexture has been destroyed.
         *
         * @member {boolean}
         * @readonly
         */
        this.destroyed = false;

        /**
         * The resource used by this BaseTexture, there can only
         * be one resource per BaseTexture, but textures can share
         * resources.
         *
         * @member {Resource}
         * @readonly
         */
        this.resource = null;

        /**
         * Number of the texture batch, used by multi-texture renderers
         *
         * @member {number}
         */
        this._batchEnabled = 0;

        /**
         * Fired when a not-immediately-available source finishes loading.
         *
         * @protected
         * @event BaseTexture#loaded
         * @param {BaseTexture} baseTexture - Resource loaded.
         */

        /**
         * Fired when a not-immediately-available source fails to load.
         *
         * @protected
         * @event BaseTexture#error
         * @param {BaseTexture} baseTexture - Resource errored.
         */

        /**
         * Fired when BaseTexture is updated.
         *
         * @protected
         * @event BaseTexture#loaded
         * @param {BaseTexture} baseTexture - Resource loaded.
         */

        /**
         * Fired when BaseTexture is destroyed.
         *
         * @protected
         * @event BaseTexture#error
         * @param {BaseTexture} baseTexture - Resource errored.
         */

        /**
         * Fired when BaseTexture is updated.
         *
         * @protected
         * @event BaseTexture#update
         * @param {BaseTexture} baseTexture - Instance of texture being updated.
         */

        /**
         * Fired when BaseTexture is destroyed.
         *
         * @protected
         * @event BaseTexture#dispose
         * @param {BaseTexture} baseTexture - Instance of texture being destroyed.
         */

        // Set the resource
        this.setResource(resource);
    }

    /**
     * Pixel width of the source of this texture
     *
     * @readonly
     * @member {number}
     */
    get realWidth()
    {
        return Math.ceil((this.width * this.resolution) - 1e-4);
    }

    /**
     * Pixel height of the source of this texture
     *
     * @readonly
     * @member {number}
     */
    get realHeight()
    {
        return Math.ceil((this.height * this.resolution) - 1e-4);
    }

    /**
     * Changes style options of BaseTexture
     *
     * @param {SCALE_MODES} [scaleMode] - Pixi scalemode
     * @param {MIPMAP_MODES} [mipmap] - enable mipmaps
     * @returns {BaseTexture} this
     */
    setStyle(scaleMode, mipmap)
    {
        let dirty;

        if (scaleMode !== undefined && scaleMode !== this.scaleMode)
        {
            this.scaleMode = scaleMode;
            dirty = true;
        }

        if (mipmap !== undefined && mipmap !== this.mipmap)
        {
            this.mipmap = mipmap;
            dirty = true;
        }

        if (dirty)
        {
            this.dirtyStyleId++;
        }

        return this;
    }

    /**
     * Changes w/h/resolution. Texture becomes valid if width and height are greater than zero.
     *
     * @param {number} width Visual width
     * @param {number} height Visual height
     * @param {number} [resolution] Optionally set resolution
     * @returns {BaseTexture} this
     */
    setSize(width, height, resolution)
    {
        this.resolution = resolution || this.resolution;
        this.width = width;
        this.height = height;
        this._refreshPOT();
        this.update();

        return this;
    }

    /**
     * Sets real size of baseTexture, preserves current resolution.
     *
     * @param {number} realWidth Full rendered width
     * @param {number} realHeight Full rendered height
     * @param {number} [resolution] Optionally set resolution
     * @returns {BaseTexture} this
     */
    setRealSize(realWidth, realHeight, resolution)
    {
        this.resolution = resolution || this.resolution;
        this.width = realWidth / this.resolution;
        this.height = realHeight / this.resolution;
        this._refreshPOT();
        this.update();

        return this;
    }

    /**
     * Refresh check for isPowerOfTwo texture based on size
     *
     * @private
     */
    _refreshPOT()
    {
        this.isPowerOfTwo = isPow2(this.realWidth) && isPow2(this.realHeight);
    }

    /**
     * Changes resolution
     *
     * @param {number} [resolution] res
     * @returns {BaseTexture} this
     */
    setResolution(resolution)
    {
        const oldResolution = this.resolution;

        if (oldResolution === resolution)
        {
            return this;
        }

        this.resolution = resolution;

        if (this.valid)
        {
            this.width = this.width * oldResolution / resolution;
            this.height = this.height * oldResolution / resolution;
            this.emit_signal('update', this);
        }

        this._refreshPOT();

        return this;
    }

    /**
     * Sets the resource if it wasn't set. Throws error if resource already present
     *
     * @param {Resource} resource - that is managing this BaseTexture
     * @returns {BaseTexture} this
     */
    setResource(resource)
    {
        if (this.resource === resource)
        {
            return this;
        }

        if (this.resource)
        {
            throw new Error('Resource can be set only once');
        }

        resource.bind(this);

        this.resource = resource;

        return this;
    }

    /**
     * Invalidates the object. Texture becomes valid if width and height are greater than zero.
     */
    update()
    {
        if (!this.valid)
        {
            if (this.width > 0 && this.height > 0)
            {
                this.valid = true;
                this.emit_signal('loaded', this);
                this.emit_signal('update', this);
            }
        }
        else
        {
            this.dirtyId++;
            this.dirtyStyleId++;
            this.emit_signal('update', this);
        }
    }

    /**
     * Destroys this base texture.
     * The method stops if resource doesn't want this texture to be destroyed.
     * Removes texture from all caches.
     */
    destroy()
    {
        // remove and destroy the resource
        if (this.resource)
        {
            this.resource.unbind(this);
            // only destroy resourced created internally
            if (this.resource.internal)
            {
                this.resource.destroy();
            }
            this.resource = null;
        }

        if (this.cacheId)
        {
            delete BaseTextureCache[this.cacheId];
            delete TextureCache[this.cacheId];

            this.cacheId = null;
        }

        // finally let the WebGL renderer know..
        this.dispose();

        BaseTexture.removeFromCache(this);
        this.textureCacheIds = null;

        this.destroyed = true;
    }

    /**
     * Frees the texture from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     * @fires BaseTexture#dispose
     */
    dispose()
    {
        this.emit_signal('dispose', this);
    }

    /**
     * Helper function that creates a base texture based on the source you provide.
     * The source can be - image url, image element, canvas element. If the
     * source is an image url or an image element and not in the base texture
     * cache, it will be created and loaded.
     *
     * @static
     * @param {string|HTMLImageElement|HTMLCanvasElement|SVGElement|HTMLVideoElement} source - The
     *        source to create base texture from.
     * @param {object} [options] See {@link BaseTexture}'s constructor for options.
     * @returns {BaseTexture} The new base texture.
     */
    static from(source, options)
    {
        let cacheId = null;

        if (typeof source === 'string')
        {
            cacheId = source;
        }
        else
        {
            if (!source._pixiId)
            {
                source._pixiId = `pixiid_${uid()}`;
            }

            cacheId = source._pixiId;
        }

        let baseTexture = BaseTextureCache[cacheId];

        if (!baseTexture)
        {
            baseTexture = new BaseTexture(source, options);
            baseTexture.cacheId = cacheId;
            BaseTexture.addToCache(baseTexture, cacheId);
        }

        return baseTexture;
    }

    /**
     * Create a new BaseTexture with a BufferResource from a Float32Array.
     * RGBA values are floats from 0 to 1.
     * @static
     * @param {Float32Array|Uint8Array} buffer The optional array to use, if no data
     *        is provided, a new Float32Array is created.
     * @param {number} width - Width of the resource
     * @param {number} height - Height of the resource
     * @param {object} [options] See {@link BaseTexture}'s constructor for options.
     * @return {BaseTexture} The resulting new BaseTexture
     */
    static fromBuffer(buffer, width, height, options)
    {
        buffer = buffer || new Float32Array(width * height * 4);

        const resource = new BufferResource(buffer, { width, height });
        const type = buffer instanceof Float32Array ? TYPES.FLOAT : TYPES.UNSIGNED_BYTE;

        return new BaseTexture(resource, Object.assign(defaultBufferOptions, options || { width, height, type }));
    }

    /**
     * Adds a BaseTexture to the global BaseTextureCache. This cache is shared across the whole PIXI object.
     *
     * @static
     * @param {BaseTexture} baseTexture - The BaseTexture to add to the cache.
     * @param {string} id - The id that the BaseTexture will be stored against.
     */
    static addToCache(baseTexture, id)
    {
        if (id)
        {
            if (baseTexture.textureCacheIds.indexOf(id) === -1)
            {
                baseTexture.textureCacheIds.push(id);
            }

            if (BaseTextureCache[id])
            {
                // eslint-disable-next-line no-console
                console.warn(`BaseTexture added to the cache with an id [${id}] that already had an entry`);
            }

            BaseTextureCache[id] = baseTexture;
        }
    }

    /**
     * Remove a BaseTexture from the global BaseTextureCache.
     *
     * @static
     * @param {string|BaseTexture} baseTexture - id of a BaseTexture to be removed, or a BaseTexture instance itself.
     * @return {BaseTexture|null} The BaseTexture that was removed.
     */
    static removeFromCache(baseTexture)
    {
        if (typeof baseTexture === 'string')
        {
            const baseTextureFromCache = BaseTextureCache[baseTexture];

            if (baseTextureFromCache)
            {
                const index = baseTextureFromCache.textureCacheIds.indexOf(baseTexture);

                if (index > -1)
                {
                    baseTextureFromCache.textureCacheIds.splice(index, 1);
                }

                delete BaseTextureCache[baseTexture];

                return baseTextureFromCache;
            }
        }
        else if (baseTexture && baseTexture.textureCacheIds)
        {
            for (let i = 0; i < baseTexture.textureCacheIds.length; ++i)
            {
                delete BaseTextureCache[baseTexture.textureCacheIds[i]];
            }

            baseTexture.textureCacheIds.length = 0;

            return baseTexture;
        }

        return null;
    }
}

/**
 * Global number of the texture batch, used by multi-texture renderers
 *
 * @static
 * @member {number}
 */
BaseTexture._globalBatch = 0;
