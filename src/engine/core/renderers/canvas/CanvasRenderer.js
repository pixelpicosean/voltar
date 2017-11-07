import SystemRenderer from '../SystemRenderer';
import CanvasMaskManager from './utils/CanvasMaskManager';
import CanvasRenderTarget from './utils/CanvasRenderTarget';
import mapCanvasBlendModesToPixi from './utils/mapCanvasBlendModesToPixi';
import { plugin_target } from '../../utils';
import { RENDERER_TYPE, SCALE_MODES, BLEND_MODES } from '../../const';
import settings from '../../settings';

/**
 * The CanvasRenderer draws the scene and all its content onto a 2d canvas. This renderer should
 * be used for browsers that do not support WebGL. Don't forget to add the CanvasRenderer.view to
 * your DOM or you will not see anything :)
 *
 * @class
 * @memberof V
 * @extends V.SystemRenderer
 */
export default class CanvasRenderer extends SystemRenderer
{
    // eslint-disable-next-line valid-jsdoc
    /**
     * @param {object} [options] - The optional renderer parameters
     * @param {number} [options.width=800] - the width of the screen
     * @param {number} [options.height=600] - the height of the screen
     * @param {HTMLCanvasElement} [options.view] - the canvas to use as a view, optional
     * @param {boolean} [options.transparent=false] - If the render view is transparent, default false
     * @param {boolean} [options.auto_resize=false] - If the render view is automatically resized, default false
     * @param {boolean} [options.antialias=false] - sets antialias (only applicable in chrome at the moment)
     * @param {number} [options.resolution=1] - The resolution / device pixel ratio of the renderer. The
     *  resolution of the renderer retina would be 2.
     * @param {boolean} [options.preserve_drawing_buffer=false] - enables drawing buffer preservation,
     *  enable this if you need to call toDataUrl on the webgl context.
     * @param {boolean} [options.clear_before_render=true] - This sets if the renderer will clear the canvas or
     *      not before the new render pass.
     * @param {number} [options.background_color=0x000000] - The background color of the rendered area
     *  (shown if not transparent).
     * @param {boolean} [options.pixel_snap=false] - If true Pixi will Math.floor() x/y values when rendering,
     *  stopping pixel interpolation.
     * @param {any} [arg2]
     * @param {any} [arg3]
     */
    constructor(options, arg2, arg3)
    {
        super('Canvas', options, arg2, arg3);

        this.type = RENDERER_TYPE.CANVAS;

        /**
         * The root canvas 2d context that everything is drawn with.
         *
         * @member {CanvasRenderingContext2D}
         */
        this.rootContext = this.view.getContext('2d', { alpha: this.transparent });

        /**
         * The currently active canvas 2d context (could change with renderTextures)
         *
         * @member {CanvasRenderingContext2D}
         */
        this.context = this.rootContext;

        /**
         * Boolean flag controlling canvas refresh.
         *
         * @member {boolean}
         */
        this.refresh = true;

        /**
         * Instance of a CanvasMaskManager, handles masking when using the canvas renderer.
         *
         * @member {V.CanvasMaskManager}
         */
        this.maskManager = new CanvasMaskManager(this);

        /**
         * The canvas property used to set the canvas smoothing property.
         *
         * @member {string}
         */
        this.smoothProperty = 'imageSmoothingEnabled';

        if (!this.rootContext.imageSmoothingEnabled)
        {
            if (this.rootContext.webkitImageSmoothingEnabled)
            {
                this.smoothProperty = 'webkitImageSmoothingEnabled';
            }
            else if (this.rootContext.mozImageSmoothingEnabled)
            {
                this.smoothProperty = 'mozImageSmoothingEnabled';
            }
            else if (this.rootContext.oImageSmoothingEnabled)
            {
                this.smoothProperty = 'oImageSmoothingEnabled';
            }
            else if (this.rootContext.msImageSmoothingEnabled)
            {
                this.smoothProperty = 'msImageSmoothingEnabled';
            }
        }

        this.initPlugins();

        this.blend_modes = mapCanvasBlendModesToPixi();
        this._activeBlendMode = null;

        this.renderingToScreen = false;

        this.resize(this.options.width, this.options.height);

        /**
         * Fired after rendering finishes.
         *
         * @event V.CanvasRenderer#postrender
         */

        /**
         * Fired before rendering starts.
         *
         * @event V.CanvasRenderer#prerender
         */
    }

