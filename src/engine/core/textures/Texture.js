import BaseTexture from './BaseTexture';
import VideoBaseTexture from './VideoBaseTexture';
import TextureUvs from './TextureUvs';
import EventEmitter from 'eventemitter3';
import { Rectangle } from '../math';
import { uid, TextureCache, getResolutionOfUrl } from '../utils';
import settings from '../settings';

/**
 * A texture stores the information that represents an image or part of an image. It cannot be added
 * to the display list directly. Instead use it as the texture for a Sprite. If no frame is provided
 * then the whole image is used.
 *
 * You can directly create a texture from an image and then reuse it multiple times like this :
 *
 * ```js
 * let texture = V.Texture.from_image('assets/image.png');
 * let sprite1 = new V.Sprite(texture);
 * let sprite2 = new V.Sprite(texture);
 * ```
 *
 * Textures made from SVGs, loaded or not, cannot be used before the file finishes processing.
 * You can check for this by checking the sprite's _textureID property.
 * ```js
 * var texture = V.Texture.from_image('assets/image.svg');
 * var sprite1 = new V.Sprite(texture);
 * //sprite1._textureID should not be undefined if the texture has finished processing the SVG file
 * ```
 * You can use a ticker or rAF to ensure your sprites load the finished textures after processing. See issue #3068.
 *
 * @class
 * @extends EventEmitter
 * @memberof V
 */
export default class Texture extends EventEmitter
{
    /**
     * @param {V.BaseTexture} base_texture - The base texture source to create the texture from
     * @param {V.Rectangle} [frame] - The rectangle frame of the texture to show
     * @param {V.Rectangle} [orig] - The area of original texture
     * @param {V.Rectangle} [trim] - Trimmed rectangle of original texture
     * @param {number} [rotate] - indicates how the texture was rotated by texture packer. See {@link V.GroupD8}
     */
    constructor(base_texture, frame, orig, trim, rotate)
    {
        super();

        this.uid = uid();

        /**
         * Does this Texture have any frame data assigned to it?
         *
         * @member {boolean}
         */
        this.no_frame = false;

        if (!frame)
        {
            this.no_frame = true;
            frame = new Rectangle(0, 0, 1, 1);
        }

        if (base_texture instanceof Texture)
        {
            base_texture = base_texture.base_texture;
        }

        /**
         * The base texture that this texture uses.
         *
         * @member {V.BaseTexture}
         */
        this.base_texture = base_texture;

        /**
         * This is the area of the BaseTexture image to actually copy to the Canvas / WebGL when rendering,
         * irrespective of the actual frame size or placement (which can be influenced by trimmed texture atlases)
         *
         * @member {V.Rectangle}
         */
        this._frame = frame;

        /**
         * This is the trimmed area of original texture, before it was put in atlas
         *
         * @member {V.Rectangle}
         */
        this.trim = trim;

        /**
         * This will let the renderer know if the texture is valid. If it's not then it cannot be rendered.
         *
         * @member {boolean}
         */
        this.valid = false;

        /**
         * This will let a renderer know that a texture has been updated (used mainly for webGL uv updates)
         *
         * @member {boolean}
         */
        this.requires_update = false;

        /**
         * The WebGL UV data cache.
         *
         * @member {V.TextureUvs}
         * @private
         */
        this._uvs = null;

        /**
         * This is the area of original texture, before it was put in atlas
         *
         * @member {V.Rectangle}
         */
        this.orig = orig || frame;// new Rectangle(0, 0, 1, 1);

        this._rotate = Number(rotate || 0);

        if (rotate === true)
        {
            // this is old texturepacker legacy, some games/libraries are passing "true" for rotated textures
            this._rotate = 2;
        }
        else if (this._rotate % 2 !== 0)
        {
            throw new Error('attempt to use diamond-shaped UVs. If you are sure, set rotation manually');
        }

        if (base_texture.has_loaded)
        {
            if (this.no_frame)
            {
                frame = new Rectangle(0, 0, base_texture.width, base_texture.height);

                // if there is no frame we should monitor for any base texture changes..
                base_texture.on('update', this.on_base_texture_updated, this);
            }
            this.frame = frame;
        }
        else
        {
            base_texture.once('loaded', this.on_base_texture_loaded, this);
        }

        /**
         * Fired when the texture is updated. This happens if the frame or the base_texture is updated.
         *
         * @event V.Texture#update
         * @protected
         * @param {V.Texture} texture - Instance of texture being updated.
         */

        this._updateID = 0;

        /**
         * Extra field for extra plugins. May contain clamp settings and some matrices
         * @type {Object}
         */
        this.transform = null;

        /**
         * The ids under which this Texture has been added to the texture cache. This is
         * automatically set as long as Texture.add_to_cache is used, but may not be set if a
         * Texture is added directly to the TextureCache array.
         *
         * @member {string[]}
         */
        this.texture_cache_ids = [];
    }

