import WebAudioInstance from "./WebAudioInstance";
import WebAudioNodes from "./WebAudioNodes";
/**
 * Represents a single sound element. Can be used to play, pause, etc. sound instances.
 * @private
 * @class WebAudioMedia
 * @memberof PIXI.sound.webaudio
 * @param {PIXI.sound.Sound} parent - Instance of parent Sound container
 */
export default class WebAudioMedia {
    init(parent) {
        this.parent = parent;
        this._nodes = new WebAudioNodes(this.context);
        this._source = this._nodes.bufferSource;
        this.source = parent.options.source;
    }
    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     * @private
     * @method PIXI.sound.webaudio.WebAudioMedia#destroy
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
        // @if DEBUG
        console.assert(this.isPlayable, "Sound not yet playable, no duration");
        // @endif
        return this._source.buffer.duration;
    }
    /**
     * Gets and sets the buffer.
     * @name PIXI.sound.webaudio.WebAudioMedia#buffer
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
     * @name PIXI.sound.webaudio.WebAudioMedia#nodes
     * @type {PIXI.sound.webaudio.WebAudioNodes}
     */
    get nodes() {
        return this._nodes;
    }
    // Implements load
    load(callback) {
        // Load from the arraybuffer, incase it was loaded outside
        if (this.source) {
            this._decode(this.source, callback);
        }
        // Load from the file path
        else if (this.parent.url) {
            this._loadUrl(callback);
        }
        else if (callback) {
            callback(new Error("sound.url or sound.source must be set"));
        }
        else {
            console.error("sound.url or sound.source must be set");
        }
    }
    /**
     * Loads a sound using XHMLHttpRequest object.
     * @method PIXI.sound.webaudio.WebAudioMedia#_loadUrl
     * @private
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
     * @method PIXI.sound.webaudio.WebAudioMedia#decode
     * @param {ArrayBuffer} arrayBuffer From load.
     * @private
     */
    _decode(arrayBuffer, callback) {
        const context = this.parent.context;
        context.decode(arrayBuffer, (err, buffer) => {
            if (err) {
                if (callback) {
                    callback(err);
                }
            }
            else {
                this.parent.isLoaded = true;
                this.buffer = buffer;
                const instance = this.parent.autoPlayStart();
                if (callback) {
                    callback(null, this.parent, instance);
                }
            }
        });
    }
}
