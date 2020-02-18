import { VObject } from 'engine/core/v_object';
import parse_uri from './parse_uri';
import { ImageTexture } from 'engine/scene/resources/texture';

let temp_anchor = null;

// some status constants
const STATUS_NONE = 0;
const STATUS_OK = 200;
const STATUS_EMPTY = 204;
const STATUS_IE_BUG_EMPTY = 1223;
const STATUS_TYPE_OK = 2;

function _noop() { }

/**
 * Manages the state and loading of a resource and all child resources.
 */
export default class Resource extends VObject {
    /**
     * Sets the load type to be used for a specific extension.
     *
     * @static
     * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
     * @param {Resource.LOAD_TYPE} load_type - The load type to set it to.
     */
    static set_extension_load_type(extname, load_type) {
        set_ext_map(Resource.load_type_map, extname, load_type);
    }

    /**
     * Sets the load type to be used for a specific extension.
     *
     * @static
     * @param {string} extname - The extension to set the type for, e.g. "png" or "fnt"
     * @param {Resource.XHR_RESPONSE_TYPE} xhr_type - The xhr type to set it to.
     */
    static set_extension_xhr_type(extname, xhr_type) {
        set_ext_map(Resource.xhr_type_map, extname, xhr_type);
    }

    /**
     * @param {string} name - The name of the resource to load.
     * @param {string|string[]} url - The url for this resource, for audio/video loads you can pass
     *      an array of sources.
     * @param {object} [options] - The options for the load.
     * @param {string|boolean} [options.cross_origin] - Is this request cross-origin? Default is to
     *      determine automatically.
     * @param {number} [options.timeout=0] - A timeout in milliseconds for the load. If the load takes
     *      longer than this time it is cancelled and the load is considered a failure. If this value is
     *      set to `0` then there is no explicit timeout.
     * @param {Resource.LOAD_TYPE} [options.load_type=Resource.LOAD_TYPE.XHR] - How should this resource
     *      be loaded?
     * @param {Resource.XHR_RESPONSE_TYPE} [options.xhr_type=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How
     *      should the data being loaded be interpreted when using XHR?
     * @param {IMetadata} [options.metadata] - Extra configuration for middleware and the Resource object.
     */
    constructor(name, url, options) {
        super();

        if (typeof name !== 'string' || typeof url !== 'string') {
            throw new Error('Both name and url are required for constructing a resource.');
        }

        options = options || {};

        /**
         * The state flags of this resource.
         *
         * @private
         * @type {number}
         */
        this._flags = 0;

        // set data url flag, needs to be set early for some _determineX checks to work.
        this._set_flag(Resource.STATUS_FLAGS.DATA_URL, url.indexOf('data:') === 0);

        /**
         * The name of this resource.
         *
         * @readonly
         * @type {string}
         */
        this.name = name;

        /**
         * The url used to load this resource.
         *
         * @readonly
         * @type {string}
         */
        this.url = url;

        /**
         * The extension used to load this resource.
         *
         * @readonly
         * @type {string}
         */
        this.extension = this._get_extension();

        /**
         * The data that was loaded by the resource.
         *
         * @type {any}
         */
        this.data = null;

        /**
         * DO NOT MODIIFY, it is used to keep internal data
         * @type {any}
         */
        this.internal = null;

        /**
         * @type {any}
         */
        this.blob = null;

        /**
         * Is this request cross-origin? If unset, determined automatically.
         *
         * @type {string|boolean}
         */
        this.cross_origin = (options.cross_origin === true) ? 'anonymous' : options.cross_origin;

        /**
         * A timeout in milliseconds for the load. If the load takes longer than this time
         * it is cancelled and the load is considered a failure. If this value is set to `0`
         * then there is no explicit timeout.
         *
         * @type {number}
         */
        this.timeout = options.timeout || 0;

        /**
         * The method of loading to use for this resource.
         *
         * @type {Resource.LOAD_TYPE}
         */
        this.load_type = options.load_type || this._determine_load_type();

        /**
         * The type used to load the resource via XHR. If unset, determined automatically.
         *
         * @type {string}
         */
        this.xhr_type = options.xhr_type;

        /**
         * Extra info for middleware, and controlling specifics about how the resource loads.
         *
         * Note that if you pass in a `loadElement`, the Resource class takes ownership of it.
         * Meaning it will modify it as it sees fit.
         *
         * @type {IMetadata}
         */
        this.metadata = options.metadata || {};

        /**
         * The error that occurred while loading (if any).
         *
         * @readonly
         * @type {Error}
         */
        this.error = null;

        /**
         * The XHR object that was used to load this resource. This is only set
         * when `load_type` is `Resource.LOAD_TYPE.XHR`.
         *
         * @readonly
         * @type {XMLHttpRequest}
         */
        this.xhr = null;

        /**
         * The child resources this resource owns.
         *
         * @readonly
         * @type {Resource[]}
         */
        this.children = [];

        /**
         * The resource type.
         *
         * @readonly
         * @type {Resource.TYPE}
         */
        this.type = Resource.TYPE.UNKNOWN;

        /**
         * The progress chunk owned by this resource.
         *
         * @readonly
         * @type {number}
         */
        this.progress_chunk = 0;

        /**
         * The `dequeue` method that will be used a storage place for the async queue dequeue method
         * used privately by the loader.
         *
         * @private
         * @type {function}
         */
        this._dequeue = _noop;

        /**
         * Used a storage place for the on load binding used privately by the loader.
         *
         * @private
         * @type {function}
         */
        this._on_load_binding = null;

        /**
         * The timer for element loads to check if they timeout.
         */
        this._element_timer = undefined;

        this._bound_complete = this.complete.bind(this);
        this._bound_on_error = this._on_error.bind(this);
        this._bound_on_progress = this._on_progress.bind(this);
        this._bound_on_timeout = this._on_timeout.bind(this);

        // xhr callbacks
        this._bound_xhr_on_error = this._xhr_on_error.bind(this);
        this._bound_xhr_on_timeout = this._xhr_on_timeout.bind(this);
        this._bound_xhr_on_abort = this._xhr_on_abort.bind(this);
        this._bound_xhr_on_load = this._xhr_on_load.bind(this);
    }

