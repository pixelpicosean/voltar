import VObject from 'engine/core/v_object';
import Filterable from "../Filterable";

/**
 * Main class to handle WebAudio API. There's a simple chain
 * of AudioNode elements: analyser > compressor > context.destination.
 * any filters that are added are inserted between the analyser and compressor nodes
 */
export default class WebAudioContext extends Filterable {
    constructor() {
        // @ts-ignore
        const ctx = new WebAudioContext.AudioContext();
        const compressor = ctx.createDynamicsCompressor();
        const analyser = ctx.createAnalyser();

        // setup the end of the node chain
        analyser.connect(compressor);
        compressor.connect(ctx.destination);

        super(analyser, compressor);

        /**
         * The instance of the AudioContext for WebAudio API.
         * @type {AudioContext}
         * @private
         */
        this._ctx = ctx;

        /**
         * The instance of the OfflineAudioContext for fast decoding audio.
         * @type {OfflineAudioContext}
         * @private
         */
        // @ts-ignore
        this._offlineCtx = new WebAudioContext.OfflineAudioContext(1, 2, (window.OfflineAudioContext) ? ctx.sampleRate : 44100);

        /**
         * Indicated whether audio on iOS has been unlocked, which requires a touchend/mousedown event that plays an
         * empty sound.
         * @type {boolean}
         * @private
         */
        this._unlocked = false;

        /**
         * Context Compressor node
         * @type {DynamicsCompressorNode}
         * @readonly
         */
        this.compressor = compressor;

        /**
         * Context Analyser node
         * @type {AnalyserNode}
         * @readonly
         */
        this.analyser = analyser;

        /**
         * Handle global events
         * @type {VObject}
         * @default 1
         */
        this.events = new VObject();

        /**
         * Sets the volume from 0 to 1.
         * @type {number}
         * @default 1
         */
        this.volume = 1;

        /**
         * Global speed of all sounds
         * @type {number}
         * @readonly
         */
        this.speed = 1;

        /**
         * Sets the muted state.
         * @type {boolean}
         * @default false
         */
        this.muted = false;

        /**
         * Current paused status
         * @type {boolean}
         * @private
         * @default false
         */
        this._paused = false;
        this.paused = false;

        // Listen for document level clicks to unlock WebAudio on iOS. See the _unlock method.
        if (ctx.state !== "running") {
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
     */
    playEmptySound() {
        const source = this._ctx.createBufferSource();
        source.buffer = this._ctx.createBuffer(1, 1, 22050);
        source.connect(this._ctx.destination);
        source.start(0, 0, 0);
        if (source.context.state === 'suspended') {
            source.context.resume();
        }
    }
    /**
     * Get AudioContext class, if not supported returns `null`
     * @static
     * @returns {AudioContext}
     */
    static get AudioContext() {
        return (window.AudioContext ||
            window.webkitAudioContext ||
            null
        );
    }
    /**
     * Get OfflineAudioContext class, if not supported returns `null`
     * @static
     * @returns {OfflineAudioContext}
     */
    static get OfflineAudioContext() {
        return (
            window.OfflineAudioContext ||
            window.webkitOfflineAudioContext ||
            null
        );
    }
    /**
     * Destroy this context.
     */
    destroy() {
        super.destroy();

        const ctx = this._ctx;

        // check if browser supports AudioContext.close()
        if (typeof ctx.close !== "undefined") {
            ctx.close();
        }
        this.events.disconnect_all();
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
     * @type {AudioContext}
     * @readonly
     */
    get audioContext() {
        return this._ctx;
    }
    /**
     * The WebAudio API OfflineAudioContext object.
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
     * @private
     */
    refresh() {
        this.events.emit_signal('refresh');
    }
    /**
     * Emit event when muted, volume or speed changes
     * @private
     */
    refreshPaused() {
        this.events.emit_signal('refreshPaused');
    }
    /**
     * Toggles the muted state.
     * @return {boolean} The current muted state.
     */
    toggleMute() {
        this.muted = !this.muted;
        this.refresh();
        return this.muted;
    }
    /**
     * Toggles the paused state.
     * @return {boolean} The current muted state.
     */
    togglePause() {
        this.paused = !this.paused;
        this.refreshPaused();
        return this._paused;
    }
    /**
     * Decode the audio data
     * @param {ArrayBuffer} arrayBuffer Buffer from loader
     * @param {(err?: Error, buffer?: AudioBuffer) => void} callback When completed, error and audioBuffer are parameters.
     */
    decode(arrayBuffer, callback) {
        this._offlineCtx.decodeAudioData(
            arrayBuffer,
            (buffer) => {
                callback(null, buffer);
            },
            () => {
                callback(new Error("Unable to decode file"));
            }
        );
    }
}
