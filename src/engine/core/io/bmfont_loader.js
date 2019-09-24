import Resource from 'engine/core/io/io_resource';
import Texture from 'engine/drivers/textures/Texture';
import { register_font } from 'engine/scene/resources/font';
import { resource_map } from 'engine/registry';


/**
 * @param {string} url
 */
function basename(url) {
    return url.replace(/\\/g, '/').replace(/.*\//, '');
}

/**
 * @param {string} url
 */
function dirname(url) {
    return url.replace(/\\/g, '/').replace(/\/[^\/]*$/, '');
}

/**
 * Register a BitmapText font from loader resource.
 *
 * @function parse_bitmap_font_data
 * @param {Resource} resource - Loader resource.
 * @param {Object<string, Texture>|Texture|Texture[]} textures - Reference to texture.
 */
export function parse(resource, textures) {
    const font = register_font(resource.data, textures);
    resource.internal = font;

    // add to global resource map
    resource_map[font.name] = font;
}

export function bmfont_loader(/** @type {Resource} */ resource, /** @type {Function} */ next) {
    // skip if no data or not xml data
    if (!resource.data || resource.type !== Resource.TYPE.XML) {
        next();

        return;
    }

    // skip if not bitmap font data, using some silly duck-typing
    if (
        resource.data.getElementsByTagName('page').length === 0
        ||
        resource.data.getElementsByTagName('info').length === 0
        ||
        resource.data.getElementsByTagName('info')[0].getAttribute('face') === null
    ) {
        next();

        return;
    }

    let xml_url = !resource.is_data_url ? dirname(resource.url) : '';

    if (resource.is_data_url) {
        if (xml_url === '.') {
            xml_url = '';
        }

        if (this.base_url && xml_url) {
            // if baseurl has a trailing slash then add one to xmlUrl so the replace works below
            if (this.base_url.charAt(this.base_url.length - 1) === '/') {
                xml_url += '/';
            }
        }
    }

    // remove base_url from xmlUrl
    xml_url = xml_url.replace(this.base_url, '');

    // if there is an xmlUrl now, it needs a trailing slash. Ensure that it does if the string isn't empty.
    if (xml_url && xml_url.charAt(xml_url.length - 1) !== '/') {
        xml_url += '/';
    }

    const pages = resource.data.getElementsByTagName('page');
    /** @type Object<string, Texture> */
    const textures = {};

    // Handle completed, when the number of textures
    // load is the same number as references in the fnt file
    const completed = (/** @type {Resource} */page) => {
        textures[page.metadata.extra] = page.internal;

        if (Object.keys(textures).length === pages.length) {
            parse(resource, textures);
            next();
        }
    };

    for (let i = 0; i < pages.length; ++i) {
        const page_file = pages[i].getAttribute('file');
        const url = xml_url + page_file;
        let exists = false;

        // incase the image is loaded outside
        // using the same loader, resource will be available
        for (const name in this.resources) {
            /** @type {Resource} */
            const bitmap_resource = this.resources[name];

            if (bitmap_resource.url === url) {
                bitmap_resource.metadata.extra = page_file;
                if (bitmap_resource.internal) {
                    completed(bitmap_resource);
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
                cross_origin: resource.cross_origin,
                loadType: Resource.LOAD_TYPE.IMAGE,
                metadata: Object.assign(
                    { extra: page_file },
                    resource.metadata.image_metadata
                ),
                parent_resource: resource,
            };

            this.add(url, options, completed);
        }
    }
}