    /**
     * @typedef IMetadata
     * @property {HTMLImageElement|HTMLAudioElement|HTMLVideoElement} [load_element=null] - The
     *      element to use for loading, instead of creating one.
     * @property {boolean} [skip_source=false] - Skips adding source(s) to the load element. This
     *      is useful if you want to pass in a `load_element` that you already added load sources to.
     * @property {string|string[]} [mime_type] - The mime type to use for the source element
     *      of a video/audio elment. If the urls are an array, you can pass this as an array as well
     *      where each index is the mime type to use for the corresponding url index.
     * @property {any} [image_metadata]
     * @property {any} [extra]
     */

    /**
     * Stores whether or not this url is a data url.
     *
     * @readonly
     * @type {boolean}
     */
    get is_data_url() {
        return this._has_flag(Resource.STATUS_FLAGS.DATA_URL);
    }

    /**
     * Describes if this resource has finished loading. Is true when the resource has completely
     * loaded.
     *
     * @readonly
     * @type {boolean}
     */
    get is_complete() {
        return this._has_flag(Resource.STATUS_FLAGS.COMPLETE);
    }

    /**
     * Describes if this resource is currently loading. Is true when the resource starts loading,
     * and is false again when complete.
     *
     * @readonly
     * @type {boolean}
     */
    get is_loading() {
        return this._has_flag(Resource.STATUS_FLAGS.LOADING);
    }

    /**
     * Marks the resource as complete.
     *
     */
    complete() {
        this._clear_events();
        this._finish();
    }

    /**
     * Aborts the loading of this resource, with an optional message.
     *
     * @param {string} message - The message to use for the error
     */
    abort(message) {
        // abort can be called multiple times, ignore subsequent calls.
        if (this.error) {
            return;
        }

        // store error
        this.error = new Error(message);

        // clear events before calling aborts
        this._clear_events();

        // abort the actual loading
        if (this.xhr) {
            this.xhr.abort();
        } else if (this.data) {
            // single source
            if (this.data.src) {
                this.data.src = Resource.EMPTY_GIF;
            }
            // multi-source
            else {
                while (this.data.firstChild) {
                    this.data.removeChild(this.data.firstChild);
                }
            }
        }

        // done now.
        this._finish();
    }

