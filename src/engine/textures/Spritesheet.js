import { Rectangle } from '../math/index';
import { get_resolution_of_url } from '../utils/index';
import BaseTexture from './BaseTexture';
import Texture from './texture';

/**
 * Utility class for maintaining reference to a collection
 * of Textures on a single Spritesheet.
 */
export default class Spritesheet {
    /**
     * The maximum number of Textures to build per process.
     *
     * @type {number}
     * @default 1000
     */
    static get BATCH_SIZE() {
        return 1000;
    }

    /**
     * @param {BaseTexture} base_texture Reference to the source BaseTexture object.
     * @param {{ frames: string[], animations: string[][], meta: { scale?: string }}} data - Spritesheet image data.
     * @param {string} [resolution_filename] - The filename to consider when determining
     *        the resolution of the spritesheet. If not provided, the image_url will
     *        be used on the BaseTexture.
     */
    constructor(base_texture, data, resolution_filename = null) {
        /**
         * Reference to ths source texture
         * @type {BaseTexture}
         */
        this.base_texture = base_texture;

        /**
         * Map of spritesheet textures.
         * @type {Object<string, Texture>}
         */
        this.textures = {};

        /**
         * A map containing the textures for each animation.
         * Can be used to create an {@link AnimatedSprite}:
         * ```js
         * new AnimatedSprite(sheet.animations["anim_name"])
         * ```
         * @type {Object<string, Texture[]>}
         */
        this.animations = {};

        /**
         * Reference to the original JSON data.
         */
        this.data = data;

        /**
         * The resolution of the spritesheet.
         * @type {number}
         */
        this.resolution = this._update_resolution(
            resolution_filename || this.base_texture.image_url
        );

        /**
         * Map of spritesheet frames.
         * @type {Object}
         * @private
         */
        this._frames = this.data.frames;

        /**
         * Collection of frame names.
         * @type {string[]}
         * @private
         */
        this._frame_keys = Object.keys(this._frames);

        /**
         * Current batch index being processed.
         * @type {number}
         * @private
         */
        this._batch_index = 0;

        /**
         * Callback when parse is completed.
         * @type {Function}
         * @private
         */
        this._callback = null;
    }

    /**
     * Generate the resolution from the filename or fallback
     * to the meta.scale field of the JSON data.
     *
     * @private
     * @param {string} resolution_filename - The filename to use for resolving
     *        the default resolution.
     * @return {number} Resolution to use for spritesheet.
     */
    _update_resolution(resolution_filename) {
        const scale = this.data.meta.scale;

        // Use a defaultValue of `null` to check if a url-based resolution is set
        let resolution = get_resolution_of_url(resolution_filename, -1);

        // No resolution found via URL
        if (resolution === -1) {
            // Use the scale value or default to 1
            resolution = (scale !== undefined) ? parseFloat(scale) : 1;
        }

        // For non-1 resolutions, update base_texture
        if (resolution !== 1) {
            this.base_texture.resolution = resolution;
            this.base_texture.update();
        }

        return resolution;
    }

    /**
     * Parser spritesheet from loaded data. This is done asynchronously
     * to prevent creating too many Texture within a single process.
     *
     * @param {Function} callback - Callback when complete returns
     *        a map of the Textures for this spritesheet.
     */
    parse(callback) {
        this._batch_index = 0;
        this._callback = callback;

        if (this._frame_keys.length <= Spritesheet.BATCH_SIZE) {
            this._process_frames(0);
            this._process_animations();
            this._parse_complete();
        } else {
            this._next_batch();
        }
    }

    /**
     * Process a batch of frames
     *
     * @private
     * @param {number} initial_frame_index - The index of frame to start.
     */
    _process_frames(initial_frame_index) {
        let frame_index = initial_frame_index;
        const max_frames = Spritesheet.BATCH_SIZE;
        const source_scale = this.base_texture.source_scale;

        while (frame_index - initial_frame_index < max_frames && frame_index < this._frame_keys.length) {
            const i = this._frame_keys[frame_index];
            const data = this._frames[i];
            const rect = data.frame;

            if (rect) {
                let frame = null;
                let trim = null;
                const source_size = data.trimmed !== false && data.sourceSize
                    ? data.sourceSize : data.frame;

                const orig = new Rectangle(
                    0,
                    0,
                    Math.floor(source_size.w * source_scale) / this.resolution,
                    Math.floor(source_size.h * source_scale) / this.resolution
                );

                if (data.rotated) {
                    frame = new Rectangle(
                        rect.x / this.resolution,
                        rect.y / this.resolution,
                        rect.h / this.resolution,
                        rect.w / this.resolution
                    );
                } else {
                    frame = new Rectangle(
                        rect.x / this.resolution,
                        rect.y / this.resolution,
                        rect.w / this.resolution,
                        rect.h / this.resolution
                    );
                }

                //  Check to see if the sprite is trimmed
                if (data.trimmed !== false && data.spriteSourceSize) {
                    trim = new Rectangle(
                        Math.floor(data.spriteSourceSize.x * source_scale) / this.resolution,
                        Math.floor(data.spriteSourceSize.y * source_scale) / this.resolution,
                        rect.w / this.resolution,
                        rect.h / this.resolution
                    );
                }

                this.textures[i] = new Texture(
                    this.base_texture,
                    frame,
                    orig,
                    trim,
                    data.rotated ? 2 : 0,
                    data.anchor
                );

                // lets also add the frame to global cache for from_frame and from_image functions
                Texture.add_to_cache(this.textures[i], i);
            }

            frame_index++;
        }
    }

    /**
     * Parse animations config
     *
     * @private
     */
    _process_animations() {
        const animations = this.data.animations || {};

        for (const anim_name in animations) {
            this.animations[anim_name] = [];
            for (const frameName of animations[anim_name]) {
                this.animations[anim_name].push(this.textures[frameName]);
            }
        }
    }

    /**
     * The parse has completed.
     *
     * @private
     */
    _parse_complete() {
        const callback = this._callback;

        this._callback = null;
        this._batch_index = 0;
        callback.call(this, this.textures);
    }

    /**
     * Begin the next batch of textures.
     *
     * @private
     */
    _next_batch() {
        this._process_frames(this._batch_index * Spritesheet.BATCH_SIZE);
        this._batch_index++;
        setTimeout(() => {
            if (this._batch_index * Spritesheet.BATCH_SIZE < this._frame_keys.length) {
                this._next_batch();
            }
            else {
                this._process_animations();
                this._parse_complete();
            }
        }, 0);
    }

    /**
     * Destroy Spritesheet and don't use after this.
     *
     * @param {boolean} [destroy_base] Whether to destroy the base texture as well
     */
    destroy(destroy_base = false) {
        for (const i in this.textures) {
            this.textures[i].destroy();
        }
        this._frames = null;
        this._frame_keys = null;
        this.data = null;
        this.textures = null;
        if (destroy_base) {
            this.base_texture.destroy();
        }
        this.base_texture = null;
    }
}
