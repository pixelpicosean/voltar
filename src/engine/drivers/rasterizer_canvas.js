import { Vector2 } from 'engine/core/math/vector2';
import { Rect2 } from 'engine/core/math/rect2';
import { Transform2D } from 'engine/core/math/transform_2d';
import { Color } from 'engine/core/color';
import {
    OS,
    VIDEO_DRIVER_GLES2_LEGACY,
    VIDEO_DRIVER_GLES2,
    VIDEO_DRIVER_GLES3,
} from 'engine/core/os/os';

import MaskSystem from './mask/MaskSystem';
import StencilSystem from './mask/StencilSystem';
import FilterSystem from './filters/FilterSystem';
import FramebufferSystem from './framebuffer/FramebufferSystem';
import RenderTextureSystem from './renderTexture/RenderTextureSystem';
import TextureSystem from './textures/TextureSystem';
import ProjectionSystem from './projection/ProjectionSystem';
import StateSystem from './state/StateSystem';
import GeometrySystem from './geometry/GeometrySystem';
import ShaderSystem from './shader/ShaderSystem';
import UniformGroup from './shader/UniformGroup';
import BatchSystem from './batch/BatchSystem';
import TextureGCSystem from './textures/TextureGCSystem';
import { Runner } from './runner';
import { VSG } from 'engine/servers/visual/visual_server_globals';
import { VObject } from 'engine/core/v_object';
import { RENDER_TARGET_TRANSPARENT, RENDER_TARGET_DIRECT_TO_SCREEN } from './constants';
import { Item } from 'engine/servers/visual/visual_server_canvas';
import { TYPE_RECT } from 'engine/servers/visual/commands';


export class RasterizerCanvas extends VObject {
    constructor() {
        super();

        /** @type {import('./rasterizer_scene').RasterizerScene} */
        this.scene_render = null;

        /** @type {import('./rasterizer_storage').RasterizerStorage} */
        this.storage = null;

        this.states = {
            canvas_shader: null,
            canvas_shadow_shader: null,

            using_texture_rect: false,
            using_ninepatch: false,
            using_skeleton: false,

            skeleton_transform: new Transform2D(),
            skeleton_transform_inverse: new Transform2D(),
            skeleton_texture_size: new Vector2(),

            current_tex: null,
            current_normal: null,

            vp: null,
            using_shadow: false,
            using_transparent_rt: false,
        }

        // private

        this.gl = OS.get_singleton().gl;
        this.extensions = {};
        this.screen = new Rect2(0, 0, 800, 600);
        this.transparent = false;
        this.resolution = 1;

        this.CONTEXT_UID = 0;

        this.runners = {
            destroy: new Runner('destroy'),
            contextChange: new Runner('contextChange'),
            reset: new Runner('reset'),
            update: new Runner('update'),
            postrender: new Runner('postrender'),
            prerender: new Runner('prerender'),
            resize: new Runner('resize'),
        };

        /**
         * Global uniforms
         * @type {UniformGroup}
         */
        this.globalUniforms = new UniformGroup({
            projectionMatrix: new Transform2D(),
        }, true);

        this.mask = this.addSystem(new MaskSystem(this));
        this.state = this.addSystem(new StateSystem(this));
        this.shader = this.addSystem(new ShaderSystem(this));
        this.texture = this.addSystem(new TextureSystem(this));
        this.geometry = this.addSystem(new GeometrySystem(this));
        this.framebuffer = this.addSystem(new FramebufferSystem(this));
        this.stencil = this.addSystem(new StencilSystem(this));
        this.projection = this.addSystem(new ProjectionSystem(this));
        this.textureGC = this.addSystem(new TextureGCSystem(this));
        this.filter = this.addSystem(new FilterSystem(this));
        this.renderTexture = this.addSystem(new RenderTextureSystem(this));
        this.batch = this.addSystem(new BatchSystem(this));

        /**
         * Flag if we are rendering to the screen vs renderTexture
         * @type {boolean}
         * @readonly
         * @default true
         */
        this.renderingToScreen = true;

        this._backgroundColorRgba = [0,0,0,0];
        this._activeRenderTarget = null;
    }

