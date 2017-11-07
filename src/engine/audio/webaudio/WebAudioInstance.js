import EventEmitter from 'eventemitter3';
let id = 0;
/**
 * A single play instance that handles the AudioBufferSourceNode.
 * @private
 * @class WebAudioInstance
 * @memberof PIXI.sound.webaudio
 * @param {SoundNodes} source Reference to the SoundNodes.
 */
export default class WebAudioInstance extends EventEmitter {
    constructor(media) {
        super();
        this.id = id++;
        this._media = null;
        this._paused = false;
        this._muted = false;
        this._elapsed = 0;
        this._updateListener = this._update.bind(this);
        // Initialize
        this.init(media);
    }
    /**
     * Stops the instance, don't use after this.
     * @method PIXI.sound.webaudio.WebAudioInstance#stop
     */
    stop() {
        if (this._source) {
            this._internalStop();
            /**
             * The sound is stopped. Don't use after this is called.
             * @event PIXI.sound.webaudio.WebAudioInstance#stop
             */
            this.emit("stop");
        }
    }
    /**
     * Set the instance speed from 0 to 1
     * @member {number} PIXI.sound.htmlaudio.HTMLAudioInstance#speed
     */
    get speed() {
        return this._speed;
    }
    set speed(speed) {
        this._speed = speed;
        this.refresh();
        this._update(true); // update progress
    }
    /**
     * Get the set the volume for this instance from 0 to 1
     * @member {number} PIXI.sound.htmlaudio.HTMLAudioInstance#volume
     */
    get volume() {
        return this._volume;
    }
    set volume(volume) {
        this._volume = volume;
        this.refresh();
    }
    /**
     * `true` if the sound is muted
     * @member {boolean} PIXI.sound.htmlaudio.HTMLAudioInstance#muted
     */
    get muted() {
        return this._muted;
    }
    set muted(muted) {
        this._muted = muted;
        this.refresh();
    }
    /**
     * If the sound instance should loop playback
     * @member {boolean} PIXI.sound.htmlaudio.HTMLAudioInstance#loop
     */
    get loop() {
        return this._loop;
    }
    set loop(loop) {
        this._loop = loop;
        this.refresh();
    }
    /**
     * Refresh loop, volume and speed based on changes to parent
     * @method PIXI.sound.webaudio.WebAudioInstance#refresh
     */
    refresh() {
        const global = this._media.context;
        const sound = this._media.parent;
        // Updating looping
        this._source.loop = this._loop || sound.loop;
        // Update the volume
        const globalVolume = global.volume * (global.muted ? 0 : 1);
        const soundVolume = sound.volume * (sound.muted ? 0 : 1);
        const instanceVolume = this._volume * (this._muted ? 0 : 1);
        this._gain.gain.value = instanceVolume * soundVolume * globalVolume;
        // Update the speed
        this._source.playbackRate.value = this._speed * sound.speed * global.speed;
    }
    /**
     * Handle changes in paused state, either globally or sound or instance
     * @method PIXI.sound.webaudio.WebAudioInstance#refreshPaused
     */
    refreshPaused() {
        const global = this._media.context;
        const sound = this._media.parent;
        // Consider global and sound paused
        const pausedReal = this._paused || sound.paused || global.paused;
        if (pausedReal !== this._pausedReal) {
            this._pausedReal = pausedReal;
            if (pausedReal) {
                // pause the sounds
                this._internalStop();
                /**
                 * The sound is paused.
                 * @event PIXI.sound.webaudio.WebAudioInstance#paused
                 */
                this.emit("paused");
            }
            else {
                /**
                 * The sound is unpaused.
                 * @event PIXI.sound.webaudio.WebAudioInstance#resumed
                 */
                this.emit("resumed");
                // resume the playing with offset
                this.play({
                    start: this._elapsed % this._duration,
                    end: this._end,
                    speed: this._speed,
                    loop: this._loop,
                    volume: this._volume
                });
            }
            /**
             * The sound is paused or unpaused.
             * @event PIXI.sound.webaudio.WebAudioInstance#pause
             * @property {boolean} paused If the instance was paused or not.
             */
            this.emit("pause", pausedReal);
        }
    }
    /**
     * Plays the sound.
     * @method PIXI.sound.webaudio.WebAudioInstance#play
     * @param {Object} options Play options
     * @param {number} options.start The position to start playing, in seconds.
     * @param {number} options.end The ending position in seconds.
     * @param {number} options.speed Speed for the instance
     * @param {boolean} options.loop If the instance is looping, defaults to sound loop
     * @param {number} options.volume Volume of the instance
     * @param {boolean} options.muted Muted state of instance
     */
    play(options) {
        const { start, end, speed, loop, volume, muted } = options;
        // @if DEBUG
        if (end) {
            console.assert(end > start, "End time is before start time");
        }
        // @endif
        this._paused = false;
        const { source, gain } = this._media.nodes.cloneBufferSource();
        this._source = source;
        this._gain = gain;
        this._speed = speed;
        this._volume = volume;
        this._loop = !!loop;
        this._muted = muted;
        this.refresh();
        // WebAudio doesn't support looping when a duration is set
        // we'll set this just for the heck of it
        if (this.loop && end !== null) {
            // @if DEBUG
            console.warn('Looping not support when specifying an "end" time');
            // @endif
            this.loop = false;
        }
        this._end = end;
        const duration = this._source.buffer.duration;
        this._duration = duration;
        this._lastUpdate = this._now();
        this._elapsed = start;
        this._source.onended = this._onComplete.bind(this);
        if (end) {
            this._source.start(0, start, end - start);
        }
        else {
            this._source.start(0, start);
        }
        /**
         * The sound is started.
         * @event PIXI.sound.webaudio.WebAudioInstance#start
         */
        this.emit("start");
        // Do an update for the initial progress
        this._update(true);
        // Start handling internal ticks
        this._enabled = true;
    }
    /**
     * Utility to convert time in millseconds or seconds
     * @method PIXI.sound.webaudio.WebAudioInstance#_toSec
     * @private
     * @param {number} [time] Time in either ms or sec
     * @return {number} Time in seconds
     */
    _toSec(time) {
        if (time > 10) {
            time /= 1000;
        }
        return time || 0;
    }
    /**
     * Start the update progress.
     * @name PIXI.sound.webaudio.WebAudioInstance#_enabled
     * @type {boolean}
     * @private
     */
    set _enabled(enabled) {
        const script = this._media.nodes.script;
        script.removeEventListener('audioprocess', this._updateListener);
        if (enabled) {
            script.addEventListener('audioprocess', this._updateListener);
        }
    }
    /**
     * The current playback progress from 0 to 1.
     * @type {number}
     * @name PIXI.sound.webaudio.WebAudioInstance#progress
     */
    get progress() {
        return this._progress;
    }
    /**
     * Pauses the sound.
     * @type {boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#paused
     */
    get paused() {
        return this._paused;
    }
    set paused(paused) {
        this._paused = paused;
        this.refreshPaused();
    }
    /**
     * Don't use after this.
     * @method PIXI.sound.webaudio.WebAudioInstance#destroy
     */
    destroy() {
        this.removeAllListeners();
        this._internalStop();
        if (this._source) {
            this._source.disconnect();
            this._source = null;
        }
        if (this._gain) {
            this._gain.disconnect();
            this._gain = null;
        }
        if (this._media) {
            this._media.context.events.off('refresh', this.refresh, this);
            this._media.context.events.off('refreshPaused', this.refreshPaused, this);
            this._media = null;
        }
        this._end = null;
        this._speed = 1;
        this._volume = 1;
        this._loop = false;
        this._elapsed = 0;
        this._duration = 0;
        this._paused = false;
        this._muted = false;
        this._pausedReal = false;
    }
    /**
     * To string method for instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#toString
     * @return {string} The string representation of instance.
     * @private
     */
    toString() {
        return "[WebAudioInstance id=" + this.id + "]";
    }
    /**
     * Get the current time in seconds.
     * @method PIXI.sound.webaudio.WebAudioInstance#_now
     * @private
     * @return {number} Seconds since start of context
     */
    _now() {
        return this._media.context.audioContext.currentTime;
    }
    /**
     * Internal update the progress.
     * @method PIXI.sound.webaudio.WebAudioInstance#_update
     * @private
     */
    _update(force = false) {
        if (this._source) {
            const now = this._now();
            const delta = now - this._lastUpdate;
            if (delta > 0 || force) {
                const speed = this._source.playbackRate.value;
                this._elapsed += delta * speed;
                this._lastUpdate = now;
                const duration = this._duration;
                const progress = (this._elapsed % duration) / duration;
                // Update the progress
                this._progress = progress;
                /**
                 * The sound progress is updated.
                 * @event PIXI.sound.webaudio.WebAudioInstance#progress
                 * @property {number} progress Amount progressed from 0 to 1
                 * @property {number} duration The total playback in seconds
                 */
                this.emit("progress", this._progress, duration);
            }
        }
    }
    /**
     * Initializes the instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#init
     */
    init(media) {
        this._media = media;
        media.context.events.on('refresh', this.refresh, this);
        media.context.events.on('refreshPaused', this.refreshPaused, this);
    }
    /**
     * Stops the instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#_internalStop
     * @private
     */
    _internalStop() {
        if (this._source) {
            this._enabled = false;
            this._source.onended = null;
            this._source.stop();
            this._source = null;
        }
    }
    /**
     * Callback when completed.
     * @method PIXI.sound.webaudio.WebAudioInstance#_onComplete
     * @private
     */
    _onComplete() {
        if (this._source) {
            this._enabled = false;
            this._source.onended = null;
        }
        this._source = null;
        this._progress = 1;
        this.emit("progress", 1, this._duration);
        /**
         * The sound ends, don't use after this
         * @event PIXI.sound.webaudio.WebAudioInstance#end
         */
        this.emit("end", this);
    }
}
