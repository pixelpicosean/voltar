import { VObject, resource_loader, ResourceLoader } from 'engine/dep/index';
const { Resource } = resource_loader;

// @ts-ignore
import { blobMiddlewareFactory } from 'resource-loader/lib/middlewares/parsing/blob';

import { loader_pre_procs, loader_use_procs } from 'engine/registry';

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
