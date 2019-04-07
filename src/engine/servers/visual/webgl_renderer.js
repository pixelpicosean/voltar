import { RENDERER_TYPE } from 'engine/const';

import VertexArrayObject from 'engine/drivers/webgl/vao';
import GLShader from 'engine/drivers/webgl/gl_shader';
import GLTexture from 'engine/drivers/webgl/gl_texture';
import create_context from 'engine/drivers/webgl/create_context';
import validate_context from './utils/validate_context';

import SystemRenderer from './system_renderer';
import ObjectRenderer from './utils/object_renderer';

import MaskManager from './managers/mask_manager';
import StencilManager from './managers/stencil_manager';
import FilterManager from './managers/filter_manager';
import TextureManager from './texture_manager';
import TextureGarbageCollector from './texture_garbage_collector';
import RenderTarget from './utils/render_target';
import WebGLState from './webgl_state';

import Texture from 'engine/scene/resources/textures/texture';
import BaseTexture from 'engine/scene/resources/textures/base_texture';
import RenderTexture from 'engine/scene/resources/textures/render_texture';

import map_webgl_draw_modes_to_voltar from './utils/map_webgl_draw_modes_to_voltar';
import { Matrix } from 'engine/core/math/index';

import { plugin_target } from 'engine/utils/index';

let CONTEXT_UID = 0;

/**
 * The WebGLRenderer draws the scene and all its content onto a webGL enabled canvas. This renderer
 * should be used for browsers that support webGL. This Render works by automatically managing webGLBatchs.
 * So no need for Sprite Batches or Sprite Clouds.
 * Don't forget to add the view to your DOM or you will not see anything :)
 */
export default class WebGLRenderer extends SystemRenderer {
    /**
     * @param {import('./system_renderer').RendererDesc} [options] - The optional renderer parameters
     */
    constructor(options) {
        super('WebGL', options);

        this.plugins = {};

        this.legacy = this.options.legacy;

        if (this.legacy) {
            VertexArrayObject.FORCE_NATIVE = true;
        }

        /**
         * The type of this renderer as a standardised const
         *
         * @type {number}
         */
        this.type = RENDERER_TYPE.WEBGL;

        this.handle_context_lost = this.handle_context_lost.bind(this);
        this.handle_context_restored = this.handle_context_restored.bind(this);

        this.view.addEventListener('webglcontextlost', this.handle_context_lost, false);
        this.view.addEventListener('webglcontextrestored', this.handle_context_restored, false);

        /**
         * The options passed in to create a new webgl context.
         *
         * @type {object}
         */
        this._context_options = {
            alpha: this.transparent,
            antialias: this.options.antialias,
            premultipliedAlpha: this.transparent,
            stencil: true,
            preserveDrawingBuffer: this.options.preserve_drawing_buffer,
            powerPreference: this.options.power_preference,
        };

        this._background_color_rgba[3] = this.transparent ? 0 : 1;

        /**
         * Manages the masks using the stencil buffer.
         */
        this.mask_manager = new MaskManager(this);

        /**
         * Manages the stencil buffer.
         */
        this.stencil_manager = new StencilManager(this);

        /**
         * An empty renderer.
         */
        this.empty_renderer = new ObjectRenderer(this);

        /**
         * The currently active ObjectRenderer.
         */
        this.current_renderer = this.empty_renderer;

        this.current_projection_matrix = new Matrix();

        /**
         * Manages textures
         *
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

        // initialize the context so it is ready for the managers.
        if (this.options.context) {
            // checks to see if a context is valid..
            validate_context(this.options.context);
        }

        /**
         * The current WebGL rendering context, it is created here
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = this.options.context || create_context(this.view, this._context_options);

        this.CONTEXT_UID = CONTEXT_UID++;

        /**
         * The currently active ObjectRenderer.
         */
        this.state = new WebGLState(this.gl);

        this.rendering_to_screen = true;

        /**
         * Holds the current state of textures bound to the GPU.
         * @type {BaseTexture[]}
         */
        this.bound_textures = null;
        /**
         * @type {BaseTexture[]}
         */
        this.empty_textures = null;

        /**
         * Holds the current shader
         *
         * @type {GLShader}
         */
        this._active_shader = null;

        /**
         * @type {VertexArrayObject}
         */
        this._active_vao = null;

        /**
         * Holds the current render target
         *
         * @type {RenderTarget}
         */
        this._active_render_target = null;

        this._init_context();

        // map some webGL blend and drawmodes..
        this.draw_modes = map_webgl_draw_modes_to_voltar(this.gl);

        this._next_texture_location = 0;

        this.set_blend_mode(0);
    }

