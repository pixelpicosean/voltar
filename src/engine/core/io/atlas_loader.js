import url from 'url';
import { Rect2 } from 'engine/core/math/rect2';

import BaseTexture from 'engine/drivers/textures/BaseTexture';
import Texture from 'engine/drivers/textures/Texture';
import * as settings from 'engine/drivers/settings';

import Resource from './io_resource';
import { raw_resource_map, resource_map } from 'engine/registry';
import { ImageTexture } from 'engine/scene/resources/texture';


/**
 * @param {string} url
 * @param {number} [default_value=1]
 */
function get_resolution_of_url(url, default_value = 1) {
    const resolution = settings.RETINA_PREFIX.exec(url);

    if (resolution) {
        return parseFloat(resolution[1]);
    }

    return default_value !== undefined ? default_value : 1;
}

/**
 * Utility class for maintaining reference to a collection
 * of Textures on a single Spritesheet.
 */
class Spritesheet {
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
         * Reference to the original JSON data.
         */
        this.data = data;

        /**
         * The resolution of the spritesheet.
         * @type {number}
         */
        this.resolution = this._update_resolution(
            resolution_filename || (this.base_texture.resource ? this.base_texture.resource.url : null)
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
        let resolution = get_resolution_of_url(resolution_filename, null);

        // No resolution found via URL
        if (resolution === null) {
            // Use the scale value or default to 1
            resolution = (scale !== undefined) ? parseFloat(scale) : 1;
        }

        // For non-1 resolutions, update base_texture
        if (resolution !== 1) {
            this.base_texture.setResolution(resolution);
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

        while (frame_index - initial_frame_index < max_frames && frame_index < this._frame_keys.length) {
            const i = this._frame_keys[frame_index];
            const data = this._frames[i];
            const rect = data.frame;

            if (rect) {
                let frame = null;
                let trim = null;
                const source_size = data.trimmed !== false && data.sourceSize
                    ? data.sourceSize : data.frame;

                const orig = new Rect2(
                    0,
                    0,
                    Math.floor(source_size.w) / this.resolution,
                    Math.floor(source_size.h) / this.resolution
                );

                if (data.rotated) {
                    frame = new Rect2(
                        Math.floor(rect.x) / this.resolution,
                        Math.floor(rect.y) / this.resolution,
                        Math.floor(rect.h) / this.resolution,
                        Math.floor(rect.w) / this.resolution
                    );
                } else {
                    frame = new Rect2(
                        Math.floor(rect.x) / this.resolution,
                        Math.floor(rect.y) / this.resolution,
                        Math.floor(rect.w) / this.resolution,
                        Math.floor(rect.h) / this.resolution
                    );
                }

                //  Check to see if the sprite is trimmed
                if (data.trimmed !== false && data.spriteSourceSize) {
                    trim = new Rect2(
                        Math.floor(data.spriteSourceSize.x) / this.resolution,
                        Math.floor(data.spriteSourceSize.y) / this.resolution,
                        Math.floor(rect.w) / this.resolution,
                        Math.floor(rect.h) / this.resolution
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
                Texture.addToCache(this.textures[i], i);
            }

            frame_index++;
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
            } else {
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

export function atlas_loader(/** @type {Resource} */ resource, /** @type {Function} */ next) {
    const image_resource_name = `${resource.name}_image`;

    // skip if no data, its not json, it isn't spritesheet data, or the image resource already exists
    if (
        !resource.data
        ||
        resource.type !== Resource.TYPE.JSON
        ||
        !resource.data.frames
        ||
        this.resources[image_resource_name]
    ) {
        next();

        return;
    }

    const load_options = {
        cross_origin: resource.cross_origin,
        metadata: resource.metadata.image_metadata,
        parent_resource: resource,
    };

    const resource_path = get_resource_path(resource, this.base_url);

    // load the image for this sheet
    this.add(image_resource_name, resource_path, load_options, function onImageLoad(/** @type {Resource} */ res) {
        if (res.error) {
            next(res.error);

            return;
        }

        const spritesheet = new Spritesheet(
            res.internal.baseTexture,
            resource.data,
            resource.url
        );

        spritesheet.parse(() => {
            resource.internal = spritesheet.textures;

            // spritesheet from atlas
            raw_resource_map[resource.name] = spritesheet;

            // textures from spritesheet
            for (let k in spritesheet.textures) {
                let tex = new ImageTexture();
                tex.create_from_atlas(spritesheet.textures[k], 0);
                resource_map[k] = tex;
            }

            next();
        });
    });
}

export function get_resource_path(/** @type {Resource} */ resource, /** @type {string} */ base_url) {
    // Prepend url path unless the resource image is a data url
    if (resource.is_data_url) {
        return resource.data.meta.image;
    }

    return url.resolve(resource.url.replace(base_url, ''), resource.data.meta.image);
}
