import settings from '../settings';
import {
    uid,
    get_svg_size,
    get_resolution_of_url,
    get_url_file_extension,
    decompose_data_uri,
    BaseTextureCache, TextureCache,
} from '../utils/index';
import { is_po2 } from 'engine/math/index';
import { EventEmitter } from 'engine/dep/index';
import determine_cross_origin from '../utils/determine_cross_origin';

/**
 * A texture stores the information that represents an image. All textures have a base texture.
 */
export default class BaseTexture extends EventEmitter {
    /**
     * @param {HTMLImageElement|HTMLCanvasElement} [source] - the source object of the texture.
     * @param {number} [scale_mode=settings.SCALE_MODE] - See {@link SCALE_MODES} for possible values
     * @param {number} [resolution=1] - The resolution / device pixel ratio of the texture
     */
    constructor(source, scale_mode, resolution) {
        super();

        this.uid = uid();

        this.touched = 0;

        /**
         * The resolution / device pixel ratio of the texture
         *
         * @member {number}
         * @default 1
         */
        this.resolution = resolution || settings.RESOLUTION;

        /**
         * The width of the base texture set when the image has loaded
         *
         * @readonly
         * @member {number}
         */
        this.width = 100;

        /**
         * The height of the base texture set when the image has loaded
         *
         * @readonly
         * @member {number}
         */
        this.height = 100;

        // TODO docs
        // used to store the actual dimensions of the source
        /**
         * Used to store the actual width of the source of this texture
         *
         * @readonly
         * @member {number}
         */
        this.real_width = 100;
        /**
         * Used to store the actual height of the source of this texture
         *
         * @readonly
         * @member {number}
         */
        this.real_height = 100;

        /**
         * The scale mode to apply when scaling this texture
         *
         * @member {number}
         * @default settings.SCALE_MODE
         * @see SCALE_MODES
         */
        this.scale_mode = scale_mode !== undefined ? scale_mode : settings.SCALE_MODE;

        /**
         * Set to true once the base texture has successfully loaded.
         *
         * This is never true if the underlying source fails to load or has no texture data.
         *
         * @readonly
         * @member {boolean}
         */
        this.has_loaded = false;

        /**
         * Set to true if the source is currently loading.
         *
         * If an Image source is loading the 'loaded' or 'error' event will be
         * dispatched when the operation ends. An underyling source that is
         * immediately-available bypasses loading entirely.
         *
         * @readonly
         * @member {boolean}
         */
        this.is_loading = false;

        /**
         * The image source that is used to create the texture.
         *
         * TODO: Make this a setter that calls load_source();
         *
         * @readonly
         * @member {HTMLImageElement|HTMLCanvasElement}
         */
        this.source = null; // set in load_source, if at all

        /**
         * The image source that is used to create the texture. This is used to
         * store the original Svg source when it is replaced with a canvas element.
         *
         * TODO: Currently not in use but could be used when re-scaling svg.
         *
         * @readonly
         * @member {Image}
         */
        this.origin_source = null; // set in loadSvg, if at all

        /**
         * Type of image defined in source, eg. `png` or `svg`
         *
         * @readonly
         * @member {string}
         */
        this.image_type = null; // set in updateImageType

        /**
         * Scale for source image. Used with Svg images to scale them before rasterization.
         *
         * @readonly
         * @member {number}
         */
        this.source_scale = 1.0;

        /**
         * Controls if RGB channels should be pre-multiplied by Alpha  (WebGL only)
         * All blend modes, and shaders written for default value. Change it on your own risk.
         *
         * @member {boolean}
         * @default true
         */
        this.premultiplied_alpha = true;

        /**
         * The image url of the texture
         *
         * @member {string}
         */
        this.image_url = null;

        /**
         * Whether or not the texture is a power of two, try to use power of two textures as much
         * as you can
         *
         * @private
         * @member {boolean}
         */
        this.is_power_of_two = false;

        // used for webGL

        /**
         *
         * Set this to true if a mipmap of this texture needs to be generated. This value needs
         * to be set before the texture is used
         * Also the texture must be a power of two size to work
         *
         * @member {boolean}
         * @see MIPMAP_TEXTURES
         */
        this.mipmap = settings.MIPMAP_TEXTURES;

        /**
         *
         * WebGL Texture wrap mode
         *
         * @member {number}
         * @see WRAP_MODES
         */
        this.wrap_mode = settings.WRAP_MODE;

        /**
         * A map of renderer IDs to webgl textures
         *
         * @private
         * @member {object<number, WebGLTexture>}
         */
        this._gl_textures = {};
        /**
         * @private
         * @member {object<number, RenderTarget>}
         */
        this._gl_render_targets = null;

        this._enabled = 0;
        this._virtalBoundId = -1;

        /**
         * If the object has been destroyed via destroy(). If true, it should not be used.
         *
         * @member {boolean}
         * @private
         * @readonly
         */
        this._destroyed = false;

        /**
         * The ids under which this BaseTexture has been added to the base texture cache. This is
         * automatically set as long as BaseTexture.add_to_cache is used, but may not be set if a
         * BaseTexture is added directly to the BaseTextureCache array.
         *
         * @member {string[]}
         */
        this.texture_cache_ids = [];

        // if no source passed don't try to load
        if (source) {
            this.load_source(source);
        }

        /**
         * Fired when a not-immediately-available source finishes loading.
         *
         * @protected
         * @event BaseTexture#loaded
         * @param {BaseTexture} base_texture - Resource loaded.
         */

        /**
         * Fired when a not-immediately-available source fails to load.
         *
         * @protected
         * @event BaseTexture#error
         * @param {BaseTexture} base_texture - Resource errored.
         */

        /**
         * Fired when BaseTexture is updated.
         *
         * @protected
         * @event BaseTexture#update
         * @param {BaseTexture} base_texture - Instance of texture being updated.
         */

        /**
         * Fired when BaseTexture is destroyed.
         *
         * @protected
         * @event BaseTexture#dispose
         * @param {BaseTexture} base_texture - Instance of texture being destroyed.
         */
    }

