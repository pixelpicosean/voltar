import Resource from "./io_resource";
import { ImageTexture } from "engine/scene/resources/texture";
import { Image } from "../image";
import { resource_map, raw_resource_map } from "engine/registry";

/**
 * @param {Resource} resource
 * @param {Function} next
 */
export function texture_loader(resource, next) {
    if (resource.data && resource.type === Resource.TYPE.IMAGE) {
        // image from the resource
        const image = new Image();
        image.data = resource.data;
        image.width = image.data.width;
        image.height = image.data.height;

        raw_resource_map[resource.name] = image;

        // texture from the image
        const texture = new ImageTexture();
        texture.create_from_image(image, 0);

        resource_map[resource.name] = texture;
        resource_map[resource.url] = texture;

        // do not store inside the resource loader
        resource.data = null;
    }
    next();
}
