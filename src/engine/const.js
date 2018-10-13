/**
 * Engine version
 *
 * @constant
 * @type {string}
 */
export const VERSION = '2.3.0 - Pixi.js(4.8.x-dev)';

/**
 * Constant to identify the Renderer Type.
 *
 * @enum {number}
 */
export const RENDERER_TYPE = {
    UNKNOWN: 0,
    WEBGL: 1,
    CANVAS: 2,
};

/**
 * Various blend modes supported by
 *
 * IMPORTANT - The WebGL renderer only supports the NORMAL, ADD, MULTIPLY and SCREEN blend modes.
 * Anything else will silently act like NORMAL.
 *
 * @enum {number}
 */
export const BLEND_MODES = {
    NORMAL: 0,
    ADD: 1,
    MULTIPLY: 2,
    SCREEN: 3,
    OVERLAY: 4,
    DARKEN: 5,
    LIGHTEN: 6,
    COLOR_DODGE: 7,
    COLOR_BURN: 8,
    HARD_LIGHT: 9,
    SOFT_LIGHT: 10,
    DIFFERENCE: 11,
    EXCLUSION: 12,
    HUE: 13,
    SATURATION: 14,
    COLOR: 15,
    LUMINOSITY: 16,
    NORMAL_NPM: 17,
    ADD_NPM: 18,
    SCREEN_NPM: 19,
};

/**
 * Various webgl draw modes. These can be used to specify which GL draw_mode to use
 * under certain situations and renderers.
 *
 * @enum {number}
 */
export const DRAW_MODES = {
    POINTS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6,
};

/**
 * The scale modes that are supported by pixi.
 *
 * The {@link SCALE_MODE} scale mode affects the default scaling mode of future operations.
 * It can be re-assigned to either LINEAR or NEAREST, depending upon suitability.
 *
 * @enum {number}
 */
export const SCALE_MODES = {
    LINEAR: 0,
    NEAREST: 1,
};

/**
 * The wrap modes that are supported by pixi.
 *
 * The {@link WRAP_MODE} wrap mode affects the default wrapping mode of future operations.
 * It can be re-assigned to either CLAMP or REPEAT, depending upon suitability.
 * If the texture is non power of two then clamp will be used regardless as webGL can
 * only use REPEAT if the texture is po2.
 *
 * This property only affects WebGL.
 *
 * @enum {number}
 */
export const WRAP_MODES = {
    CLAMP: 0,
    REPEAT: 1,
    MIRRORED_REPEAT: 2,
};

/**
 * The gc modes that are supported by pixi.
 *
 * The {@link GC_MODE} Garbage Collection mode for pixi textures is AUTO
 * If set to GC_MODE, the renderer will occasionally check textures usage. If they are not
 * used for a specified period of time they will be removed from the GPU. They will of course
 * be uploaded again when they are required. This is a silent behind the scenes process that
 * should ensure that the GPU does not  get filled up.
 *
 * Handy for mobile devices!
 * This property only affects WebGL.
 *
 * @enum {number}
 */
export const GC_MODES = {
    AUTO: 0,
    MANUAL: 1,
};

/**
 * Regexp for image type by extension.
 *
 * @constant
 * @type {RegExp}
 * @example `image.png`
 */
export const URL_FILE_EXTENSION = /\.(\w{3,4})(?:$|\?|#)/i;

/**
 * Regexp for data URI.
 * Based on: {@link https://github.com/ragingwind/data-uri-regex}
 *
 * @constant
 * @type {RegExp}
 * @example data:image/png;base64
 */
export const DATA_URI = /^\s*data:(?:([\w-]+)\/([\w+.-]+))?(?:;charset=([\w-]+))?(?:;(base64))?,(.*)/i;

/**
 * Regexp for SVG size.
 *
 * @constant
 * @type {RegExp}
 * @example &lt;svg width="100" height="100"&gt;&lt;/svg&gt;
 */
export const SVG_SIZE = /<svg[^>]*(?:\s(width|height)=('|")(\d*(?:\.\d+)?)(?:px)?('|"))[^>]*(?:\s(width|height)=('|")(\d*(?:\.\d+)?)(?:px)?('|"))[^>]*>/i; // eslint-disable-line max-len

/**
 * Constants that identify shapes, mainly to prevent `instanceof` calls.
 *
 * @enum {number}
 */
export const SHAPES = {
    POLY: 0,
    RECT: 1,
    CIRC: 2,
    ELIP: 3,
    RREC: 4,
};

/**
 * Constants that specify float precision in shaders.
 *
 * @enum {string}
 */
export const PRECISION = {
    LOW: 'lowp',
    MEDIUM: 'mediump',
    HIGH: 'highp',
};

/**
 * Constants that specify the transform type.
 *
 * @enum {number}
 */
export const TRANSFORM_MODE = {
    STATIC: 0,
    DYNAMIC: 1,
};

/**
 * Constants that define the type of gradient on text.
 *
 * @enum {number}
 */
export const TEXT_GRADIENT = {
    LINEAR_VERTICAL: 0,
    LINEAR_HORIZONTAL: 1,
};

/**
 * Represents the update priorities used by internal V classes when registered with
 * the {@link ticker.Ticker} object. Higher priority items are updated first and lower
 * priority items, such as render, should go later.
 *
 * @enum {number}
 */
export const UPDATE_PRIORITY = {
    INTERACTION: 50,
    HIGH: 25,
    NORMAL: 0,
    LOW: -25,
    UTILITY: -50,
};
