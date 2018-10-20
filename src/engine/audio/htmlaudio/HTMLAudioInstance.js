import { EventEmitter } from 'engine/dep/index';
import * as ticker from 'engine/ticker/index';
import HTMLAudioMedia from './HTMLAudioMedia';

let id = 0;
/**
 * Instance which wraps the `<audio>` element playback.
 */
export default class HTMLAudioInstance extends EventEmitter {
    constructor(parent) {
        super();

        /**
         * @type {HTMLAudioMedia}
         */
        this._media = null;

        /**
         * @type {HTMLAudioElement}
         */
        this._source = null;

        this.id = id++;
        this.init(parent);
    }
    /**
     * The current playback progress from 0 to 1.
     * @type {number}
     */
    get progress() {
        const { currentTime } = this._source;
        return currentTime / this._duration;
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
     * Reference: http://stackoverflow.com/a/40370077
     */
    _onPlay() {
        this._playing = true;
    }
    /**
     * Reference: http://stackoverflow.com/a/40370077
     */
    _onPause() {
        this._playing = false;
    }
    /**
     * Initialize the instance.
     * @param {HTMLAudioMedia} media
     */
    init(media) {
        this._playing = false;
        this._duration = media.source.duration;
        // @ts-ignore
        this._source = media.source.cloneNode(false);
        const source = this._source;
        source.src = media.parent.url;
        source.onplay = this._onPlay.bind(this);
        source.onpause = this._onPause.bind(this);
        media.context.on('refresh', this.refresh, this);
        media.context.on('refreshPaused', this.refreshPaused, this);
        this._media = media;
    }
    /**
     * Stop the sound playing
     * @private
     */
    _internalStop() {
        if (this._source && this._playing) {
            this._source.onended = null;
            this._source.pause();
        }
    }
    /**
     * Stop the sound playing
     */
    stop() {
        this._internalStop();
        if (this._source) {
            this.emit("stop");
        }
    }
    /**
     * Set the instance speed from 0 to 1
     * @member {number} HTMLAudioInstance#speed
     */
    get speed() {
        return this._speed;
    }
    set speed(speed) {
        this._speed = speed;
        this.refresh();
    }
    /**
     * Get the set the volume for this instance from 0 to 1
     * @member {number} HTMLAudioInstance#volume
     */
    get volume() {
        return this._volume;
    }
    set volume(volume) {
        this._volume = volume;
        this.refresh();
    }
    /**
     * If the sound instance should loop playback
     * @member {boolean} HTMLAudioInstance#loop
     */
    get loop() {
        return this._loop;
    }
    set loop(loop) {
        this._loop = loop;
        this.refresh();
    }
    /**
     * `true` if the sound is muted
     * @member {boolean} HTMLAudioInstance#muted
     */
    get muted() {
        return this._muted;
    }
    set muted(muted) {
        this._muted = muted;
        this.refresh();
    }
    /**
     * Call whenever the loop, speed or volume changes
     * @method HTMLAudioInstance#refresh
     */
    refresh() {
        const global = this._media.context;
        const sound = this._media.parent;
        // Update the looping
        this._source.loop = this._loop || sound.loop;
        // Update the volume
        const globalVolume = global.volume * (global.muted ? 0 : 1);
        const soundVolume = sound.volume * (sound.muted ? 0 : 1);
        const instanceVolume = this._volume * (this._muted ? 0 : 1);
        this._source.volume = instanceVolume * globalVolume * soundVolume;
        // Update the speed
        this._source.playbackRate = this._speed * global.speed * sound.speed;
    }
    /**
     * Handle changes in paused state, either globally or sound or instance
     * @method HTMLAudioInstance#refreshPaused
     */
    refreshPaused() {
        const global = this._media.context;
        const sound = this._media.parent;
        // Handle the paused state
        const pausedReal = this._paused || sound.paused || global.paused;
        if (pausedReal !== this._pausedReal) {
            this._pausedReal = pausedReal;
            if (pausedReal) {
                this._internalStop();
                /**
                 * The sound is paused.
                 * @event HTMLAudioInstance#paused
                 */
                this.emit("paused");
            }
            else {
                /**
                 * The sound is unpaused.
                 * @event HTMLAudioInstance#resumed
                 */
                this.emit("resumed");
                // resume the playing with offset
                this.play({
                    start: this._source.currentTime,
                    end: this._end,
                    volume: this._volume,
                    speed: this._speed,
                    loop: this._loop
                });
            }
            /**
             * The sound is paused or unpaused.
             * @event HTMLAudioInstance#pause
             * @property {boolean} paused If the instance was paused or not.
             */
            this.emit("pause", pausedReal);
        }
    }
    /**
     * Start playing the sound/
     * @method HTMLAudioInstance#play
     */
    play(options) {
        const { start, end, speed, loop, volume, muted } = options;
        // @if DEBUG
        if (end) {
            console.assert(end > start, "End time is before start time");
        }
        // @endif
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
        this._start = start;
        this._end = end || this._duration;
        // Lets expand the start and end a little
        // to deal with the low-latecy of playing audio this way
        // this is a little fudge-factor
        this._start = Math.max(0, this._start - HTMLAudioInstance.PADDING);
        this._end = Math.min(this._end + HTMLAudioInstance.PADDING, this._duration);
        this._source.onloadedmetadata = () => {
            if (this._source) {
                this._source.currentTime = start;
                this._source.onloadedmetadata = null;
                this.emit("progress", start, this._duration);
                ticker.shared.add(this._onUpdate, this);
            }
        };
        this._source.onended = this._onComplete.bind(this);
        this._source.play();
        /**
         * The sound is started.
         * @event HTMLAudioInstance#start
         */
        this.emit("start");
    }
    /**
     * Handle time update on sound.
     * @method HTMLAudioInstance#_onUpdate
     * @private
     */
    _onUpdate() {
        this.emit("progress", this.progress, this._duration);
        if (this._source.currentTime >= this._end && !this._source.loop) {
            this._onComplete();
        }
    }
    /**
     * Callback when completed.
     * @method HTMLAudioInstance#_onComplete
     * @private
     */
    _onComplete() {
        ticker.shared.remove(this._onUpdate, this);
        this._internalStop();
        this.emit("progress", 1, this._duration);
        /**
         * The sound ends, don't use after this
         * @event HTMLAudioInstance#end
         */
        this.emit("end", this);
    }
    /**
     * Don't use after this.
     * @method HTMLAudioInstance#destroy
     */
    destroy() {
        ticker.shared.remove(this._onUpdate, this);
        this.removeAllListeners();
        const source = this._source;
        if (source) {
            // Remove the listeners
            source.onended = null;
            source.onplay = null;
            source.onpause = null;
            this._internalStop();
        }
        this._source = null;
        this._speed = 1;
        this._volume = 1;
        this._loop = false;
        this._end = null;
        this._start = 0;
        this._duration = 0;
        this._playing = false;
        this._pausedReal = false;
        this._paused = false;
        this._muted = false;
        if (this._media) {
            this._media.context.off('refresh', this.refresh, this);
            this._media.context.off('refreshPaused', this.refreshPaused, this);
            this._media = null;
        }
    }
    /**
     * To string method for instance.
     * @method HTMLAudioInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    toString() {
        return "[HTMLAudioInstance id=" + this.id + "]";
    }
}
/**
 * Extra padding, in seconds, to deal with low-latecy of HTMLAudio.
 * @name HTMLAudioInstance.PADDING
 * @readonly
 * @default 0.1
 */
HTMLAudioInstance.PADDING = 0.1;
