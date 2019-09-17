import { VObject } from 'engine/core/v_object';

import parse_uri from './parse_uri';
import { queue, each_series } from './async';
import Resource from './io_resource';
import blob_middleware_factory from './middlewares/parsing/blob';

import { loader_pre_procs, loader_use_procs } from 'engine/registry';
import { texture_loader } from './texture_loader';

// some constants
const MAX_PROGRESS = 100;
const rgx_extract_url_hash = /(#[\w-]+)?$/;

/**
 * All the resources for this loader keyed by name.
 *
 * @type {Object<string, Resource>}
 */
const shared_resources = {};

/**
 * Manages the state and loading of multiple resources to load.
 */
export class ResourceLoader extends VObject {
    /**
     * @param {string} [base_url=''] - The base url for all resources loaded by this loader.
     * @param {number} [concurrency=10] - The number of resources to load concurrently.
     */
    constructor(base_url = '', concurrency = 10) {
        super();

        /**
         * The base url for all resources loaded by this loader.
         *
         * @type {string}
         */
        this.base_url = base_url;

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
        this.default_query_string = '';

        /**
         * The middleware to run before loading each resource.
         *
         * @private
         * @type {function[]}
         */
        this._before_middleware = [];

        /**
         * The middleware to run after loading each resource.
         *
         * @private
         * @type {function[]}
         */
        this._after_middleware = [];

        /**
         * The tracks the resources we are currently completing parsing for.
         *
         * @private
         * @type {Resource[]}
         */
        this._resources_parsing = [];

        /**
         * The `_loadResource` function bound with this object context.
         *
         * @private
         * @type {function}
         * @param {Resource} r - The resource to load
         * @param {Function} d - The dequeue function
         */
        this._bound_load_resource = (r, d) => this._load_resource(r, d);

        /**
         * The resources waiting to be loaded.
         *
         * @private
         */
        this._queue = queue(this._bound_load_resource, concurrency);

        this._queue.pause();

        this.resources = shared_resources;

        // Add default before middleware
        for (let i = 0; i < ResourceLoader._default_before_middleware.length; ++i) {
            this.pre(ResourceLoader._default_before_middleware[i]);
        }

        // Add default after middleware
        for (let i = 0; i < ResourceLoader._default_after_middleware.length; ++i) {
            this.use(ResourceLoader._default_after_middleware[i]);
        }

        for (let i = 0; i < loader_pre_procs.length; ++i) {
            this.pre(loader_pre_procs[i]());
        }

        // parse any blob into more usable objects (e.g. Image)
        this.use(blob_middleware_factory());
        this.use(texture_loader);
        for (let i = 0; i < loader_use_procs.length; ++i) {
            this.use(loader_use_procs[i]());
        }
    }

    /**
     * Options for a call to `.add()`.
     *
     * @see Loader#add
     *
     * @typedef IAddOptions
     * @property {string} [name] - The name of the resource to load, if not passed the url is used.
     * @property {string} [key] - Alias for `name`.
     * @property {string} [url] - The url for this resource, relative to the baseUrl of this loader.
     * @property {string|boolean} [cross_origin] - Is this request cross-origin? Default is to
     *      determine automatically.
     * @property {number} [timeout=0] - A timeout in milliseconds for the load. If the load takes
     *      longer than this time it is cancelled and the load is considered a failure. If this value is
     *      set to `0` then there is no explicit timeout.
     * @property {Resource.LOAD_TYPE} [load_type=Resource.LOAD_TYPE.XHR] - How should this resource
     *      be loaded?
     * @property {Resource.XHR_RESPONSE_TYPE} [xhr_type=Resource.XHR_RESPONSE_TYPE.DEFAULT] - How
     *      should the data being loaded be interpreted when using XHR?
     * @property {Resource.OnCompleteSignal} [on_complete] - Callback to add an an on_complete signal istener.
     * @property {Resource.OnCompleteSignal} [callback] - Alias for `on_complete`.
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
            cb = url || name.callback || name.on_complete;
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
        if (this.loading && (!options || !options.parent_resource)) {
            throw new Error('Cannot add resources while the loader is running.');
        }

        // check if resource already exists.
        if (this.resources[name]) {
            throw new Error(`Resource named "${name}" already exists.`);
        }

        // add base url if this isn't an absolute url
        url = this._prepare_url(url);

        // create the store the resource
        this.resources[name] = new Resource(name, url, options);

        if (typeof cb === 'function') {
            this.resources[name].connect_once('after_middleware', cb);
        }

        // if actively loading, make sure to adjust progress chunks for that parent and its children
        if (this.loading) {
            /** @type {Resource} */
            const parent = options.parent_resource;
            /** @type {Resource[]} */
            const incomplete_children = [];

            for (let i = 0; i < parent.children.length; ++i) {
                if (!parent.children[i].is_complete) {
                    incomplete_children.push(parent.children[i]);
                }
            }

            const full_chunk = parent.progress_chunk * (incomplete_children.length + 1); // +1 for parent
            const each_chunk = full_chunk / (incomplete_children.length + 2); // +2 for parent & new child

            parent.children.push(this.resources[name]);
            parent.progress_chunk = each_chunk;

            for (let i = 0; i < incomplete_children.length; ++i) {
                incomplete_children[i].progress_chunk = each_chunk;
            }

            this.resources[name].progress_chunk = each_chunk;
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
        this._before_middleware.push(fn);
        return this;
    }

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @param {Function} fn - The middleware function to register.
     */
    use(fn) {
        this._after_middleware.push(fn);
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

            if (res.is_loading) {
                res.abort('Reset while resource is still loading!');
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
            this.connect_once('complete', cb);
        }

        // if the queue has already started we are done here
        if (this.loading) {
            return this;
        }

        if (this._queue.idle()) {
            this._on_start();
            this._on_complete();
        } else {
            // distribute progress chunks
            const num_tasks = this._queue._tasks.length;
            const chunk = MAX_PROGRESS / num_tasks;

            for (let i = 0; i < this._queue._tasks.length; ++i) {
                this._queue._tasks[i].data.progress_chunk = chunk;
            }

            // notify we are starting
            this._on_start();

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
    _prepare_url(url) {
        const parsed_url = parse_uri(url, { strictMode: true });
        let result;

        // absolute url, just use it as is.
        if (parsed_url.protocol || !parsed_url.path || url.indexOf('//') === 0) {
            result = url;
        }
        // if baseUrl doesn't end in slash and url doesn't start with slash, then add a slash inbetween
        else if (this.base_url.length
            && this.base_url.lastIndexOf('/') !== this.base_url.length - 1
            && url.charAt(0) !== '/'
        ) {
            result = `${this.base_url}/${url}`;
        }
        else {
            result = this.base_url + url;
        }

        // if we need to add a default querystring, there is a bit more work
        if (this.default_query_string) {
            const hash = rgx_extract_url_hash.exec(result)[0];

            result = result.substr(0, result.length - hash.length);

            if (result.indexOf('?') !== -1) {
                result += `&${this.default_query_string}`;
            } else {
                result += `?${this.default_query_string}`;
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
    _load_resource(resource, dequeue) {
        resource._dequeue = dequeue;

        // run before middleware
        each_series(
            this._before_middleware,
            /**
             * @param {Function} fn
             * @param {Function} next
             */
            (fn, next) => {
                fn.call(this, resource, () => {
                    // if the before middleware marks the resource as complete,
                    // break and don't process any more before middleware
                    next(resource.is_complete ? {} : null);
                });
            },
            () => {
                if (resource.is_complete) {
                    this._on_load(resource);
                } else {
                    resource.connect_once('complete', this._on_load, this);
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
    _on_start() {
        this.progress = 0;
        this.loading = true;
        this.emit_signal('start', this);
    }

    /**
     * Called once each resource has loaded.
     *
     * @private
     */
    _on_complete() {
        this.progress = MAX_PROGRESS;
        this.loading = false;
        this.emit_signal('complete', this, this.resources);
    }

    /**
     * Called each time a resources is loaded.
     *
     * @private
     * @param {Resource} resource - The resource that was loaded
     */
    _on_load(resource) {
        resource._on_load_binding = null;

        // remove this resource from the async queue, and add it to our list of resources that are being parsed
        this._resources_parsing.push(resource);
        resource._dequeue();

        // run all the after middleware for this resource
        each_series(
            this._after_middleware,
            /**
             * @param {Function} fn
             * @param {Function} next
             */
            (fn, next) => {
                fn.call(this, resource, next);
            },
            () => {
                resource.emit_signal('after_middleware', resource);

                this.progress = Math.min(MAX_PROGRESS, this.progress + resource.progress_chunk);
                this.emit_signal('progress', this, resource);

                if (resource.error) {
                    this.emit_signal('error', resource.error, this, resource);
                } else {
                    this.emit_signal('load', this, resource);
                }

                this._resources_parsing.splice(this._resources_parsing.indexOf(resource), 1);

                // do completion check
                if (this._queue.idle() && this._resources_parsing.length === 0) {
                    this._on_complete();
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
        ResourceLoader._default_before_middleware.push(fn);

        return ResourceLoader;
    }

    /**
     * Sets up a middleware function that will run *after* the
     * resource is loaded.
     *
     * @param {Function} fn - The middleware function to register.
     */
    static LoaderUseStatic(fn) {
        ResourceLoader._default_after_middleware.push(fn);

        return ResourceLoader;
    }
}

/**
 * A default array of middleware to run before loading each resource.
 * Each of these middlewares are added to any new Loader instances when they are created.
 *
 * @type {Function[]}
 */
ResourceLoader._default_before_middleware = [];

/**
 * A default array of middleware to run after loading each resource.
 * Each of these middlewares are added to any new Loader instances when they are created.
 *
 * @type {Function[]}
 */
ResourceLoader._default_after_middleware = [];