    /**
     * Updates the texture on all the webgl renderers, this also assumes the src has changed.
     *
     * @fires BaseTexture#update
     */
    update() {
        // Svg size is handled during load
        if (this.image_type !== 'svg') {
            // @ts-ignore
            this.real_width = this.source.naturalWidth || this.source.videoWidth || this.source.width;
            // @ts-ignore
            this.real_height = this.source.naturalHeight || this.source.videoHeight || this.source.height;

            this._update_dimensions();
        }

        this.emit('update', this);
    }

    /**
     * Update dimensions from real values
     */
    _update_dimensions() {
        this.width = this.real_width / this.resolution;
        this.height = this.real_height / this.resolution;

        this.is_power_of_two = is_po2(this.real_width) && is_po2(this.real_height);
    }

    /**
     * Load a source.
     *
     * If the source is not-immediately-available, such as an image that needs to be
     * downloaded, then the 'loaded' or 'error' event will be dispatched in the future
     * and `has_loaded` will remain false after this call.
     *
     * The logic state after calling `load_source` directly or indirectly (eg. `from_image`, `new BaseTexture`) is:
     *
     *     if (texture.has_loaded) {
     *          // texture ready for use
     *     } else if (texture.is_loading) {
     *          // listen to 'loaded' and/or 'error' events on texture
     *     } else {
     *          // not loading, not going to load UNLESS the source is reloaded
     *          // (it may still make sense to listen to the events)
     *     }
     *
     * @protected
     * @param {HTMLImageElement|HTMLCanvasElement} source - the source object of the texture.
     */
    load_source(source) {
        const was_loading = this.is_loading;

        this.has_loaded = false;
        this.is_loading = false;

        if (was_loading && this.source) {
            this.source.onload = null;
            this.source.onerror = null;
        }

        const first_source_loaded = !this.source;

        this.source = source;

        // Apply source if loaded. Otherwise setup appropriate loading monitors.
        // @ts-ignore
        if (((source.src && source.complete) || source.getContext) && source.width && source.height) {
            this._update_image_type();

            if (this.image_type === 'svg') {
                this._load_svg_source();
            } else {
                this._source_loaded();
            }

            if (first_source_loaded) {
                // send loaded event if previous source was null and we have been passed a pre-loaded IMG element
                this.emit('loaded', this);
            }
        // @ts-ignore
        } else if (!source.getContext) {
            // Image fail / not ready
            this.is_loading = true;

            const scope = this;

            source.onload = () => {
                scope._update_image_type();
                source.onload = null;
                source.onerror = null;

                if (!scope.is_loading) {
                    return;
                }

                scope.is_loading = false;
                scope._source_loaded();

                if (scope.image_type === 'svg') {
                    scope._load_svg_source();

                    return;
                }

                scope.emit('loaded', scope);
            };

            source.onerror = () => {
                source.onload = null;
                source.onerror = null;

                if (!scope.is_loading) {
                    return;
                }

                scope.is_loading = false;
                scope.emit('error', scope);
            };

            // Per http://www.w3.org/TR/html5/embedded-content-0.html#the-img-element
            // "The value of `complete` can thus change while a script is executing."
            // So complete needs to be re-checked after the callbacks have been added..
            // NOTE: complete will be true if the image has no src so best to check if the src is set.
            // @ts-ignore
            if (source.complete && source.src) {
                // ..and if we're complete now, no need for callbacks
                source.onload = null;
                source.onerror = null;

                if (scope.image_type === 'svg') {
                    scope._load_svg_source();

                    return;
                }

                this.is_loading = false;

                if (source.width && source.height) {
                    this._source_loaded();

                    // If any previous subscribers possible
                    if (was_loading) {
                        this.emit('loaded', this);
                    }
                }
                // If any previous subscribers possible
                else if (was_loading) {
                    this.emit('error', this);
                }
            }
        }
    }

