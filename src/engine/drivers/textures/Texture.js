import { VObject } from 'engine/core/v_object';
import BaseTexture from './BaseTexture';
import ImageResource from './resources/ImageResource';
import CanvasResource from './resources/CanvasResource';
import TextureUvs from './TextureUvs';
import * as settings from '../settings';
import { Rect2 } from 'engine/core/math/rect2';
import { Vector2 } from 'engine/core/math/vector2';
import { TextureCache } from '../utils/caches';
import { uid } from '../utils/uid';
import { getResolutionOfUrl } from '../utils/getResolutionOfUrl';


const DEFAULT_UVS = new TextureUvs();

export default class Texture extends VObject
{
    /**
     * @param {BaseTexture} baseTexture - The base texture source to create the texture from
     * @param {Rect2} [frame] - The rectangle frame of the texture to show
     * @param {Rect2} [orig] - The area of original texture
     * @param {Rect2} [trim] - Trimmed rectangle of original texture
     * @param {number} [rotate] - indicates how the texture was rotated by texture packer. See {@link GroupD8}
     * @param {Vector2} [anchor] - Default anchor point used for sprite placement / rotation
     */
    constructor(baseTexture, frame, orig, trim, rotate, anchor)
    {
        super();

        /**
         * Does this Texture have any frame data assigned to it?
         *
         * This mode is enabled automatically if no frame was passed inside constructor.
         *
         * In this mode texture is subscribed to baseTexture events, and fires `update` on any change.
         *
         * Beware, after loading or resize of baseTexture event can fired two times!
         * If you want more control, subscribe on baseTexture itself.
         *
         * ```js
         * texture.on('update', () => {});
         * ```
         *
         * Any assignment of `frame` switches off `noFrame` mode.
         *
         * @member {boolean}
         */
        this.noFrame = false;

        if (!frame)
        {
            this.noFrame = true;
            frame = new Rect2(0, 0, 1, 1);
        }

        if (baseTexture instanceof Texture)
        {
            baseTexture = baseTexture.baseTexture;
        }

        /**
         * The base texture that this texture uses.
         *
         * @member {BaseTexture}
         */
        this.baseTexture = baseTexture;

        /**
         * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
         * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
         *
         * @member {Rect2}
         */
        this._frame = frame;

        /**
         * This is the trimmed area of original texture, before it was put in atlas
         * Please call `updateUvs()` after you change coordinates of `trim` manually.
         *
         * @member {Rect2}
         */
        this.trim = trim;

        /**
         * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
         *
         * @member {boolean}
         */
        this.valid = false;

        /**
         * This will let a renderer know that a texture has been updated (used mainly for WebGL uv updates)
         *
         * @member {boolean}
         */
        this.requiresUpdate = false;

        /**
         * The WebGL UV data cache. Can be used as quad UV
         *
         * @member {TextureUvs}
         * @protected
         */
        this._uvs = DEFAULT_UVS;

        /**
         * Default TextureMatrix instance for this texture
         * By default that object is not created because its heavy
         *
         * @member {TextureMatrix}
         */
        this.uvMatrix = null;

        /**
         * This is the area of original texture, before it was put in atlas
         *
         * @member {Rect2}
         */
        this.orig = orig || frame;// new Rect2(0, 0, 1, 1);

        this._rotate = Number(rotate || 0);

        if (this._rotate % 2 !== 0)
        {
            throw new Error('attempt to use diamond-shaped UVs. If you are sure, set rotation manually');
        }

        /**
         * Anchor point that is used as default if sprite is created with this texture.
         * Changing the `defaultAnchor` at a later point of time will not update Sprite's anchor point.
         * @member {Vector2}
         * @default {0,0}
         */
        this.defaultAnchor = anchor ? new Vector2(anchor.x, anchor.y) : new Vector2(0, 0);

        /**
         * Update ID is observed by sprites and TextureMatrix instances.
         * Call updateUvs() to increment it.
         *
         * @member {number}
         * @protected
         */

        this._updateID = 0;

        /**
         * The ids under which this Texture has been added to the texture cache. This is
         * automatically set as long as Texture.addToCache is used, but may not be set if a
         * Texture is added directly to the TextureCache array.
         *
         * @member {string[]}
         */
        this.textureCacheIds = [];

        if (!baseTexture.valid)
        {
            baseTexture.connect_once('loaded', this.onBaseTextureUpdated, this);
        }
        else if (this.noFrame)
        {
            // if there is no frame we should monitor for any base texture changes..
            if (baseTexture.valid)
            {
                this.onBaseTextureUpdated(baseTexture);
            }
        }
        else
        {
            this.frame = frame;
        }

        if (this.noFrame)
        {
            baseTexture.connect('update', this.onBaseTextureUpdated, this);
        }
    }

    /**
     * Updates this texture on the gpu.
     *
     * Calls the TextureResource update.
     *
     * If you adjusted `frame` manually, please call `updateUvs()` instead.
     *
     */
    update()
    {
        if (this.baseTexture.resource)
        {
            this.baseTexture.resource.update();
        }
    }