    init_plugins() { }
    destroy_plugins() { }

    /**
     * Creates the WebGL context
     */
    _init_context() {
        const gl = this.gl;

        // restore a context if it was previously lost
        if (gl.isContextLost() && gl.getExtension('WEBGL_lose_context')) {
            gl.getExtension('WEBGL_lose_context').restoreContext();
        }

        const max_textures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

        this._active_shader = null;
        this._active_vao = null;

        this.bound_textures = new Array(max_textures);
        this.empty_textures = new Array(max_textures);

        // create a texture manager...
        this.texture_manager = new TextureManager(this);
        this.filter_manager = new FilterManager(this);
        this.texture_gc = new TextureGarbageCollector(this);

        this.state.reset_to_default();

        this.root_render_target = new RenderTarget(gl, this.width, this.height, null, this.resolution, true);
        this.root_render_target.clearColor = this._background_color_rgba;

        this.bind_render_target(this.root_render_target);

        // now lets fill up the textures with empty ones!
        const empty_gl_texture = GLTexture.from_data(gl, null, 1, 1);

        const temp_obj = { _gl_textures: {} };

        temp_obj._gl_textures[this.CONTEXT_UID] = {};

        for (let i = 0; i < max_textures; i++) {
            const empty = new BaseTexture();

            empty._gl_textures[this.CONTEXT_UID] = empty_gl_texture;

            // @ts-ignore
            this.bound_textures[i] = temp_obj;
            this.empty_textures[i] = empty;
            this.bind_texture(null, i);
        }

        this.emit_signal('context', gl);

        // setup the width/height properties and gl viewport
        this.resize(this.screen.width, this.screen.height);
    }

