import SystemRenderer from '../SystemRenderer';
import MaskManager from './managers/MaskManager';
import StencilManager from './managers/StencilManager';
import FilterManager from './managers/FilterManager';
import RenderTarget from './utils/RenderTarget';
import ObjectRenderer from './utils/ObjectRenderer';
import TextureManager from './TextureManager';
import BaseTexture from '../../textures/BaseTexture';
import TextureGarbageCollector from './TextureGarbageCollector';
import WebGLState from './WebGLState';
import mapWebGLDrawModesToPixi from './utils/mapWebGLDrawModesToPixi';
import validateContext from './utils/validateContext';
import { plugin_target } from '../../utils';
import glCore from 'pixi-gl-core';
import { RENDERER_TYPE } from '../../const';

let CONTEXT_UID = 0;

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
 * @property {boolean} [round_pixels=false] - If true PixiJS will Math.floor() x/y values when
 *     rendering, stopping pixel interpolation.
 * @property {boolean} [legacy=false] - If true PixiJS will aim to ensure compatibility
 *     with older / less advanced devices. If you experiance unexplained flickering try setting this to true.
 * @property {string} [powerPreference] - Parameter passed to webgl context, set to "high-performance"
 *     for devices with dual graphics card
 */

/**
 * The WebGLRenderer draws the scene and all its content onto a webGL enabled canvas. This renderer
 * should be used for browsers that support webGL. This Render works by automatically managing webGLBatchs.
 * So no need for Sprite Batches or Sprite Clouds.
 * Don't forget to add the view to your DOM or you will not see anything :)
 *
 * @class
 */
export default class WebGLRenderer extends SystemRenderer {
    /**
     * @param {RendererOption} [options] - The optional renderer parameters
     * @param {any} [arg2]
     * @param {any} [arg3]
     */
    constructor(options, arg2, arg3) {
        super('WebGL', options, arg2, arg3);

        this.legacy = this.options.legacy;

        if (this.legacy) {
            glCore.VertexArrayObject.FORCE_NATIVE = true;
        }

        /**
         * The type of this renderer as a standardised const
         *
         * @type {number}
         * @see RENDERER_TYPE
         */
        this.type = RENDERER_TYPE.WEBGL;

        this.handleContextLost = this.handleContextLost.bind(this);
        this.handleContextRestored = this.handleContextRestored.bind(this);

        this.view.addEventListener('webglcontextlost', this.handleContextLost, false);
        this.view.addEventListener('webglcontextrestored', this.handleContextRestored, false);

        /**
         * The options passed in to create a new webgl context.
         *
         * @type {object}
         * @private
         */
        this._contextOptions = {
            alpha: this.transparent,
            antialias: this.options.antialias,
            premultiplied_alpha: this.transparent && this.transparent !== 'notMultiplied',
            stencil: true,
            preserve_drawing_buffer: this.options.preserve_drawing_buffer,
            powerPreference: this.options.powerPreference,
        };

        this._background_colorRgba[3] = this.transparent ? 0 : 1;

        /**
         * Manages the masks using the stencil buffer.
         *
         * @type {MaskManager}
         */
        this.mask_manager = new MaskManager(this);

        /**
         * Manages the stencil buffer.
         *
         * @type {StencilManager}
         */
        this.stencilManager = new StencilManager(this);

        /**
         * An empty renderer.
         *
         * @type {ObjectRenderer}
         */
        this.empty_renderer = new ObjectRenderer(this);

        /**
         * The currently active ObjectRenderer.
         *
         * @type {ObjectRenderer}
         */
        this.current_renderer = this.empty_renderer;

        /**
         * Manages textures
         * @type {TextureManager}
         */
        this.texture_manager = null;

        /**
         * Manages the filters.
         *
         * @type {FilterManager}
         */
        this.filter_manager = null;

        this.init_plugins();

        /**
         * The current WebGL rendering context, it is created here
         *
         * @type {WebGLRenderingContext}
         */
        // initialize the context so it is ready for the managers.
        if (this.options.context) {
            // checks to see if a context is valid..
            validateContext(this.options.context);
        }

        this.gl = this.options.context || glCore.createContext(this.view, this._contextOptions);

        this.CONTEXT_UID = CONTEXT_UID++;

        /**
         * The currently active ObjectRenderer.
         *
         * @type {WebGLState}
         */
        this.state = new WebGLState(this.gl);

        this.rendering_to_screen = true;

        /**
         * Holds the current state of textures bound to the GPU.
         * @type {Array<Texture>}
         */
        this.bound_textures = null;

        /**
         * Holds the current shader
         *
         * @type {Shader}
         */
        this._activeShader = null;

        this._activeVao = null;

        /**
         * Holds the current render target
         *
         * @type {RenderTarget}
         */
        this._active_render_target = null;

        this._initContext();

        // map some webGL blend and drawmodes..
        this.draw_modes = mapWebGLDrawModesToPixi(this.gl);

        this._nextTextureLocation = 0;

        this.setBlendMode(0);

        /**
         * Fired after rendering finishes.
         *
         * @event WebGLRenderer#postrender
         */

        /**
         * Fired before rendering starts.
         *
         * @event WebGLRenderer#prerender
         */

        /**
         * Fired when the WebGL context is set.
         *
         * @event WebGLRenderer#context
         * @param {WebGLRenderingContext} gl - WebGL context.
         */
    }

