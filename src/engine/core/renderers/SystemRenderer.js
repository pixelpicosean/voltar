import { sayHello, hex2string, hex2rgb } from '../utils';
import { Matrix, Rectangle } from '../math';
import { RENDERER_TYPE } from '../const';
import settings from '../settings';
import Node2D from '../scene/Node2D';
import RenderTexture from '../textures/RenderTexture';
import EventEmitter from 'eventemitter3';

const tempMatrix = new Matrix();

/**
 * @typedef RendererOption
 * @property {number} [width=800] - the width of the screen
 * @property {number} [height=600] - the height of the screen
 * @property {HTMLCanvasElement} [view] - the canvas to use as a view, optional
 * @property {boolean} [transparent=false] - If the render view is transparent, default false
 * @property {boolean} [auto_resize=false] - If the render view is automatically resized, default false
 * @property {boolean} [antialias=false] - sets antialias (only applicable in chrome at the moment)
 * @property {number} [resolution=1] - The resolution / device pixel ratio of the renderer. The
 *     resolution of the renderer retina would be 2.
 * @property {boolean} [preserve_drawing_buffer=false] - enables drawing buffer preservation,
 *     enable this if you need to call toDataUrl on the webgl context.
 * @property {boolean} [clear_before_render=true] - This sets if the renderer will clear the canvas or
 *     not before the new render pass.
 * @property {number} [background_color=0x000000] - The background color of the rendered area
 *     (shown if not transparent).
 * @property {boolean} [pixel_snap=false] - If true Pixi will Math.floor() x/y values when rendering,
 *     stopping pixel interpolation.
 */

/**
 * The SystemRenderer is the base for a Pixi Renderer. It is extended by the {@link V.CanvasRenderer}
 * and {@link V.WebGLRenderer} which can be used for rendering a Pixi scene.
 *
 * @abstract
 * @class
 */
export default class SystemRenderer extends EventEmitter
{
    /**
     * @param {string} system - The name of the system this renderer is for.
     * @param {RendererOption} [options] - The optional renderer parameters
     */
    constructor(system, options, arg2, arg3)
    {
        super();

        sayHello(system);

        // Support for constructor(system, screenWidth, screenHeight, options)
        if (typeof options === 'number')
        {
            options = Object.assign({
                width: options,
                height: arg2 || settings.RENDER_OPTIONS.height,
            }, arg3);
        }

        // Add the default render options
        options = Object.assign({}, settings.RENDER_OPTIONS, options);

        /**
         * The supplied constructor options.
         *
         * @type {RendererOption}
         * @readOnly
         */
        this.options = options;

        /**
         * The type of the renderer.
         *
         * @type {number}
         * @default RENDERER_TYPE.UNKNOWN
         * @see RENDERER_TYPE
         */
        this.type = RENDERER_TYPE.UNKNOWN;

        /**
         * Measurements of the screen. (0, 0, screenWidth, screenHeight)
         *
         * Its safe to use as filter_area or hit_area for whole stage
         *
         * @type {Rectangle}
         */
        this.screen = new Rectangle(0, 0, options.width, options.height);

        /**
         * The canvas element that everything is drawn to
         *
         * @type {HTMLCanvasElement}
         */
        this.view = options.view || document.createElement('canvas');

        /**
         * The resolution / device pixel ratio of the renderer
         *
         * @type {number}
         * @default 1
         */
        this.resolution = options.resolution || settings.RESOLUTION;

        /**
         * Whether the render view is transparent
         *
         * @type {boolean}
         */
        this.transparent = options.transparent;

        /**
         * Whether css dimensions of canvas view should be resized to screen dimensions automatically
         *
         * @type {boolean}
         */
        this.auto_resize = options.auto_resize || false;

        /**
         * Tracks the blend modes useful for this renderer.
         *
         * @type {{key:string, mixed:number}}
         */
        this.blend_modes = null;

        /**
         * The value of the preserve_drawing_buffer flag affects whether or not the contents of
         * the stencil buffer is retained after rendering.
         *
         * @type {boolean}
         */
        this.preserve_drawing_buffer = options.preserve_drawing_buffer;

        /**
         * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
         * If the scene is NOT transparent Pixi will use a canvas sized fillRect operation every
         * frame to set the canvas background color. If the scene is transparent Pixi will use clearRect
         * to clear the canvas every frame. Disable this by setting this to false. For example if
         * your game has a canvas filling background image you often don't need this set.
         *
         * @type {boolean}
         * @default
         */
        this.clear_before_render = options.clear_before_render;

        /**
         * If true Pixi will Math.floor() x/y values when rendering, stopping pixel interpolation.
         * Handy for crisp pixel art and speed on legacy devices.
         *
         * @type {boolean}
         */
        this.pixel_snap = options.pixel_snap;

        /**
         * The background color as a number.
         *
         * @type {number}
         * @private
         */
        this._background_color = 0x000000;

        /**
         * The background color as an [R, G, B] array.
         *
         * @type {Array<number>}
         * @private
         */
        this._background_colorRgba = [0, 0, 0, 0];

        /**
         * The background color as a string.
         *
         * @type {string}
         * @private
         */
        this._background_colorString = '#000000';

        this.background_color = options.background_color || this._background_color; // run bg color setter

        /**
         * This temporary display object used as the parent of the currently being rendered item
         *
         * @type {Node2D}
         * @private
         */
        this._tempNode2DParent = new Node2D();

        /**
         * The last root object that the renderer tried to render.
         *
         * @type {Node2D}
         * @private
         */
        this._lastObjectRendered = this._tempNode2DParent;
    }