    /**
     * Kicks off loading of this resource. This method is asynchronous.
     *
     * @param {Function} [cb] - Optional callback to call once the resource is loaded.
     */
    load(cb) {
        if (this.is_loading) {
            return;
        }

        if (this.is_complete) {
            if (cb) {
                setTimeout(() => cb(this), 1);
            }

            return;
        } else if (cb) {
            this.connect_once('complete', cb);
        }

        this._set_flag(Resource.STATUS_FLAGS.LOADING, true);

        this.emit_signal('start', this);

        // if unset, determine the value
        if (this.cross_origin === false || typeof this.cross_origin !== 'string') {
            this.cross_origin = this._determine_cross_origin(this.url);
        }

        switch (this.load_type) {
            case Resource.LOAD_TYPE.IMAGE: {
                this.type = Resource.TYPE.IMAGE;
                this._load_element('image');
            } break;
            case Resource.LOAD_TYPE.AUDIO: {
                this.type = Resource.TYPE.AUDIO;
                this._load_source_element('audio');
            } break;
            case Resource.LOAD_TYPE.VIDEO: {
                this.type = Resource.TYPE.VIDEO;
                this._load_source_element('video');
            } break;
            case Resource.LOAD_TYPE.XHR: {
                /* falls through */
            }
            default: {
                this._load_xhr();
            } break;
        }
    }

    /**
     * Checks if the flag is set.
     *
     * @private
     * @param {number} flag - The flag to check.
     */
    _has_flag(flag) {
        return (this._flags & flag) !== 0;
    }

    /**
     * (Un)Sets the flag.
     *
     * @private
     * @param {number} flag - The flag to (un)set.
     * @param {boolean} value - Whether to set or (un)set the flag.
     */
    _set_flag(flag, value) {
        this._flags = value ? (this._flags | flag) : (this._flags & ~flag);
    }

    /**
     * Clears all the events from the underlying loading source.
     *
     * @private
     */
    _clear_events() {
        clearTimeout(this._element_timer);

        if (this.data && this.data.removeEventListener) {
            this.data.removeEventListener('error', this._bound_on_error, false);
            this.data.removeEventListener('load', this._bound_complete, false);
            this.data.removeEventListener('progress', this._bound_on_progress, false);
            this.data.removeEventListener('canplaythrough', this._bound_complete, false);
        }

        if (this.xhr) {
            if (this.xhr.removeEventListener) {
                this.xhr.removeEventListener('error', this._bound_xhr_on_error, false);
                this.xhr.removeEventListener('timeout', this._bound_xhr_on_timeout, false);
                this.xhr.removeEventListener('abort', this._bound_xhr_on_abort, false);
                this.xhr.removeEventListener('progress', this._bound_on_progress, false);
                this.xhr.removeEventListener('load', this._bound_xhr_on_load, false);
            } else {
                this.xhr.onerror = null;
                this.xhr.ontimeout = null;
                this.xhr.onprogress = null;
                this.xhr.onload = null;
            }
        }
    }

    /**
     * Finalizes the load.
     *
     * @private
     */
    _finish() {
        if (this.is_complete) {
            throw new Error('Complete called again for an already completed resource.');
        }

        this._set_flag(Resource.STATUS_FLAGS.COMPLETE, true);
        this._set_flag(Resource.STATUS_FLAGS.LOADING, false);

        this.emit_signal('complete', this);
    }

