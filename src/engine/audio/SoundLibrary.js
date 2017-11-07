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
 */
/**
 * @description Manages the playback of sounds.
 * @class SoundLibrary
 * @private
 */
export default class SoundLibrary {
    constructor(Resource) {
        this.Resource = Resource;

        this.init();
    }
    /**
     * Re-initialize the sound library, this will
     * recreate the AudioContext. If there's a hardware-failure
     * call `close` and then `init`.
     * @return {SoundLibrary}
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
     * @readonly
     */
    get context() {
        return this._context;
    }
    /**
     * Initialize the singleton of the library
     * @return {Sound}
     */
    static init(Resource, Loader, shared) {
        if (SoundLibrary.instance) {
            throw new Error("SoundLibrary is already created");
        }
        const instance = SoundLibrary.instance = new SoundLibrary(Resource);
        LoaderMiddleware.install(instance, Loader, Resource, shared);
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
     * @type {Array<filters.Filter>}
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
     * @private
     * @param {string|ArrayBuffer|HTMLAudioElement|Object} source The source options
     * @param {any} [overrides] Override default options
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
     * @type {boolean}
     */
    get useLegacy() {
        return false;
    }
    set useLegacy(legacy) {
        LoaderMiddleware.set_legacy(false, this.Resource);
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
     * @param {string} alias The sound alias reference.
     * @return {SoundLibrary}
     */
    remove(alias) {
        this.exists(alias, true);
        this._sounds[alias].destroy();
        delete this._sounds[alias];
        return this;
    }
    /**
     * Set the global volume for all sounds. To set per-sound volume see {@link v.sound#volume}.
     * @type {number}
     */
    get volume_all() {
        return this._context.volume;
    }
    set volume_all(volume) {
        this._context.volume = volume;
        this._context.refresh();
    }
    /**
     * Set the global speed for all sounds. To set per-sound speed see {@link v.sound#speed}.
     * @type {number}
     */
    get speed_all() {
        return this._context.speed;
    }
    set speed_all(speed) {
        this._context.speed = speed;
        this._context.refresh();
    }
    /**
     * Toggle paused property for all sounds.
     * @return {boolean} `true` if all sounds are paused.
     */
    toggle_pause_all() {
        return this._context.toggle_pause();
    }
    /**
     * Pauses any playing sounds.
     * @return {SoundLibrary} Instance for chaining.
     */
    pause_all() {
        this._context.paused = true;
        this._context.refresh();
        return this;
    }
    /**
     * Resumes any sounds.
     * @return {SoundLibrary} Instance for chaining.
     */
    resume_all() {
        this._context.paused = false;
        this._context.refresh();
        return this;
    }
    /**
     * Toggle muted property for all sounds.
     * @return {boolean} `true` if all sounds are muted.
     */
    toggle_mute_all() {
        return this._context.toggleMute();
    }
    /**
     * Mutes all playing sounds.
     * @return {SoundLibrary}
     */
    mute_all() {
        this._context.muted = true;
        this._context.refresh();
        return this;
    }
    /**
     * Unmutes all playing sounds.
     * @return {SoundLibrary}
     */
    unmute_all() {
        this._context.muted = false;
        this._context.refresh();
        return this;
    }
    /**
     * Stops and removes all sounds. They cannot be used after this.
     * @return {SoundLibrary}
     */
    remove_all() {
        for (const alias in this._sounds) {
            this._sounds[alias].destroy();
            delete this._sounds[alias];
        }
        return this;
    }
    /**
     * Stops all sounds.
     * @return {SoundLibrary}
     */
    stop_all() {
        for (const alias in this._sounds) {
            this._sounds[alias].stop();
        }
        return this;
    }
    /**
     * Checks if a sound by alias exists.
     * @param {string} alias Check for alias.
     * @param {boolean} [assert] Assert to console or not.
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
     * @param {string} alias The sound alias reference.
     * @return {Sound} Sound object.
     */
    find(alias) {
        this.exists(alias, true);
        return this._sounds[alias];
    }
    /**
     * Plays a sound.
     * @param {String} alias The sound alias reference.
     * @param {String} sprite The alias of the sprite to play.
     * @return {any} The sound instance, this cannot be reused
     *         after it is done playing. Returns `null` if the sound has not yet loaded.
     */
    /**
     * Plays a sound.
     * @param {string} alias The sound alias reference.
     * @param {Object|Function} options The options or callback when done.
     * @param {Function} [options.complete] When completed.
     * @param {Function} [options.loaded] If not already preloaded, callback when finishes load.
     * @param {number} [options.start=0] Start time offset.
     * @param {number} [options.end] End time offset.
     * @param {number} [options.speed] Override default speed, default to the Sound's speed setting.
     * @param {boolean} [options.loop] Override default loop, default to the Sound's loop setting.
     * @return {any} The sound instance,
     *        this cannot be reused after it is done playing. Returns a Promise if the sound
     *        has not yet loaded.
     */
    play(alias, options) {
        return this.find(alias).play(options);
    }
    /**
     * Stops a sound.
     * @param {string} alias The sound alias reference.
     * @return {Sound} Sound object.
     */
    stop(alias) {
        return this.find(alias).stop();
    }
    /**
     * Pauses a sound.
     * @param {string} alias The sound alias reference.
     * @return {Sound} Sound object.
     */
    pause(alias) {
        return this.find(alias).pause();
    }
    /**
     * Resumes a sound.
     * @param {string} alias The sound alias reference.
     * @return {Sound} Instance for chaining.
     */
    resume(alias) {
        return this.find(alias).resume();
    }
    /**
     * Get or set the volume for a sound.
     * @param {string} alias The sound alias reference.
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
     * @param {string} alias The sound alias reference.
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
     * @param {string} alias The sound alias reference.
     * @return {number} The current duration in seconds.
     */
    duration(alias) {
        return this.find(alias).duration;
    }
    /**
     * Closes the sound library. This will release/destroy
     * the AudioContext(s). Can be used safely if you want to
     * initialize the sound library later. Use `init` method.
     * @return {SoundLibrary}
     */
    close() {
        this.remove_all();
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