    /**
     * Creates the WebGL context
     *
     * @private
     */
    _initContext() {
        const gl = this.gl;

        // restore a context if it was previously lost
        if (gl.isContextLost() && gl.getExtension('WEBGL_lose_context')) {
            gl.getExtension('WEBGL_lose_context').restoreContext();
        }

        const maxTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        this._activeShader = null;
        this._activeVao = null;

        this.bound_textures = new Array(maxTextures);
        this.emptyTextures = new Array(maxTextures);

        // create a texture manager...
        this.texture_manager = new TextureManager(this);
        this.filter_manager = new FilterManager(this);
        this.textureGC = new TextureGarbageCollector(this);

        this.state.resetToDefault();

        this.rootRenderTarget = new RenderTarget(gl, this.width, this.height, null, this.resolution, true);
        this.rootRenderTarget.clearColor = this._background_colorRgba;

        this.bindRenderTarget(this.rootRenderTarget);

        // now lets fill up the textures with empty ones!
        const emptyGLTexture = new glCore.GLTexture.fromData(gl, null, 1, 1);

        const tempObj = { _gl_textures: {} };

        tempObj._gl_textures[this.CONTEXT_UID] = {};

        for (let i = 0; i < maxTextures; i++) {
            const empty = new BaseTexture();

            empty._gl_textures[this.CONTEXT_UID] = emptyGLTexture;

            this.bound_textures[i] = tempObj;
            this.emptyTextures[i] = empty;
            this.bind_texture(null, i);
        }

        this.emit('context', gl);

        // setup the width/height properties and gl viewport
        this.resize(this.screen.width, this.screen.height);
    }

    /**
     * Renders the object to its webGL view
     *
     * @param {Node2D} node - the object to be rendered
     * @param {RenderTexture} render_texture - The render texture to render to.
     * @param {boolean} [clear] - Should the canvas be cleared before the new render
     * @param {Matrix} [transform] - A transform to apply to the render texture before rendering.
     * @param {boolean} [skip_updateTransform] - Should we skip the update transform pass?
     */
    render(node, render_texture, clear, transform, skip_updateTransform) {
        // can be handy to know!
        this.rendering_to_screen = !render_texture;

        this.emit('prerender');

        // no point rendering if our context has been blown up!
        if (!this.gl || this.gl.isContextLost()) {
            return;
        }

        this._nextTextureLocation = 0;

        if (!render_texture) {
            this._last_object_rendered = node;
        }

        if (!skip_updateTransform) {
            // update the scene graph
            const cache_parent = node.parent;

            node.parent = this._temp_node_2d_parent;
            node.update_transform();
            node.parent = cache_parent;
            // node.hit_area = //TODO add a temp hit area
        }

        this.bind_render_texture(render_texture, transform);

        this.current_renderer.start();

        if (clear !== undefined ? clear : this.clear_before_render) {
            this._active_render_target.clear();
        }

        node.render_webgl(this);

        // apply transform..
        this.current_renderer.flush();

        // this.set_object_renderer(this.emptyRenderer);

        this.textureGC.update();

        this.emit('postrender');
    }

    /**
     * Changes the current renderer to the one given in parameter
     *
     * @param {ObjectRenderer} object_renderer - The object renderer to use.
     */
    set_object_renderer(object_renderer) {
        if (this.current_renderer === object_renderer) {
            return;
        }

        this.current_renderer.stop();
        this.current_renderer = object_renderer;
        this.current_renderer.start();
    }

    /**
     * This should be called if you wish to do some custom rendering
     * It will basically render anything that may be batched up such as sprites
     *
     */
    flush() {
        this.set_object_renderer(this.empty_renderer);
    }

    /**
     * Resizes the webGL view to the specified width and height.
     *
     * @param {number} screenWidth - the new width of the screen
     * @param {number} screenHeight - the new height of the screen
     */
    resize(screenWidth, screenHeight) {
        //  if(width * this.resolution === this.width && height * this.resolution === this.height)return;

        SystemRenderer.prototype.resize.call(this, screenWidth, screenHeight);

        this.rootRenderTarget.resize(screenWidth, screenHeight);

        if (this._active_render_target === this.rootRenderTarget) {
            this.rootRenderTarget.activate();

            if (this._activeShader) {
                this._activeShader.uniforms.projectionMatrix = this.rootRenderTarget.projectionMatrix.to_array(true);
            }
        }
    }