    /**
     * Updates type of the source image.
     */
    _update_image_type() {
        if (!this.image_url) {
            return;
        }

        const data_uri = decompose_data_uri(this.image_url);
        let image_type;

        if (data_uri && data_uri.mediaType === 'image') {
            // Check for subType validity
            const first_sub_type = data_uri.subType.split('+')[0];

            image_type = get_url_file_extension(`.${first_sub_type}`);

            if (!image_type) {
                throw new Error('Invalid image type in data URI.');
            }
        } else {
            image_type = get_url_file_extension(this.image_url);

            if (!image_type) {
                image_type = 'png';
            }
        }

        this.image_type = image_type;
    }

    /**
     * Checks if `source` is an SVG image and whether it's loaded via a URL or a data URI. Then calls
     * `_loadSvgSourceUsingDataUri` or `_loadSvgSourceUsingXhr`.
     */
    _load_svg_source() {
        if (this.image_type !== 'svg') {
            // Do nothing if source is not svg
            return;
        }

        const data_uri = decompose_data_uri(this.image_url);

        if (data_uri) {
            this._load_svg_source_using_data_uri(data_uri);
        } else {
            // We got an URL, so we need to do an XHR to check the svg size
            this._load_svg_source_using_xhr();
        }
    }

    /**
     * Reads an SVG string from data URI and then calls `_loadSvgSourceUsingString`.
     *
     * @param {import('engine/utils/index').DecomposedDataUri} data_uri - The data uri to load from.
     */
    _load_svg_source_using_data_uri(data_uri) {
        let svg_string;

        if (data_uri.encoding === 'base64') {
            if (!atob) {
                throw new Error('Your browser doesn\'t support base64 conversions.');
            }
            svg_string = atob(data_uri.data);
        } else {
            svg_string = data_uri.data;
        }

        this._load_svg_source_using_string(svg_string);
    }

    /**
     * Loads an SVG string from `image_url` using XHR and then calls `_loadSvgSourceUsingString`.
     */
    _load_svg_source_using_xhr() {
        const svg_xhr = new XMLHttpRequest();

        // This throws error on IE, so SVG Document can't be used
        // svgXhr.responseType = 'document';

        // This is not needed since we load the svg as string (breaks IE too)
        // but overrideMimeType() can be used to force the response to be parsed as XML
        // svgXhr.overrideMimeType('image/svg+xml');

        svg_xhr.onload = () => {
            if (svg_xhr.readyState !== svg_xhr.DONE || svg_xhr.status !== 200) {
                throw new Error('Failed to load SVG using XHR.');
            }

            this._load_svg_source_using_string(svg_xhr.response);
        };

        svg_xhr.onerror = () => this.emit('error', this);

        svg_xhr.open('GET', this.image_url, true);
        svg_xhr.send();
    }

