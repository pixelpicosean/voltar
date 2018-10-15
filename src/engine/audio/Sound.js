import HTMLAudioMedia from "./htmlaudio/HTMLAudioMedia";
import SoundLibrary from "./SoundLibrary";
import SoundSprite from "./sprites/SoundSprite";
import SoundUtils from "./utils/SoundUtils";
import WebAudioMedia from "./webaudio/WebAudioMedia";
import Filter from "./filters/Filter";
/**
 * Sound represents a single piece of loaded media. When playing a sound {@link IMediaInstance} objects
 * are created. Properties such a `volume`, `pause`, `mute`, `speed`, etc will have an effect on all instances.
 */
export default class Sound {
    /**
     * Constructor, use `Sound.from`
     * @private
     */
    constructor(media, options) {
        this.media = media;
        this.options = options;
        this._instances = [];
        this._sprites = {};
        this.media.init(this);
        const complete = options.complete;
        this._autoPlayOptions = complete ? { complete } : null;
        this.isLoaded = false;
        this.isPlaying = false;
        this.autoPlay = options.autoPlay;
        this.singleInstance = options.singleInstance;
        this.preload = options.preload || this.autoPlay;
        this.url = options.url;
        this.speed = options.speed;
        this.volume = options.volume;
        this.loop = options.loop;
        if (options.sprites) {
            this.addSprites(options.sprites);
        }
        if (this.preload) {
            this._preload(options.loaded);
        }
    }
    /**
     * Create a new sound instance from source.
     * @param {ArrayBuffer|String|Object|HTMLAudioElement} options Either the path or url to the source file.
     *        or the object of options to use.
     * @param {String} [options.url] If `options` is an object, the source of file.
     * @param {HTMLAudioElement|ArrayBuffer} [options.source] The source, if already preloaded.
     * @param {boolean} [options.autoPlay=false] true to play after loading.
     * @param {boolean} [options.preload=false] true to immediately start preloading.
     * @param {boolean} [options.singleInstance=false] `true` to disallow playing multiple layered instances at once.
     * @param {number} [options.volume=1] The amount of volume 1 = 100%.
     * @param {number} [options.speed=1] The playback rate where 1 is 100% speed.
     * @param {Object} [options.sprites] The map of sprite data. Where a sprite is an object
     *        with a `start` and `end`, which are the times in seconds. Optionally, can include
     *        a `speed` amount where 1 is 100% speed.
     * @param {Sound~completeCallback} [options.complete=null] Global complete callback
     *        when play is finished.
     * @param {Sound~loadedCallback} [options.loaded=null] Call when finished loading.
     * @param {boolean} [options.loop=false] true to loop the audio playback.
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
    // Actual implementation
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
     * Remove all sound sprites.
     * @return {Sound} Sound instance for chaining.
     */
    /**
     * Remove a sound sprite.
     * @return {Sound} Sound instance for chaining.
     */
    removeSprites(alias) {
        if (!alias) {
            }
        }
        else {
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
    // Overloaded function
    play(source, complete) {
        let options;
        if (typeof source === "string") {
            const sprite = source;
            options = { sprite, complete };
        }
        else if (typeof source === "function") {
            options = {};
            options.complete = source;
        }
        else {
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
            // @if DEBUG
            console.assert(!!this._sprites[alias], `Alias ${alias} is not available`);
            // @endif
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
        instance.once("end", () => {
            if (options.complete) {
                options.complete(this);
            }
            this._onComplete(instance);
        });
        instance.once("stop", () => {
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
     * @type {number}
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
