import { UPDATE_PRIORITY } from 'engine/const';
import { uid, BaseTextureCache } from 'engine/utils/index';
import { shared } from 'engine/ticker/index';
import determine_cross_origin from 'engine/utils/determine_cross_origin';
import BaseTexture from './base_texture';

/**
 * @typedef VideoURLObj
 * @property {string} src One of the source urls for the video
 * @property {string} mime The mimetype of the video (e.g. 'video/mp4'). If not specified
 *                         the url's extension will be used as the second part of the mime type.
 */

/**
 * A texture of a [playing] Video.
 *
 * Video base textures mimic Pixi BaseTexture.from.... method in their creation process.
 *
 * This can be used in several ways, such as:
 *
 * ```js
 * let texture = VideoBaseTexture.from_url('http://mydomain.com/video.mp4');
 *
 * let texture = VideoBaseTexture.from_url({ src: 'http://mydomain.com/video.mp4', mime: 'video/mp4' });
 *
 * let texture = VideoBaseTexture.from_urls(['/video.webm', '/video.mp4']);
 *
 * let texture = VideoBaseTexture.from_urls([
 *     { src: '/video.webm', mime: 'video/webm' },
 *     { src: '/video.mp4', mime: 'video/mp4' }
 * ]);
 * ```
 *
 * See the ["deus" demo](http://www.goodboydigital.com/pixijs/examples/deus/).
 */
export default class VideoBaseTexture extends BaseTexture {
    /**
     * @param {HTMLVideoElement} source - Video source
     * @param {number} [scale_mode]
     * @param {boolean} [auto_play] - Start playing video as soon as it is loaded
     */
    constructor(source, scale_mode, auto_play = true) {
        if (!source) {
            throw new Error('No video source element specified.');
        }

        // hook in here to check if video is already available.
        // BaseTexture looks for a source.complete boolean, plus width & height.

        if ((source.readyState === source.HAVE_ENOUGH_DATA || source.readyState === source.HAVE_FUTURE_DATA)
            && source.width && source.height) {
            source.complete = true;
        }

        super(source, scale_mode);

        this.width = source.videoWidth;
        this.height = source.videoHeight;

        this._auto_update = true;
        this._is_auto_updating = false;

        /**
         * When set to true will automatically play videos used by this texture once
         * they are loaded. If false, it will not modify the playing state.
         *
         * @type {boolean}
         */
        this.auto_play = auto_play;

        this.update = this.update.bind(this);
        this._on_can_play = this._on_can_play.bind(this);

        source.addEventListener('play', this._on_play_start.bind(this));
        source.addEventListener('pause', this._on_play_stop.bind(this));
        this.has_loaded = false;
        this._loaded = false;

        if (!this._is_source_ready()) {
            source.addEventListener('canplay', this._on_can_play);
            source.addEventListener('canplaythrough', this._on_can_play);
        } else {
            this._on_can_play();
        }
    }

    /**
     * Returns true if the underlying source is playing.
     */
    _is_source_playing() {
        const source = /** @type {HTMLVideoElement} */(this.source);

        return (source.currentTime > 0 && source.paused === false && source.ended === false && source.readyState > 2);
    }

    /**
     * Returns true if the underlying source is ready for playing.
     */
    _is_source_ready() {
        return  /** @type {HTMLVideoElement} */(this.source).readyState === 3
            ||
            /** @type {HTMLVideoElement} */(this.source).readyState === 4;
    }

    /**
     * Runs the update loop when the video is ready to play
     */
    _on_play_start() {
        // Just in case the video has not received its can play even yet..
        if (!this.has_loaded) {
            this._on_can_play();
        }

        if (!this._is_auto_updating && this.auto_update) {
            shared.add(this.update, this, UPDATE_PRIORITY.HIGH);
            this._is_auto_updating = true;
        }
    }

    /**
     * Fired when a pause event is triggered, stops the update loop
     */
    _on_play_stop() {
        if (this._is_auto_updating) {
            shared.remove(this.update, this);
            this._is_auto_updating = false;
        }
    }

    /**
     * Fired when the video is loaded and ready to play
     */
    _on_can_play() {
        this.has_loaded = true;

        if (this.source) {
            this.source.removeEventListener('canplay', this._on_can_play);
            this.source.removeEventListener('canplaythrough', this._on_can_play);

            this.width = /** @type {HTMLVideoElement} */(this.source).videoWidth;
            this.height = /** @type {HTMLVideoElement} */(this.source).videoHeight;

            // prevent multiple loaded dispatches..
            if (!this._loaded) {
                this._loaded = true;
                this.emit_signal('loaded', this);
            }

            if (this._is_source_playing()) {
                this._on_play_start();
            } else if (this.auto_play) {
                /** @type {HTMLVideoElement} */(this.source).play();
            }
        }
    }