    /* API */

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl) {
        this.context_change(gl);
    }
    /**
     * @param {WebGLRenderingContext} gl
     */
    context_change(gl) {
        this.gl = gl;

        this.get_extensions();

        this.runners.contextChange.run(this.gl);

        const size = OS.get_singleton().get_window_size();
        this.resize(size.width, size.height);
    }
    get_extensions() {
        const gl = this.gl;

        if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2 || OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES2_LEGACY) {
            Object.assign(this.extensions, {
                drawBuffers: gl.getExtension('WEBGL_draw_buffers'),
                depthTexture: gl.getExtension('WEBKIT_WEBGL_depth_texture'),
                loseContext: gl.getExtension('WEBGL_lose_context'),
                vertexArrayObject: gl.getExtension('OES_vertex_array_object')
                    || gl.getExtension('MOZ_OES_vertex_array_object')
                    || gl.getExtension('WEBKIT_OES_vertex_array_object'),
                anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
                uint32ElementIndex: gl.getExtension('OES_element_index_uint'),
                // Floats and half-floats
                floatTexture: gl.getExtension('OES_texture_float'),
                floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
                textureHalfFloat: gl.getExtension('OES_texture_half_float'),
                textureHalfFloatLinear: gl.getExtension('OES_texture_half_float_linear'),
            });
        } else if (OS.get_singleton().video_driver_index === VIDEO_DRIVER_GLES3) {
            Object.assign(this.extensions, {
                anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic'),
                // Floats and half-floats
                colorBufferFloat: gl.getExtension('EXT_color_buffer_float'),
                floatTextureLinear: gl.getExtension('OES_texture_float_linear'),
            });
        }
    }

    draw_window_margins(black_margin, black_image) { }

    update() { }

    canvas_begin() {
        const gl = this.gl;
        // TODO: bind canvas shader

        this.runners.prerender.run();
        this.emit_signal('prerender');

        const frame = this.storage.frame;
        let viewport_x = 0, viewport_y = 0, viewport_width = 0, viewport_height = 0;

        if (frame.current_rt) {
            this.renderTexture.bind(frame.current_rt.texture);
            this.states.using_transparent_rt = frame.current_rt.flags[RENDER_TARGET_TRANSPARENT];

            if (frame.current_rt.flags[RENDER_TARGET_DIRECT_TO_SCREEN]) {
                this.renderingToScreen = true;

                viewport_width = frame.current_rt.width;
                viewport_height = frame.current_rt.height;
                viewport_x = frame.current_rt.x;
                viewport_y = OS.get_singleton().window_size.height - viewport_height - frame.current_rt.y;
                // gl.scissor(viewport_x, viewport_y, viewport_width, viewport_height);
                // gl.viewport(viewport_x, viewport_y, viewport_width, viewport_height);
                // gl.enable(gl.SCISSOR_TEST);
            } else {
                this.renderingToScreen = false;
            }
        }

        // FIXME: should we bind empty render target here?
        this.renderTexture.bind(null);

        this.reset_canvas();

        this.projection.transform = null;

        this.batch.currentRenderer.start();

        if (frame.clear_request) {
            this._backgroundColorRgba[0] = frame.clear_request_color.r;
            this._backgroundColorRgba[1] = frame.clear_request_color.g;
            this._backgroundColorRgba[2] = frame.clear_request_color.b;
            this._backgroundColorRgba[3] = this.states.using_transparent_rt ? frame.clear_request_color.a : 1.0;
            this.renderTexture.clear(this._backgroundColorRgba);
            frame.clear_request = false;
        }
    }

    canvas_end() {
        const frame = this.storage.frame;
        this.batch.currentRenderer.flush();

        if (frame.current_rt && frame.current_rt.texture) {
            frame.current_rt.texture.baseTexture.update();
        }

        this.runners.postrender.run();

        this.projection.transform = null;

        this.emit_signal('postrender');

        // TODO: reset viewport to full window size while drawing to screen?

        this.states.using_texture_rect = false;
        this.states.using_skeleton = false;
        this.states.using_ninepatch = false;
        this.states.using_transparent_rt = false;
    }

    reset_canvas() {
        // const gl = this.gl;
        // gl.disable(gl.DEPTH_TEST);
    }

    /**
     * @param {import('engine/servers/visual/visual_server_canvas').Item} p_item_list
     * @param {number} p_z
     * @param {Color} p_modulate
     * @param {any} p_light
     * @param {Transform2D} p_base_transform
     */
    canvas_render_items(p_item_list, p_z, p_modulate, p_light, p_base_transform) {
        while (p_item_list) {
            this._canvas_item_render_commands(p_item_list);
            p_item_list = /** @type {Item} */(p_item_list.next);
        }
    }

    /* private */

    /**
     * @param {Item} p_item
     */
    _canvas_item_render_commands(p_item) {
        for (let c of p_item.commands) {
            switch (c.type) {
                case TYPE_RECT: {
                    c.calculate_vertices(p_item.final_transform);
                    this.batch.currentRenderer.render(c);
                } break;
            }
        }
    }

    /**
     * @template T
     * @param {T} system
     */
    addSystem(system) {
        for (const i in this.runners) {
            this.runners[i].add(system);
        }
        return system;
    }

    /**
     * Resizes the WebGL view to the specified width and height.
     *
     * @param {number} screenWidth - The new width of the screen.
     * @param {number} screenHeight - The new height of the screen.
     */
    resize(screenWidth, screenHeight) {
        this.runners.resize.run(screenWidth, screenHeight);
    }

    /**
     * Resets the WebGL state so you can render things however you fancy!
     */
    reset() {
        this.runners.reset.run();

        return this;
    }

    /**
     * Clear the frame buffer
     */
    clear() {
        this.framebuffer.bind();
        this.framebuffer.clear(0, 0, 0, 0);
    }

    /**
     * Removes everything from the renderer (event listeners, spritebatch, etc...)
     */
    free() {
        if (this.extensions.loseContext) {
            this.extensions.loseContext.loseContext();
        }

        this.runners.destroy.run();
        for (const r in this.runners) {
            this.runners[r].destroy();
        }
        this.gl = null;

        return super.free();
    }
}
