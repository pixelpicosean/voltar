import { resource_loader } from 'engine/dep/index';
const { Resource } = resource_loader;
import Texture from 'engine/textures/Texture';
import { register_font } from './res';

function basename(url) {
    return url.replace(/\\/g, '/').replace(/.*\//, '');
}

function dirname(url) {
    return url.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');
}

/**
 * Register a BitmapText font from loader resource.
 *
 * @function parse_bitmap_font_data
 * @param {Resource} resource - Loader resource.
 * @param {Texture|Texture[]} textures - Reference to texture.
 */
export function parse(resource, textures) {
    resource.bitmap_font = register_font(resource.data, textures);
}

export default function () {
    /**
     * @param {Resource} resource
     * @param {Function} next
     */
    return function bitmap_font_parser(resource, next) {
        // skip if no data or not xml data
        if (!resource.data || resource.type !== Resource.TYPE.XML) {
            next();

            return;
        }

        // skip if not bitmap font data, using some silly duck-typing
        if (resource.data.getElementsByTagName('page').length === 0
            || resource.data.getElementsByTagName('info').length === 0
            || resource.data.getElementsByTagName('info')[0].getAttribute('face') === null
        ) {
            next();

            return;
        }

        let xmlUrl = !resource.isDataUrl ? dirname(resource.url) : '';

        if (resource.isDataUrl) {
            if (xmlUrl === '.') {
                xmlUrl = '';
            }

            if (this.baseUrl && xmlUrl) {
                // if baseurl has a trailing slash then add one to xmlUrl so the replace works below
                if (this.baseUrl.charAt(this.baseUrl.length - 1) === '/') {
                    xmlUrl += '/';
                }
            }
        }

        // remove baseUrl from xmlUrl
        xmlUrl = xmlUrl.replace(this.baseUrl, '');

        // if there is an xmlUrl now, it needs a trailing slash. Ensure that it does if the string isn't empty.
        if (xmlUrl && xmlUrl.charAt(xmlUrl.length - 1) !== '/') {
            xmlUrl += '/';
        }

        const pages = resource.data.getElementsByTagName('page');
        const textures = {};

        // Handle completed, when the number of textures
        // load is the same number as references in the fnt file
        const completed = (page) => {
            textures[page.metadata.pageFile] = page.texture;

            if (Object.keys(textures).length === pages.length) {
                parse(resource, textures);
                next();
            }
        };

        for (let i = 0; i < pages.length; ++i) {
            const pageFile = pages[i].getAttribute('file');
            const url = xmlUrl + pageFile;
            let exists = false;

            // incase the image is loaded outside
            // using the same loader, resource will be available
            for (const name in this.resources) {
                const bitmapResource = this.resources[name];

                if (bitmapResource.url === url) {
                    bitmapResource.metadata.pageFile = pageFile;
                    if (bitmapResource.texture) {
                        completed(bitmapResource);
                    }
                    else {
                        bitmapResource.onAfterMiddleware.add(completed);
                    }
                    exists = true;
                    break;
                }
            }

            // texture is not loaded, we'll attempt to add
            // it to the load and add the texture to the list
            if (!exists) {
                // Standard loading options for images
                const options = {
                    crossOrigin: resource.crossOrigin,
                    loadType: Resource.LOAD_TYPE.IMAGE,
                    metadata: Object.assign(
                        { pageFile },
                        resource.metadata.imageMetadata
                    ),
                    parentResource: resource,
                };

                this.add(url, options, completed);
            }
        }
    };
}