    /**
     * Resizes the webGL view to the specified width and height.
     *
     * @param {number} blend_mode - the desired blend mode
     */
    setBlendMode(blend_mode) {
        this.state.setBlendMode(blend_mode);
    }

    /**
     * Erases the active render target and fills the drawing area with a colour
     *
     * @param {number} [clearColor] - The colour
     */
    clear(clearColor) {
        this._active_render_target.clear(clearColor);
    }

    /**
     * Sets the transform of the active render target to the given matrix
     *
     * @param {Matrix} matrix - The transformation matrix
     */
    set_transform(matrix) {
        this._active_render_target.transform = matrix;
    }

    /**
     * Erases the render texture and fills the drawing area with a colour
     *
     * @param {RenderTexture} render_texture - The render texture to clear
     * @param {number} [clearColor] - The colour
     * @return {WebGLRenderer} Returns itself.
     */
    clearRenderTexture(render_texture, clearColor) {
        const base_texture = render_texture.base_texture;
        const render_target = base_texture._gl_render_targets[this.CONTEXT_UID];

        if (render_target) {
            render_target.clear(clearColor);
        }

        return this;
    }

    /**
     * Binds a render texture for rendering
     *
     * @param {RenderTexture} render_texture - The render texture to render
     * @param {Transform} transform - The transform to be applied to the render texture
     * @return {WebGLRenderer} Returns itself.
     */
    bind_render_texture(render_texture, transform) {
        let render_target;

        if (render_texture) {
            const base_texture = render_texture.base_texture;

            if (!base_texture._gl_render_targets[this.CONTEXT_UID]) {
                // bind the current texture
                this.texture_manager.update_texture(base_texture, 0);
            }

            this.unbind_texture(base_texture);

            render_target = base_texture._gl_render_targets[this.CONTEXT_UID];
            render_target.setFrame(render_texture.frame);
        }
        else {
            render_target = this.rootRenderTarget;
        }

        render_target.transform = transform;
        this.bindRenderTarget(render_target);

        return this;
    }

    /**
     * Changes the current render target to the one given in parameter
     *
     * @param {RenderTarget} render_target - the new render target
     * @return {WebGLRenderer} Returns itself.
     */
    bindRenderTarget(render_target) {
        if (render_target !== this._active_render_target) {
            this._active_render_target = render_target;
            render_target.activate();

            if (this._activeShader) {
                this._activeShader.uniforms.projectionMatrix = render_target.projectionMatrix.to_array(true);
            }

            this.stencilManager.setMaskStack(render_target.stencilMaskStack);
        }

        return this;
    }

    /**
     * Changes the current shader to the one given in parameter
     *
     * @param {Shader} shader - the new shader
     * @param {boolean} [autoProject=true] - Whether automatically set the projection matrix
     * @return {WebGLRenderer} Returns itself.
     */
    bindShader(shader, autoProject) {
        // TODO cache
        if (this._activeShader !== shader) {
            this._activeShader = shader;
            shader.bind();

            // `autoProject` normally would be a default parameter set to true
            // but because of how Babel transpiles default parameters
            // it hinders the performance of this method.
            if (autoProject !== false) {
                // automatically set the projection matrix
                shader.uniforms.projectionMatrix = this._active_render_target.projectionMatrix.to_array(true);
            }
        }

        return this;
    }

    /**
     * Binds the texture. This will return the location of the bound texture.
     * It may not be the same as the one you pass in. This is due to optimisation that prevents
     * needless binding of textures. For example if the texture is already bound it will return the
     * current location of the texture instead of the one provided. To bypass this use force location
     *
     * @param {Texture} texture - the new texture
     * @param {number} location - the suggested texture location
     * @param {boolean} [forceLocation=false] - force the location
     * @return {number} bound texture location
     */
    bind_texture(texture, location, forceLocation = false) {
        texture = texture || this.emptyTextures[location];
        texture = texture.base_texture || texture;
        texture.touched = this.textureGC.count;

        if (!forceLocation) {
            // TODO - maybe look into adding boundIds.. save us the loop?
            for (let i = 0; i < this.bound_textures.length; i++) {
                if (this.bound_textures[i] === texture) {
                    return i;
                }
            }

            if (location === undefined) {
                this._nextTextureLocation++;
                this._nextTextureLocation %= this.bound_textures.length;
                location = this.bound_textures.length - this._nextTextureLocation - 1;
            }
        }
        else {
            location = location || 0;
        }

        const gl = this.gl;
        const gl_texture = texture._gl_textures[this.CONTEXT_UID];

        if (!gl_texture) {
            // this will also bind the texture..
            this.texture_manager.update_texture(texture, location);
        }
        else {
            // bind the current texture
            this.bound_textures[location] = texture;
            gl.activeTexture(gl.TEXTURE0 + location);
            gl.bindTexture(gl.TEXTURE_2D, gl_texture.texture);
        }

        return location;
    }