    /**
     * Renders the object to this canvas view
     *
     * @param {V.Node2D} displayObject - The object to be rendered
     * @param {V.RenderTexture} [renderTexture] - A render texture to be rendered to.
     *  If unset, it will render to the root context.
     * @param {boolean} [clear=false] - Whether to clear the canvas before drawing
     * @param {V.Transform} [transform] - A transformation to be applied
     * @param {boolean} [skipUpdateTransform=false] - Whether to skip the update transform
     */
    render(displayObject, renderTexture, clear, transform, skipUpdateTransform)
    {
        if (!this.view)
        {
            return;
        }

        // can be handy to know!
        this.renderingToScreen = !renderTexture;

        this.emit('prerender');

        const rootResolution = this.resolution;

        if (renderTexture)
        {
            renderTexture = renderTexture.base_texture || renderTexture;

            if (!renderTexture._canvasRenderTarget)
            {
                renderTexture._canvasRenderTarget = new CanvasRenderTarget(
                    renderTexture.width,
                    renderTexture.height,
                    renderTexture.resolution
                );
                renderTexture.source = renderTexture._canvasRenderTarget.canvas;
                renderTexture.valid = true;
            }

            this.context = renderTexture._canvasRenderTarget.context;
            this.resolution = renderTexture._canvasRenderTarget.resolution;
        }
        else
        {
            this.context = this.rootContext;
        }

        const context = this.context;

        if (!renderTexture)
        {
            this._lastObjectRendered = displayObject;
        }

        if (!skipUpdateTransform)
        {
            // update the scene graph
            const cacheParent = displayObject.parent;
            const tempWt = this._tempNode2DParent.transform.world_transform;

            if (transform)
            {
                transform.copy(tempWt);

                // lets not forget to flag the parent transform as dirty...
                this._tempNode2DParent.transform._worldID = -1;
            }
            else
            {
                tempWt.identity();
            }

            displayObject.parent = this._tempNode2DParent;

            displayObject.update_transform();
            displayObject.parent = cacheParent;
            // displayObject.hit_area = //TODO add a temp hit area
        }

        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        this._activeBlendMode = BLEND_MODES.NORMAL;
        context.globalCompositeOperation = this.blend_modes[BLEND_MODES.NORMAL];

        if (navigator.isCocoonJS && this.view.screencanvas)
        {
            context.fillStyle = 'black';
            context.clear();
        }

        if (clear !== undefined ? clear : this.clear_before_render)
        {
            if (this.renderingToScreen)
            {
                if (this.transparent)
                {
                    context.clearRect(0, 0, this.width, this.height);
                }
                else
                {
                    context.fillStyle = this._background_colorString;
                    context.fillRect(0, 0, this.width, this.height);
                }
            } // else {
            // TODO: implement background for CanvasRenderTarget or RenderTexture?
            // }
        }

        // TODO RENDER TARGET STUFF HERE..
        const tempContext = this.context;

        this.context = context;
        displayObject.render_canvas(this);
        this.context = tempContext;

        context.restore();

        this.resolution = rootResolution;

        this.emit('postrender');
    }

    /**
     * Clear the canvas of renderer.
     *
     * @param {string} [clearColor] - Clear the canvas with this color, except the canvas is transparent.
     */
    clear(clearColor)
    {
        const context = this.context;

        clearColor = clearColor || this._background_colorString;

        if (!this.transparent && clearColor)
        {
            context.fillStyle = clearColor;
            context.fillRect(0, 0, this.width, this.height);
        }
        else
        {
            context.clearRect(0, 0, this.width, this.height);
        }
    }

    /**
     * Sets the blend mode of the renderer.
     *
     * @param {number} blend_mode - See {@link V.BLEND_MODES} for valid values.
     */
    setBlendMode(blend_mode)
    {
        if (this._activeBlendMode === blend_mode)
        {
            return;
        }

        this._activeBlendMode = blend_mode;
        this.context.globalCompositeOperation = this.blend_modes[blend_mode];
    }

    /**
     * Removes everything from the renderer and optionally removes the Canvas DOM element.
     *
     * @param {boolean} [removeView=false] - Removes the Canvas element from the DOM.
     */
    destroy(removeView)
    {
        this.destroyPlugins();

        // call the base destroy
        super.destroy(removeView);

        this.context = null;

        this.refresh = true;

        this.maskManager.destroy();
        this.maskManager = null;

        this.smoothProperty = null;
    }

    /**
     * Resizes the canvas view to the specified width and height.
     *
     * @extends V.SystemRenderer#resize
     *
     * @param {number} screenWidth - the new width of the screen
     * @param {number} screenHeight - the new height of the screen
     */
    resize(screenWidth, screenHeight)
    {
        super.resize(screenWidth, screenHeight);

        // reset the scale mode.. oddly this seems to be reset when the canvas is resized.
        // surely a browser bug?? Let pixi fix that for you..
        if (this.smoothProperty)
        {
            this.rootContext[this.smoothProperty] = (settings.SCALE_MODE === SCALE_MODES.LINEAR);
        }
    }

    /**
     * Checks if blend mode has changed.
     */
    invalidate_blend_mode()
    {
        this._activeBlendMode = this.blend_modes.indexOf(this.context.globalCompositeOperation);
    }
}

/**
 * Collection of installed plugins. These are included by default in V, but can be excluded
 * by creating a custom build. Consult the README for more information about creating custom
 * builds and excluding plugins.
 * @name V.CanvasRenderer#plugins
 * @type {object}
 * @readonly
 * @property {V.accessibility.AccessibilityManager} accessibility Support tabbing interactive elements.
 * @property {V.extract.CanvasExtract} extract Extract image data from renderer.
 * @property {V.interaction.InteractionManager} interaction Handles mouse, touch and pointer events.
 * @property {V.prepare.CanvasPrepare} prepare Pre-render display objects.
 */

/**
 * Adds a plugin to the renderer.
 *
 * @method V.CanvasRenderer#registerPlugin
 * @param {string} plugin_name - The name of the plugin.
 * @param {Function} ctor - The constructor function or class for the plugin.
 */

plugin_target.mixin(CanvasRenderer);