    /**
     * Loads texture using an SVG string. The original SVG Image is stored as `origin_source` and the
     * created canvas is the new `source`. The SVG is scaled using `source_scale`. Called by
     * `_loadSvgSourceUsingXhr` or `_loadSvgSourceUsingDataUri`.
     *
     * @param  {string} svg_string SVG source as string
     *
     * @fires BaseTexture#loaded
     */
    _load_svg_source_using_string(svg_string) {
        const svg_size = get_svg_size(svg_string);

        const svg_width = svg_size.width;
        const svg_height = svg_size.height;

        if (!svg_width || !svg_height) {
            throw new Error('The SVG image must have width and height defined (in pixels), canvas API needs them.');
        }

        // Scale real_width and real_height
        this.real_width = Math.round(svg_width * this.source_scale);
        this.real_height = Math.round(svg_height * this.source_scale);

        this._update_dimensions();

        // Create a canvas element
        const canvas = document.createElement('canvas');

        canvas.width = this.real_width;
        canvas.height = this.real_height;
        canvas._pixiId = `canvas_${uid()}`;

        // Draw the Svg to the canvas
        canvas
            .getContext('2d')
            .drawImage(this.source, 0, 0, svg_width, svg_height, 0, 0, this.real_width, this.real_height);

        // Replace the original source image with the canvas
        this.origin_source = this.source;
        this.source = canvas;

        // Add also the canvas in cache (destroy clears by `image_url` and `source._pixiId`)
        BaseTexture.add_to_cache(this, canvas._pixiId);

        this.is_loading = false;
        this._source_loaded();
        this.emit('loaded', this);
    }

    /**
     * Used internally to update the width, height, and some other tracking vars once
     * a source has successfully loaded.
     *
     * @private
     */
    _source_loaded() {
        this.has_loaded = true;
        this.update();
    }

    /**
     * Destroys this base texture
     *
     */
    destroy() {
        if (this.image_url) {
            delete TextureCache[this.image_url];

            this.image_url = null;

            // @ts-ignore
            if (!navigator.isCocoonJS) {
                // @ts-ignore
                this.source.src = '';
            }
        }

        this.source = null;

        this.dispose();

        BaseTexture.remove_from_cache(this);
        this.texture_cache_ids = null;

        this._destroyed = true;
    }

    /**
     * Frees the texture from WebGL memory without destroying this texture object.
     * This means you can still use the texture later which will upload it to GPU
     * memory again.
     *
     * @fires BaseTexture#dispose
     */
    dispose() {
        this.emit('dispose', this);
    }

    /**
     * Changes the source image of the texture.
     * The original source must be an Image element.
     *
     * @param {string} new_src - the path of the image
     */
    update_source_image(new_src) {
        // @ts-ignore
        this.source.src = new_src;

        this.load_source(this.source);
    }

    /**
     * Helper function that creates a base texture from the given image url.
     * If the image is not in the base texture cache it will be created and loaded.
     *
     * @static
     * @param {string} image_url - The image url of the texture
     * @param {boolean} [crossorigin=(auto)] - Should use anonymous CORS? Defaults to true if the URL is not a data-URI.
     * @param {number} [scale_mode=settings.SCALE_MODE] - See {@link SCALE_MODES} for possible values
     * @param {number} [source_scale=(auto)] - Scale for the original image, used with Svg images.
     * @return {BaseTexture} The new base texture.
     */
    static from_image(image_url, crossorigin, scale_mode, source_scale) {
        let base_texture = BaseTextureCache[image_url];

        if (!base_texture) {
            // new Image() breaks tex loading in some versions of Chrome.
            // See https://code.google.com/p/chromium/issues/detail?id=238071
            const image = new Image();// document.createElement('img');

            if (crossorigin === undefined && image_url.indexOf('data:') !== 0) {
                image.crossOrigin = determine_cross_origin(image_url);
            }
            else if (crossorigin) {
                image.crossOrigin = typeof crossorigin === 'string' ? crossorigin : 'anonymous';
            }

            base_texture = new BaseTexture(image, scale_mode);
            base_texture.image_url = image_url;

            if (source_scale) {
                base_texture.source_scale = source_scale;
            }

            // if there is an @2x at the end of the url we are going to assume its a highres image
            base_texture.resolution = get_resolution_of_url(image_url);

            image.src = image_url; // Setting this triggers load

            BaseTexture.add_to_cache(base_texture, image_url);
        }

        return base_texture;
    }

