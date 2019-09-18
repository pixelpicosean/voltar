import * as settings from '../settings';

/**
 * get the resolution / device pixel ratio of an asset by looking for the prefix
 * used by spritesheets and image urls
 *
 * @param {string} url - the image path
 * @param {number} [defaultValue=1] - the defaultValue if no filename prefix is set.
 * @return {number} resolution / device pixel ratio of an asset
 */
export function getResolutionOfUrl(url, defaultValue) {
    const resolution = settings.RETINA_PREFIX.exec(url);

    if (resolution) {
        return parseFloat(resolution[1]);
    }

    return defaultValue !== undefined ? defaultValue : 1;
}
