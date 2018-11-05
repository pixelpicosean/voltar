import { EventEmitter } from 'engine/dep/index';

/**
 * The fallback version of WebAudioContext which uses `<audio>` instead of WebAudio API.
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
     * @method HTMLAudioContext#refresh
     * @private
     */
    refresh() {
        this.emit_signal('refresh');
    }
    /**
     * Internal trigger paused changes
     * @method HTMLAudioContext#refreshPaused
     * @private
     */
    refreshPaused() {
        this.emit_signal('refreshPaused');
    }
    /**
     * HTML Audio does not support filters, this is non-functional API.
     * @type {Array<import('../filters/index').Filter>}
     * @name HTMLAudioContext#filters
     * @default null
     */
    get filters() {
        console.warn('HTML Audio does not support filters');
        return null;
    }
    set filters(filters) {
        console.warn('HTML Audio does not support filters');
    }
    /**
     * HTML Audio does not support `audioContext`
     * @type {null}
     * @name HTMLAudioContext#audioContext
     * @default null
     * @readonly
     */
    get audioContext() {
        console.warn('HTML Audio does not support audioContext');
        return null;
    }
    /**
     * Toggles the muted state.
     * @method HTMLAudioContext#toggleMute
     * @return {boolean} The current muted state.
     */
    toggleMute() {
        this.muted = !this.muted;
        this.refresh();
        return this.muted;
    }
    /**
     * Toggles the paused state.
     * @method HTMLAudioContext#togglePause
     * @return {boolean} The current paused state.
     */
    togglePause() {
        this.paused = !this.paused;
        this.refreshPaused();
        return this.paused;
    }
    /**
     * Destroy and don't use after this
     * @method HTMLAudioContext#destroy
     */
    destroy() {
        this.disconnect_all();
    }
}
