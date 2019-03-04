import settings from '../settings';
import { RENDERER_TYPE } from '../const';

import { say_hello, hex2string, hex2rgb } from '../utils/index';
import { Matrix, Rectangle } from '../math/index';
import { VObject } from 'engine/dep/index';
import Node2D from '../scene/Node2D';
import RenderTexture from '../textures/RenderTexture';

const temp_matrix = new Matrix();

/**
 * @typedef RendererDesc
 * @property {number} [width] - the width of the screen
 * @property {number} [height] - the height of the screen
 * @property {HTMLCanvasElement} [view] - the canvas to use as a view, optional
 * @property {boolean} [transparent] - If the render view is transparent, default false
 * @property {boolean} [auto_resize] - If the render view is automatically resized, default false
 * @property {boolean} [antialias] - sets antialias (only applicable in chrome at the moment)
 * @property {number} [resolution] - The resolution / device pixel ratio of the renderer. The
 *     resolution of the renderer retina would be 2.
 * @property {boolean} [preserve_drawing_buffer] - enables drawing buffer preservation,
 *     enable this if you need to call toDataUrl on the webgl context.
 * @property {boolean} [clear_before_render] - This sets if the renderer will clear the canvas or not before the new render pass.
 * @property {number} [background_color] - The background color of the rendered area (shown if not transparent).
 * @property {boolean} [pixel_snap] - Round x/y values when rendering, stopping pixel interpolation.
 * @property {boolean} [legacy] - If true PixiJS will aim to ensure compatibility
 *     with older / less advanced devices. If you experiance unexplained flickering try setting this to true.
 * @property {string} [power_preference] - Parameter passed to webgl context, set to "high-performance"
 *     for devices with dual graphics card
 * @property {WebGLRenderingContext} [context]
 */

/**
 * The SystemRenderer is the base for a Renderer. It is extended by the
 * `WebGLRenderer` which can be used for rendering a scene.
 */
export default class SystemRenderer extends VObject {
    /**
     * @param {string} system - The name of the system this renderer is for.
     * @param {RendererDesc} [desc] - The optional renderer parameters
     */
    constructor(system, desc) {
        super();

        this.system = system;

        say_hello();

        /**
         * The supplied constructor options.
         *
         * @type {RendererDesc}
         */
        this.options = Object.assign({}, settings.RENDER_OPTIONS, desc);

        /**
         * The type of the renderer.
         *
         * @type {number}
         */
        this.type = RENDERER_TYPE.UNKNOWN;

        /**
         * Measurements of the screen. (0, 0, screenWidth, screenHeight)
         *
         * Its safe to use as filter_area or hit_area for whole stage
         *
         * @type {Rectangle}
         */
        this.screen = new Rectangle(0, 0, desc.width, desc.height);

        /**
         * The canvas element that everything is drawn to
         *
         * @type {HTMLCanvasElement}
         */
        this.view = desc.view || document.createElement('canvas');

        /**
         * The resolution / device pixel ratio of the renderer
         *
         * @type {number}
         */
        this.resolution = desc.resolution || settings.RESOLUTION;

        /**
         * Whether the render view is transparent
         *
         * @type {boolean}
         */
        this.transparent = desc.transparent;

        /**
         * Whether css dimensions of canvas view should be resized to screen dimensions automatically
         *
         * @type {boolean}
         */
        this.auto_resize = desc.auto_resize || false;

        /**
         * Tracks the blend modes useful for this renderer.
         *
         * @type {any}
         */
        this.blend_modes = null;

        /**
         * The value of the preserve_drawing_buffer flag affects whether or not the contents of
         * the stencil buffer is retained after rendering.
         *
         * @type {boolean}
         */
        this.preserve_drawing_buffer = desc.preserve_drawing_buffer;

        /**
         * This sets if the CanvasRenderer will clear the canvas or not before the new render pass.
         * If the scene is NOT transparent Pixi will use a canvas sized fillRect operation every
         * frame to set the canvas background color. If the scene is transparent Pixi will use clearRect
         * to clear the canvas every frame. Disable this by setting this to false. For example if
         * your game has a canvas filling background image you often don't need this set.
         *
         * @type {boolean}
         */
        this.clear_before_render = desc.clear_before_render;

        /**
         * Whether round x/y values when rendering, stopping pixel interpolation.
         * Handy for crisp pixel art and speed on legacy devices.
         *
         * @type {boolean}
         */
        this.pixel_snap = desc.pixel_snap;

        /**
         * The background color as a number.
         *
         * @type {number}
         */
        this._background_color = 0x000000;

        /**
         * The background color as an [R, G, B] array.
         *
         * @type {number[]}
         */
        this._background_color_rgba = [0, 0, 0, 0];

        /**
         * The background color as a string.
         *
         * @type {string}
         */
        this._background_color_string = '#000000';

        this.background_color = desc.background_color || this._background_color; // run bg color setter

        /**
         * This temporary display object used as the parent of the currently being rendered item
         *
         * @type {Node2D}
         */
        this._temp_node_2d_parent = new Node2D();

        /**
         * The last root object that the renderer tried to render.
         *
         * @type {Node2D}
         */
        this._last_object_rendered = this._temp_node_2d_parent;
    }

