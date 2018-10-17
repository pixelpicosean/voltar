import { DATA_URI, URL_FILE_EXTENSION, SVG_SIZE } from '../const';
import settings from '../settings';
import plugin_target from './plugin_target';
import * as mixins from './mixin';
import map_premultiplied_blend_modes from './map_premultiplied_blend_modes';

let next_uid = 0;
let said_hello = false;

/**
 * Generalized convenience utilities for
 * @example
 *
 * // Convert hex color to string
 * console.log(utils.hex2string(0xff00ff)); // returns: "#ff00ff"
 */
export {
    plugin_target,
    mixins,
};

/**
 * Gets the next unique identifier
 *
 * @return {number} The next unique identifier to use.
 */
export function uid() {
    return ++next_uid;
}

/**
 * Converts a hex color number to an [R, G, B] array
 *
 * @param {number} hex - The number to convert
 * @param  {number[]|Float32Array} [out=[]] If supplied, this array will be used rather than returning a new one
 * @return {number[]|Float32Array} An array representing the [R, G, B] of the color.
 */
export function hex2rgb(hex, out) {
    out = out || [];

    out[0] = ((hex >> 16) & 0xFF) / 255;
    out[1] = ((hex >> 8) & 0xFF) / 255;
    out[2] = (hex & 0xFF) / 255;

    return out;
}

/**
 * Converts a hex color number to a string.
 *
 * @param {number} hex_num - Number in hex
 * @return {string} The string color.
 */
export function hex2string(hex_num) {
    let hex = hex_num.toString(16);
    hex = '000000'.substr(0, 6 - hex.length) + hex;

    return `#${hex}`;
}

/**
 * Converts a color as an [R, G, B] array to a hex number
 *
 * @param {number[]} rgb - rgb array
 * @return {number} The color number
 */
export function rgb2hex(rgb) {
    return (((rgb[0] * 255) << 16) + ((rgb[1] * 255) << 8) + (rgb[2] * 255 | 0));
}

/**
 * get the resolution / device pixel ratio of an asset by looking for the prefix
 * used by spritesheets and image urls
 *
 * @param {string} url - the image path
 * @param {number} [default_value=1] - the defaultValue if no filename prefix is set.
 * @return {number} resolution / device pixel ratio of an asset
 */
export function get_resolution_of_url(url, default_value) {
    const resolution = settings.RETINA_PREFIX.exec(url);

    if (resolution) {
        return parseFloat(resolution[1]);
    }

    return default_value !== undefined ? default_value : 1;
}

/**
 * Typedef for decompose_data_uri return object.
 *
 * @typedef DecomposedDataUri
 * @property {String} mediaType type, eg. `image`
 * @property {String} subType type, eg. `png`
 * @property {String} charset
 * @property {String} encoding encoding, eg. `base64`
 * @property {any} data The actual data
 */

/**
 * Split a data URI into components. Returns undefined if
 * parameter `dataUri` is not a valid data URI.
 *
 * @param {string} dataUri - the data URI to check
 * @return {DecomposedDataUri|undefined} The decomposed data uri or undefined
 */
export function decompose_data_uri(dataUri) {
    const data_uri_match = DATA_URI.exec(dataUri);

    if (data_uri_match) {
        return {
            mediaType: data_uri_match[1] ? data_uri_match[1].toLowerCase() : undefined,
            subType: data_uri_match[2] ? data_uri_match[2].toLowerCase() : undefined,
            charset: data_uri_match[3] ? data_uri_match[3].toLowerCase() : undefined,
            encoding: data_uri_match[4] ? data_uri_match[4].toLowerCase() : undefined,
            data: data_uri_match[5],
        };
    }

    return undefined;
}

/**
 * Get type of the image by regexp for extension. Returns undefined for unknown extensions.
 *
 * @param {string} url - the image path
 * @return {string|undefined} image extension
 */
export function get_url_file_extension(url) {
    const extension = URL_FILE_EXTENSION.exec(url);

    if (extension) {
        return extension[1].toLowerCase();
    }

    return undefined;
}

/**
 * Typedef for Size object.
 *
 * @typedef {object} Size
 * @property {number} width component
 * @property {number} height component
 */

/**
 * Get size from an svg string using regexp.
 *
 * @param {string} svg_string - a serialized svg element
 * @return {Size|undefined} image extension
 */
