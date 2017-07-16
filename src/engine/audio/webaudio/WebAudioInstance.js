import EventEmitter from 'eventemitter3';
let id = 0;
/**
 * A single play instance that handles the AudioBufferSourceNode.
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
     * Plays the sound.
     * @method PIXI.sound.webaudio.WebAudioInstance#play
     * @param {Number} [start=0] The position to start playing, in seconds.
     * @param {Number} [end] The ending position in seconds.
     * @param {Number} [speed] Override the default speed.
     * @param {Boolean} [loop] Override the default loop.
     * @param {Number} [fadeIn] Time to fadein volume.
     * @param {Number} [fadeOut] Time to fadeout volume.
     */
    play(start, end, speed, loop, fadeIn, fadeOut) {
        // @if DEBUG
        if (end) {
            console.assert(end > start, "End time is before start time");
        }
        // @endif
        this._paused = false;
        this._source = this._media.nodes.cloneBufferSource();
        if (speed !== undefined) {
            this._source.playbackRate.value = speed;
        }
        this._speed = this._source.playbackRate.value;
        if (loop !== undefined) {
            this._loop = this._source.loop = !!loop;
        }
        // WebAudio doesn't support looping when a duration is set
        // we'll set this just for the heck of it
        if (this._loop && end !== undefined) {
            // @if DEBUG
            console.warn('Looping not support when specifying an "end" time');
            // @endif
            this._loop = this._source.loop = false;
        }
        this._end = end;
        const duration = this._source.buffer.duration;
        fadeIn = this._toSec(fadeIn);
        // Clamp fadeIn to the duration
        if (fadeIn > duration) {
            fadeIn = duration;
        }
        // Cannot fade out for looping sounds
        if (!this._loop) {
            fadeOut = this._toSec(fadeOut);
            // Clamp fadeOut to the duration + fadeIn
            if (fadeOut > duration - fadeIn) {
                fadeOut = duration - fadeIn;
            }
        }
        this._duration = duration;
        this._fadeIn = fadeIn;
        this._fadeOut = fadeOut;
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
     * @param {Number} [time] Time in either ms or sec
     * @return {Number} Time in seconds
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
     * @type {Boolean}
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
     * @type {Number}
     * @name PIXI.sound.webaudio.WebAudioInstance#progress
     */
    get progress() {
        return this._progress;
    }
    /**
     * Pauses the sound.
     * @type {Boolean}
     * @name PIXI.sound.webaudio.WebAudioInstance#paused
     */
    get paused() {
        return this._paused;
    }
    set paused(paused) {
        if (paused !== this._paused) {
            this._paused = paused;
            if (paused) {
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
                this.play(this._elapsed % this._duration, this._end, this._speed, this._loop, this._fadeIn, this._fadeOut);
            }
            /**
             * The sound is paused or unpaused.
             * @event PIXI.sound.webaudio.WebAudioInstance#pause
             * @property {Boolean} paused If the instance was paused or not.
             */
            this.emit("pause", paused);
        }
    }
    /**
     * Don't use after this.
     * @method PIXI.sound.webaudio.WebAudioInstance#destroy
     */
    destroy() {
        this.removeAllListeners();
        this._internalStop();
        this._source = null;
        this._speed = 0;
        this._end = 0;
        this._media = null;
        this._elapsed = 0;
        this._duration = 0;
        this._loop = false;
        this._fadeIn = 0;
        this._fadeOut = 0;
        this._paused = false;
    }
    /**
     * To string method for instance.
     * @method PIXI.sound.webaudio.WebAudioInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    toString() {
        return "[SoundInstance id=" + this.id + "]";
    }
    /**
     * Get the current time in seconds.
     * @method PIXI.sound.webaudio.WebAudioInstance#_now
     * @private
     * @return {Number} Seconds since start of context
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
                this._elapsed += delta;
                this._lastUpdate = now;
                const duration = this._duration;
                const progress = ((this._elapsed * this._speed) % duration) / duration;
                if (this._fadeIn || this._fadeOut) {
                    const position = progress * duration;
                    const gain = this._media.nodes.gain.gain;
                    const maxVolume = this._media.parent.volume;
                    if (this._fadeIn) {
                        if (position <= this._fadeIn && progress < 1) {
                            // Manipulate the gain node directly
                            // so we can maintain the starting volume
                            gain.value = maxVolume * (position / this._fadeIn);
                        }
                        else {
                            gain.value = maxVolume;
                            this._fadeIn = 0;
                        }
                    }
                    if (this._fadeOut && position >= duration - this._fadeOut) {
                        const percent = (duration - position) / this._fadeOut;
                        gain.value = maxVolume * percent;
                    }
                }
                // Update the progress
                this._progress = progress;
                /**
                 * The sound progress is updated.
                 * @event PIXI.sound.webaudio.WebAudioInstance#progress
                 * @property {Number} progress Amount progressed from 0 to 1
                 * @property {Number} duration The total playback in seconds
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
            // Reset the volume
            this._media.volume = this._media.parent.volume;
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
