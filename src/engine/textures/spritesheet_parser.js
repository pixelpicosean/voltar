import Resource from 'engine/core/io/Resource';
import url from 'url';
import Spritesheet from 'engine/textures/Spritesheet';

export default () => {
    return function spritesheet_parser(/** @type {Resource} */ resource, /** @type {Function} */ next) {
        const image_resource_name = `${resource.name}_image`;

        // skip if no data, its not json, it isn't spritesheet data, or the image resource already exists
        if (
            !resource.data
            ||
            resource.type !== Resource.TYPE.JSON
            ||
            !resource.data.frames
            ||
            this.resources[image_resource_name]
        ) {
            next();

            return;
        }

        const load_options = {
            cross_origin: resource.cross_origin,
            metadata: resource.metadata.image_metadata,
            parent_resource: resource,
        };

        const resource_path = get_resource_path(resource, this.base_url);

        // load the image for this sheet
        this.add(image_resource_name, resource_path, load_options, function onImageLoad(/** @type {Resource} */ res) {
            if (res.error) {
                next(res.error);

                return;
            }

            const spritesheet = new Spritesheet(
                res.texture.base_texture,
                resource.data,
                resource.url
            );

            spritesheet.parse(() => {
                resource.spritesheet = spritesheet;
                resource.textures = spritesheet.textures;
                next();
            });
        });
    };
}

export function get_resource_path(/** @type {Resource} */ resource, /** @type {string} */ base_url) {
    // Prepend url path unless the resource image is a data url
    if (resource.is_data_url) {
        return resource.data.meta.image;
    }

    return url.resolve(resource.url.replace(base_url, ''), resource.data.meta.image);
}
