import * as filters from "./filters/index";
import { HTMLAudioContext } from "./htmlaudio/index";
import LoaderMiddleware from "./loader/LoaderMiddleware";
import Sound from "./Sound";
import { WebAudioContext } from "./webaudio/index";
import Filter from "./filters/Filter";

/**
 * Manages the playback of sounds.
 */
export default class SoundLibrary {
    constructor() {
        /**
         * For legacy approach for Audio. Instead of using WebAudio API
         * for playback of sounds, it will use HTML5 `<audio>` element.
         * @type {boolean}
         * @default false
         * @private
         */
        this._useLegacy = false;

        /**
         * The global context to use.
         * @type {IMediaContext}
         * @private
         */
        this._context = null;

        /**
         * The WebAudio specific context
         * @type {WebAudioContext}
         * @private
         */
        this._webAudioContext = null;

        /**
         * The HTML Audio (legacy) context.
         * @type {HTMLAudioContext}
         * @private
         */
        this._htmlAudioContext = null;

        /**
         * The map of all sounds by alias.
         * @type {{[id: string]: Sound}}
         * @private
         */
        this._sounds = null;

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
     * @type {IMediaContext}
     */
    get context() {
        return this._context;
    }

    /**
     * Initialize the singleton of the library
     * @return {SoundLibrary}
     */
    static init() {
        if (SoundLibrary.instance) {
            throw new Error("SoundLibrary is already created");
        }

        const instance = SoundLibrary.instance = new SoundLibrary();

        LoaderMiddleware.install(instance);

        return instance;
    }
    /**
     * Apply filters to all sounds. Can be useful
     * for setting global planning or global effects.
     * **Only supported with WebAudio.**
     * @example
     * // Adds a filter to pan all output left
     * sound.filtersAll = [
     *     new sound.filters.StereoFilter(-1)
     * ];
     * @type {Array<Filter>}
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
    /**
     * Adds a new sound by alias or register an existing sound with library cache
     * @param {string|Object<string, import("./Sound").Options|string|ArrayBuffer|HTMLAudioElement>} source The sound alias reference or
     *      map of sounds to add, the key is the alias,
     *      the value is `string`, `ArrayBuffer`, `HTMLAudioElement`
     *      or the list of options
     * @param {import("./Sound").Options|string|ArrayBuffer|HTMLAudioElement|Sound} sourceOptions options
     * @returns {Sound}
     */
    add(source, sourceOptions) {
        if (typeof source === "object") {
            const results = {};
            for (const alias in source) {
                /** @type {import("./Sound").Options} */
                const options = this._getOptions(source[alias], sourceOptions);
                results[alias] = this.add(alias, options);
            }
            // TODO: multiply sound return support
            // @ts-ignore
            return results;
        } else if (typeof source === "string") {
            console.assert(!this._sounds[source], `Sound with alias ${source} already exists.`);

            if (sourceOptions instanceof Sound) {
                this._sounds[source] = sourceOptions;
                return sourceOptions;
            } else {
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
     * @return {import("./Sound").Options} The construction options
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
        LoaderMiddleware.legacy = legacy;
        this._useLegacy = legacy;

        // Set the context to use
        if (!legacy && this.supported) {
            // @ts-ignore
            this._context = this._webAudioContext;
        } else {
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
        return this._context.togglePause();
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
     * @param {string} alias The sound alias reference.
     * @param {import("./Sound").PlayOptions|import("./Sound").CompleteCallback|string} options The options or callback when done.
     * @return {IMediaInstance|Promise<IMediaInstance>} The sound instance,
     *      this cannot be reused after it is done playing. Returns a Promise if the sound
     *      has not yet loaded.
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

/**
 * Singleton instance
 * @type {SoundLibrary}
 * @static
 */
SoundLibrary.instance = null;
