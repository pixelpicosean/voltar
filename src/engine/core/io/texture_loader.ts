import Resource from "./io_resource.js";
import { ImageTexture } from "engine/scene/resources/texture.js";
import { get_resource_map, get_raw_resource_map } from "engine/registry.js";

export function texture_loader(resource: Resource, next: Function) {
    if (resource.data && resource.type === Resource.TYPE.IMAGE) {
        const image = new ImageTexture;
        image.create_from_image(resource.data);
        image.resource_name = resource.name;
        image.resource_path = resource.url;
        image.texture.name = resource.name;
        get_raw_resource_map()[resource.name] = image;

        get_resource_map()[resource.name] = image;
        get_resource_map()[resource.url] = image;

        resource.internal = image;
    }
    next();
}
