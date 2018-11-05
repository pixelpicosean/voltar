import HTMLAudioMedia from "./htmlaudio/HTMLAudioMedia";
import SoundLibrary from "./SoundLibrary";
import SoundSprite from "./sprites/SoundSprite";
import SoundUtils from "./utils/SoundUtils";
import WebAudioMedia from "./webaudio/WebAudioMedia";
import Filter from "./filters/Filter";

/**
 * Constructor options
 * @typedef Options
 * @property {boolean} [autoPlay]
 * @property {boolean} [preaload]
 * @property {boolean} [singleInstance]
 * @property {number} [volume]
 * @property {number} [speed]
 * @property {CompleteCallback} [complete]
 * @property {LoadedCallback} [loaded]
 * @property {boolean} [preload]
 * @property {boolean} [loop]
 * @property {string} [url]
 * @property {ArrayBuffer|HTMLAudioElement} [source]
 * @property {{[id: string]: import("./sprites/SoundSprite").SoundSpriteData}} [sprites];
 */

// Interface for play options
/**
 * @typedef PlayOptions
 * @property {number} [start]
 * @property {number} [end]
 * @property {number} [speed]
 * @property {boolean} [loop]
 * @property {number} [volume]
 * @property {string} [sprite]
 * @property {boolean} [muted]
 * @property {CompleteCallback} [complete]
 * @property {LoadedCallback} [loaded]
 * @property {number} [offset]
 */

/**
 * Callback when sound is loaded.
 * @callback PIXI.sound.Sound~loadedCallback
 * @param {Error} err The callback error.
 * @param {PIXI.sound.Sound} sound The instance of new sound.
 * @param {PIXI.sound.IMediaInstance} instance The instance of auto-played sound.
 */
/**
 * Callback when sound is loaded.
 * @callback LoadedCallback
 * @param {Error} err The callback error.
 * @param {Sound} [sound] The instance of new sound.
 * @param {IMediaInstance} [instance] The instance of auto-played sound.
 */

/**
 * Callback when sound is completed.
 * @callback CompleteCallback
 * @param {Sound} sound The instance of sound.
 */

/**
 * Sound represents a single piece of loaded media. When playing a sound {@link IMediaInstance} objects
 * are created. Properties such a `volume`, `pause`, `mute`, `speed`, etc will have an effect on all instances.
 */
