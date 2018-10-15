import SoundUtils from "../utils/SoundUtils";
import { loader_pre_procs, loader_use_procs } from 'engine/registry';

/**
 * Sound middleware installation utilities for PIXI.loaders.Loader
 * @class
 * @private
 */
export default class LoaderMiddleware {
    /**
     * Install the middleware
     * @param {SoundLibrary} sound - Instance of sound library
     */
    static install(sound, Loader, Resource) {
        LoaderMiddleware._sound = sound;
        LoaderMiddleware.set_legacy(sound.useLegacy, Resource);
        // Globally install middleware on all Loaders
        // Note: `resolve` is not supported by default `Loader`
        //  so this will not actually work.
        Loader.addPixiMiddleware(() => {
            return LoaderMiddleware.plugin;
        });
        // Install middleware on the default loader
        loader_pre_procs.push(LoaderMiddleware.resolve);
        loader_use_procs.push(LoaderMiddleware.plugin);
    }
    /**
     * Set the legacy mode
     * @name audio.loader.legacy
     * @type {boolean}
     * @private
     */
    static set_legacy(legacy, Resource) {
        // Configure PIXI Loader to handle audio files correctly
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