    /**
     * Loads this resources using an element that has a single source,
     * like an HTMLImageElement.
     *
     * @private
     * @param {string} type - The type of element to use.
     */
    _load_element(type) {
        if (this.metadata.load_element) {
            this.data = this.metadata.load_element;
        } else if (type === 'image' && typeof Image !== 'undefined') {
            this.data = new Image();
        } else {
            this.data = document.createElement(type);
        }

        if (this.cross_origin) {
            this.data.crossOrigin = this.cross_origin;
        }

        if (!this.metadata.skip_source) {
            this.data.src = this.url;
        }

        this.data.addEventListener('error', this._bound_on_error, false);
        this.data.addEventListener('load', this._bound_complete, false);
        this.data.addEventListener('progress', this._bound_on_progress, false);

        if (this.timeout) {
            this._element_timer = setTimeout(this._bound_on_timeout, this.timeout);
        }
    }

    /**
     * Loads this resources using an element that has multiple sources,
     * like an HTMLAudioElement or HTMLVideoElement.
     *
     * @private
     * @param {string} type - The type of element to use.
     */
    _load_source_element(type) {
        if (this.metadata.load_element) {
            this.data = this.metadata.load_element;
        } else if (type === 'audio' && typeof Audio !== 'undefined') {
            this.data = new Audio();
        } else {
            this.data = document.createElement(type);
        }

        if (this.data === null) {
            this.abort(`Unsupported element: ${type}`);

            return;
        }

        if (this.cross_origin) {
            this.data.crossOrigin = this.cross_origin;
        }

        if (!this.metadata.skip_source) {
            if (Array.isArray(this.url)) {
                const mime_types = this.metadata.mime_type;

                for (let i = 0; i < this.url.length; ++i) {
                    this.data.appendChild(
                        this._create_source(type, this.url[i], Array.isArray(mime_types) ? mime_types[i] : mime_types)
                    );
                }
            } else {
                const mimeTypes = this.metadata.mime_type;

                this.data.appendChild(
                    this._create_source(type, this.url, Array.isArray(mimeTypes) ? mimeTypes[0] : mimeTypes)
                );
            }
        }

        this.data.addEventListener('error', this._bound_on_error, false);
        this.data.addEventListener('load', this._bound_complete, false);
        this.data.addEventListener('progress', this._bound_on_progress, false);
        this.data.addEventListener('canplaythrough', this._bound_complete, false);

        this.data.load();

        if (this.timeout) {
            this._element_timer = setTimeout(this._bound_on_timeout, this.timeout);
        }
    }

    /**
     * Loads this resources using an XMLHttpRequest.
     *
     * @private
     */
    _load_xhr() {
        // if unset, determine the value
        if (typeof this.xhr_type !== 'string') {
            this.xhr_type = this._determine_xhr_type();
        }

        const xhr = this.xhr = new XMLHttpRequest();

        // set the request type and url
        xhr.open('GET', this.url, true);

        xhr.timeout = this.timeout;

        // load json as text and parse it ourselves. We do this because some browsers
        // *cough* safari *cough* can't deal with it.
        if (this.xhr_type === Resource.XHR_RESPONSE_TYPE.JSON || this.xhr_type === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
            // @ts-ignore
            xhr.responseType = Resource.XHR_RESPONSE_TYPE.TEXT;
        } else {
            // @ts-ignore
            xhr.responseType = this.xhr_type;
        }

        xhr.addEventListener('error', this._bound_xhr_on_error, false);
        xhr.addEventListener('timeout', this._bound_xhr_on_timeout, false);
        xhr.addEventListener('abort', this._bound_xhr_on_abort, false);
        xhr.addEventListener('progress', this._bound_on_progress, false);
        xhr.addEventListener('load', this._bound_xhr_on_load, false);

        xhr.send();
    }

    /**
     * Creates a source used in loading via an element.
     *
     * @private
     * @param {string} type - The element type (video or audio).
     * @param {string} url - The source URL to load from.
     * @param {string} [mime] - The mime type of the video
     */
    _create_source(type, url, mime) {
        if (!mime) {
            mime = `${type}/${this._get_extension()}`;
        }

        const source = document.createElement('source');

        source.src = url;
        source.type = mime;

        return source;
    }

    /**
     * Called if a load errors out.
     *
     * @param {Event} event - The error event from the element that emits it.
     * @private
     */
    _on_error(event) {
        // @ts-ignore
        this.abort(`Failed to load element using: ${event.target.nodeName}`);
    }

