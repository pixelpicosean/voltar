/**
 * @todo Describe property usage
 *
 * @static
 * @name ProgramCache
 * @type {Object}
 */
export const ProgramCache = {};

/**
 * @todo Describe property usage
 *
 * @static
 * @name TextureCache
 * @type {Object}
 */
export const TextureCache = Object.create(null);

/**
 * @todo Describe property usage
 *
 * @static
 * @name BaseTextureCache
 * @type {Object}
 */

export const BaseTextureCache = Object.create(null);
/**
 * Destroys all texture in the cache
 *
 * @function destroyTextureCache
 */
export function destroyTextureCache() {
    let key;

    for (key in TextureCache) {
        TextureCache[key].destroy();
    }
    for (key in BaseTextureCache) {
        BaseTextureCache[key].destroy();
    }
}

/**
 * Removes all textures from cache, but does not destroy them
 *
 * @function clearTextureCache
 */
export function clearTextureCache() {
    let key;

    for (key in TextureCache) {
        delete TextureCache[key];
    }
    for (key in BaseTextureCache) {
        delete BaseTextureCache[key];
    }
}
