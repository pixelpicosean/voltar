import WebAudioInstance from "./WebAudioInstance";
import WebAudioNodes from "./WebAudioNodes";
import Sound from "../Sound";
import WebAudioContext from "./WebAudioContext";
import Filter from "../filters/Filter";

/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 *
 * @param {Sound} parent - Instance of parent Sound container
 */
export default class WebAudioMedia {
    constructor() {
        /**
         * Reference to the parent Sound container.
         * @type {Sound}
         * @readonly
         */
        this.parent = null;

        /**
         * Instance of the chain builder.
         * @type {WebAudioNodes}
         * @private
         */
        this._nodes = null;

        /**
         * Instance of the source node.
         * @type {AudioBufferSourceNode}
         * @private
         */
        this._source = null;

        /**
         * The file buffer to load.
         * @type {ArrayBuffer}
         * @readonly
         */
        this.source = null;
    }
    init(parent) {
        this.parent = parent;
        this._nodes = new WebAudioNodes(this.context);
        this._source = this._nodes.bufferSource;
        this.source = parent.options.source;
    }
    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @private
     */
    destroy() {
        this.parent = null;
        this._nodes.destroy();
        this._nodes = null;
        this._source = null;
        this.source = null;
    }
    // Implement create
    create() {
        return new WebAudioInstance(this);
    }
    // Implement context
    get context() {
        return this.parent.context;
    }
    // Implement isPlayable
    get isPlayable() {
        return !!this._source && !!this._source.buffer;
    }
    // Implement filters
    get filters() {
        return this._nodes.filters;
    }
    set filters(filters) {
        this._nodes.filters = filters;
    }
    // Implements duration
    get duration() {
        console.assert(this.isPlayable, "Sound not yet playable, no duration");

        return this._source.buffer.duration;
    }
    /**
     * Gets and sets the buffer.
     * @type {AudioBuffer}
     */
    get buffer() {
        return this._source.buffer;
    }
    set buffer(buffer) {
        this._source.buffer = buffer;
    }
    /**
     * Get the current chained nodes object
     * @private
     * @type {WebAudioNodes}
     */
    get nodes() {
        return this._nodes;
    }

    /**
     * Implement load
     * @param {import("../Sound").LoadedCallback} [callback]
     */
    load(callback) {
        // Load from the arraybuffer, incase it was loaded outside
        if (this.source) {
            this._decode(this.source, callback);
        }
        // Load from the file path
        else if (this.parent.url) {
            this._loadUrl(callback);
        } else if (callback) {
            callback(new Error("sound.url or sound.source must be set"));
        } else {
            console.error("sound.url or sound.source must be set");
        }
    }
    /**
     * Loads a sound using XHMLHttpRequest object.
     * @private
     * @param {import("../Sound").LoadedCallback} [callback]
     */
    _loadUrl(callback) {
        const request = new XMLHttpRequest();
        const url = this.parent.url;
        request.open("GET", url, true);
        request.responseType = "arraybuffer";

        // Decode asynchronously
        request.onload = () => {
            this.source = request.response;
            this._decode(request.response, callback);
        };
        // actually start the request
        request.send();
    }
    /**
     * Decodes the array buffer.
     * @param {ArrayBuffer} arrayBuffer From load.
     * @param {import("../Sound").LoadedCallback} [callback]
     * @private
     */
    _decode(arrayBuffer, callback) {
        /** @type {WebAudioContext} */
        // @ts-ignore
        const context = this.parent.context;
        context.decode(arrayBuffer, (err, buffer) => {
            if (err) {
                if (callback) {
                    callback(err);
                }
            } else {
                this.parent.isLoaded = true;
                this.buffer = buffer;
                const instance = this.parent.autoPlayStart();
                if (callback) {
                    // @ts-ignore
                    callback(null, this.parent, instance);
                }
            }
        });
    }
}
