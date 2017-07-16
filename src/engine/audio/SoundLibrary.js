import Filterable from "./Filterable";
import * as filters from "./filters";
import * as htmlaudio from "./htmlaudio";
import { HTMLAudioContext } from "./htmlaudio";
import LoaderMiddleware from "./loader";
import Sound from "./Sound";
import SoundSprite from "./sprites/SoundSprite";
import utils from "./utils/SoundUtils";
import { WebAudioContext } from "./webaudio";
import * as webaudio from "./webaudio";
/**
 * Playing sound files with WebAudio API
 * @namespace PIXI.sound
 */
/**
 * @description Manages the playback of sounds.
 * @class SoundLibrary
 * @memberof PIXI.sound
 * @private
 */
export default class SoundLibrary {
    constructor(loaders) {
        this.loaders = loaders;
        if (this.supported) {
            this._webAudioContext = new WebAudioContext();
        }
        this._htmlAudioContext = new HTMLAudioContext();
        this._sounds = {};
        this.useLegacy = !this.supported;
    }
    /**
     * The global context to use.
     * @name PIXI.sound#context
     * @readonly
     * @type {PIXI.sound.webaudio.WebAudioContext}
     */
    get context() {
        return this._context;
    }
    /**
     * Initialize the singleton of the library
     * @method PIXI.sound.SoundLibrary.init
     * @return {PIXI.sound}
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
            // PIXI.loader and new PIXI.loaders.Loader
            LoaderMiddleware.install(instance, loaders);
        }
        // Remove the global namespace created by rollup
        // makes it possible for users to opt-in to exposing
        // the library globally
        if (typeof window.__pixiSound === "undefined") {
            delete window.__pixiSound;
        }
        // Webpack and NodeJS-like environments will not expose
        // the library to the window by default, user must opt-in
        if (typeof module === "undefined") {
            instance.global();
        }
        return instance;
    }
    /**
     * Set the `PIXI.sound` window namespace object. By default
     * the global namespace is disabled in environments that use
     * require/module (e.g. Webpack), so `PIXI.sound` would not
     * be accessible these environments. Window environments
     * will automatically expose the window object, calling this
     * method will do nothing.
     * @method PIXI.sound#global
     * @example
     * import {sound} from 'pixi-sound';
     * sound.global(); // Now can use PIXI.sound
     */
    global() {
        const PixiJS = PIXI;
        if (!PixiJS.sound) {
            Object.defineProperty(PixiJS, "sound", {
                get() { return SoundLibrary.instance; },
            });
            Object.defineProperties(SoundLibrary.instance, {
                filters: { get() { return filters; } },
                htmlaudio: { get() { return htmlaudio; } },
                webaudio: { get() { return webaudio; } },
                utils: { get() { return utils; } },
                Sound: { get() { return Sound; } },
                SoundSprite: { get() { return SoundSprite; } },
                Filterable: { get() { return Filterable; } },
                SoundLibrary: { get() { return SoundLibrary; } },
            });
        }
    }
    /**
     * Apply filters to all sounds. Can be useful
     * for setting global planning or global effects.
     * **Only supported with WebAudio.**
     * @example
     * // Adds a filter to pan all output left
     * PIXI.sound.filtersAll = [
     *     new PIXI.sound.filters.StereoFilter(-1)
     * ];
     * @name PIXI.sound#filtersAll
     * @type {PIXI.sound.filters.Filter[]}
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
     * @name PIXI.sound#supported
     * @readonly
     * @type {Boolean}
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
     * @method PIXI.sound#_getOptions
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
     * Do not use WebAudio, force the use of legacy.
     * @name PIXI.sound#useLegacy
     * @type {Boolean}
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
     * @method PIXI.sound#remove
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    remove(alias) {
        this.exists(alias, true);
        this._sounds[alias].destroy();
        delete this._sounds[alias];
        return this;
    }
    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link PIXI.sound#volume}.
     * @name PIXI.sound#volumeAll
     * @type {Number}
     */
    get volumeAll() {
        return this._context.volume;
    }
    set volumeAll(volume) {
        this._context.volume = volume;
    }
    /**
     * Toggle paused property for all sounds.
     * @method PIXI.sound#togglePauseAll
     * @return {Boolean} `true` if all sounds are paused.
     */
    togglePauseAll() {
        return this._context.togglePause();
    }
    /**
     * Pauses any playing sounds.
     * @method PIXI.sound#pauseAll
     * @return {PIXI.sound} Instance for chaining.
     */
    pauseAll() {
        this._context.paused = true;
        return this;
    }
    /**
     * Resumes any sounds.
     * @method PIXI.sound#resumeAll
     * @return {PIXI.sound} Instance for chaining.
     */
    resumeAll() {
        this._context.paused = false;
        return this;
    }
    /**
     * Toggle muted property for all sounds.
     * @method PIXI.sound#toggleMuteAll
     * @return {Boolean} `true` if all sounds are muted.
     */
    toggleMuteAll() {
        return this._context.toggleMute();
    }
    /**
     * Mutes all playing sounds.
     * @method PIXI.sound#muteAll
     * @return {PIXI.sound} Instance for chaining.
     */
    muteAll() {
        this._context.muted = true;
        return this;
    }
    /**
     * Unmutes all playing sounds.
     * @method PIXI.sound#unmuteAll
     * @return {PIXI.sound} Instance for chaining.
     */
    unmuteAll() {
        this._context.muted = false;
        return this;
    }
    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @method PIXI.sound#removeAll
     * @return {PIXI.sound} Instance for chaining.
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
     * @method PIXI.sound#stopAll
     * @return {PIXI.sound} Instance for chaining.
     */
    stopAll() {
        for (const alias in this._sounds) {
            this._sounds[alias].stop();
        }
        return this;
    }
    /**
     * Checks if a sound by alias exists.
     * @method PIXI.sound#exists
     * @param {String} alias Check for alias.
     * @return {Boolean} true if the sound exists.
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
     * @method PIXI.sound#find
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    find(alias) {
        this.exists(alias, true);
        return this._sounds[alias];
    }
    /**
     * Plays a sound.
     * @method PIXI.sound#play
     * @param {String} alias The sound alias reference.
     * @param {String} sprite The alias of the sprite to play.
     * @return {PIXI.sound.SoundInstance|null} The sound instance, this cannot be reused
     *         after it is done playing. Returns `null` if the sound has not yet loaded.
     */
    /**
     * Plays a sound.
     * @method PIXI.sound#play
     * @param {String} alias The sound alias reference.
     * @param {Object|Function} options The options or callback when done.
     * @param {Function} [options.complete] When completed.
     * @param {Function} [options.loaded] If not already preloaded, callback when finishes load.
     * @param {Number} [options.start=0] Start time offset.
     * @param {Number} [options.end] End time offset.
     * @param {Number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {Boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @return {PIXI.sound.SoundInstance|Promise<PIXI.sound.SoundInstance>} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    play(alias, options) {
        return this.find(alias).play(options);
    }
    /**
     * Stops a sound.
     * @method PIXI.sound#stop
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    stop(alias) {
        return this.find(alias).stop();
    }
    /**
     * Pauses a sound.
     * @method PIXI.sound#pause
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound.Sound} Sound object.
     */
    pause(alias) {
        return this.find(alias).pause();
    }
    /**
     * Resumes a sound.
     * @method PIXI.sound#resume
     * @param {String} alias The sound alias reference.
     * @return {PIXI.sound} Instance for chaining.
     */
    resume(alias) {
        return this.find(alias).resume();
    }
    /**
     * Get or set the volume for a sound.
     * @method PIXI.sound#volume
     * @param {String} alias The sound alias reference.
     * @param {Number} [volume] Optional current volume to set.
     * @return {Number} The current volume.
     */
    volume(alias, volume) {
        const sound = this.find(alias);
        if (volume !== undefined) {
            sound.volume = volume;
        }
        return sound.volume;
    }
    /**
     * Get the length of a sound in seconds.
     * @method PIXI.sound#duration
     * @param {String} alias The sound alias reference.
     * @return {Number} The current duration in seconds.
     */
    duration(alias) {
        return this.find(alias).duration;
    }
    /**
     * Destroys the sound module.
     * @method PIXI.sound#destroy
     * @private
     */
    destroy() {
        this.removeAll();
        this._sounds = null;
        this._context = null;
    }
}