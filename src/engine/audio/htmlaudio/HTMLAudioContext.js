import EventEmitter from 'eventemitter3';
/**
 * The fallback version of WebAudioContext which uses `<audio>` instead of WebAudio API.
 * @class HTMLAudioContext
 * @extends PIXI.util.EventEmitter
 * @memberof PIXI.sound.htmlaudio
 */
export default class HTMLAudioContext extends EventEmitter {
    constructor() {
        super();
        this._volume = 1;
        this._muted = false;
        this._paused = false;
    }
    /**
     * Pauses all sounds.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#paused
     * @default false
     */
    set paused(paused) {
        const oldPaused = this._paused;
        this._paused = paused;
        if (paused !== oldPaused) {
            /**
             * Fired when paused state changes
             * @event PIXI.sound.htmlaudio.HTMLAudioContext#paused
             * @param {Boolean} paused - Paused state of context
             * @private
             */
            this.emit('paused', paused);
        }
    }
    get paused() {
        return this._paused;
    }
    /**
     * Sets the muted state.
     * @type {Boolean}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#muted
     * @default false
     */
    set muted(muted) {
        const oldMuted = this._muted;
        this._muted = muted;
        if (muted !== oldMuted) {
            /**
             * Fired when muted state changes
             * @event PIXI.sound.htmlaudio.HTMLAudioContext#muted
             * @param {Boolean} muted - Muted state of context
             * @private
             */
            this.emit('muted', muted);
        }
    }
    get muted() {
        return this._muted;
    }
    /**
     * Sets the volume from 0 to 1.
     * @type {Number}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#volume
     * @default 1
     */
    set volume(volume) {
        const oldVolume = this._volume;
        this._volume = volume;
        if (volume !== oldVolume) {
            /**
             * Fired when volume changes
             * @event PIXI.sound.htmlaudio.HTMLAudioContext#volume
             * @param {Boolean} volume - Current context volume
             * @private
             */
            this.emit('volume', volume);
        }
    }
    get volume() {
        return this._volume;
    }
    /**
     * HTML Audio does not support filters, this is non-functional API.
     * @type {Array<PIXI.sound.filters.Filter>}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#filters
     * @default null
     */
    get filters() {
        // @if DEBUG
        console.warn('HTML Audio does not support filters');
        // @endif
        return null;
    }
    set filters(filters) {
        // @if DEBUG
        console.warn('HTML Audio does not support filters');
        // @endif
    }
    /**
     * HTML Audio does not support `audioContext`
     * @type {null}
     * @name PIXI.sound.htmlaudio.HTMLAudioContext#audioContext
     * @default null
     * @readonly
     */
    get audioContext() {
        // @if DEBUG
        console.warn('HTML Audio does not support audioContext');
        // @endif
        return null;
    }
    /**
     * Toggles the muted state.
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#toggleMute
     * @return {Boolean} The current muted state.
     */
    toggleMute() {
        this.muted = !this.muted;
        return this._muted;
    }
    /**
     * Toggles the paused state.
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#togglePause
     * @return {Boolean} The current paused state.
     */
    togglePause() {
        this.paused = !this.paused;
        return this._paused;
    }
    /**
     * Destroy and don't use after this
     * @method PIXI.sound.htmlaudio.HTMLAudioContext#destroy
     */
    destroy() {
        this.removeAllListeners();
    }
}
