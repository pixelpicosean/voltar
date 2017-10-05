import SoundUtils from "../utils/SoundUtils";
/**
 * Sound middleware installation utilities for PIXI.loaders.Loader
 * @class
 * @private
 */
export default class LoaderMiddleware {
    /**
     * Install the middleware
     * @method PIXI.sound.loader.install
     * @param {PIXI.sound.SoundLibrary} sound - Instance of sound library
     */
    static install(sound, loaders) {
        LoaderMiddleware._sound = sound;
        LoaderMiddleware.set_legacy(sound.useLegacy, loaders);
        // Globally install middleware on all Loaders
        // Note: `resolve` is not supported by default `Loader`
        //  so this will not actually work.
        loaders.Loader.addPixiMiddleware(() => {
            return LoaderMiddleware.plugin;
        });
        // Install middleware on the default loader
        loaders.shared.use(LoaderMiddleware.plugin);
        loaders.shared.pre(LoaderMiddleware.resolve);
    }
    /**
     * Set the legacy mode
     * @name PIXI.sound.loader.legacy
     * @type {boolean}
     * @private
     */
    static set_legacy(legacy, loaders) {
        // Configure PIXI Loader to handle audio files correctly
        const Resource = loaders.Resource;
        const exts = SoundUtils.extensions;
        // Make sure we support webaudio
        if (!legacy) {
            // Load all audio files as ArrayBuffers
            exts.forEach((ext) => {
                Resource.setExtensionXhrType(ext, Resource.XHR_RESPONSE_TYPE.BUFFER);
                Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.XHR);
            });
        }
        else {
            // Fall back to loading as <audio> elements
            exts.forEach((ext) => {
                Resource.setExtensionXhrType(ext, Resource.XHR_RESPONSE_TYPE.DEFAULT);
                Resource.setExtensionLoadType(ext, Resource.LOAD_TYPE.AUDIO);
            });
        }
    }
    /**
     * Handle the preprocessing of file paths
     */
    static resolve(resource, next) {
        SoundUtils.resolveUrl(resource);
        next();
    }
    /**
     * Actual resource-loader middleware for sound class
     */
    static plugin(resource, next) {
        if (resource.data && SoundUtils.extensions.indexOf(resource.extension) > -1) {
            resource.sound = LoaderMiddleware._sound.add(resource.name, {
                loaded: next,
                preload: true,
                url: resource.url,
                source: resource.data,
            });
        }
        else {
            next();
        }
    }
}
