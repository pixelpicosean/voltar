import Filterable from "../Filterable";
/**
 * @description Main class to handle WebAudio API. There's a simple chain
 * of AudioNode elements: analyser > gainNode > compressor > context.destination.
 * any filters that are added are inserted between the analyser and gainNode nodes
 * @class WebAudioContext
 * @extends PIXI.sound.Filterable
 * @memberof PIXI.sound.webaudio
 */
export default class WebAudioContext extends Filterable {
    constructor() {
        const ctx = new WebAudioContext.AudioContext();
        const gain = ctx.createGain();
        const compressor = ctx.createDynamicsCompressor();
        const analyser = ctx.createAnalyser();
        // setup the end of the node chain
        analyser.connect(gain);
        gain.connect(compressor);
        compressor.connect(ctx.destination);
        super(analyser, gain);
        this._ctx = ctx;
        this._offlineCtx = new WebAudioContext.OfflineAudioContext(1, 2, ctx.sampleRate);
        this._unlocked = false;
        this.gain = gain;
        this.compressor = compressor;
        this.analyser = analyser;
        // Set the defaults
        this.volume = 1;
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
     * @method PIXI.sound.webaudio.WebAudioContext#_unlock
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
     * @method PIXI.sound.webaudio.WebAudioContext#playEmptySound
     */
    playEmptySound() {
        const source = this._ctx.createBufferSource();
        source.buffer = this._ctx.createBuffer(1, 1, 22050);
        source.connect(this._ctx.destination);
        source.start(0, 0, 0);
    }
    /**
     * Get AudioContext class, if not supported returns `null`
     * @name PIXI.sound.webaudio.WebAudioContext.AudioContext
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
     * @name PIXI.sound.webaudio.WebAudioContext.OfflineAudioContext
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
     * @method PIXI.sound.webaudio.WebAudioContext#destroy
     */
    destroy() {
        super.destroy();
        const ctx = this._ctx;
        // check if browser supports AudioContext.close()
        if (typeof ctx.close !== "undefined") {
            ctx.close();
        }
        this.analyser.disconnect();
        this.gain.disconnect();
        this.compressor.disconnect();
        this.gain = null;
        this.analyser = null;
        this.compressor = null;
        this._offlineCtx = null;
        this._ctx = null;
    }
    /**
     * The WebAudio API AudioContext object.
     * @name PIXI.sound.webaudio.WebAudioContext#audioContext
     * @type {AudioContext}
     * @readonly
     */
    get audioContext() {
        return this._ctx;
    }
    /**
     * The WebAudio API OfflineAudioContext object.
     * @name PIXI.sound.webaudio.WebAudioContext#offlineContext
     * @type {OfflineAudioContext}
     * @readonly
     */
    get offlineContext() {
        return this._offlineCtx;
    }
    /**
     * Sets the muted state.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioContext#muted
     * @default false
     */
    get muted() {
        return this._muted;
    }
    set muted(muted) {
        this._muted = !!muted;
        this.gain.gain.value = this._muted ? 0 : this._volume;
    }
    /**
     * Sets the volume from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioContext#volume
     * @default 1
     */
    set volume(volume) {
        // update volume
        this._volume = volume;
        // update actual volume IIF not muted
        if (!this._muted) {
            this.gain.gain.value = this._volume;
        }
    }
    get volume() {
        return this._volume;
    }
    /**
     * Pauses all sounds.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioContext#paused
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
     * Toggles the muted state.
     * @method PIXI.sound.webaudio.WebAudioContext#toggleMute
     * @return {Boolean} The current muted state.
     */
    toggleMute() {
        this.muted = !this.muted;
        return this._muted;
    }
    /**
     * Toggles the paused state.
     * @method PIXI.sound.webaudio.WebAudioContext#togglePause
     * @return {Boolean} The current muted state.
     */
    togglePause() {
        this.paused = !this.paused;
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
