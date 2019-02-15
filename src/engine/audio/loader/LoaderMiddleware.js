import SoundUtils from "../utils/SoundUtils";
import { loader_pre_procs, loader_use_procs } from 'engine/registry';
import SoundLibrary from "../SoundLibrary";

import Resource from 'engine/core/io/Resource';


/**
 * Sound middleware installation utilities for PIXI.loaders.Loader
 */
export default class LoaderMiddleware {
    /**
     * Install the middleware
     * @param {SoundLibrary} sound - Instance of sound library
     */
    static install(sound) {
        LoaderMiddleware._sound = sound;
        LoaderMiddleware.legacy = sound.useLegacy;

        // Install middleware on the default loader
        loader_use_procs.push(() => LoaderMiddleware.plugin);
        loader_pre_procs.push(() => LoaderMiddleware.resolve);
    }
    /**
     * Set the legacy mode
     */
    static set legacy(/** @type {boolean} */ legacy) {
        // Configure PIXI Loader to handle audio files correctly
        const exts = SoundUtils.extensions;

        // Make sure we support webaudio
        if (!legacy) {
            // Load all audio files as ArrayBuffers
            exts.forEach((ext) => {
                Resource.set_extension_xhr_type(ext, Resource.XHR_RESPONSE_TYPE.BUFFER);
                Resource.set_extension_load_type(ext, Resource.LOAD_TYPE.XHR);
            });
        } else {
            // Fall back to loading as <audio> elements
            exts.forEach((ext) => {
                Resource.set_extension_xhr_type(ext, Resource.XHR_RESPONSE_TYPE.DEFAULT);
                Resource.set_extension_load_type(ext, Resource.LOAD_TYPE.AUDIO);
            });
        }
    }
    /**
     * Handle the preprocessing of file paths
     * @param {Resource} resource
     * @param {() => void} next
     */
    static resolve(resource, next) {
        SoundUtils.resolveUrl(resource);
        next();
    }
    /**
     * IO middleware for sound
     * @param {Resource} resource
     * @param {() => void} next
     */
    static plugin(resource, next) {
        if (resource.data && SoundUtils.extensions.indexOf(resource.extension) > -1) {
            resource.sound = LoaderMiddleware._sound.add(resource.name, {
                loaded: next,
                preload: true,
                url: resource.url,
                source: resource.data,
            });
        } else {
            next();
        }
    }
}

/**
 * @type {SoundLibrary}
 * @static
 * @private
*/
LoaderMiddleware._sound = null;
