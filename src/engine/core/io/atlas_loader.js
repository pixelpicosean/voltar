import Resource from './io_resource.js';
import {
    get_raw_resource_map,
    get_resource_map,
} from 'engine/registry.js';
import { ImageTexture } from 'engine/scene/resources/texture.js';


/**
 * @param {string} url
 * @param {number} [default_value=1]
 */
function get_resolution_of_url(url, default_value = 1) {
    // const resolution = settings.RETINA_PREFIX.exec(url);

    // if (resolution) {
    //     return parseFloat(resolution[1]);
    // }

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
     * @param {ImageTexture} base_texture Reference to the source BaseTexture object.
     * @param {{ frames: string[], meta: { scale?: string }}} data - Spritesheet image data.
     */
    constructor(base_texture, data) {
        /**
         * Reference to ths source texture
         * @type {ImageTexture}
         */
        this.base_texture = base_texture;

        /**
         * Map of spritesheet textures.
         * @type {Object<string, ImageTexture>}
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
        this.resolution = 1;

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
            const rect = this._frames[i].frame;
            const tex = new ImageTexture;
            tex.create_from_region(this.base_texture, rect.x, rect.y, rect.w, rect.h);
            tex.resource_name = i;
            this.textures[i] = tex;

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
            res.internal,
            resource.data
        );

        spritesheet.parse(() => {
            resource.internal = spritesheet.textures;

            // spritesheet from atlas
            get_raw_resource_map()[resource.name] = spritesheet;

            // textures from spritesheet
            for (let k in spritesheet.textures) {
                get_resource_map()[k] = spritesheet.textures[k];
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

    return resolve_url(resource.url.replace(base_url, ''), resource.data.meta.image);
}

/**
 * @param {string} from
 * @param {string} to
 */
function resolve_url(from, to) {
    const segs = from.split("/");
    segs[segs.length - 1] = to;
    return segs.join("/");
}