export default class Sound {
    /**
     * Constructor, use `Sound.from`
     * @param {IMedia} media
     * @param {Options} options
     */
    constructor(media, options) {
        this.media = media;
        this.options = options;

        /**
         * `true` if the buffer is loaded.
         *
         * @type {boolean}
         * @default false
         */
        this.isLoaded = false;
        /**
         * `true` if the sound is currently being played.
         *
         * @type {boolean}
         * @default false
         * @readonly
         */
        this.isPlaying = false;
        /**
         * true to start playing immediate after load.
         *
         * @type {boolean}
         * @default false
         * @readonly
         */
        this.autoPlay = options.autoPlay;
        /**
         * `true` to disallow playing multiple layered instances at once.
         *
         * @type {boolean}
         * @default false
         */
        this.singleInstance = options.singleInstance;
        /**
         * `true` to immediately start preloading.
         *
         * @type {boolean}
         * @default false
         * @readonly
         */
        this.preload = options.preload || this.autoPlay;
        /**
         * The file source to load.
         *
         * @type {String}
         * @readonly
         */
        this.url = options.url;
        /**
         * The constructor options.
         *
         * @type {Object}
         * @readonly
         */
        this.options = options;
        /**
         * The audio source
         *
         * @type {IMedia}
         * @private
         */
        this.media = media;
        /**
         * The collection of instances being played.
         *
         * @type {Array<IMediaInstance>}
         * @private
         */
        this._instances = [];
        /**
         * Reference to the sound context.
         *
         * @type {import("./sprites/SoundSprite").SoundSprites}
         * @private
         */
        this._sprites = {};
        const complete = options.complete;
        /**
         * The options when auto-playing.
         *
         * @type {PlayOptions}
         * @private
         */
        this._autoPlayOptions = complete ? { complete } : null;
        /**
         * The internal volume.
         *
         * @type {number}
         * @private
         */
        this.volume = options.volume;
        /**
         * The internal paused state.
         *
         * @type {boolean}
         * @private
         */
        this._paused = false;
        /**
         * The internal muted state.
         *
         * @type {boolean}
         * @private
         */
        this._muted = false;
        /**
         * The internal volume.
         *
         * @type {boolean}
         * @private
         */
        this._loop = false;
        /**
         * The internal playbackRate
         *
         * @type {number}
         * @private
         */
        this.speed = options.speed;
        this.loop = options.loop;

        this.media.init(this);

        if (options.sprites) {
            this.addSprites(options.sprites);
        }
        if (this.preload) {
            this._preload(options.loaded);
        }
    }
    /**
     * Create a new sound instance from source.
     * @param {ArrayBuffer|String|Object|HTMLAudioElement} source Either the path or url to the source file.
     *                                                            or the object of options to use.
     * @return {Sound} Created sound instance.
     */
    static from(source) {
        let options = {};
        if (typeof source === "string") {
            options.url = source;
        }
        else if (source instanceof ArrayBuffer || source instanceof HTMLAudioElement) {
            options.source = source;
        }
        else {
            options = source;
        }
        // Default settings
        options = Object.assign({
            autoPlay: false,
            singleInstance: false,
            url: null,
            source: null,
            preload: false,
            volume: 1,
            speed: 1,
            complete: null,
            loaded: null,
            loop: false,
        }, options);
        // Resolve url in-case it has a special format
        if (options.url) {
            options.url = SoundUtils.resolveUrl(options.url);
        }
        Object.freeze(options);
        const media = SoundLibrary.instance.useLegacy ?
            new HTMLAudioMedia() :
            new WebAudioMedia();
        return new Sound(media, options);
    }
    /**
     * Instance of the media context
     * @type {IMediaContext}
     * @readonly
     */
    get context() {
        return SoundLibrary.instance.context;
    }
    /**
     * Stops all the instances of this sound from playing.
     * @return {Sound} Instance of this sound.
     */
    pause() {
        this.isPlaying = false;
        this.paused = true;
        return this;
    }
    /**
     * Resuming all the instances of this sound from playing
     * @return {Sound} Instance of this sound.
     */
    resume() {
        this.isPlaying = this._instances.length > 0;
        this.paused = false;
        return this;
    }
    /**
     * Stops all the instances of this sound from playing.
     * @type {boolean}
     * @readonly
     */
    get paused() {
        return this._paused;
    }
    set paused(paused) {
        this._paused = paused;
        this.refreshPaused();
    }
    /**
     * The playback rate
     * @type {number}
     */
    get speed() {
        return this._speed;
    }
    set speed(speed) {
        this._speed = speed;
        this.refresh();
    }
    /**
     * Set the filters. Only supported with WebAudio.
     * @type {Array<Filter>}
     */
    get filters() {
        return this.media.filters;
    }
    set filters(filters) {
        this.media.filters = filters;
    }
    /**
     * Add a sound sprite, which is a saved instance of a longer sound.
     * Similar to an image spritesheet.
     * @param {string|{[id: string]: import("./sprites/SoundSprite").SoundSpriteData}} source The unique name of the sound sprite or sprites
     * @param {import("./sprites/SoundSprite").SoundSpriteData} [data] Map of sounds to add where the key is the alias,
     *        and the data are configuration options
     * @returns {SoundSprite|import("./sprites/SoundSprite").SoundSprites} Sound sprite result.
     */
    addSprites(source, data) {
        if (typeof source === "object") {
            const results = {};
            for (const alias in source) {
                results[alias] = this.addSprites(alias, source[alias]);
            }
            return results;
        }
        else if (typeof source === "string") {
            console.assert(!this._sprites[source], `Alias ${source} is already taken`);
            const sprite = new SoundSprite(this, data);
            this._sprites[source] = sprite;
            return sprite;
        }
    }
    /**
     * Destructor, safer to use `SoundLibrary.remove(alias)` to remove this sound.
     */
    destroy() {
        this._removeInstances();
        this.removeSprites();
        this.media.destroy();
        this.media = null;
        this._sprites = null;
        this._instances = null;
    }
    /**
     * Remove a sound sprite.
     * @param {string} [alias] The unique name of the sound sprite, if nothing
     *                         is provided, all sprites will be removed.
     * @return {Sound} Sound instance for chaining.
     */
    removeSprites(alias) {
        if (!alias) {
            for (const name in this._sprites) {
                this.removeSprites(name);
            }
        } else {
            const sprite = this._sprites[alias];
            if (sprite !== undefined) {
                sprite.destroy();
                delete this._sprites[alias];
            }
        }
        return this;
    }
    /**
     * If the current sound is playable (loaded).
     * @type {boolean}
     * @readonly
     */
    get isPlayable() {
        return this.isLoaded && this.media && this.media.isPlayable;
    }
    /**
     * Stops all the instances of this sound from playing.
     * @return {Sound} Instance of this sound.
     */
    stop() {
        if (!this.isPlayable) {
            this.autoPlay = false;
            this._autoPlayOptions = null;
            return this;
        }
        this.isPlaying = false;
        // Go in reverse order so we don't skip items
        for (let i = this._instances.length - 1; i >= 0; i--) {
            this._instances[i].stop();
        }
        return this;
    }
    /**
     * Plays a sound or a sound sprite
     * @param {string|PlayOptions|CompleteCallback} [source] Name of sprite or play options or complete callback
     * @param {CompleteCallback} [complete] Callback when complete
     */
    play(source, complete) {
        /** @type {PlayOptions} */
        let options;
        if (typeof source === "string") {
            const sprite = source;
            options = { sprite, complete };
        } else if (typeof source === "function") {
            options = {};
            options.complete = source;
        } else {
            options = source;
        }

        options = Object.assign({
            complete: null,
            loaded: null,
            sprite: null,
            end: null,
            start: 0,
            volume: 1,
            speed: 1,
            muted: false,
            loop: false,
        }, options || {});

        // A sprite is specified, add the options
        if (options.sprite) {
            const alias = options.sprite;

            console.assert(!!this._sprites[alias], `Alias ${alias} is not available`);

            const sprite = this._sprites[alias];
            options.start = sprite.start;
            options.end = sprite.end;
            options.speed = sprite.speed || 1;
            delete options.sprite;
        }
        // @deprecated offset option
        if (options.offset) {
            options.start = options.offset;
        }
        // if not yet playable, ignore
        // - usefull when the sound download isnt yet completed
        if (!this.isLoaded) {
            return new Promise((resolve, reject) => {
                this.autoPlay = true;
                this._autoPlayOptions = options;
                this._preload((err, sound, instance) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        if (options.loaded) {
                            options.loaded(err, sound, instance);
                        }
                        resolve(instance);
                    }
                });
            });
        }
        // Stop all sounds
        if (this.singleInstance) {
            this._removeInstances();
        }
        // clone the bufferSource
        const instance = this._createInstance();
        this._instances.push(instance);
        this.isPlaying = true;
        instance.connect_once("end", () => {
            if (options.complete) {
                options.complete(this);
            }
            this._onComplete(instance);
        });
        instance.connect_once("stop", () => {
            this._onComplete(instance);
        });

        instance.play(options);

        return instance;
    }
    /**
     * Internal only, speed, loop, volume change occured.
     * @private
     */
    refresh() {
        const len = this._instances.length;
        for (let i = 0; i < len; i++) {
            this._instances[i].refresh();
        }
    }
    /**
     * Handle changes in paused state. Internal only.
     * @private
     */
    refreshPaused() {
        const len = this._instances.length;
        for (let i = 0; i < len; i++) {
            this._instances[i].refreshPaused();
        }
    }
    /**
     * Gets and sets the volume.
     * @type {number}
     */
    get volume() {
        return this._volume;
    }
    set volume(volume) {
        this._volume = volume;
        this.refresh();
    }
    /**
     * Gets and sets the muted flag.
     * @type {boolean}
     */
    get muted() {
        return this._muted;
    }
    set muted(muted) {
        this._muted = muted;
        this.refresh();
    }
    /**
     * Gets and sets the looping.
     * @type {boolean}
     */
    get loop() {
        return this._loop;
    }
    set loop(loop) {
        this._loop = loop;
        this.refresh();
    }
    /**
     * Starts the preloading of sound.
     * @param {LoadedCallback} [callback]
     * @private
     */
    _preload(callback) {
        this.media.load(callback);
    }
    /**
     * Gets the list of instances that are currently being played of this sound.
     * @type {Array<IMediaInstance>}
     * @readonly
     */
    get instances() {
        return this._instances;
    }
    /**
     * Get the map of sprites.
     * @type {Object}
     * @readonly
     */
    get sprites() {
        return this._sprites;
    }
    /**
     * Get the duration of the audio in seconds.
     * @type {number}
     */
    get duration() {
        return this.media.duration;
    }
    /**
     * Auto play the first instance.
     * @private
     */
    autoPlayStart() {
        let instance;
        if (this.autoPlay) {
            instance = this.play(this._autoPlayOptions);
        }
        return instance;
    }
    /**
     * Removes all instances.
     * @private
     */
    _removeInstances() {
        // destroying also stops
        for (let i = this._instances.length - 1; i >= 0; i--) {
            this._poolInstance(this._instances[i]);
        }
        this._instances.length = 0;
    }
    /**
     * Sound instance completed.
     * @private
     * @param {IMediaInstance} instance
     */
    _onComplete(instance) {
        if (this._instances) {
            const index = this._instances.indexOf(instance);
            if (index > -1) {
                this._instances.splice(index, 1);
            }
            this.isPlaying = this._instances.length > 0;
        }
        this._poolInstance(instance);
    }
    /**
     * Create a new instance.
     * @private
     * @return {IMediaInstance} New instance to use
     */
    _createInstance() {
        if (Sound._pool.length > 0) {
            const instance = Sound._pool.pop();
            instance.init(this.media);
            return instance;
        }
        return this.media.create();
    }
    /**
     * Destroy/recycling the instance object.
     * @private
     * @param {IMediaInstance} instance - Instance to recycle
     */
    _poolInstance(instance) {
        instance.destroy();
        // Add it if it isn't already added
        if (Sound._pool.indexOf(instance) < 0) {
            Sound._pool.push(instance);
        }
    }
}

/**
 * Pool of instances
 * @type {Array<IMediaInstance>}
 * @private
 */
Sound._pool = [];