    /**
     * Helper function that creates a base texture from the given canvas element.
     *
     * @static
     * @param {HTMLCanvasElement} canvas - The canvas element source of the texture
     * @param {number} [scale_mode] - See {@link SCALE_MODES} for possible values
     * @param {string} [origin='canvas'] - A string origin of who created the base texture
     * @return {BaseTexture} The new base texture.
     */
    static from_canvas(canvas, scale_mode, origin = 'canvas') {
        if (!canvas._pixiId) {
            canvas._pixiId = `${origin}_${uid()}`;
        }

        let base_texture = BaseTextureCache[canvas._pixiId];

        if (!base_texture) {
            base_texture = new BaseTexture(canvas, scale_mode);
            BaseTexture.add_to_cache(base_texture, canvas._pixiId);
        }

        return base_texture;
    }

    /**
     * Helper function that creates a base texture based on the source you provide.
     * The source can be - image url, image element, canvas element. If the
     * source is an image url or an image element and not in the base texture
     * cache, it will be created and loaded.
     *
     * @static
     * @param {string|HTMLImageElement|HTMLCanvasElement} source - The source to create base texture from.
     * @param {number} [scale_mode=settings.SCALE_MODE] - See {@link SCALE_MODES} for possible values
     * @param {number} [source_scale=(auto)] - Scale for the original image, used with Svg images.
     * @return {BaseTexture} The new base texture.
     */
    static from(source, scale_mode, source_scale) {
        if (typeof source === 'string') {
            return BaseTexture.from_image(source, undefined, scale_mode, source_scale);
        }
        else if (source instanceof HTMLImageElement) {
            const image_url = source.src;
            let base_texture = BaseTextureCache[image_url];

            if (!base_texture) {
                base_texture = new BaseTexture(source, scale_mode);
                base_texture.image_url = image_url;

                if (source_scale) {
                    base_texture.source_scale = source_scale;
                }

                // if there is an @2x at the end of the url we are going to assume its a highres image
                base_texture.resolution = get_resolution_of_url(image_url);

                BaseTexture.add_to_cache(base_texture, image_url);
            }

            return base_texture;
        }
        else if (source instanceof HTMLCanvasElement) {
            return BaseTexture.from_canvas(source, scale_mode);
        }

        // lets assume its a base texture!
        return source;
    }

    /**
     * Adds a BaseTexture to the global BaseTextureCache.
     *
     * @static
     * @param {BaseTexture} base_texture - The BaseTexture to add to the cache.
     * @param {string} id - The id that the BaseTexture will be stored against.
     */
    static add_to_cache(base_texture, id) {
        if (id) {
            if (base_texture.texture_cache_ids.indexOf(id) === -1) {
                base_texture.texture_cache_ids.push(id);
            }

            // @if DEBUG
            /* eslint-disable no-console */
            if (BaseTextureCache[id]) {
                console.warn(`BaseTexture added to the cache with an id [${id}] that already had an entry`);
            }
            /* eslint-enable no-console */
            // @endif

            BaseTextureCache[id] = base_texture;
        }
    }

    /**
     * Remove a BaseTexture from the global BaseTextureCache.
     *
     * @static
     * @param {string|BaseTexture} base_texture - id of a BaseTexture to be removed, or a BaseTexture instance itself.
     * @return {BaseTexture|null} The BaseTexture that was removed.
     */
    static remove_from_cache(base_texture) {
        if (typeof base_texture === 'string') {
            const base_textureFromCache = BaseTextureCache[base_texture];

            if (base_textureFromCache) {
                const index = base_textureFromCache.texture_cache_ids.indexOf(base_texture);

                if (index > -1) {
                    base_textureFromCache.texture_cache_ids.splice(index, 1);
                }

                delete BaseTextureCache[base_texture];

                return base_textureFromCache;
            }
        }
        else if (base_texture && base_texture.texture_cache_ids) {
            for (let i = 0; i < base_texture.texture_cache_ids.length; ++i) {
                delete BaseTextureCache[base_texture.texture_cache_ids[i]];
            }

            base_texture.texture_cache_ids.length = 0;

            return base_texture;
        }

        return null;
    }
}