    /**
     * unbinds the texture ...
     *
     * @param {Texture} texture - the texture to unbind
     * @return {WebGLRenderer} Returns itself.
     */
    unbind_texture(texture) {
        const gl = this.gl;

        texture = texture.base_texture || texture;

        for (let i = 0; i < this.bound_textures.length; i++) {
            if (this.bound_textures[i] === texture) {
                this.bound_textures[i] = this.emptyTextures[i];

                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bind_texture(gl.TEXTURE_2D, this.emptyTextures[i]._gl_textures[this.CONTEXT_UID].texture);
            }
        }

        return this;
    }

    /**
     * Creates a new VAO from this renderer's context and state.
     *
     * @return {glCore.VertexArrayObject} The new VAO.
     */
    createVao() {
        return new glCore.VertexArrayObject(this.gl, this.state.attribState);
    }

    /**
     * Changes the current Vao to the one given in parameter
     *
     * @param {glCore.VertexArrayObject} vao - the new Vao
     * @return {WebGLRenderer} Returns itself.
     */
    bindVao(vao) {
        if (this._activeVao === vao) {
            return this;
        }

        if (vao) {
            vao.bind();
        }
        else if (this._activeVao) {
            // TODO this should always be true i think?
            this._activeVao.unbind();
        }

        this._activeVao = vao;

        return this;
    }

    /**
     * Resets the WebGL state so you can render things however you fancy!
     *
     * @return {WebGLRenderer} Returns itself.
     */
    reset() {
        this.set_object_renderer(this.empty_renderer);

        this.bindVao(null);
        this._activeShader = null;
        this._active_render_target = this.rootRenderTarget;

        for (let i = 0; i < this.bound_textures.length; i++) {
            this.bound_textures[i] = this.emptyTextures[i];
        }

        // bind the main frame buffer (the screen);
        this.rootRenderTarget.activate();

        this.state.resetToDefault();

        return this;
    }

    /**
     * Handles a lost webgl context
     *
     * @private
     * @param {WebGLContextEvent} event - The context lost event.
     */
    handleContextLost(event) {
        event.preventDefault();
    }

    /**
     * Handles a restored webgl context
     *
     * @private
     */
    handleContextRestored() {
        this.texture_manager.remove_all();
        this.filter_manager.destroy(true);
        this._initContext();
    }

    /**
     * Removes everything from the renderer (event listeners, spritebatch, etc...)
     *
     * @param {boolean} [removeView=false] - Removes the Canvas element from the DOM.
     *  See: https://github.com/pixijs/pixi.js/issues/2233
     */
    destroy(removeView) {
        this.destroyPlugins();

        // remove listeners
        this.view.removeEventListener('webglcontextlost', this.handleContextLost);
        this.view.removeEventListener('webglcontextrestored', this.handleContextRestored);

        this.texture_manager.destroy();

        // call base destroy
        super.destroy(removeView);

        this.uid = 0;

        // destroy the managers
        this.mask_manager.destroy();
        this.stencilManager.destroy();
        this.filter_manager.destroy();

        this.mask_manager = null;
        this.filter_manager = null;
        this.texture_manager = null;
        this.current_renderer = null;

        this.handleContextLost = null;
        this.handleContextRestored = null;

        this._contextOptions = null;
        this.gl.useProgram(null);

        if (this.gl.getExtension('WEBGL_lose_context')) {
            this.gl.getExtension('WEBGL_lose_context').loseContext();
        }

        this.gl = null;

        // this = null;
    }
}

/**
 * Collection of installed plugins. These are included by default in V, but can be excluded
 * by creating a custom build. Consult the README for more information about creating custom
 * builds and excluding plugins.
 * @name WebGLRenderer#plugins
 * @type {object}
 * @readonly
 * @property {accessibility.AccessibilityManager} accessibility Support tabbing interactive elements.
 * @property {extract.WebGLExtract} extract Extract image data from renderer.
 * @property {interaction.InteractionManager} interaction Handles mouse, touch and pointer events.
 * @property {prepare.WebGLPrepare} prepare Pre-render display objects.
 */

/**
 * Adds a plugin to the renderer.
 *
 * @method WebGLRenderer#register_plugin
 * @param {string} plugin_name - The name of the plugin.
 * @param {Function} ctor - The constructor function or class for the plugin.
 */

plugin_target.mixin(WebGLRenderer);
