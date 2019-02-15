import Resource from "../../Resource";

// a simple in-memory cache for resources
/** @type {Object<string, any>} */
const cache = {};

export default () => {
    return function memory_middleware(/** @type {Resource} */ resource, /** @type {Function} */ next) {
        // if cached, then set data and complete the resource
        if (cache[resource.url]) {
            resource.data = cache[resource.url];
            resource.complete(); // marks resource load complete and stops processing before middlewares
        }
        // if not cached, wait for complete and store it in the cache.
        else {
            resource.connect_once('complete', () => (cache[this.url] = this.data));
        }

        next();
    };
}