    /**
     * Renders the object to its webGL view
     *
     * @param {import('engine/index').Node2D} node - the object to be rendered
     * @param {import('engine/index').RenderTexture} render_texture - The render texture to render to.
     * @param {boolean} [clear] - Should the canvas be cleared before the new render
     * @param {Matrix} [transform] - A transform to apply to the render texture before rendering.
     * @param {boolean} [skip_update_transform] - Should we skip the update transform pass?
     */
    render(node, render_texture, clear, transform = Matrix.IDENTITY, skip_update_transform = false) {
        // can be handy to know!
        this.rendering_to_screen = !render_texture;

        this.emit_signal('prerender');

        // no point rendering if our context has been blown up!
        if (!this.gl || this.gl.isContextLost()) {
            return;
        }

        this._next_texture_location = 0;

        if (!render_texture) {
            this._last_object_rendered = node;
        }

        if (!skip_update_transform) {
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

        this.texture_gc.update();

        this.emit_signal('postrender');
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
        if (!object_renderer) {
            // TODO: print renderer missing warning for development
            return;
        }

        this.current_renderer.stop();
        this.current_renderer = object_renderer;
        this.current_renderer.start();
    }

    /**
     * This should be called if you wish to do some custom rendering
     * It will basically render anything that may be batched up such as sprites
     */
    flush() {
        this.set_object_renderer(this.empty_renderer);
    }

    /**
     * Resizes the webGL view to the specified width and height.
     *
     * @param {number} screen_width - the new width of the screen
     * @param {number} screen_height - the new height of the screen
     */
    resize(screen_width, screen_height) {
        super.resize(screen_width, screen_height);

        this.root_render_target.resize(screen_width, screen_height);

        if (this._active_render_target === this.root_render_target) {
            this.root_render_target.activate();

            if (this._active_shader) {
                this._active_shader.uniforms.projection_matrix = this.root_render_target.projection_matrix.to_array(true);
            }
        }
    }

    /**
     * Resizes the webGL view to the specified width and height.
     *
     * @param {number} blend_mode - the desired blend mode
     */
    set_blend_mode(blend_mode) {
        this.state.set_blend_mode(blend_mode);
    }

    /**
     * Erases the active render target and fills the drawing area with a colour
     *
     * @param {number[]} [clear_color] - The colour
     */
    clear(clear_color) {
        this._active_render_target.clear(clear_color);
    }

    /**
     * Sets the transform of the active render target to the given matrix
     *
     * @param {Matrix} matrix - The transformation matrix
     */
    set_projection_matrix(matrix) {
        this.current_projection_matrix.copy(matrix);

        this.root_render_target.calculate_projection(this.root_render_target.size);
        this.root_render_target.projection_matrix.append(matrix);

        if (this._active_shader) {
            this._active_shader.uniforms.projection_matrix = this.root_render_target.projection_matrix.to_array(true);
        }
    }

    /**
     * Erases the render texture and fills the drawing area with a colour
     *
     * @param {RenderTexture} render_texture - The render texture to clear
     * @param {number[]} [clear_color] - The colour
     */
    clear_render_texture(render_texture, clear_color) {
        const base_texture = render_texture.base_texture;
        const render_target = base_texture._gl_render_targets[this.CONTEXT_UID];

        if (render_target) {
            render_target.clear(clear_color);
        }

        return this;
    }

    /**
     * Binds a render texture for rendering
     *
     * @param {import('engine/index').RenderTexture} render_texture - The render texture to render
     * @param {Matrix} [transform] - The transform to be applied to the render texture
     */
    bind_render_texture(render_texture, transform = Matrix.IDENTITY) {
        /** @type {RenderTarget} */
        let render_target;

        if (render_texture) {
            const base_texture = render_texture.base_texture;

            if (!base_texture._gl_render_targets[this.CONTEXT_UID]) {
                // bind the current texture
                this.texture_manager.update_texture(base_texture, 0);
            }

            this.unbind_texture(base_texture);

            render_target = base_texture._gl_render_targets[this.CONTEXT_UID];
            render_target.set_frame(render_texture.frame);
        } else {
            render_target = this.root_render_target;
        }

        render_target.calculate_projection(render_target.frame || render_target.size);
        render_target.projection_matrix.append(transform);
        this.bind_render_target(render_target);

        return this;
    }

    /**
     * Changes the current render target to the one given in parameter
     *
     * @param {RenderTarget} render_target - the new render target
     */
    bind_render_target(render_target) {
        if (render_target !== this._active_render_target) {
            this._active_render_target = render_target;
            render_target.activate();

            if (this._active_shader) {
                this._active_shader.uniforms.projection_matrix = render_target.projection_matrix.to_array(true);
            }

            this.stencil_manager.set_mask_stack(render_target.stencil_mask_stack);
        }

        return this;
    }

    /**
     * Changes the current shader to the one given in parameter
     *
     * @param {GLShader} shader - the new shader
     * @param {boolean} [auto_project] - Whether automatically set the projection matrix
     */
    bind_shader(shader, auto_project = true) {
        // TODO cache
        if (this._active_shader !== shader) {
            this._active_shader = shader;
            shader.bind();

            if (auto_project) {
                // automatically set the projection matrix
                shader.uniforms.projection_matrix = this._active_render_target.projection_matrix.to_array(true);
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
     * @param {BaseTexture|Texture} [texture] - the new texture
     * @param {number} [location] - the suggested texture location
     * @param {boolean} [force_location=false] - force the location
     */
    bind_texture(texture, location, force_location = false) {
        texture = texture || this.empty_textures[location];

        const base_texture = /** @type {Texture} */(texture).base_texture || /** @type {BaseTexture} */(texture);
        base_texture.touched = this.texture_gc.count;

        if (!force_location) {
            // TODO: maybe look into adding bound_ids.. save us the loop?
            for (let i = 0; i < this.bound_textures.length; i++) {
                if (this.bound_textures[i] === base_texture) {
                    return i;
                }
            }

            if (location === undefined) {
                this._next_texture_location++;
                this._next_texture_location %= this.bound_textures.length;
                location = this.bound_textures.length - this._next_texture_location - 1;
            }
        } else {
            location = location || 0;
        }

        const gl = this.gl;
        const gl_texture = base_texture._gl_textures[this.CONTEXT_UID];

        if (!gl_texture) {
            // this will also bind the base_texture..
            this.texture_manager.update_texture(base_texture, location);
        } else {
            // bind the current base_texture
            this.bound_textures[location] = base_texture;
            gl.activeTexture(gl.TEXTURE0 + location);
            gl.bindTexture(gl.TEXTURE_2D, gl_texture.texture);
        }

        return location;
    }

    /**
     * unbinds the texture ...
     *
     * @param {BaseTexture|Texture} texture - the texture to unbind
     */
    unbind_texture(texture) {
        const gl = this.gl;

        const base_texture = /** @type {Texture} */(texture).base_texture || /** @type {BaseTexture} */(texture);

        for (let i = 0; i < this.bound_textures.length; i++) {
            if (this.bound_textures[i] === base_texture) {
                this.bound_textures[i] = this.empty_textures[i];

                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, this.empty_textures[i]._gl_textures[this.CONTEXT_UID].texture);
            }
        }

        return this;
    }

    /**
     * Creates a new VAO from this renderer's context and state.
     */
    create_vao() {
        return new VertexArrayObject(this.gl, this.state.attrib_state);
    }

    /**
     * Changes the current Vao to the one given in parameter
     *
     * @param {VertexArrayObject} vao - the new Vao
     */
    bind_vao(vao) {
        if (this._active_vao === vao) {
            return this;
        }

        if (vao) {
            vao.bind();
        } else if (this._active_vao) {
            // TODO: this should always be true i think?
            this._active_vao.unbind();
        }

        this._active_vao = vao;

        return this;
    }

    /**
     * Resets the WebGL state so you can render things however you fancy!
     */
    reset() {
        this.set_object_renderer(this.empty_renderer);

        this.bind_vao(null);
        this._active_shader = null;
        this._active_render_target = this.root_render_target;

        for (let i = 0; i < this.bound_textures.length; i++) {
            this.bound_textures[i] = this.empty_textures[i];
        }

        // bind the main frame buffer (the screen);
        this.root_render_target.activate();

        this.state.reset_to_default();

        return this;
    }

    /**
     * Handles a lost webgl context
     *
     * @param {WebGLContextEvent} event - The context lost event.
     */
    handle_context_lost(event) {
        event.preventDefault();
    }

    /**
     * Handles a restored webgl context
     */
    handle_context_restored() {
        this.texture_manager.remove_all();
        this.filter_manager.destroy(true);
        this._init_context();
    }

    /**
     * Removes everything from the renderer (event listeners, spritebatch, etc...)
     *
     * @param {boolean} [remove_view] - Removes the Canvas element from the DOM.
     */
    destroy(remove_view = false) {
        this.destroy_plugins();

        // remove listeners
        this.view.removeEventListener('webglcontextlost', this.handle_context_lost);
        this.view.removeEventListener('webglcontextrestored', this.handle_context_restored);

        this.texture_manager.destroy();

        // call base destroy
        super.destroy(remove_view);

        this.uid = 0;

        // destroy the managers
        this.mask_manager.destroy();
        this.stencil_manager.destroy();
        this.filter_manager.destroy();

        this.mask_manager = null;
        this.filter_manager = null;
        this.texture_manager = null;
        this.current_renderer = null;

        this.handle_context_lost = null;
        this.handle_context_restored = null;

        this._context_options = null;
        this.gl.useProgram(null);

        if (this.gl.getExtension('WEBGL_lose_context')) {
            this.gl.getExtension('WEBGL_lose_context').loseContext();
        }

        this.gl = null;
    }

    /**
     * @param {string} key
     * @param {any} plugin
     */
    static register_plugin(key, plugin) { }
}

plugin_target.mixin(WebGLRenderer);
