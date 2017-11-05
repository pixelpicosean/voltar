import { DATA_URI, URL_FILE_EXTENSION, SVG_SIZE, VERSION } from '../const';
import settings from '../settings';
import EventEmitter from 'eventemitter3';
import plugin_target from './plugin_target';
import * as mixins from './mixin';
import * as isMobile from 'ismobilejs';
import removeItems from 'remove-array-items';
import map_premultiplied_blend_modes from './map_premultiplied_blend_modes';

let nextUid = 0;
let saidHello = false;

/**
 * Generalized convenience utilities for
 * @example
 * // Get info on current device
 * console.log(utils.isMobile);
 *
 * // Convert hex color to string
 * console.log(utils.hex2string(0xff00ff)); // returns: "#ff00ff"
 * @namespace utils
 */
export {
    /**
     * @see {@link https://github.com/kaimallea/isMobile}
     *
     * @memberof utils
     * @function isMobile
     * @type {Object}
     */
    isMobile,

    /**
     * @see {@link https://github.com/mreinstein/remove-array-items}
     *
     * @memberof utils
     * @function removeItems
     * @type {Object}
     */
    removeItems,
    /**
     * @see {@link https://github.com/primus/eventemitter3}
     *
     * @memberof utils
     * @class EventEmitter
     * @type {EventEmitter}
     */
    EventEmitter,
    /**
     * @memberof utils
     * @function plugin_target
     * @type {mixin}
     */
    plugin_target,
    mixins,
};

/**
 * Gets the next unique identifier
 *
 * @memberof utils
 * @function uid
 * @return {number} The next unique identifier to use.
 */
export function uid()
{
    return ++nextUid;
}

/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @memberof utils
 * @function hex2rgb
 * @param {number} hex - The number to convert
 * @param  {number[]} [out=[]] If supplied, this array will be used rather than returning a new one
 * @return {number[]} An array representing the [R, G, B] of the color.
 */
export function hex2rgb(hex, out)
{
    out = out || [];

    out[0] = ((hex >> 16) & 0xFF) / 255;
    out[1] = ((hex >> 8) & 0xFF) / 255;
    out[2] = (hex & 0xFF) / 255;

    return out;
}

/**
 * Converts a hex color number to a string.
 *
 * @memberof utils
 * @function hex2string
 * @param {number} hex - Number in hex
 * @return {string} The string color.
 */
export function hex2string(hex)
{
    hex = hex.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;

    return `#${hex}`;
}

/**
 * Converts a color as an [R, G, B] array to a hex number
 *
 * @memberof utils
 * @function rgb2hex
 * @param {number[]} rgb - rgb array
 * @return {number} The color number
 */
export function rgb2hex(rgb)
{
    return (((rgb[0] * 255) << 16) + ((rgb[1] * 255) << 8) + (rgb[2] * 255 | 0));
}

/**
 * get the resolution / device pixel ratio of an asset by looking for the prefix
 * used by spritesheets and image urls
 *
 * @memberof utils
 * @function getResolutionOfUrl
 * @param {string} url - the image path
 * @param {number} [defaultValue=1] - the defaultValue if no filename prefix is set.
 * @return {number} resolution / device pixel ratio of an asset
 */
export function getResolutionOfUrl(url, defaultValue)
{
    const resolution = settings.RETINA_PREFIX.exec(url);

    if (resolution)
    {
        return parseFloat(resolution[1]);
    }

    return defaultValue !== undefined ? defaultValue : 1;
}

/**
 * Typedef for decomposeDataUri return object.
 *
 * @typedef {object} DecomposedDataUri
 * @property {mediaType} Media type, eg. `image`
 * @property {subType} Sub type, eg. `png`
 * @property {encoding} Data encoding, eg. `base64`
 * @property {data} The actual data
 */

/**
 * Split a data URI into components. Returns undefined if
 * parameter `dataUri` is not a valid data URI.
 *
 * @memberof utils
 * @function decomposeDataUri
 * @param {string} dataUri - the data URI to check
 * @return {DecomposedDataUri|undefined} The decomposed data uri or undefined
 */
export function decomposeDataUri(dataUri)
{
    const dataUriMatch = DATA_URI.exec(dataUri);

    if (dataUriMatch)
    {
        return {
            mediaType: dataUriMatch[1] ? dataUriMatch[1].toLowerCase() : undefined,
            subType: dataUriMatch[2] ? dataUriMatch[2].toLowerCase() : undefined,
            encoding: dataUriMatch[3] ? dataUriMatch[3].toLowerCase() : undefined,
            data: dataUriMatch[4],
        };
    }

    return undefined;
}

/**
 * Get type of the image by regexp for extension. Returns undefined for unknown extensions.
 *
 * @memberof utils
 * @function getUrlFileExtension
 * @param {string} url - the image path
 * @return {string|undefined} image extension
 */
export function getUrlFileExtension(url)
{
    const extension = URL_FILE_EXTENSION.exec(url);

    if (extension)
    {
        return extension[1].toLowerCase();
    }

    return undefined;
}

/**
 * Typedef for Size object.
 *
 * @typedef {object} Size
 * @property {width} Width component
 * @property {height} Height component
 */

/**
 * Get size from an svg string using regexp.
 *
 * @memberof utils
 * @function getSvgSize
 * @param {string} svgString - a serialized svg element
 * @return {Size|undefined} image extension
 */
export function getSvgSize(svgString)
{
    const sizeMatch = SVG_SIZE.exec(svgString);
    const size = {};

    if (sizeMatch)
    {
        size[sizeMatch[1]] = Math.round(parseFloat(sizeMatch[3]));
        size[sizeMatch[5]] = Math.round(parseFloat(sizeMatch[7]));
    }

    return size;
}