    /**
     * Called if a load progress event fires for an element or xhr/xdr.
     *
     * @private
     * @param {ProgressEvent} event - Progress event.
     */
    _on_progress(event) {
        if (event && event.lengthComputable) {
            this.emit_signal('progress', this, event.loaded / event.total);
        }
    }

    /**
     * Called if a timeout event fires for an element.
     *
     * @private
     */
    _on_timeout() {
        this.abort(`Load timed out.`);
    }

    /**
     * Called if an error event fires for xhr/xdr.
     *
     * @private
     */
    _xhr_on_error() {
        const xhr = this.xhr;

        this.abort(`${req_type(xhr)} Request failed. Status: ${xhr.status}, text: "${xhr.statusText}"`);
    }

    /**
     * Called if an error event fires for xhr/xdr.
     *
     * @private
     */
    _xhr_on_timeout() {
        const xhr = this.xhr;

        this.abort(`${req_type(xhr)} Request timed out.`);
    }

    /**
     * Called if an abort event fires for xhr/xdr.
     *
     * @private
     */
    _xhr_on_abort() {
        const xhr = this.xhr;

        this.abort(`${req_type(xhr)} Request was aborted by the user.`);
    }

    /**
     * Called when data successfully loads from an xhr/xdr request.
     *
     * @private
     */
    _xhr_on_load() {
        const xhr = this.xhr;
        let text = '';
        let status = typeof xhr.status === 'undefined' ? STATUS_OK : xhr.status; // XDR has no `.status`, assume 200.

        // responseText is accessible only if responseType is '' or 'text' and on older browsers
        if (xhr.responseType === '' || xhr.responseType === 'text' || typeof xhr.responseType === 'undefined') {
            text = xhr.responseText;
        }

        // status can be 0 when using the `file://` protocol so we also check if a response is set.
        // If it has a response, we assume 200; otherwise a 0 status code with no contents is an aborted request.
        if (status === STATUS_NONE && (text.length > 0 || xhr.responseType === Resource.XHR_RESPONSE_TYPE.BUFFER)) {
            status = STATUS_OK;
        }
        // handle IE9 bug: http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
        else if (status === STATUS_IE_BUG_EMPTY) {
            status = STATUS_EMPTY;
        }

        const statusType = (status / 100) | 0;

        if (statusType === STATUS_TYPE_OK) {
            // if text, just return it
            if (this.xhr_type === Resource.XHR_RESPONSE_TYPE.TEXT) {
                this.data = text;
                this.type = Resource.TYPE.TEXT;
            }
            // if json, parse into json object
            else if (this.xhr_type === Resource.XHR_RESPONSE_TYPE.JSON) {
                try {
                    this.data = JSON.parse(text);
                    this.type = Resource.TYPE.JSON;
                } catch (e) {
                    this.abort(`Error trying to parse loaded json: ${e}`);

                    return;
                }
            }
            // if xml, parse into an xml document or div element
            else if (this.xhr_type === Resource.XHR_RESPONSE_TYPE.DOCUMENT) {
                try {
                    if (DOMParser) {
                        const domparser = new DOMParser();

                        this.data = domparser.parseFromString(text, 'text/xml');
                    } else {
                        const div = document.createElement('div');

                        div.innerHTML = text;

                        this.data = div;
                    }

                    this.type = Resource.TYPE.XML;
                } catch (e) {
                    this.abort(`Error trying to parse loaded xml: ${e}`);

                    return;
                }
            }
            // other types just return the response
            else {
                this.data = xhr.response || text;
            }
        } else {
            this.abort(`[${xhr.status}] ${xhr.statusText}: ${xhr.responseURL}`);

            return;
        }

        this.complete();
    }

