import { GC_MODES, WRAP_MODES, PRECISION, SCALE_MODES } from './const';
import max_recommended_textures from './utils/max_recommended_textures';
import can_upload_same_buffer from './utils/can_upload_same_buffer';

/**
 * @typedef RenderOptions
 * @property {HTMLCanvasElement} view
 * @property {boolean} antialias
 * @property {boolean} auto_resize
 * @property {boolean} transparent
 * @property {number} background_color
 * @property {boolean} clear_before_render
 * @property {boolean} preserve_drawing_buffer
 * @property {boolean} pixel_snap
 * @property {number} width
 * @property {number} height
 * @property {boolean} legacy
 */

/**
 * User's customizable globals for overriding the default V settings, such
 * as a renderer's default resolution, framerate, float percision, etc.
 * @example
 * // Use the native window resolution as the default resolution
 * // will support high-density displays when rendering
 * settings.RESOLUTION = window.devicePixelRatio.
 *
 * // Disable interpolation when scaling, will make texture be pixelated
 * settings.SCALE_MODE = SCALE_MODES.NEAREST;
 */
export default {
    /**
     * Target frames per millisecond.
     *
     * @type {number}
     * @default 0.06
     */
    TARGET_FPMS: 0.06,

    /**
     * If set to true WebGL will attempt make textures mimpaped by default.
     * Mipmapping will only succeed if the base texture uploaded has power of two dimensions.
     *
     * @type {boolean}
     * @default true
     */
    MIPMAP_TEXTURES: true,

    /**
     * Default resolution / device pixel ratio of the renderer.
     *
     * @type {number}
     * @default 1
     */
    RESOLUTION: 1,

    /**
     * Default filter resolution.
     *
     * @type {number}
     * @default 1
     */
    FILTER_RESOLUTION: 1,

    /**
     * The maximum textures that this device supports.
     *
     * @type {number}
     * @default 32
     */
    SPRITE_MAX_TEXTURES: max_recommended_textures(32),

    // TODO: maybe change to SPRITE.BATCH_SIZE: 2000
    // TODO: maybe add PARTICLE.BATCH_SIZE: 15000

    /**
     * The default sprite batch size.
     *
     * The default aims to balance desktop and mobile devices.
     *
     * @type {number}
     * @default 4096
     */
    SPRITE_BATCH_SIZE: 4096,

    /**
     * The prefix that denotes a URL is for a retina asset.
     *
     * @type {RegExp}
     * @example `@2x`
     */
    RETINA_PREFIX: /@([0-9\.]+)x/,

    /**
     * The default render options if none are supplied to {@link WebGLRenderer}
     * @type {RenderOptions}
     */
    RENDER_OPTIONS: {
        view: null,
        antialias: false,
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

    // TODO: use enum instead of number as the type

    /**
     * Default Garbage Collection mode.
     *
     * @type {GC_MODES}
     * @default GC_MODES.AUTO
     */
    GC_MODE: GC_MODES.AUTO,

    /**
     * Default Garbage Collection max idle.
     *
     * @type {number}
     * @default 3600
     */
    GC_MAX_IDLE: 60 * 60,

    /**
     * Default Garbage Collection maximum check count.
     *
     * @type {number}
     * @default 600
     */
    GC_MAX_CHECK_COUNT: 60 * 10,

    /**
     * Default wrap modes that are supported.
     *
     * @type {WRAP_MODES}
     * @default WRAP_MODES.CLAMP
     */
    WRAP_MODE: WRAP_MODES.CLAMP,

    /**
     * The scale modes that are supported.
     *
     * @type {SCALE_MODES}
     * @default SCALE_MODES.LINEAR
     */
    SCALE_MODE: SCALE_MODES.LINEAR,

    /**
     * Default specify float precision in vertex shader.
     *
     * @type {PRECISION}
     * @default PRECISION.HIGH
     */
    PRECISION_VERTEX: PRECISION.HIGH,

    /**
     * Default specify float precision in fragment shader.
     *
     * @type {PRECISION}
     * @default PRECISION.MEDIUM
     */
    PRECISION_FRAGMENT: PRECISION.MEDIUM,

    /**
     * Can we upload the same buffer in a single frame?
     *
     * @type {boolean}
     */
    CAN_UPLOAD_SAME_BUFFER: can_upload_same_buffer(),

    /**
     * Default Mesh `canvasPadding`.
     * @type {number}
     */
    MESH_CANVAS_PADDING: 0,
}
