import { resource_loader } from 'engine/dep/index';
import Texture from 'engine/textures/Texture';

const { Resource } = resource_loader;

export default function () {
    return function texture_parser(resource, next) {
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
