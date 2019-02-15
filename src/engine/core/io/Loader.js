import Signal from 'mini-signals';
import parse_uri from './parse_uri';
import * as async from './async';
import Resource from './Resource';
import { VObject } from 'engine/dep/index';

import { blobMiddlewareFactory } from './middlewares/parsing/blob';
import { loader_pre_procs, loader_use_procs } from 'engine/registry';

// some constants
const MAX_PROGRESS = 100;
const rgxExtractUrlHash = /(#[\w-]+)?$/;

/**
 * Manages the state and loading of multiple resources to load.
 */
export default class Loader extends VObject {
    /**
     * @param {string} [baseUrl=''] - The base url for all resources loaded by this loader.
     * @param {number} [concurrency=10] - The number of resources to load concurrently.
     */
    constructor(baseUrl = '', concurrency = 10) {
        super();

        /**
         * The base url for all resources loaded by this loader.
         *
         * @type {string}
         */
        this.baseUrl = baseUrl;

        /**
         * The progress percent of the loader going through the queue.
         *
         * @type {number}
         */
        this.progress = 0;

        /**
         * Loading state of the loader, true if it is currently loading resources.
         *
         * @type {boolean}
         */
        this.loading = false;

        /**
         * A querystring to append to every URL added to the loader.
         *
         * This should be a valid query string *without* the question-mark (`?`). The loader will
         * also *not* escape values for you. Make sure to escape your parameters with
         * [`encodeURIComponent`](https://mdn.io/encodeURIComponent) before assigning this property.
         *
         * @example
         * const loader = new Loader();
         *
         * loader.defaultQueryString = 'user=me&password=secret';
         *
         * // This will request 'image.png?user=me&password=secret'
         * loader.add('image.png').load();
         *
         * loader.reset();
         *
         * // This will request 'image.png?v=1&user=me&password=secret'
         * loader.add('iamge.png?v=1').load();
         *
         * @type {string}
         */
        this.defaultQueryString = '';

        /**
         * The middleware to run before loading each resource.
         *
         * @private
         * @type {function[]}
         */
        this._beforeMiddleware = [];

        /**
         * The middleware to run after loading each resource.
         *
         * @private
         * @type {function[]}
         */
        this._afterMiddleware = [];

        /**
         * The tracks the resources we are currently completing parsing for.
         *
         * @private
         * @type {Resource[]}
         */
        this._resourcesParsing = [];

        /**
         * The `_loadResource` function bound with this object context.
         *
         * @private
         * @type {function}
         * @param {Resource} r - The resource to load
         * @param {Function} d - The dequeue function
         */
        this._boundLoadResource = (r, d) => this._loadResource(r, d);

        /**
         * The resources waiting to be loaded.
         *
         * @private
         */
        this._queue = async.queue(this._boundLoadResource, concurrency);

        this._queue.pause();

        /**
         * All the resources for this loader keyed by name.
         *
         * @type {Object<string, Resource>}
         */
        this.resources = {};

        /**
         * Dispatched once per loaded or errored resource.
         *
         * @type {Signal}
         */
        this.onProgress = new Signal();

        /**
         * Dispatched once per errored resource.
         *
         * @type {Signal}
         */
        this.onError = new Signal();

        /**
         * Dispatched once per loaded resource.
         *
         * @type {Signal}
         */
        this.onLoad = new Signal();

        /**
         * Dispatched when the loader begins to process the queue.
         *
         * @type {Signal}
         */
        this.onStart = new Signal();

        /**
         * Dispatched when the queued resources all load.
         *
         * @type {Signal}
         */
        this.onComplete = new Signal();

        // Add default before middleware
        for (let i = 0; i < Loader._defaultBeforeMiddleware.length; ++i) {
            this.pre(Loader._defaultBeforeMiddleware[i]);
        }

        // Add default after middleware
        for (let i = 0; i < Loader._defaultAfterMiddleware.length; ++i) {
            this.use(Loader._defaultAfterMiddleware[i]);
        }

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
     * Options for a call to `.add()`.
     *
     * @see Loader#add
     *
     * @typedef {object} IAddOptions
     * @property {string} [name] - The name of the resource to load, if not passed the url is used.
     * @property {string} [key] - Alias for `name`.
     * @property {string} [url] - The url for this resource, relative to the baseUrl of this loader.
     * @property {string|boolean} [crossOrigin] - Is this request cross-origin? Default is to
     *      determine automatically.
     * @property {number} [timeout=0] - A timeout in milliseconds for the load. If the load takes
     *      longer than this time it is cancelled and the load is considered a failure. If this value is
     *      set to `0` then there is no explicit timeout.
     * @property {Resource.LOAD_TYPE} [loadType=Resource.LOAD_TYPE.XHR] - How should this resource
     *      be loaded?
     * @property {Resource.XHR_RESPONSE_TYPE} [xhrType=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How
     *      should the data being loaded be interpreted when using XHR?
     * @property {Resource.OnCompleteSignal} [onComplete] - Callback to add an an onComplete signal istener.
     * @property {Resource.OnCompleteSignal} [callback] - Alias for `onComplete`.
     * @property {Resource.IMetadata} [metadata] - Extra configuration for middleware and the Resource object.
     */

    /**
     * Adds a resource (or multiple resources) to the loader queue.
     * This function can take a wide variety of different parameters.
     */
    add(name, url, options, cb) {
        // special case of an array of objects or urls
        if (Array.isArray(name)) {
            for (let i = 0; i < name.length; ++i) {
                this.add(name[i]);
            }

            return this;
        }

        // if an object is passed instead of params
        if (typeof name === 'object') {
            cb = url || name.callback || name.onComplete;
            options = name;
            url = name.url;
            name = name.name || name.key || name.url;
        }

        // case where no name is passed shift all args over by one.
        if (typeof url !== 'string') {
            cb = options;
            options = url;
            url = name;
        }

        // now that we shifted make sure we have a proper url.
        if (typeof url !== 'string') {
            throw new Error('No url passed to add resource to loader.');
        }

        // options are optional so people might pass a function and no options
        if (typeof options === 'function') {
            cb = options;
            options = null;
        }

        // if loading already you can only add resources that have a parent.
        if (this.loading && (!options || !options.parentResource)) {
            throw new Error('Cannot add resources while the loader is running.');
        }

        // check if resource already exists.
        if (this.resources[name]) {
            throw new Error(`Resource named "${name}" already exists.`);
        }

        // add base url if this isn't an absolute url
        url = this._prepareUrl(url);

        // create the store the resource
        this.resources[name] = new Resource(name, url, options);

        if (typeof cb === 'function') {
            this.resources[name].onAfterMiddleware.once(cb);
        }

        // if actively loading, make sure to adjust progress chunks for that parent and its children
        if (this.loading) {
            const parent = options.parentResource;
            const incompleteChildren = [];

            for (let i = 0; i < parent.children.length; ++i) {
                if (!parent.children[i].isComplete) {
                    incompleteChildren.push(parent.children[i]);
                }
            }

            const fullChunk = parent.progressChunk * (incompleteChildren.length + 1); // +1 for parent
            const eachChunk = fullChunk / (incompleteChildren.length + 2); // +2 for parent & new child

            parent.children.push(this.resources[name]);
            parent.progressChunk = eachChunk;

            for (let i = 0; i < incompleteChildren.length; ++i) {
                incompleteChildren[i].progressChunk = eachChunk;
            }

            this.resources[name].progressChunk = eachChunk;
        }

        // add the resource to the queue
        this._queue.push(this.resources[name]);

        return this;
    }

    /**
     * Sets up a middleware function that will run *before* the
     * resource is loaded.
     *
     * @param {Function} fn - The middleware function to register.
     */
    pre(fn) {
        this._beforeMiddleware.push(fn);
        return this;
    }

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @param {Function} fn - The middleware function to register.
     */
    use(fn) {
        this._afterMiddleware.push(fn);
        return this;
    }

    /**
     * Resets the queue of the loader to prepare for a new load.
     */
    reset() {
        this.progress = 0;
        this.loading = false;

        this._queue.kill();
        this._queue.pause();

        // abort all resource loads
        for (const k in this.resources) {
            const res = this.resources[k];

            if (res._onLoadBinding) {
                res._onLoadBinding.detach();
            }

            if (res.isLoading) {
                res.abort();
            }
        }

        this.resources = {};

        return this;
    }

    destroy() {
        this.disconnect_all();
        this.reset();
    }

    /**
     * Starts loading the queued resources.
     *
     * @param {Function} [cb] - Optional callback that will be bound to the `complete` event.
     */
    load(cb) {
        // register complete callback if they pass one
        if (typeof cb === 'function') {
            this.onComplete.once(cb);
        }

        // if the queue has already started we are done here
        if (this.loading) {
            return this;
        }

        if (this._queue.idle()) {
            this._onStart();
            this._onComplete();
        } else {
            // distribute progress chunks
            const numTasks = this._queue._tasks.length;
            const chunk = MAX_PROGRESS / numTasks;

            for (let i = 0; i < this._queue._tasks.length; ++i) {
                this._queue._tasks[i].data.progressChunk = chunk;
            }

            // notify we are starting
            this._onStart();

            // start loading
            this._queue.resume();
        }

        return this;
    }

    /**
     * The number of resources to load concurrently.
     *
     * @type {number}
     * @default 10
     */
    get concurrency() {
        return this._queue.concurrency;
    }
    set concurrency(concurrency) {
        this._queue.concurrency = concurrency;
    }

    /**
     * Prepares a url for usage based on the configuration of this object
     *
     * @private
     * @param {string} url - The url to prepare.
     */
    _prepareUrl(url) {
        const parsedUrl = parse_uri(url, { strictMode: true });
        let result;

        // absolute url, just use it as is.
        if (parsedUrl.protocol || !parsedUrl.path || url.indexOf('//') === 0) {
            result = url;
        }
        // if baseUrl doesn't end in slash and url doesn't start with slash, then add a slash inbetween
        else if (this.baseUrl.length
            && this.baseUrl.lastIndexOf('/') !== this.baseUrl.length - 1
            && url.charAt(0) !== '/'
        ) {
            result = `${this.baseUrl}/${url}`;
        }
        else {
            result = this.baseUrl + url;
        }

        // if we need to add a default querystring, there is a bit more work
        if (this.defaultQueryString) {
            const hash = rgxExtractUrlHash.exec(result)[0];

            result = result.substr(0, result.length - hash.length);

            if (result.indexOf('?') !== -1) {
                result += `&${this.defaultQueryString}`;
            } else {
                result += `?${this.defaultQueryString}`;
            }

            result += hash;
        }

        return result;
    }

    /**
     * Loads a single resource.
     *
     * @private
     * @param {Resource} resource - The resource to load.
     * @param {Function} dequeue - The function to call when we need to dequeue this item.
     */
    _loadResource(resource, dequeue) {
        resource._dequeue = dequeue;

        // run before middleware
        async.eachSeries(
            this._beforeMiddleware,
            /**
             * @param {Function} fn
             * @param {Function} next
             */
            (fn, next) => {
                fn.call(this, resource, () => {
                    // if the before middleware marks the resource as complete,
                    // break and don't process any more before middleware
                    next(resource.isComplete ? {} : null);
                });
            },
            () => {
                if (resource.isComplete) {
                    this._onLoad(resource);
                }
                else {
                    resource._onLoadBinding = resource.onComplete.once(this._onLoad, this);
                    resource.load();
                }
            },
            true
        );
    }

    /**
     * Called once loading has started.
     *
     * @private
     */
    _onStart() {
        this.progress = 0;
        this.loading = true;
        this.onStart.dispatch(this);
    }

    /**
     * Called once each resource has loaded.
     *
     * @private
     */
    _onComplete() {
        this.progress = MAX_PROGRESS;
        this.loading = false;
        this.onComplete.dispatch(this, this.resources);
    }

    /**
     * Called each time a resources is loaded.
     *
     * @private
     * @param {Resource} resource - The resource that was loaded
     */
    _onLoad(resource) {
        resource._onLoadBinding = null;

        // remove this resource from the async queue, and add it to our list of resources that are being parsed
        this._resourcesParsing.push(resource);
        resource._dequeue();

        // run all the after middleware for this resource
        async.eachSeries(
            this._afterMiddleware,
            /**
             * @param {Function} fn
             * @param {Function} next
             */
            (fn, next) => {
                fn.call(this, resource, next);
            },
            () => {
                resource.onAfterMiddleware.dispatch(resource);

                this.progress = Math.min(MAX_PROGRESS, this.progress + resource.progressChunk);
                this.onProgress.dispatch(this, resource);

                if (resource.error) {
                    this.onError.dispatch(resource.error, this, resource);
                }
                else {
                    this.onLoad.dispatch(this, resource);
                }

                this._resourcesParsing.splice(this._resourcesParsing.indexOf(resource), 1);

                // do completion check
                if (this._queue.idle() && this._resourcesParsing.length === 0) {
                    this._onComplete();
                }
            },
            true
        );
    }

    /**
     * Sets up a middleware function that will run *before* the
     * resource is loaded.
     *
     * @param {Function} fn - The middleware function to register.
     */
    static LoaderPreStatic(fn) {
        Loader._defaultBeforeMiddleware.push(fn);

        return Loader;
    }

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @param {Function} fn - The middleware function to register.
     */
    static LoaderUseStatic(fn) {
        Loader._defaultAfterMiddleware.push(fn);

        return Loader;
    }
}

/**
 * A default array of middleware to run before loading each resource.
 * Each of these middlewares are added to any new Loader instances when they are created.
 *
 * @type {Function[]}
 */
Loader._defaultBeforeMiddleware = [];

/**
 * A default array of middleware to run after loading each resource.
 * Each of these middlewares are added to any new Loader instances when they are created.
 *
 * @type {Function[]}
 */
Loader._defaultAfterMiddleware = [];