    /**
     * Sets the `crossOrigin` property for this resource based on if the url
     * for this resource is cross-origin. If crossOrigin was manually set, this
     * function does nothing.
     *
     * @private
     * @param {string} url - The url to test.
     * @param {object} [loc=window.location] - The location object to test against.
     */
    _determine_cross_origin(url, loc) {
        // data: and javascript: urls are considered same-origin
        if (url.indexOf('data:') === 0) {
            return '';
        }

        // A sandboxed iframe without the 'allow-same-origin' attribute will have a special
        // origin designed not to match window.location.origin, and will always require
        // crossOrigin requests regardless of whether the location matches.
        if (window.origin !== window.location.origin) {
            return 'anonymous';
        }

        // default is window.location
        loc = loc || window.location;

        if (!temp_anchor) {
            temp_anchor = document.createElement('a');
        }

        // let the browser determine the full href for the url of this resource and then
        // parse with the node url lib, we can't use the properties of the anchor element
        // because they don't work in IE9 :(
        temp_anchor.href = url;
        const parsed_url = parse_uri(temp_anchor.href, { strictMode: true });

        const samePort = (!parsed_url.port && loc.port === '') || (parsed_url.port === loc.port);
        const protocol = parsed_url.protocol ? `${parsed_url.protocol}:` : '';

        // if cross origin
        if (parsed_url.host !== loc.hostname || !samePort || protocol !== loc.protocol) {
            return 'anonymous';
        }

        return '';
    }

    /**
     * Determines the responseType of an XHR request based on the extension of the
     * resource being loaded.
     *
     * @private
     */
    _determine_xhr_type() {
        return Resource.xhr_type_map[this.extension] || Resource.XHR_RESPONSE_TYPE.TEXT;
    }

    /**
     * Determines the loadType of a resource based on the extension of the
     * resource being loaded.
     *
     * @private
     */
    _determine_load_type() {
        return Resource.load_type_map[this.extension] || Resource.LOAD_TYPE.XHR;
    }

    /**
     * Extracts the extension (sans '.') of the file being loaded by the resource.
     *
     * @private
     */
    _get_extension() {
        let url = this.url;
        let ext = '';

        if (this.is_data_url) {
            const slashIndex = url.indexOf('/');

            ext = url.substring(slashIndex + 1, url.indexOf(';', slashIndex));
        } else {
            const queryStart = url.indexOf('?');
            const hashStart = url.indexOf('#');
            const index = Math.min(
                queryStart > -1 ? queryStart : url.length,
                hashStart > -1 ? hashStart : url.length
            );

            url = url.substring(0, index);
            ext = url.substring(url.lastIndexOf('.') + 1);
        }

        return ext.toLowerCase();
    }

    /**
     * Determines the mime type of an XHR request based on the responseType of
     * resource being loaded.
     *
     * @private
     * @param {Resource.XHR_RESPONSE_TYPE} type - The type to get a mime type for.
     */
    _get_mime_from_xhr_type(type) {
        switch (type) {
            case Resource.XHR_RESPONSE_TYPE.BUFFER:
                return 'application/octet-binary';

            case Resource.XHR_RESPONSE_TYPE.BLOB:
                return 'application/blob';

            case Resource.XHR_RESPONSE_TYPE.DOCUMENT:
                return 'application/xml';

            case Resource.XHR_RESPONSE_TYPE.JSON:
                return 'application/json';

            case Resource.XHR_RESPONSE_TYPE.DEFAULT:
            case Resource.XHR_RESPONSE_TYPE.TEXT:
                /* falls through */
            default:
                return 'text/plain';
        }
    }
}

/**
 * The types of resources a resource could represent.
 *
 * @static
 * @readonly
 * @enum {number}
 */
Resource.STATUS_FLAGS = {
    NONE:       0,
    DATA_URL:   (1 << 0),
    COMPLETE:   (1 << 1),
    LOADING:    (1 << 2),
};

/**
 * The types of resources a resource could represent.
 *
 * @static
 * @readonly
 * @enum {string}
 */
Resource.TYPE = {
    UNKNOWN:    'unknown',
    JSON:       'json',
    XML:        'xml',
    IMAGE:      'image',
    AUDIO:      'audio',
    VIDEO:      'video',
    TEXT:       'text',
};

/**
 * The types of loading a resource can use.
 *
 * @static
 * @readonly
 * @enum {string}
 */
