import EventEmitter from 'eventemitter3';
let id = 0;
/**
 * Instance which wraps the `<audio>` element playback.
 * @class HTMLAudioInstance
 * @memberof PIXI.sound.htmlaudio
 */
export default class HTMLAudioInstance extends EventEmitter {
    constructor(parent) {
        super();
        this.id = id++;
        this.init(parent);
    }
    /**
     * The current playback progress from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#progress
     */
    get progress() {
        const { currentTime } = this._source;
        return currentTime / this._duration;
    }
    /**
     * Pauses the sound.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioInstance#paused
     */
    get paused() {
        return this._paused;
    }
    set paused(paused) {
        const contextPaused = this._parent.context.paused;
        if (paused === this._paused && contextPaused === this._paused) {
            // Do nothing, no pause change
            return;
        }
        this._paused = paused;
        if (paused || contextPaused) {
            this._internalStop();
            /**
             * The sound is paused.
             * @event PIXI.sound.htmlaudio.HTMLAudioInstance#paused
             */
            this.emit("paused");
        }
        else {
            /**
             * The sound is unpaused.
             * @event PIXI.sound.htmlaudio.HTMLAudioInstance#resumed
             */
            this.emit("resumed");
            // resume the playing with offset
            this.play(this._source.currentTime, this._end, 1, this._source.loop, 0, 0);
        }
        /**
         * The sound is paused or unpaused.
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#pause
         * @property {Boolean} paused If the instance was paused or not.
         */
        this.emit("pause", paused);
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
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#init
     * @param {PIXI.sound.htmlaudio.HTMLAudioMedia} parent
     */
    init(parent) {
        this._playing = false;
        this._duration = parent.source.duration;
        const source = this._source = parent.source.cloneNode(false);
        source.src = parent.parent.url;
        source.onplay = this._onPlay.bind(this);
        source.onpause = this._onPause.bind(this);
        // Update on global volume changes
        this._onVolumeChanged = () => {
            let volume = parent.volume;
            volume *= parent.context.volume;
            volume *= parent.context.muted ? 0 : 1;
            source.volume = volume;
        };
        this._onPausedChanged = () => {
            this.paused = this.paused;
        };
        parent.on('volume', this._onVolumeChanged);
        parent.context.on('volume', this._onVolumeChanged);
        parent.context.on('muted', this._onVolumeChanged);
        parent.context.on('paused', this._onPausedChanged);
        this._parent = parent;
        this._onPausedChanged();
        this._onVolumeChanged();
    }
    /**
     * Stop the sound playing
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_internalStop
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
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#stop
     */
    stop() {
        this._internalStop();
        if (this._source) {
            this.emit("stop");
        }
    }
    /**
     * Start playing the sound/
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#play
     */
    play(start, end, speed, loop, fadeIn, fadeOut) {
        // @if DEBUG
        if (end) {
            console.assert(end > start, "End time is before start time");
        }
        // @endif
        if (loop !== undefined) {
            this._source.loop = loop;
        }
        // WebAudio doesn't support looping when a duration is set
        // we'll set this just for the heck of it
        if (loop === true && end !== undefined) {
            // @if DEBUG
            console.warn('Looping not support when specifying an "end" time');
            // @endif
            this._source.loop = false;
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
                PIXI.ticker.shared.add(this._onUpdate, this);
            }
        };
        this._source.onended = this._onComplete.bind(this);
        this._source.play();
        /**
         * The sound is started.
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#start
         */
        this.emit("start");
    }
    /**
     * Handle time update on sound.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_onUpdate
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
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#_onComplete
     * @private
     */
    _onComplete() {
        PIXI.ticker.shared.remove(this._onUpdate, this);
        this._internalStop();
        this.emit("progress", 1, this._duration);
        /**
         * The sound ends, don't use after this
         * @event PIXI.sound.htmlaudio.HTMLAudioInstance#end
         */
        this.emit("end", this);
    }
    /**
     * Don't use after this.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#destroy
     */
    destroy() {
        PIXI.ticker.shared.remove(this._onUpdate, this);
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
        this._end = 0;
        this._start = 0;
        this._duration = 0;
        this._playing = false;
        // Remove parent listener for volume changes
        const parent = this._parent;
        if (parent) {
            parent.off('volume', this._onVolumeChanged);
            parent.context.off('muted', this._onVolumeChanged);
            parent.context.off('volume', this._onVolumeChanged);
            parent.context.off('paused', this._onPausedChanged);
        }
        this._parent = null;
        this._onVolumeChanged = null;
        this._onPausedChanged = null;
    }
    /**
     * To string method for instance.
     * @method PIXI.sound.htmlaudio.HTMLAudioInstance#toString
     * @return {String} The string representation of instance.
     * @private
     */
    toString() {
        return "[HTMLAudioInstance id=" + this.id + "]";
    }
}
/**
 * Extra padding, in seconds, to deal with low-latecy of HTMLAudio.
 * @name PIXI.sound.htmlaudio.HTMLAudioInstance.PADDING
 * @readonly
 * @default 0.1
 */
HTMLAudioInstance.PADDING = 0.1;