    /**
     * Updates this texture on the gpu.
     *
     */
    update()
    {
        this.base_texture.update();
    }

    /**
     * Called when the base texture is loaded
     *
     * @private
     * @param {V.BaseTexture} base_texture - The base texture.
     */
    on_base_texture_loaded(base_texture)
    {
        this._updateID++;

        // TODO this code looks confusing.. boo to abusing getters and setters!
        if (this.no_frame)
        {
            this.frame = new Rectangle(0, 0, base_texture.width, base_texture.height);
        }
        else
        {
            this.frame = this._frame;
        }

        this.base_texture.on('update', this.on_base_texture_updated, this);
        this.emit('update', this);
    }

    /**
     * Called when the base texture is updated
     *
     * @private
     * @param {V.BaseTexture} base_texture - The base texture.
     */
    on_base_texture_updated(base_texture)
    {
        this._updateID++;

        this._frame.width = base_texture.width;
        this._frame.height = base_texture.height;

        this.emit('update', this);
    }

    /**
     * Destroys this texture
     *
     * @param {boolean} [destroyBase=false] Whether to destroy the base texture as well
     */
    destroy(destroyBase)
    {
        if (this.base_texture)
        {
            if (destroyBase)
            {
                // delete the texture if it exists in the texture cache..
                // this only needs to be removed if the base texture is actually destroyed too..
                if (TextureCache[this.base_texture.image_url])
                {
                    Texture.remove_from_cache(this.base_texture.image_url);
                }

                this.base_texture.destroy();
            }

            this.base_texture.off('update', this.on_base_texture_updated, this);
            this.base_texture.off('loaded', this.on_base_texture_loaded, this);

            this.base_texture = null;
        }

        this._frame = null;
        this._uvs = null;
        this.trim = null;
        this.orig = null;

        this.valid = false;

        Texture.remove_from_cache(this);
        this.texture_cache_ids = null;
    }

    /**
     * Creates a new texture object that acts the same as this one.
     *
     * @return {V.Texture} The new texture
     */
    clone()
    {
        return new Texture(this.base_texture, this.frame, this.orig, this.trim, this.rotate);
    }

    /**
     * Updates the internal WebGL UV cache.
     *
     * @protected
     */
    _updateUvs()
    {
        if (!this._uvs)
        {
            this._uvs = new TextureUvs();
        }

        this._uvs.set(this._frame, this.base_texture, this.rotate);

        this._updateID++;
    }

    /**
     * Helper function that creates a Texture object from the given image url.
     * If the image is not in the texture cache it will be  created and loaded.
     *
     * @static
     * @param {string} image_url - The image url of the texture
     * @param {boolean} [crossorigin] - Whether requests should be treated as crossorigin
     * @param {number} [scale_mode=V.settings.SCALE_MODE] - See {@link V.SCALE_MODES} for possible values
     * @param {number} [source_scale=(auto)] - Scale for the original image, used with SVG images.
     * @return {V.Texture} The newly created texture
     */
    static from_image(image_url, crossorigin, scale_mode, source_scale)
    {
        let texture = TextureCache[image_url];

        if (!texture)
        {
            texture = new Texture(BaseTexture.from_image(image_url, crossorigin, scale_mode, source_scale));
            Texture.add_to_cache(texture, image_url);
        }

        return texture;
    }

    /**
     * Helper function that creates a sprite that will contain a texture from the TextureCache based on the frameId
     * The frame ids are created when a Texture packer file has been loaded
     *
     * @static
     * @param {string} frameId - The frame Id of the texture in the cache
     * @return {V.Texture} The newly created texture
     */
    static from_frame(frameId)
    {
        const texture = TextureCache[frameId];

        if (!texture)
        {
            throw new Error(`The frameId "${frameId}" does not exist in the texture cache`);
        }

        return texture;
    }

