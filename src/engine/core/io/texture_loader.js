import Resource from "./io_resource";
import { ImageTexture } from "engine/scene/resources/texture";
import { resource_map, raw_resource_map } from "engine/registry";

/**
 * @param {Resource} resource
 * @param {Function} next
 */
export function texture_loader(resource, next) {
    if (resource.data && resource.type === Resource.TYPE.IMAGE) {
        const image = new ImageTexture;
        image.create_from_image(resource.data);
        image.resource_name = resource.name;
        image.resource_path = resource.url;
        image.texture.name = resource.name;
        raw_resource_map[resource.name] = image;

        resource_map[resource.name] = image;
        resource_map[resource.url] = image;

        resource.internal = image;
    }
    next();
}
