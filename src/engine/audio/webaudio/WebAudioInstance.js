import EventEmitter from 'eventemitter3';
import WebAudioUtils from "./WebAudioUtils";
import WebAudioMedia from './WebAudioMedia';

let id = 0;

/**
 * A single play instance that handles the AudioBufferSourceNode.
 * @param {WebAudioMedia} source
 */
export default class WebAudioInstance extends EventEmitter {
    constructor(media) {
        super();

        /**
         * The current unique ID for this instance.
         * @readonly
         */
        this.id = id++;

        /**
         * The source Sound.
         * @type {WebAudioMedia}
         * @private
         */
        this._media = null;

        /**
         * true if paused.
         * @type {boolean}
         * @private
         */
        this._paused = false;

        /**
         * true if muted.
         * @type {boolean}
         * @private
         */
        this._muted = false;

        /**
         * true if paused.
         * @type {number}
         * @private
         */
        this._elapsed = 0;

        /**
         * The instance volume
         * @type {number}
         * @private
         */
        this._volume = 0;

        /**
         * Last update frame number.
         * @type {number}
         * @private
         */
        this._lastUpdate = 0;

        /**
         * The total number of seconds elapsed in playback.
         * @type {number}
         * @private
         */
        this._elapsed = 0;

        /**
         * Playback rate, where 1 is 100%.
         * @type {number}
         * @private
         */
        this._speed = 0;

        /**
         * Playback rate, where 1 is 100%.
         * @type {number}
         * @private
         */
        this._end = 0;

        /**
         * `true` if should be looping.
         * @type {boolean}
         * @private
         */
        this._loop = false;

        /**
         * Gain node for controlling volume of instance
         * @type {GainNode}
         * @private
         */
        this._gain = null;

        /**
         * Length of the sound in seconds.
         * @type {number}
         * @private
         */
        this._duration = 0;

        /**
         * The progress of the sound from 0 to 1.
         * @type {number}
         * @private
         */
        this._progress = 0;

        /**
         * Callback for update listener
         * @type {EventListener}
         * @private
         */
        this._updateListener = this._update.bind(this);

        /**
         * Audio buffer source clone from Sound object.
         * @type {AudioBufferSourceNode}
         * @private
         */
        this._source = null;

        // Initialize
        this.init(media);
    }
    /**
     * Stops the instance, don't use after this.
     */
    stop() {
        if (this._source) {
            this._internalStop();

            this.emit("stop");
        }
    }
    /**
     * Set the instance speed from 0 to 1
     * @member {number}
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
     * @member {number}
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
     * @member {boolean}
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
     * @member {boolean}
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
        WebAudioUtils.setParamValue(this._gain.gain, instanceVolume * soundVolume * globalVolume);

        // Update the speed
        WebAudioUtils.setParamValue(this._source.playbackRate, this._speed * sound.speed * global.speed);
    }
    /**
     * Handle changes in paused state, either globally or sound or instance
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

                this.emit("paused");
            }
            else {
                this.emit("resumed");

                // resume the playing with offset
                this.play({
                    start: this._elapsed % this._duration,
                    end: this._end,
                    speed: this._speed,
                    loop: this._loop,
                    volume: this._volume,
                });
            }

            this.emit("pause", pausedReal);
        }
    }
    /**
     * Plays the sound.
     * @param {import('../Sound').PlayOptions} options Play options
     */
    play(options) {
        const { start, end, speed, loop, volume, muted } = options;

        if (end) {
            console.assert(end > start, "End time is before start time");
        }

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
            console.warn('Looping not support when specifying an "end" time');
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
        } else {
            this._source.start(0, start);
        }

        this.emit("start");

        // Do an update for the initial progress
        this._update(true);

        // Start handling internal ticks
        this._enabled = true;
    }
    /**
     * Utility to convert time in millseconds or seconds
     * @private
     * @param {number} time Time in either ms or sec
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
     */
    get progress() {
        return this._progress;
    }
    /**
     * Pauses the sound.
     * @type {boolean}
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
     * @return {string} The string representation of instance.
     * @private
     */
    toString() {
        return `[WebAudioInstance id=${this.id}]`;
    }
    /**
     * Get the current time in seconds.
     * @private
     * @return {number} Seconds since start of context
     */
    _now() {
        return this._media.context.audioContext.currentTime;
    }
    /**
     * Internal update the progress.
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

                this.emit("progress", this._progress, duration);
            }
        }
    }
    /**
     * Initializes the instance.
     * @param {WebAudioMedia} media
     */
    init(media) {
        this._media = media;
        media.context.events.on('refresh', this.refresh, this);
        media.context.events.on('refreshPaused', this.refreshPaused, this);
    }
    /**
     * Stops the instance.
     * @private
     */
    _internalStop() {
        if (this._source) {
            this._enabled = false;
            this._source.onended = null;
            this._source.stop(0); // param needed for iOS 8 bug
            this._source = null;
        }
    }
    /**
     * Callback when completed.
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

        this.emit("end", this);
    }
}