    /**
     * Helper function that creates a new Texture based on the given canvas element.
     *
     * @static
     * @param {HTMLCanvasElement} canvas - The canvas element source of the texture
     * @param {number} [scale_mode=V.settings.SCALE_MODE] - See {@link V.SCALE_MODES} for possible values
     * @param {string} [origin='canvas'] - A string origin of who created the base texture
     * @return {V.Texture} The newly created texture
     */
    static from_canvas(canvas, scale_mode, origin = 'canvas')
    {
        return new Texture(BaseTexture.from_canvas(canvas, scale_mode, origin));
    }

    /**
     * Helper function that creates a new Texture based on the given video element.
     *
     * @static
     * @param {HTMLVideoElement|string} video - The URL or actual element of the video
     * @param {number} [scale_mode=V.settings.SCALE_MODE] - See {@link V.SCALE_MODES} for possible values
     * @return {V.Texture} The newly created texture
     */
    static from_video(video, scale_mode)
    {
        if (typeof video === 'string')
        {
            return Texture.from_video_url(video, scale_mode);
        }

        return new Texture(VideoBaseTexture.from_video(video, scale_mode));
    }

    /**
     * Helper function that creates a new Texture based on the video url.
     *
     * @static
     * @param {string} videoUrl - URL of the video
     * @param {number} [scale_mode=V.settings.SCALE_MODE] - See {@link V.SCALE_MODES} for possible values
     * @return {V.Texture} The newly created texture
     */
    static from_video_url(videoUrl, scale_mode)
    {
        return new Texture(VideoBaseTexture.from_url(videoUrl, scale_mode));
    }

    /**
     * Helper function that creates a new Texture based on the source you provide.
     * The source can be - frame id, image url, video url, canvas element, video element, base texture
     *
     * @static
     * @param {number|string|HTMLImageElement|HTMLCanvasElement|HTMLVideoElement|V.BaseTexture}
     *        source - Source to create texture from
     * @return {V.Texture} The newly created texture
     */
    static from(source)
    {
        // TODO auto detect cross origin..
        // TODO pass in scale mode?
        if (typeof source === 'string')
        {
            const texture = TextureCache[source];

            if (!texture)
            {
                // check if its a video..
                const isVideo = source.match(/\.(mp4|webm|ogg|h264|avi|mov)$/) !== null;

                if (isVideo)
                {
                    return Texture.from_video_url(source);
                }

                return Texture.from_image(source);
            }

            return texture;
        }
        else if (source instanceof HTMLImageElement)
        {
            return new Texture(BaseTexture.from(source));
        }
        else if (source instanceof HTMLCanvasElement)
        {
            return Texture.from_canvas(source, settings.SCALE_MODE, 'HTMLCanvasElement');
        }
        else if (source instanceof HTMLVideoElement)
        {
            return Texture.from_video(source);
        }
        else if (source instanceof BaseTexture)
        {
            return new Texture(source);
        }

        // lets assume its a texture!
        return source;
    }

    /**
     * Create a texture from a source and add to the cache.
     *
     * @static
     * @param {HTMLImageElement|HTMLCanvasElement} source - The input source.
     * @param {String} image_url - File name of texture, for cache and resolving resolution.
     * @param {String} [name] - Human readible name for the texture cache. If no name is
     *        specified, only `image_url` will be used as the cache ID.
     * @return {V.Texture} Output texture
     */
    static from_loader(source, image_url, name)
    {
        const base_texture = new BaseTexture(source, undefined, getResolutionOfUrl(image_url));
        const texture = new Texture(base_texture);

        base_texture.image_url = image_url;

        // No name, use image_url instead
        if (!name)
        {
            name = image_url;
        }

        // lets also add the frame to pixi's global cache for from_frame and from_image fucntions
        BaseTexture.add_to_cache(texture.base_texture, name);
        Texture.add_to_cache(texture, name);

        // also add references by url if they are different.
        if (name !== image_url)
        {
            BaseTexture.add_to_cache(texture.base_texture, image_url);
            Texture.add_to_cache(texture, image_url);
        }

        return texture;
    }

