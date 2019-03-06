import Resource from 'engine/core/io/Resource';
import Texture from 'engine/textures/texture';

export default function () {
    return function texture_parser(/** @type {Resource} */ resource, /** @type {Function} */next) {
        // create a new texture if the data is an Image object
        if (resource.data && resource.type === Resource.TYPE.IMAGE) {
            resource.texture = Texture.from_loader(
                resource.data,
                resource.url,
                resource.name
            );
        }
        next();
    };
}