/**
 * Skips the hello message of renderers that are created after this is run.
 *
 * @function skipHello
 * @memberof utils
 */
export function skipHello()
{
    saidHello = true;
}

/**
 * Logs out the version and renderer information for this running instance of
 * If you don't want to see this message you can run `utils.skipHello()` before
 * creating your renderer. Keep in mind that doing that will forever makes you a jerk face.
 *
 * @static
 * @function sayHello
 * @memberof utils
 * @param {string} type - The string renderer type to log.
 */
export function sayHello(type) {
    if (!saidHello) {
        saidHello = true;

        if (window.console) {
            console.log(`[Voltar] Renderer: ${type}`);
        }
    }
}

/**
 * Helper for checking for webgl support
 *
 * @memberof utils
 * @function isWebGLSupported
 * @return {boolean} is webgl supported
 */
export function isWebGLSupported()
{
    const contextOptions = { stencil: true, failIfMajorPerformanceCaveat: true };

    try
    {
        if (!window.WebGLRenderingContext)
        {
            return false;
        }

        const canvas = document.createElement('canvas');
        let gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);

        const success = !!(gl && gl.getContextAttributes().stencil);

        if (gl)
        {
            const loseContext = gl.getExtension('WEBGL_lose_context');

            if (loseContext)
            {
                loseContext.loseContext();
            }
        }

        gl = null;

        return success;
    }
    catch (e)
    {
        return false;
    }
}

/**
 * Returns sign of number
 *
 * @memberof utils
 * @function sign
 * @param {number} n - the number to check the sign of
 * @returns {number} 0 if `n` is 0, -1 if `n` is negative, 1 if `n` is positive
 */
export function sign(n)
{
    if (n === 0) return 0;

    return n < 0 ? -1 : 1;
}

/**
 * @todo Describe property usage
 *
 * @memberof utils
 * @private
 */
export const TextureCache = Object.create(null);

/**
 * @todo Describe property usage
 *
 * @memberof utils
 * @private
 */
export const BaseTextureCache = Object.create(null);

/**
 * Destroys all texture in the cache
 *
 * @memberof utils
 * @function destroyTextureCache
 */
export function destroyTextureCache()
{
    let key;

    for (key in TextureCache)
    {
        TextureCache[key].destroy();
    }
    for (key in BaseTextureCache)
    {
        BaseTextureCache[key].destroy();
    }
}

/**
 * Removes all textures from cache, but does not destroy them
 *
 * @memberof utils
 * @function clearTextureCache
 */
export function clearTextureCache()
{
    let key;

    for (key in TextureCache)
    {
        delete TextureCache[key];
    }
    for (key in BaseTextureCache)
    {
        delete BaseTextureCache[key];
    }
}

/**
 * @memberof utils
 * @const premultiplyBlendMode
 * @type {Array<number[]>} maps premultiply flag and blend_mode to adjusted blend_mode
 */
export const premultiplyBlendMode = map_premultiplied_blend_modes();

/**
 * changes blend_mode according to texture format
 *
 * @memberof utils
 * @function correctBlendMode
 * @param {number} blend_mode supposed blend mode
 * @param {boolean} premultiplied  whether source is premultiplied
 * @returns {number} true blend mode for this texture
 */
export function correctBlendMode(blend_mode, premultiplied)
{
    return premultiplyBlendMode[premultiplied ? 1 : 0][blend_mode];
}

/**
 * premultiplies tint
 *
 * @param {number} tint integet RGB
 * @param {number} alpha floating point alpha (0.0-1.0)
 * @returns {number} tint multiplied by alpha
 */
export function premultiplyTint(tint, alpha)
{
    if (alpha === 1.0)
    {
        return (alpha * 255 << 24) + tint;
    }
    if (alpha === 0.0)
    {
        return 0;
    }
    let R = ((tint >> 16) & 0xFF);
    let G = ((tint >> 8) & 0xFF);
    let B = (tint & 0xFF);

    R = ((R * alpha) + 0.5) | 0;
    G = ((G * alpha) + 0.5) | 0;
    B = ((B * alpha) + 0.5) | 0;

    return (alpha * 255 << 24) + (R << 16) + (G << 8) + B;
}

/**
 * combines rgb and alpha to out array
 *
 * @param {Float32Array|number[]} rgb input rgb
 * @param {number} alpha alpha param
 * @param {Float32Array} [out] output
 * @param {boolean} [premultiply=true] do premultiply it
 * @returns {Float32Array} vec4 rgba
 */
export function premultiplyRgba(rgb, alpha, out, premultiply)
{
    out = out || new Float32Array(4);
    if (premultiply || premultiply === undefined)
    {
        out[0] = rgb[0] * alpha;
        out[1] = rgb[1] * alpha;
        out[2] = rgb[2] * alpha;
    }
    else
    {
        out[0] = rgb[0];
        out[1] = rgb[1];
        out[2] = rgb[2];
    }
    out[3] = alpha;

    return out;
}

/**
 * converts integer tint and float alpha to vec4 form, premultiplies by default
 *
 * @param {number} tint input tint
 * @param {number} alpha alpha param
 * @param {Float32Array} [out] output
 * @param {boolean} [premultiply=true] do premultiply it
 * @returns {Float32Array} vec4 rgba
 */
export function premultiplyTintToRgba(tint, alpha, out, premultiply)
{
    out = out || new Float32Array(4);
    out[0] = ((tint >> 16) & 0xFF) / 255.0;
    out[1] = ((tint >> 8) & 0xFF) / 255.0;
    out[2] = (tint & 0xFF) / 255.0;
    if (premultiply || premultiply === undefined)
    {
        out[0] *= alpha;
        out[1] *= alpha;
        out[2] *= alpha;
    }
    out[3] = alpha;

    return out;
}