    /**
     * Called when the base texture is updated
     *
     * @protected
     * @param {BaseTexture} baseTexture - The base texture.
     */
    onBaseTextureUpdated(baseTexture)
    {
        if (this.noFrame)
        {
            if (!this.baseTexture.valid)
            {
                return;
            }

            this._frame.width = baseTexture.width;
            this._frame.height = baseTexture.height;
            this.valid = true;
            this.updateUvs();
        }
        else
        {
            // TODO this code looks confusing.. boo to abusing getters and setters!
            // if user gave us frame that has bigger size than resized texture it can be a problem
            this.frame = this._frame;
        }

        this.emit_signal('update', this);
    }

    /**
     * Destroys this texture
     *
     * @param {boolean} [destroyBase=false] Whether to destroy the base texture as well
     */
    destroy(destroyBase)
    {
        if (this.baseTexture)
        {
            if (destroyBase)
            {
                const { resource } = this.baseTexture;

                // delete the texture if it exists in the texture cache..
                // this only needs to be removed if the base texture is actually destroyed too..
                if (resource && TextureCache[resource.url])
                {
                    Texture.removeFromCache(resource.url);
                }

                this.baseTexture.destroy();
            }

            this.baseTexture.disconnect('update', this.onBaseTextureUpdated, this);

            this.baseTexture = null;
        }

        this._frame = null;
        this._uvs = null;
        this.trim = null;
        this.orig = null;

        this.valid = false;

        Texture.removeFromCache(this);
        this.textureCacheIds = null;
    }

    /**
     * Creates a new texture object that acts the same as this one.
     *
     * @return {Texture} The new texture
     */
    clone()
    {
        return new Texture(this.baseTexture, this.frame, this.orig, this.trim, this.rotate, this.defaultAnchor);
    }

    /**
     * Updates the internal WebGL UV cache. Use it after you change `frame` or `trim` of the texture.
     * Call it after changing the frame
     */
    updateUvs()
    {
        if (this._uvs === DEFAULT_UVS)
        {
            this._uvs = new TextureUvs();
        }

        this._uvs.set(this._frame, this.baseTexture, this.rotate);

        this._updateID++;
    }

    /**
     * Helper function that creates a new Texture based on the source you provide.
     * The source can be - frame id, image url, video url, canvas element, video element, base texture
     *
     * @static
     * @param {number|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|BaseTexture} source
     *        Source to create texture from
     * @param {object} [options] See {@link BaseTexture}'s constructor for options.
     * @return {Texture} The newly created texture
     */
    static from(source, options = {})
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

        let texture = TextureCache[cacheId];

        if (!texture)
        {
            if (!options.resolution)
            {
                options.resolution = getResolutionOfUrl(source);
            }

            texture = new Texture(new BaseTexture(source, options));
            texture.baseTexture.cacheId = cacheId;

            BaseTexture.addToCache(texture.baseTexture, cacheId);
            Texture.addToCache(texture, cacheId);
        }

