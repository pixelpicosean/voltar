import EventEmitter from 'eventemitter3';
/**
 * The fallback version of WebAudioContext which uses `<audio>` instead of WebAudio API.
 * @private
 * @class HTMLAudioContext
 * @extends PIXI.util.EventEmitter
 * @memberof v.audio.htmlaudio
 */
export default class HTMLAudioContext extends EventEmitter {
    constructor() {
        super();
        this.speed = 1;
        this.volume = 1;
        this.muted = false;
        this.paused = false;
    }
    /**
     * Internal trigger when volume, mute or speed changes
     * @method v.audio.htmlaudio.HTMLAudioContext#refresh
     * @private
     */
    refresh() {
        this.emit('refresh');
    }
    /**
     * Internal trigger paused changes
     * @method v.audio.htmlaudio.HTMLAudioContext#refreshPaused
     * @private
     */
    refreshPaused() {
        this.emit('refreshPaused');
    }
    /**
     * HTML Audio does not support filters, this is non-functional API.
     * @type {Array<v.audio.filters.Filter>}
     * @name v.audio.htmlaudio.HTMLAudioContext#filters
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
     * @name v.audio.htmlaudio.HTMLAudioContext#audioContext
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
     * @method v.audio.htmlaudio.HTMLAudioContext#toggleMute
     * @return {boolean} The current muted state.
     */
    toggleMute() {
        this.muted = !this.muted;
        this.refresh();
        return this.muted;
    }
    /**
     * Toggles the paused state.
     * @method v.audio.htmlaudio.HTMLAudioContext#togglePause
     * @return {boolean} The current paused state.
     */
    togglePause() {
        this.paused = !this.paused;
        this.refreshPaused();
        return this.paused;
    }
    /**
     * Destroy and don't use after this
     * @method v.audio.htmlaudio.HTMLAudioContext#destroy
     */
    destroy() {
        this.removeAllListeners();
    }
}