    /**
     * Adds a Texture to the global TextureCache. This cache is shared across the whole V object.
     *
     * @static
     * @param {V.Texture} texture - The Texture to add to the cache.
     * @param {string} id - The id that the Texture will be stored against.
     */
    static add_to_cache(texture, id)
    {
        if (id)
        {
            if (texture.texture_cache_ids.indexOf(id) === -1)
            {
                texture.texture_cache_ids.push(id);
            }

            // @if DEBUG
            /* eslint-disable no-console */
            if (TextureCache[id])
            {
                console.warn(`Texture added to the cache with an id [${id}] that already had an entry`);
            }
            /* eslint-enable no-console */
            // @endif

            TextureCache[id] = texture;
        }
    }

    /**
     * Remove a Texture from the global TextureCache.
     *
     * @static
     * @param {string|V.Texture} texture - id of a Texture to be removed, or a Texture instance itself
     * @return {V.Texture|null} The Texture that was removed
     */
    static remove_from_cache(texture)
    {
        if (typeof texture === 'string')
        {
            const textureFromCache = TextureCache[texture];

            if (textureFromCache)
            {
                const index = textureFromCache.texture_cache_ids.indexOf(texture);

                if (index > -1)
                {
                    textureFromCache.texture_cache_ids.splice(index, 1);
                }

                delete TextureCache[texture];

                return textureFromCache;
            }
        }
        else if (texture && texture.texture_cache_ids)
        {
            for (let i = 0; i < texture.texture_cache_ids.length; ++i)
            {
                // Check that texture matches the one being passed in before deleting it from the cache.
                if (TextureCache[texture.texture_cache_ids[i]] === texture)
                {
                    delete TextureCache[texture.texture_cache_ids[i]];
                }
            }

            texture.texture_cache_ids.length = 0;

            return texture;
        }

        return null;
    }

    /**
     * The frame specifies the region of the base texture that this texture uses.
     *
     * @member {V.Rectangle}
     */
    get frame()
    {
        return this._frame;
    }

    set frame(frame) // eslint-disable-line require-jsdoc
    {
        this._frame = frame;

        this.no_frame = false;

        const { x, y, width, height } = frame;
        const xNotFit = x + width > this.base_texture.width;
        const yNotFit = y + height > this.base_texture.height;

        if (xNotFit || yNotFit)
        {
            const relationship = xNotFit && yNotFit ? 'and' : 'or';
            const errorX = `X: ${x} + ${width} = ${x + width} > ${this.base_texture.width}`;
            const errorY = `Y: ${y} + ${height} = ${y + height} > ${this.base_texture.height}`;

            throw new Error('Texture Error: frame does not fit inside the base Texture dimensions: '
                + `${errorX} ${relationship} ${errorY}`);
        }

        // this.valid = width && height && this.base_texture.source && this.base_texture.has_loaded;
        this.valid = width && height && this.base_texture.has_loaded;

        if (!this.trim && !this.rotate)
        {
            this.orig = frame;
        }

        if (this.valid)
        {
            this._updateUvs();
        }
    }

    /**
     * Indicates whether the texture is rotated inside the atlas
     * set to 2 to compensate for texture packer rotation
     * set to 6 to compensate for spine packer rotation
     * can be used to rotate or mirror sprites
     * See {@link V.GroupD8} for explanation
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
            this._updateUvs();
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

function create_white_texture()
{
    const canvas = document.createElement('canvas');

    canvas.width = 10;
    canvas.height = 10;

    const context = canvas.getContext('2d');

    context.fillStyle = 'white';
    context.fillRect(0, 0, 10, 10);

    return new Texture(new BaseTexture(canvas));
}

function remove_all_handlers(tex)
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
 */
Texture.EMPTY = new Texture(new BaseTexture());
remove_all_handlers(Texture.EMPTY);
remove_all_handlers(Texture.EMPTY.base_texture);

/**
 * A white texture of 10x10 size, used for graphics and other things
 * Can not be destroyed.
 *
 * @static
 * @constant
 */
Texture.WHITE = create_white_texture();
remove_all_handlers(Texture.WHITE);
remove_all_handlers(Texture.WHITE.base_texture);