        // lets assume its a base texture!
        return texture;
    }

    /**
     * Create a new Texture with a BufferResource from a Float32Array.
     * RGBA values are floats from 0 to 1.
     * @static
     * @param {Float32Array|Uint8Array} buffer The optional array to use, if no data
     *        is provided, a new Float32Array is created.
     * @param {number} width - Width of the resource
     * @param {number} height - Height of the resource
     * @param {object} [options] See {@link BaseTexture}'s constructor for options.
     * @return {Texture} The resulting new BaseTexture
     */
    static fromBuffer(buffer, width, height, options)
    {
        return new Texture(BaseTexture.fromBuffer(buffer, width, height, options));
    }

    /**
     * Create a texture from a source and add to the cache.
     *
     * @static
     * @param {HTMLImageElement|HTMLCanvasElement} source - The input source.
     * @param {String} imageUrl - File name of texture, for cache and resolving resolution.
     * @param {String} [name] - Human readable name for the texture cache. If no name is
     *        specified, only `imageUrl` will be used as the cache ID.
     * @return {Texture} Output texture
     */
    static fromLoader(source, imageUrl, name)
    {
        const resource = new ImageResource(source);

        resource.url = imageUrl;

        const baseTexture = new BaseTexture(resource, {
            scaleMode: settings.SCALE_MODE,
            resolution: getResolutionOfUrl(imageUrl),
        });

        const texture = new Texture(baseTexture);

        // No name, use imageUrl instead
        if (!name)
        {
            name = imageUrl;
        }

        // lets also add the frame to pixi's global cache for 'fromLoader' function
        BaseTexture.addToCache(texture.baseTexture, name);
        Texture.addToCache(texture, name);

        // also add references by url if they are different.
        if (name !== imageUrl)
        {
            BaseTexture.addToCache(texture.baseTexture, imageUrl);
            Texture.addToCache(texture, imageUrl);
        }

        return texture;
    }

    /**
     * Adds a Texture to the global TextureCache. This cache is shared across the whole PIXI object.
     *
     * @static
     * @param {Texture} texture - The Texture to add to the cache.
     * @param {string} id - The id that the Texture will be stored against.
     */
    static addToCache(texture, id)
    {
        if (id)
        {
            if (texture.textureCacheIds.indexOf(id) === -1)
            {
                texture.textureCacheIds.push(id);
            }

            if (TextureCache[id])
            {
                // eslint-disable-next-line no-console
                console.warn(`Texture added to the cache with an id [${id}] that already had an entry`);
            }

            TextureCache[id] = texture;
        }
    }

    /**
     * Remove a Texture from the global TextureCache.
     *
     * @static
     * @param {string|Texture} texture - id of a Texture to be removed, or a Texture instance itself
     * @return {Texture|null} The Texture that was removed
     */
    static removeFromCache(texture)
    {
        if (typeof texture === 'string')
        {
            const textureFromCache = TextureCache[texture];

            if (textureFromCache)
            {
                const index = textureFromCache.textureCacheIds.indexOf(texture);

                if (index > -1)
                {
                    textureFromCache.textureCacheIds.splice(index, 1);
                }

                delete TextureCache[texture];

                return textureFromCache;
            }
        }
        else if (texture && texture.textureCacheIds)
        {
            for (let i = 0; i < texture.textureCacheIds.length; ++i)
            {
                // Check that texture matches the one being passed in before deleting it from the cache.
                if (TextureCache[texture.textureCacheIds[i]] === texture)
                {
                    delete TextureCache[texture.textureCacheIds[i]];
                }
            }

            texture.textureCacheIds.length = 0;

            return texture;
        }

        return null;
    }

    /**
     * Returns resolution of baseTexture
     *
     * @member {number}
     * @readonly
     */
    get resolution()
    {
        return this.baseTexture.resolution;
    }

    /**
     * The frame specifies the region of the base texture that this texture uses.
     * Please call `updateUvs()` after you change coordinates of `frame` manually.
     *
     * @member {Rect2}
     */
    get frame()
    {
        return this._frame;
    }

    set frame(frame) // eslint-disable-line require-jsdoc
    {
        this._frame = frame;

        this.noFrame = false;

        const { x, y, width, height } = frame;
        const xNotFit = x + width > this.baseTexture.width;
        const yNotFit = y + height > this.baseTexture.height;

        if (xNotFit || yNotFit)
        {
            const relationship = xNotFit && yNotFit ? 'and' : 'or';
            const errorX = `X: ${x} + ${width} = ${x + width} > ${this.baseTexture.width}`;
            const errorY = `Y: ${y} + ${height} = ${y + height} > ${this.baseTexture.height}`;

            throw new Error('Texture Error: frame does not fit inside the base Texture dimensions: '
                + `${errorX} ${relationship} ${errorY}`);
        }

        this.valid = width && height && this.baseTexture.valid;

        if (!this.trim && !this.rotate)
        {
            this.orig = frame;
        }

        if (this.valid)
        {
            this.updateUvs();
        }
    }

    /**
     * Indicates whether the texture is rotated inside the atlas
     * set to 2 to compensate for texture packer rotation
     * set to 6 to compensate for spine packer rotation
     * can be used to rotate or mirror sprites
     * See {@link GroupD8} for explanation
     *
     * @member {number}
     */
    get rotate()
    {
        return this._rotate;
    }

    set rotate(rotate) // eslint-disable-line require-jsdoc
    {
        this._rotate = rotate;
        if (this.valid)
        {
            this.updateUvs();
        }
    }

    /**
     * The width of the Texture in pixels.
     *
     * @member {number}
     */
    get width()
    {
        return this.orig.width;
    }

    /**
     * The height of the Texture in pixels.
     *
     * @member {number}
     */
    get height()
    {
        return this.orig.height;
    }
}

function createWhiteTexture()
{
    const canvas = document.createElement('canvas');

    canvas.width = 16;
    canvas.height = 16;

    const context = canvas.getContext('2d');

    context.fillStyle = 'white';
    context.fillRect(0, 0, 16, 16);

    return new Texture(new BaseTexture(new CanvasResource(canvas)));
}

function removeAllHandlers(tex)
{
    tex.destroy = function _emptyDestroy() { /* empty */ };
    tex.on = function _emptyOn() { /* empty */ };
    tex.once = function _emptyOnce() { /* empty */ };
    tex.emit = function _emptyEmit() { /* empty */ };
}

/**
 * An empty texture, used often to not have to create multiple empty textures.
 * Can not be destroyed.
 *
 * @static
 * @constant
 * @member {Texture}
 */
Texture.EMPTY = new Texture(new BaseTexture());
removeAllHandlers(Texture.EMPTY);
removeAllHandlers(Texture.EMPTY.baseTexture);

/**
 * A white texture of 16x16 size, used for graphics and other things
 * Can not be destroyed.
 *
 * @static
 * @constant
 * @member {Texture}
 */
Texture.WHITE = createWhiteTexture();
removeAllHandlers(Texture.WHITE);
removeAllHandlers(Texture.WHITE.baseTexture);