    /**
     * Same as view.width, actual number of pixels in the canvas by horizontal
     *
     * @type {number}
     */
    get width() {
        return this.view.width;
    }

    /**
     * Same as view.height, actual number of pixels in the canvas by vertical
     *
     * @type {number}
     */
    get height() {
        return this.view.height;
    }

    /**
     * Resizes the screen and canvas to the specified width and height
     * Canvas dimensions are multiplied by resolution
     *
     * @param {number} screen_width - the new width of the screen
     * @param {number} screen_height - the new height of the screen
     */
    resize(screen_width, screen_height) {
        this.screen.width = screen_width;
        this.screen.height = screen_height;

        this.view.width = screen_width * this.resolution;
        this.view.height = screen_height * this.resolution;

        if (this.auto_resize) {
            this.view.style.width = `${screen_width}px`;
            this.view.style.height = `${screen_height}px`;
        }
    }

    /**
     * @param {Node2D} obj
     * @param {RenderTexture} tex
     * @param {boolean} clear
     * @param {Matrix} transform
     * @param {boolean} skip_transform_update
     */
    render(obj, tex, clear, transform, skip_transform_update) { }

    /**
     * Useful function that returns a texture of the display object that can then be used to create sprites
     * This can be quite useful if your node is complicated and needs to be reused multiple times.
     *
     * @param {Node2D} node - The node the object will be generated from
     * @param {number} [scale_mode] - Should be one of the scale_mode consts
     * @param {number} [resolution] - The resolution / device pixel ratio of the texture being generated
     * @param {Rectangle} [region] - The region of the node, that shall be rendered,
     *        if no region is specified, defaults to the local bounds of the node.
     */
    generate_texture(node, scale_mode, resolution, region) {
        region = region || node.get_local_bounds();

        const render_texture = RenderTexture.create(region.width | 0, region.height | 0, scale_mode, resolution);

        temp_matrix.tx = -region.x;
        temp_matrix.ty = -region.y;

        this.render(node, render_texture, false, temp_matrix, !!node.parent);

        return render_texture;
    }

    /**
     * Removes everything from the renderer and optionally removes the Canvas DOM element.
     *
     * @param {boolean} [remove_view] - Removes the Canvas element from the DOM.
     */
    destroy(remove_view) {
        if (remove_view && this.view.parentNode) {
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
        this._background_color_rgba = null;
        this._background_color_string = null;

        this._temp_node_2d_parent = null;
        this._last_object_rendered = null;
    }

    /**
     * The background color to fill if not transparent
     *
     * @type {number}
     */
    get background_color() {
        return this._background_color;
    }
    set background_color(value) {
        this._background_color = value;
        this._background_color_string = hex2string(value);
        hex2rgb(value, this._background_color_rgba);
    }
}
