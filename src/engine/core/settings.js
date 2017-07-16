import maxRecommendedTextures from './utils/maxRecommendedTextures';
import canUploadSameBuffer from './utils/canUploadSameBuffer';

/**
 * User's customizable globals for overriding the default V settings, such
 * as a renderer's default resolution, framerate, float percision, etc.
 * @example
 * // Use the native window resolution as the default resolution
 * // will support high-density displays when rendering
 * V.settings.RESOLUTION = window.devicePixelRatio.
 *
 * // Disable interpolation when scaling, will make texture be pixelated
 * V.settings.SCALE_MODE = V.SCALE_MODES.NEAREST;
 * @namespace V.settings
 */
export default {

    /**
     * Target frames per millisecond.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 0.06
     */
    TARGET_FPMS: 0.06,

    /**
     * If set to true WebGL will attempt make textures mimpaped by default.
     * Mipmapping will only succeed if the base texture uploaded has power of two dimensions.
     *
     * @static
     * @memberof V.settings
     * @type {boolean}
     * @default true
     */
    MIPMAP_TEXTURES: true,

    /**
     * Default resolution / device pixel ratio of the renderer.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 1
     */
    RESOLUTION: 1,

    /**
     * Default filter resolution.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 1
     */
    FILTER_RESOLUTION: 1,

    /**
     * The maximum textures that this device supports.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 32
     */
    SPRITE_MAX_TEXTURES: maxRecommendedTextures(32),

    // TODO: maybe change to SPRITE.BATCH_SIZE: 2000
    // TODO: maybe add PARTICLE.BATCH_SIZE: 15000

    /**
     * The default sprite batch size.
     *
     * The default aims to balance desktop and mobile devices.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 4096
     */
    SPRITE_BATCH_SIZE: 4096,

    /**
     * The prefix that denotes a URL is for a retina asset.
     *
     * @static
     * @memberof V.settings
     * @type {RegExp}
     * @example `@2x`
     * @default /@([0-9\.]+)x/
     */
    RETINA_PREFIX: /@([0-9\.]+)x/,

    /**
     * The default render options if none are supplied to {@link V.WebGLRenderer}
     * or {@link V.CanvasRenderer}.
     *
     * @static
     * @constant
     * @memberof V.settings
     * @type {object}
     * @property {HTMLCanvasElement} view=null
     * @property {number} resolution=1
     * @property {boolean} antialias=false
     * @property {boolean} force_fxaa=false
     * @property {boolean} auto_resize=false
     * @property {boolean} transparent=false
     * @property {number} background_color=0x000000
     * @property {boolean} clear_before_render=true
     * @property {boolean} preserve_drawing_buffer=false
     * @property {boolean} pixel_snap=false
     * @property {number} width=800
     * @property {number} height=600
     * @property {boolean} legacy=false
     */
    RENDER_OPTIONS: {
        view: null,
        antialias: false,
        force_fxaa: false,
        auto_resize: false,
        transparent: false,
        background_color: 0x000000,
        clear_before_render: true,
        preserve_drawing_buffer: false,
        pixel_snap: false,
        width: 800,
        height: 600,
        legacy: false,
    },

    /**
     * Default transform type.
     *
     * @static
     * @memberof V.settings
     * @type {V.TRANSFORM_MODE}
     * @default V.TRANSFORM_MODE.STATIC
     */
    TRANSFORM_MODE: 0,

    /**
     * Default Garbage Collection mode.
     *
     * @static
     * @memberof V.settings
     * @type {V.GC_MODES}
     * @default V.GC_MODES.AUTO
     */
    GC_MODE: 0,

    /**
     * Default Garbage Collection max idle.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 3600
     */
    GC_MAX_IDLE: 60 * 60,

    /**
     * Default Garbage Collection maximum check count.
     *
     * @static
     * @memberof V.settings
     * @type {number}
     * @default 600
     */
    GC_MAX_CHECK_COUNT: 60 * 10,

    /**
     * Default wrap modes that are supported by pixi.
     *
     * @static
     * @memberof V.settings
     * @type {V.WRAP_MODES}
     * @default V.WRAP_MODES.CLAMP
     */
    WRAP_MODE: 0,

    /**
     * The scale modes that are supported by pixi.
     *
     * @static
     * @memberof V.settings
     * @type {V.SCALE_MODES}
     * @default V.SCALE_MODES.LINEAR
     */
    SCALE_MODE: 0,

    /**
     * Default specify float precision in vertex shader.
     *
     * @static
     * @memberof V.settings
     * @type {V.PRECISION}
     * @default V.PRECISION.HIGH
     */
    PRECISION_VERTEX: 'highp',

    /**
     * Default specify float precision in fragment shader.
     *
     * @static
     * @memberof V.settings
     * @type {V.PRECISION}
     * @default V.PRECISION.MEDIUM
     */
    PRECISION_FRAGMENT: 'mediump',

    /**
     * Can we upload the same buffer in a single frame?
     *
     * @static
     * @constant
     * @memberof V
     * @type {boolean}
     */
    CAN_UPLOAD_SAME_BUFFER: canUploadSameBuffer(),

};
