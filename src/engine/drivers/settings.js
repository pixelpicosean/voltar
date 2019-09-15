import { maxRecommendedTextures } from './utils/max_recommended_textures';
import { device } from 'engine/dep/index';
import { WRAP_MODES, SCALE_MODES, MIPMAP_MODES } from './constants';

/**
 * Mipmapping will only succeed if the base texture uploaded has power of two dimensions.
 */
export const MIPMAP_TEXTURES = MIPMAP_MODES.POW2;

/**
 * Default anisotropic filtering level of textures.
 * Usually from 0 to 16
 */
export const ANISOTROPIC_LEVEL = 0;

/**
 * Default resolution / device pixel ratio of the renderer.
 */
export const RESOLUTION = 1;

/**
 * Default filter resolution.
 */
export const FILTER_RESOLUTION = 1;

/**
 * The maximum textures that this device supports.
 */
export const SPRITE_MAX_TEXTURES = maxRecommendedTextures(32);

// TODO: maybe change to SPRITE.BATCH_SIZE: 2000
// TODO: maybe add PARTICLE.BATCH_SIZE: 15000

export const SPRITE_BATCH_SIZE = 4096;

/**
 * @type {object}
 * @property {HTMLCanvasElement} view=null
 * @property {number} resolution=1
 * @property {boolean} antialias=false
 * @property {boolean} forceFXAA=false
 * @property {boolean} autoDensity=false
 * @property {boolean} transparent=false
 * @property {number} backgroundColor=0x000000
 * @property {boolean} clearBeforeRender=true
 * @property {boolean} preserveDrawingBuffer=false
 * @property {number} width=800
 * @property {number} height=600
 * @property {boolean} legacy=false
 */
export const RENDER_OPTIONS = {
    view: null,
    antialias: false,
    forceFXAA: false,
    autoDensity: false,
    transparent: false,
    backgroundColor: 0x000000,
    clearBeforeRender: true,
    preserveDrawingBuffer: false,
    width: 800,
    height: 600,
    legacy: false,
};

/**
 * Default Garbage Collection mode.
 */
export const GC_MODE = 0;

/**
 * Default Garbage Collection max idle.
 */
export const GC_MAX_IDLE = 60 * 60;

/**
 * Default Garbage Collection maximum check count.
 */
export const GC_MAX_CHECK_COUNT = 60 * 10;

/**
 * Default wrap modes that are supported by pixi.
 */
export const WRAP_MODE = WRAP_MODES.CLAMP;

/**
 * Default scale mode for textures.
 */
export const SCALE_MODE = SCALE_MODES.LINEAR;

/**
 * Default specify float precision in vertex shader.
 */
export const PRECISION_VERTEX = 'highp';

/**
 * Default specify float precision in fragment shader.
 * iOS is best set at highp due to https://github.com/pixijs/pixi.js/issues/3742
 */
export const PRECISION_FRAGMENT = device.apple.device ? 'highp' : 'mediump';

/**
 * Can we upload the same buffer in a single frame?
 */
export const CAN_UPLOAD_SAME_BUFFER = !device.apple.device;

/**
 * Enables bitmap creation before image load. This feature is experimental.
 */
export const CREATE_IMAGE_BITMAP = false;

/**
 * If true PixiJS will Math.floor() x/y values when rendering, stopping pixel interpolation.
 * Advantages can include sharper image quality (like text) and faster rendering on canvas.
 * The main disadvantage is movement of objects may appear less smooth.
 */
export const ROUND_PIXELS = false;

export const RETINA_PREFIX = /@([0-9\.]+)x/;
