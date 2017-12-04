import Filterable from "../Filterable";
import EventEmitter from 'eventemitter3';


/**
 * Main class to handle WebAudio API. There's a simple chain
 * of AudioNode elements: analyser > compressor > context.destination.
 * any filters that are added are inserted between the analyser and compressor nodes
 * @private
 * @class WebAudioContext
 * @extends v.audio.Filterable
 * @memberof v.audio.webaudio
 */
export default class WebAudioContext extends Filterable {
    constructor() {
        const ctx = new WebAudioContext.AudioContext();
        const compressor = ctx.createDynamicsCompressor();
        const analyser = ctx.createAnalyser();
        // setup the end of the node chain
        analyser.connect(compressor);
        compressor.connect(ctx.destination);
        super(analyser, compressor);
        this._ctx = ctx;
        this._offlineCtx = new WebAudioContext.OfflineAudioContext(1, 2, ctx.sampleRate);
        this._unlocked = false;
        this.compressor = compressor;
        this.analyser = analyser;
        this.events = new EventEmitter();
        // Set the defaults
        this.volume = 1;
        this.speed = 1;
        this.muted = false;
        this.paused = false;
        // Listen for document level clicks to unlock WebAudio on iOS. See the _unlock method.
        if ("ontouchstart" in window && ctx.state !== "running") {
            this._unlock(); // When played inside of a touch event, this will enable audio on iOS immediately.
            this._unlock = this._unlock.bind(this);
            document.addEventListener("mousedown", this._unlock, true);
            document.addEventListener("touchstart", this._unlock, true);
            document.addEventListener("touchend", this._unlock, true);
        }
    }
    /**
     * Try to unlock audio on iOS. This is triggered from either WebAudio plugin setup (which will work if inside of
     * a `mousedown` or `touchend` event stack), or the first document touchend/mousedown event. If it fails (touchend
     * will fail if the user presses for too long, indicating a scroll event instead of a click event.
     *
     * Note that earlier versions of iOS supported `touchstart` for this, but iOS9 removed this functionality. Adding
     * a `touchstart` event to support older platforms may preclude a `mousedown` even from getting fired on iOS9, so we
     * stick with `mousedown` and `touchend`.
     * @method v.audio.webaudio.WebAudioContext#_unlock
     * @private
     */
    _unlock() {
        if (this._unlocked) {
            return;
        }
        this.playEmptySound();
        if (this._ctx.state === "running") {
            document.removeEventListener("mousedown", this._unlock, true);
            document.removeEventListener("touchend", this._unlock, true);
            document.removeEventListener("touchstart", this._unlock, true);
            this._unlocked = true;
        }
    }
    /**
     * Plays an empty sound in the web audio context.  This is used to enable web audio on iOS devices, as they
     * require the first sound to be played inside of a user initiated event (touch/click).
     * @method v.audio.webaudio.WebAudioContext#playEmptySound
     */
    playEmptySound() {
        const source = this._ctx.createBufferSource();
        source.buffer = this._ctx.createBuffer(1, 1, 22050);
        source.connect(this._ctx.destination);
        source.start(0, 0, 0);
    }
    /**
     * Get AudioContext class, if not supported returns `null`
     * @name v.audio.webaudio.WebAudioContext.AudioContext
     * @type {Function}
     * @static
     */
    static get AudioContext() {
        const win = window;
        return (win.AudioContext ||
            win.webkitAudioContext ||
            null);
    }
    /**
     * Get OfflineAudioContext class, if not supported returns `null`
     * @name v.audio.webaudio.WebAudioContext.OfflineAudioContext
     * @type {Function}
     * @static
     */
    static get OfflineAudioContext() {
        const win = window;
        return (win.OfflineAudioContext ||
            win.webkitOfflineAudioContext ||
            null);
    }
    /**
     * Destroy this context.
     * @method v.audio.webaudio.WebAudioContext#destroy
     */
    destroy() {
        super.destroy();
        const ctx = this._ctx;
        // check if browser supports AudioContext.close()
        if (typeof ctx.close !== "undefined") {
            ctx.close();
        }
        this.events.removeAllListeners();
        this.analyser.disconnect();
        this.compressor.disconnect();
        this.analyser = null;
        this.compressor = null;
        this.events = null;
        this._offlineCtx = null;
        this._ctx = null;
    }
    /**
     * The WebAudio API AudioContext object.
     * @name v.audio.webaudio.WebAudioContext#audioContext
     * @type {AudioContext}
     * @readonly
     */
    get audioContext() {
        return this._ctx;
    }
    /**
     * The WebAudio API OfflineAudioContext object.
     * @name v.audio.webaudio.WebAudioContext#offlineContext
     * @type {OfflineAudioContext}
     * @readonly
     */
    get offlineContext() {
        return this._offlineCtx;
    }
    /**
     * Pauses all sounds, even though we handle this at the instance
     * level, we'll also pause the audioContext so that the
     * time used to compute progress isn't messed up.
     * @type {boolean}
     * @name v.audio.webaudio.WebAudioContext#paused
     * @default false
     */
    set paused(paused) {
        if (paused && this._ctx.state === "running") {
            this._ctx.suspend();
        }
        else if (!paused && this._ctx.state === "suspended") {
            this._ctx.resume();
        }
        this._paused = paused;
    }
    get paused() {
        return this._paused;
    }
    /**
     * Emit event when muted, volume or speed changes
     * @method v.audio.webaudio.WebAudioContext#refresh
     * @private
     */
    refresh() {
        this.events.emit('refresh');
    }
    /**
     * Emit event when muted, volume or speed changes
     * @method v.audio.webaudio.WebAudioContext#refreshPaused
     * @private
     */
    refreshPaused() {
        this.events.emit('refreshPaused');
    }
    /**
     * Toggles the muted state.
     * @method v.audio.webaudio.WebAudioContext#toggleMute
     * @return {boolean} The current muted state.
     */
    toggleMute() {
        this.muted = !this.muted;
        this.refresh();
        return this.muted;
    }
    /**
     * Toggles the paused state.
     * @method v.audio.webaudio.WebAudioContext#togglePause
     * @return {boolean} The current muted state.
     */
    togglePause() {
        this.paused = !this.paused;
        this.refreshPaused();
        return this._paused;
    }
    /**
     * Decode the audio data
     * @method decode
     * @param {ArrayBuffer} arrayBuffer Buffer from loader
     * @param {Function} callback When completed, error and audioBuffer are parameters.
     */
    decode(arrayBuffer, callback) {
        this._offlineCtx.decodeAudioData(arrayBuffer, (buffer) => {
            callback(null, buffer);
        }, () => {
            callback(new Error("Unable to decode file"));
        });
    }
}
