import { VObject, resource_loader, ResourceLoader } from 'engine/dep/index';
const { Resource } = resource_loader;

// @ts-ignore
import { blobMiddlewareFactory } from 'resource-loader/lib/middlewares/parsing/blob';

import { loader_pre_procs, loader_use_procs } from 'engine/registry';

/**
 *
 * The new loader, extends Resource Loader by Chad Engler: https://github.com/englercj/resource-loader
 *
 * ```js
 * const loader = v.loader; // pixi exposes a premade instance for you to use.
 * //or
 * const loader = new v.loaders.Loader(); // you can also create your own if you want
 *
 * const sprites = {};
 *
 * // Chainable `add` to enqueue a resource
 * loader.add('bunny', 'data/bunny.png')
 *       .add('spaceship', 'assets/spritesheet.json');
 * loader.add('scoreFont', 'assets/score.fnt');
 *
 * // Chainable `pre` to add a middleware that runs for each resource, *before* loading that resource.
 * // This is useful to implement custom caching modules (using filesystem, indexeddb, memory, etc).
 * loader.pre(cachingMiddleware);
 *
 * // Chainable `use` to add a middleware that runs for each resource, *after* loading that resource.
 * // This is useful to implement custom parsing modules (like spritesheet parsers, spine parser, etc).
 * loader.use(parsingMiddleware);
 *
 * // The `load` method loads the queue of resources, and calls the passed in callback called once all
 * // resources have loaded.
 * loader.load((loader, resources) => {
 *     // resources is an object where the key is the name of the resource loaded and the value is the resource object.
 *     // They have a couple default properties:
 *     // - `url`: The URL that the resource was loaded from
 *     // - `error`: The error that happened when trying to load (if any)
 *     // - `data`: The raw data that was loaded
 *     // also may contain other properties based on the middleware that runs.
 *     sprites.bunny = new v.Sprite(resources.bunny.texture);
 *     sprites.spaceship = new v.Sprite(resources.spaceship.texture);
 *     sprites.scoreFont = new v.Sprite(resources.scoreFont.texture);
 * });
 *
 * // throughout the process multiple signals can be dispatched.
 * loader.onProgress.add(() => {}); // called once per loaded/errored file
 * loader.onError.add(() => {}); // called once per errored file
 * loader.onLoad.add(() => {}); // called once per loaded file
 * loader.onComplete.add(() => {}); // called once when the queued resources all load.
 * ```
 *
 * @see https://github.com/englercj/resource-loader
 */
export default class Loader extends ResourceLoader {
    /**
     * @param {string} [baseUrl=''] - The base url for all resources loaded by this loader.
     * @param {number} [concurrency=10] - The number of resources to load concurrently.
     */
    constructor(baseUrl, concurrency) {
        super(baseUrl, concurrency);

        for (let i = 0; i < loader_pre_procs.length; ++i) {
            this.pre(loader_pre_procs[i]());
        }

        // parse any blob into more usable objects (e.g. Image)
        this.use(blobMiddlewareFactory());
        for (let i = 0; i < loader_use_procs.length; ++i) {
            this.use(loader_use_procs[i]());
        }

        // Compat layer, translate the new v2 signals into old v1 events.
        // @ts-ignore
        this.onStart.add((l) => this.emit_signal('start', l));
        // @ts-ignore
        this.onProgress.add((l, r) => this.emit_signal('progress', l, r));
        // @ts-ignore
        this.onError.add((e, l, r) => this.emit_signal('error', e, l, r));
        // @ts-ignore
        this.onLoad.add((l, r) => this.emit_signal('load', l, r));
        // @ts-ignore
        this.onComplete.add((l, r) => this.emit_signal('complete', l, r));
    }

    /**
     * Destroy the loader, removes references.
     */
    destroy() {
        // @ts-ignore
        this.disconnect_all();
        this.reset();
    }
}

// Copy EE3 prototype (mixin)
for (const k in VObject.prototype) {
    Loader.prototype[k] = VObject.prototype[k];
}

// Add custom extentions
Resource.setExtensionXhrType('fnt', Resource.XHR_RESPONSE_TYPE.DOCUMENT);