export function get_svg_size(svg_string) {
    const size_match = SVG_SIZE.exec(svg_string);
    const size = { width: undefined, height: undefined };

    if (size_match) {
        size[size_match[1]] = Math.round(parseFloat(size_match[3]));
        size[size_match[5]] = Math.round(parseFloat(size_match[7]));
    }

    return size;
}

/**
 * Skips the hello message of renderers that are created after this is run.
 */
export function skip_hello() {
    said_hello = true;
}

/**
 * Logs out the version and renderer information for this running instance of
 * If you don't want to see this message you can run `utils.skip_hello()` before
 * creating your renderer. Keep in mind that doing that will forever makes you a jerk face.
 *
 * @param {string} type - The string renderer type to log.
 */
export function say_hello(type) {
    if (!said_hello) {
        said_hello = true;

        if (window.console) {
            console.log(`[Voltar] Renderer: ${type}`);
        }
    }
}

/**
 * Helper for checking for webgl support
 *
 * @return {boolean} is webgl supported
 */
export function is_webgl_supported() {
    const context_desc = { stencil: true, failIfMajorPerformanceCaveat: true };

    try {
        // @ts-ignore
        if (!window.WebGLRenderingContext) {
            return false;
        }

        const canvas = document.createElement('canvas');
        /** @type {WebGLRenderingContext} */
        let gl;
        // @ts-ignore
        gl = canvas.getContext('webgl', context_desc) || canvas.getContext('experimental-webgl', context_desc);

        const success = !!(gl && gl.getContextAttributes().stencil);

        if (gl) {
            const loseContext = gl.getExtension('WEBGL_lose_context');

            if (loseContext) {
                loseContext.loseContext();
            }
        }

        gl = null;

        return success;
    }
    catch (e) {
        return false;
    }
}

/**
 * Returns sign of number
 *
 * @param {number} n - the number to check the sign of
 * @returns {number} 0 if `n` is 0, -1 if `n` is negative, 1 if `n` is positive
 */
export function sign(n) {
    if (n === 0) return 0;

    return n < 0 ? -1 : 1;
}

/**
 * @todo Describe property usage
 */
export const TextureCache = Object.create(null);

/**
 * @todo Describe property usage
 */
export const BaseTextureCache = Object.create(null);

/**
 * Destroys all texture in the cache
 */
export function destroy_texture_cache() {
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
 */
export function clear_texture_cache() {
    let key;

    for (key in TextureCache) {
        delete TextureCache[key];
    }
    for (key in BaseTextureCache) {
        delete BaseTextureCache[key];
    }
}

/**
 * @todo Describe property usage
 */
export const SpriteFramesCache = Object.create(null);

/**
 * @const
 * @type {Array<number[]>} maps premultiply flag and blend_mode to adjusted blend_mode
 */
export const premultiply_blend_mode = map_premultiplied_blend_modes();

/**
 * changes blend_mode according to texture format
 *
 * @param {number} blend_mode supposed blend mode
 * @param {boolean} premultiplied  whether source is premultiplied
 * @returns {number} true blend mode for this texture
 */
export function correct_blend_mode(blend_mode, premultiplied) {
    return premultiply_blend_mode[premultiplied ? 1 : 0][blend_mode];
}

/**
 * premultiplies tint
 *
 * @param {number} tint integet RGB
 * @param {number} alpha floating point alpha (0.0-1.0)
 * @returns {number} tint multiplied by alpha
 */
export function premultiply_tint(tint, alpha) {
    if (alpha === 1.0) {
        return (alpha * 255 << 24) + tint;
    }
    if (alpha === 0.0) {
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
export function premultiply_rgba(rgb, alpha, out, premultiply) {
    out = out || new Float32Array(4);
    if (premultiply || premultiply === undefined) {
        out[0] = rgb[0] * alpha;
        out[1] = rgb[1] * alpha;
        out[2] = rgb[2] * alpha;
    }
    else {
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
export function premultiply_tint_to_rgba(tint, alpha, out, premultiply) {
    out = out || new Float32Array(4);
    out[0] = ((tint >> 16) & 0xFF) / 255.0;
    out[1] = ((tint >> 8) & 0xFF) / 255.0;
    out[2] = (tint & 0xFF) / 255.0;
    if (premultiply || premultiply === undefined) {
        out[0] *= alpha;
        out[1] *= alpha;
        out[2] *= alpha;
    }
    out[3] = alpha;

    return out;
}
