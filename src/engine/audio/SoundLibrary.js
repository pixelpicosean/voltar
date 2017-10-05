import Filterable from "./Filterable";
import * as filters from "./filters";
import * as htmlaudio from "./htmlaudio";
import { HTMLAudioContext } from "./htmlaudio";
import LoaderMiddleware from "./loader/LoaderMiddleware";
import Sound from "./Sound";
import SoundSprite from "./sprites/SoundSprite";
import utils from "./utils/SoundUtils";
import { WebAudioContext } from "./webaudio";
import * as webaudio from "./webaudio";
/**
 * Contains all of the functionality for using the **pixi-sound** library.
 * This is deisnged to play audio with WebAudio and fallback to HTML5.
 * @namespace v.sound
 */
/**
 * @description Manages the playback of sounds.
 * @class SoundLibrary
 * @memberof v.sound
 * @private
 */
export default class SoundLibrary {
    constructor(loaders) {
        this.loaders = loaders;
        this.init();
    }
    /**
     * Re-initialize the sound library, this will
     * recreate the AudioContext. If there's a hardware-failure
     * call `close` and then `init`.
     * @method v.sound#init
     * @return {v.sound} Sound instance
     */
    init() {
        if (this.supported) {
            this._webAudioContext = new WebAudioContext();
        }
        this._htmlAudioContext = new HTMLAudioContext();
        this._sounds = {};
        this.useLegacy = !this.supported;
        return this;
    }
    /**
     * The global context to use.
     * @name v.sound#context
     * @readonly
     * @type {v.sound.IMediaContext}
     */
    get context() {
        return this._context;
    }
    /**
     * Initialize the singleton of the library
     * @method v.sound.SoundLibrary.init
     * @return {v.sound}
     */
    static init(loaders) {
        if (SoundLibrary.instance) {
            throw new Error("SoundLibrary is already created");
        }
        const instance = SoundLibrary.instance = new SoundLibrary(loaders);
        // In some cases loaders can be not included
        // the the bundle for PixiJS, custom builds
        if (typeof loaders !== "undefined") {
            this.loaders = loaders;
            // Install the middleware to support
            // v.loader and new v.loaders.Loader
            LoaderMiddleware.install(instance, loaders);
        }
        return instance;
    }
    /**
     * Apply filters to all sounds. Can be useful
     * for setting global planning or global effects.
     * **Only supported with WebAudio.**
     * @example
     * // Adds a filter to pan all output left
     * v.sound.filtersAll = [
     *     new v.sound.filters.StereoFilter(-1)
     * ];
     * @name v.sound#filtersAll
     * @type {v.sound.filters.Filter[]}
     */
    get filtersAll() {
        if (!this.useLegacy) {
            return this._context.filters;
        }
        return [];
    }
    set filtersAll(filters) {
        if (!this.useLegacy) {
            this._context.filters = filters;
        }
    }
    /**
     * `true` if WebAudio is supported on the current browser.
     * @name v.sound#supported
     * @readonly
     * @type {boolean}
     */
    get supported() {
        return WebAudioContext.AudioContext !== null;
    }
    // Actual method
    add(source, sourceOptions) {
        if (typeof source === "object") {
            const results = {};
            for (const alias in source) {
                const options = this._getOptions(source[alias], sourceOptions);
                results[alias] = this.add(alias, options);
            }
            return results;
        }
        else if (typeof source === "string") {
            // @if DEBUG
            console.assert(!this._sounds[source], `Sound with alias ${source} already exists.`);
            // @endif
            if (sourceOptions instanceof Sound) {
                this._sounds[source] = sourceOptions;
                return sourceOptions;
            }
            else {
                const options = this._getOptions(sourceOptions);
                const sound = Sound.from(options);
                this._sounds[source] = sound;
                return sound;
            }
        }
    }
    /**
     * Internal methods for getting the options object
     * @method v.sound#_getOptions
     * @private
     * @param {string|ArrayBuffer|HTMLAudioElement|Object} source The source options
     * @param {Object} [overrides] Override default options
     * @return {Object} The construction options
     */
    _getOptions(source, overrides) {
        let options;
        if (typeof source === "string") {
            options = { url: source };
        }
        else if (source instanceof ArrayBuffer || source instanceof HTMLAudioElement) {
            options = { source };
        }
        else {
            options = source;
        }
        return Object.assign(options, overrides || {});
    }
    /**
     * Do not use WebAudio, force the use of legacy. This **must** be called before loading any files.
     * @name v.sound#useLegacy
     * @type {boolean}
     */
    get useLegacy() {
        return false;
    }
    set useLegacy(legacy) {
        LoaderMiddleware.set_legacy(false, this.loaders);
        // Set the context to use
        if (this.supported) {
            this._context = this._webAudioContext;
        }
        else {
            this._context = this._htmlAudioContext;
        }
    }
    /**
     * Removes a sound by alias.
     * @method v.sound#remove
     * @param {String} alias The sound alias reference.
     * @return {v.sound} Instance for chaining.
     */
    remove(alias) {
        this.exists(alias, true);
        this._sounds[alias].destroy();
        delete this._sounds[alias];
        return this;
    }
    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link v.sound#volume}.
     * @name v.sound#volumeAll
     * @type {number}
     */
    get volumeAll() {
        return this._context.volume;
    }
    set volumeAll(volume) {
        this._context.volume = volume;
        this._context.refresh();
    }
    /**
     * Set the global speed for all sounds. To set per-sound speed see {@link v.sound#speed}.
     * @name v.sound#speedAll
     * @type {number}
     */
    get speedAll() {
        return this._context.speed;
    }
    set speedAll(speed) {
        this._context.speed = speed;
        this._context.refresh();
    }
    /**
     * Toggle paused property for all sounds.
     * @method v.sound#togglePauseAll
     * @return {boolean} `true` if all sounds are paused.
     */
    togglePauseAll() {
        return this._context.togglePause();
    }
    /**
     * Pauses any playing sounds.
     * @method v.sound#pauseAll
     * @return {v.sound} Instance for chaining.
     */
    pauseAll() {
        this._context.paused = true;
        this._context.refresh();
        return this;
    }
    /**
     * Resumes any sounds.
     * @method v.sound#resumeAll
     * @return {v.sound} Instance for chaining.
     */
    resumeAll() {
        this._context.paused = false;
        this._context.refresh();
        return this;
    }
    /**
     * Toggle muted property for all sounds.
     * @method v.sound#toggleMuteAll
     * @return {boolean} `true` if all sounds are muted.
     */
    toggleMuteAll() {
        return this._context.toggleMute();
    }
    /**
     * Mutes all playing sounds.
     * @method v.sound#muteAll
     * @return {v.sound} Instance for chaining.
     */
    muteAll() {
        this._context.muted = true;
        this._context.refresh();
        return this;
    }
    /**
     * Unmutes all playing sounds.
     * @method v.sound#unmuteAll
     * @return {v.sound} Instance for chaining.
     */
    unmuteAll() {
        this._context.muted = false;
        this._context.refresh();
        return this;
    }
    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @method v.sound#removeAll
     * @return {v.sound} Instance for chaining.
     */
    removeAll() {
        for (const alias in this._sounds) {
            this._sounds[alias].destroy();
            delete this._sounds[alias];
        }
        return this;
    }
    /**
     * Stops all sounds.
     * @method v.sound#stopAll
     * @return {v.sound} Instance for chaining.
     */
    stopAll() {
        for (const alias in this._sounds) {
            this._sounds[alias].stop();
        }
        return this;
    }
    /**
     * Checks if a sound by alias exists.
     * @method v.sound#exists
     * @param {String} alias Check for alias.
     * @return {boolean} true if the sound exists.
     */
    exists(alias, assert = false) {
        const exists = !!this._sounds[alias];
        if (assert) {
            console.assert(exists, `No sound matching alias '${alias}'.`);
        }
        return exists;
    }
    /**
     * Find a sound by alias.
     * @method v.sound#find
     * @param {String} alias The sound alias reference.
     * @return {v.sound.Sound} Sound object.
     */
    find(alias) {
        this.exists(alias, true);
        return this._sounds[alias];
    }
    /**
     * Plays a sound.
     * @method v.sound#play
     * @param {String} alias The sound alias reference.
     * @param {String} sprite The alias of the sprite to play.
     * @return {v.sound.IMediaInstance|null} The sound instance, this cannot be reused
     *         after it is done playing. Returns `null` if the sound has not yet loaded.
     */
    /**
     * Plays a sound.
     * @method v.sound#play
     * @param {String} alias The sound alias reference.
     * @param {Object|Function} options The options or callback when done.
     * @param {Function} [options.complete] When completed.
     * @param {Function} [options.loaded] If not already preloaded, callback when finishes load.
     * @param {number} [options.start=0] Start time offset.
     * @param {number} [options.end] End time offset.
     * @param {number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @return {v.sound.IMediaInstance|Promise<v.sound.IMediaInstance>} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    play(alias, options) {
        return this.find(alias).play(options);
    }
    /**
     * Stops a sound.
     * @method v.sound#stop
     * @param {String} alias The sound alias reference.
     * @return {v.sound.Sound} Sound object.
     */
    stop(alias) {
        return this.find(alias).stop();
    }
    /**
     * Pauses a sound.
     * @method v.sound#pause
     * @param {String} alias The sound alias reference.
     * @return {v.sound.Sound} Sound object.
     */
    pause(alias) {
        return this.find(alias).pause();
    }
    /**
     * Resumes a sound.
     * @method v.sound#resume
     * @param {String} alias The sound alias reference.
     * @return {v.sound} Instance for chaining.
     */
    resume(alias) {
        return this.find(alias).resume();
    }
    /**
     * Get or set the volume for a sound.
     * @method v.sound#volume
     * @param {String} alias The sound alias reference.
     * @param {number} [volume] Optional current volume to set.
     * @return {number} The current volume.
     */
    volume(alias, volume) {
        const sound = this.find(alias);
        if (volume !== undefined) {
            sound.volume = volume;
        }
        return sound.volume;
    }
    /**
     * Get or set the speed for a sound.
     * @method v.sound#speed
     * @param {String} alias The sound alias reference.
     * @param {number} [speed] Optional current speed to set.
     * @return {number} The current speed.
     */
    speed(alias, speed) {
        const sound = this.find(alias);
        if (speed !== undefined) {
            sound.speed = speed;
        }
        return sound.speed;
    }
    /**
     * Get the length of a sound in seconds.
     * @method v.sound#duration
     * @param {String} alias The sound alias reference.
     * @return {number} The current duration in seconds.
     */
    duration(alias) {
        return this.find(alias).duration;
    }
    /**
     * Closes the sound library. This will release/destroy
     * the AudioContext(s). Can be used safely if you want to
     * initialize the sound library later. Use `init` method.
     * @method v.sound#close
     * @return {v.sound}
     */
    close() {
        this.removeAll();
        this._sounds = null;
        if (this._webAudioContext) {
            this._webAudioContext.destroy();
            this._webAudioContext = null;
        }
        if (this._htmlAudioContext) {
            this._htmlAudioContext.destroy();
            this._htmlAudioContext = null;
        }
        this._context = null;
        return this;
    }
}