Resource.LOAD_TYPE = {
    /** Uses XMLHttpRequest to load the resource. */
    XHR:    'xhr',
    /** Uses an `Image` object to load the resource. */
    IMAGE:  'image',
    /** Uses an `Audio` object to load the resource. */
    AUDIO:  'audio',
    /** Uses a `Video` object to load the resource. */
    VIDEO:  'video',
};

/**
 * The XHR ready states, used internally.
 *
 * @static
 * @readonly
 * @enum {string}
 */
Resource.XHR_RESPONSE_TYPE = {
    /** string */
    DEFAULT:    'text',
    /** ArrayBuffer */
    BUFFER:     'arraybuffer',
    /** Blob */
    BLOB:       'blob',
    /** Document */
    DOCUMENT:   'document',
    /** Object */
    JSON:       'json',
    /** String */
    TEXT:       'text',
};

Resource.load_type_map = {
    // images
    gif:        Resource.LOAD_TYPE.IMAGE,
    png:        Resource.LOAD_TYPE.IMAGE,
    bmp:        Resource.LOAD_TYPE.IMAGE,
    jpg:        Resource.LOAD_TYPE.IMAGE,
    jpeg:       Resource.LOAD_TYPE.IMAGE,
    tif:        Resource.LOAD_TYPE.IMAGE,
    tiff:       Resource.LOAD_TYPE.IMAGE,
    webp:       Resource.LOAD_TYPE.IMAGE,
    tga:        Resource.LOAD_TYPE.IMAGE,
    svg:        Resource.LOAD_TYPE.IMAGE,
    'svg+xml':  Resource.LOAD_TYPE.IMAGE, // for SVG data urls

    // audio
    mp3:        Resource.LOAD_TYPE.AUDIO,
    ogg:        Resource.LOAD_TYPE.AUDIO,
    wav:        Resource.LOAD_TYPE.AUDIO,

    // videos
    mp4:        Resource.LOAD_TYPE.VIDEO,
    webm:       Resource.LOAD_TYPE.VIDEO,
};

Resource.xhr_type_map = {
    // xml
    xhtml:      Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    html:       Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    htm:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    xml:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    tmx:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    svg:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,
    fnt:        Resource.XHR_RESPONSE_TYPE.DOCUMENT,

    // images
    gif:        Resource.XHR_RESPONSE_TYPE.BLOB,
    png:        Resource.XHR_RESPONSE_TYPE.BLOB,
    bmp:        Resource.XHR_RESPONSE_TYPE.BLOB,
    jpg:        Resource.XHR_RESPONSE_TYPE.BLOB,
    jpeg:       Resource.XHR_RESPONSE_TYPE.BLOB,
    tif:        Resource.XHR_RESPONSE_TYPE.BLOB,
    tiff:       Resource.XHR_RESPONSE_TYPE.BLOB,
    webp:       Resource.XHR_RESPONSE_TYPE.BLOB,
    tga:        Resource.XHR_RESPONSE_TYPE.BLOB,

    // json
    json:       Resource.XHR_RESPONSE_TYPE.JSON,

    // text
    text:       Resource.XHR_RESPONSE_TYPE.TEXT,
    txt:        Resource.XHR_RESPONSE_TYPE.TEXT,

    // fonts
    ttf:        Resource.XHR_RESPONSE_TYPE.BUFFER,
    otf:        Resource.XHR_RESPONSE_TYPE.BUFFER,
};

// We can't set the `src` attribute to empty string, so on abort we set it to this 1px transparent gif
Resource.EMPTY_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

/**
 * Quick helper to set a value on one of the extension maps. Ensures there is no
 * dot at the start of the extension.
 *
 * @ignore
 * @param {object} map - The map to set on.
 * @param {string} extname - The extension (or key) to set.
 * @param {string} val - The value to set.
 */
function set_ext_map(map, extname, val) {
    if (extname && extname.indexOf('.') === 0) {
        extname = extname.substring(1);
    }

    if (!extname) {
        return;
    }

    map[extname] = val;
}

/**
 * Quick helper to get string xhr type.
 *
 * @ignore
 * @param {XMLHttpRequest} xhr - The request to check.
 */
function req_type(xhr) {
    return xhr.toString().replace('object ', '');
}
