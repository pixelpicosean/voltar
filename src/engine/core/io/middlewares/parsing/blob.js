import Resource from '../../io_resource.js';
import encode_binary from '../../b64';

// @ts-ignore
const Url = window.URL || window.webkitURL;

// a middleware for transforming XHR loaded Blobs into more useful objects
export default function blob_middleware_factory() {
    return function blob_middleware(/** @type {Resource} */ resource, /** @type {Function} */ next) {
        if (!resource.data) {
            next();

            return;
        }

        // if this was an XHR load of a blob
        if (resource.xhr && resource.xhr_type === Resource.XHR_RESPONSE_TYPE.BLOB) {
            // if there is no blob support we probably got a binary string back
            if (!window.Blob || typeof resource.data === 'string') {
                const type = resource.xhr.getResponseHeader('content-type');

                // this is an image, convert the binary string into a data url
                if (type && type.indexOf('image') === 0) {
                    resource.data = new Image();
                    resource.data.src = `data:${type};base64,${encode_binary(resource.xhr.responseText)}`;

                    resource.type = Resource.TYPE.IMAGE;

                    // wait until the image loads and then callback
                    resource.data.onload = () => {
                        resource.data.onload = null;

                        next();
                    };

                    // next will be called on load
                    return;
                }
            }
            // if content type says this is an image, then we should transform the blob into an Image object
            else if (resource.data.type.indexOf('image') === 0) {
                const src = Url.createObjectURL(resource.data);

                resource.blob = resource.data;
                resource.data = new Image();
                resource.data.src = src;

                resource.type = Resource.TYPE.IMAGE;

                // cleanup the no longer used blob after the image loads
                resource.data.onload = () => {
                    Url.revokeObjectURL(src);
                    resource.data.onload = null;

                    next();
                };

                // next will be called on load.
                return;
            }
        }

        next();
    };
}