    /**
     * Same as view.width, actual number of pixels in the canvas by horizontal
     *
     * @type {number}
     * @readonly
     * @default 800
     */
    get width()
    {
        return this.view.width;
    }

    /**
     * Same as view.height, actual number of pixels in the canvas by vertical
     *
     * @type {number}
     * @readonly
     * @default 600
     */
    get height()
    {
        return this.view.height;
    }

    /**
     * Resizes the screen and canvas to the specified width and height
     * Canvas dimensions are multiplied by resolution
     *
     * @param {number} screenWidth - the new width of the screen
     * @param {number} screenHeight - the new height of the screen
     */
    resize(screenWidth, screenHeight)
    {
        this.screen.width = screenWidth;
        this.screen.height = screenHeight;

        this.view.width = screenWidth * this.resolution;
        this.view.height = screenHeight * this.resolution;

        if (this.auto_resize)
        {
            this.view.style.width = `${screenWidth}px`;
            this.view.style.height = `${screenHeight}px`;
        }
    }

    /**
     * Useful function that returns a texture of the display object that can then be used to create sprites
     * This can be quite useful if your displayObject is complicated and needs to be reused multiple times.
     *
     * @param {Node2D} displayObject - The displayObject the object will be generated from
     * @param {number} scale_mode - Should be one of the scale_mode consts
     * @param {number} resolution - The resolution / device pixel ratio of the texture being generated
     * @param {Rectangle} [region] - The region of the displayObject, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the displayObject.
     * @return {Texture} a texture of the graphics object
     */
    generate_texture(displayObject, scale_mode, resolution, region)
    {
        region = region || displayObject.get_local_bounds();

        const renderTexture = RenderTexture.create(region.width | 0, region.height | 0, scale_mode, resolution);

        tempMatrix.tx = -region.x;
        tempMatrix.ty = -region.y;

        this.render(displayObject, renderTexture, false, tempMatrix, true);

        return renderTexture;
    }

    /**
     * Removes everything from the renderer and optionally removes the Canvas DOM element.
     *
     * @param {boolean} [removeView=false] - Removes the Canvas element from the DOM.
     */
    destroy(removeView)
    {
        if (removeView && this.view.parentNode)
        {
            this.view.parentNode.removeChild(this.view);
        }

        this.type = RENDERER_TYPE.UNKNOWN;

        this.view = null;

        this.screen = null;

        this.resolution = 0;

        this.transparent = false;

        this.auto_resize = false;

        this.blend_modes = null;

        this.options = null;

        this.preserve_drawing_buffer = false;
        this.clear_before_render = false;

        this.pixel_snap = false;

        this._background_color = 0;
        this._background_colorRgba = null;
        this._background_colorString = null;

        this._tempNode2DParent = null;
        this._lastObjectRendered = null;
    }

    /**
     * The background color to fill if not transparent
     *
     * @type {number}
     */
    get background_color()
    {
        return this._background_color;
    }

    set background_color(value) // eslint-disable-line require-jsdoc
    {
        this._background_color = value;
        this._background_colorString = hex2string(value);
        hex2rgb(value, this._background_colorRgba);
    }
}
