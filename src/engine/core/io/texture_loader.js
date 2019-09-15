import Resource from "./io_resource";
import Texture from "engine/drivers/textures/Texture";
import { ImageTexture } from "engine/scene/resources/texture";

/**
 * @param {Resource} resource
 * @param {Function} next
 */
export function texture_loader(resource, next) {
    if (resource.data && resource.type === Resource.TYPE.IMAGE) {
        resource.texture = new ImageTexture();
        resource.texture.texture = Texture.fromLoader(
            resource.data,
            resource.url,
            resource.name
        );
    }
    next();
}