    /**
     * Destroys this texture
     */
    destroy() {
        if (this._is_auto_updating) {
            shared.remove(this.update, this);
        }

        if (this.source && this.source._tex_id) {
            BaseTexture.remove_from_cache(this.source._tex_id);
            delete this.source._tex_id;

            /** @type {HTMLVideoElement} */(this.source).pause();
            /** @type {HTMLVideoElement} */(this.source).src = '';
            /** @type {HTMLVideoElement} */(this.source).load();
        }

        super.destroy();
    }

    /**
     * Mimic BaseTexture.from.... method.
     *
     * @param {HTMLVideoElement} video - Video to create texture from
     * @param {number} [scale_mode]
     * @param {boolean} [auto_play] - Start playing video as soon as it is loaded
     * @return {VideoBaseTexture} Newly created VideoBaseTexture
     */
    static from_video(video, scale_mode, auto_play) {
        if (!video._tex_id) {
            video._tex_id = `video_${uid()}`;
        }

        let base_texture = BaseTextureCache[video._tex_id];

        if (!base_texture) {
            base_texture = new VideoBaseTexture(video, scale_mode, auto_play);
            BaseTexture.add_to_cache(base_texture, video._tex_id);
        }

        return base_texture;
    }

    /**
     * Helper function that creates a new BaseTexture based on the given video element.
     * This BaseTexture can then be used to create a texture
     *
     * @param {string|VideoURLObj|string[]|VideoURLObj[]} video_src - The URL(s) for the video.
     * @param {number} scale_mode
     * @param {boolean} [crossorigin] - Should use anonymous CORS? Defaults to true if the URL is not a data-URI.
     * @param {boolean} [auto_play] - Start playing video as soon as it is loaded
     * @return {VideoBaseTexture} Newly created VideoBaseTexture
     */
    static from_url(video_src, scale_mode, crossorigin, auto_play) {
        const video = document.createElement('video');

        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('playsinline', '');

        const url = Array.isArray(video_src) ?
            (/** @type {VideoURLObj} */(video_src[0]).src || video_src[0]) :
            (/** @type {VideoURLObj} */(video_src).src || video_src);

        if (crossorigin === undefined && /** @type {string} */(url).indexOf('data:') !== 0) {
            video.crossOrigin = determine_cross_origin(/** @type {string} */(url));
        } else if (crossorigin) {
            video.crossOrigin = (typeof crossorigin === 'string') ?
                crossorigin :
                'anonymous';
        }

        // array of objects or strings
        if (Array.isArray(video_src)) {
            for (let i = 0; i < video_src.length; ++i) {
                video.appendChild(create_source(/** @type {VideoURLObj} */(video_src[i]).src || /** @type {string} */(video_src[i]), /** @type {VideoURLObj} */(video_src[i]).mime));
            }
        }
        // single object or string
        else {
            video.appendChild(create_source(/** @type {string} */(url), /** @type {VideoURLObj} */(video_src).mime));
        }

        video.load();

        return VideoBaseTexture.from_video(video, scale_mode, auto_play);
    }

    /**
     * Should the base texture automatically update itself, set to true by default
     *
     * @type {boolean}
     */
    get auto_update() {
        return this._auto_update;
    }

    set auto_update(value) {
        if (value !== this._auto_update) {
            this._auto_update = value;

            if (!this._auto_update && this._is_auto_updating) {
                shared.remove(this.update, this);
                this._is_auto_updating = false;
            } else if (this._auto_update && !this._is_auto_updating) {
                shared.add(this.update, this, UPDATE_PRIORITY.HIGH);
                this._is_auto_updating = true;
            }
        }
    }
}

VideoBaseTexture.from_urls = VideoBaseTexture.from_url;

/**
 * @param {string} path
 * @param {string} type
 */
function create_source(path, type) {
    if (!type) {
        const pure_path = path.split('?').shift().toLowerCase();
        type = `video/${pure_path.substr(pure_path.lastIndexOf('.') + 1)}`;
    }

    const source = document.createElement('source');

    source.src = path;
    source.type = type;

    return source;
}
