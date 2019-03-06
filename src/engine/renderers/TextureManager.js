import { WRAP_MODES, SCALE_MODES } from 'engine/const';
import { remove_items } from 'engine/dep/index';
import GLTexture from 'engine/drivers/webgl/gl_texture';
import RenderTarget from './utils/RenderTarget';
import WebGLRenderer from './WebGLRenderer';
import BaseTexture from 'engine/scene/resources/textures/base_texture';
import Texture from 'engine/scene/resources/textures/texture';

/**
 * Helper class to create a webGL Texture
 */
export default class TextureManager {
    /**
     * @param {WebGLRenderer} renderer - A reference to the current renderer
     */
    constructor(renderer) {
        /**
         * A reference to the current renderer
         *
         * @type {WebGLRenderer}
         */
        this.renderer = renderer;

        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = renderer.gl;

        /**
         * Track textures in the renderer so we can no longer listen to them on destruction.
         *
         * @type {BaseTexture[]}
         */
        this._managed_textures = [];
    }

    /**
     * Binds a texture.
     */
    bind_texture() { }

    /**
     * Gets a texture.
     */
    get_texture() { }

    /**
     * Updates and/or Creates a WebGL texture for the renderer's context.
     *
     * @param {BaseTexture} texture - the texture to update
     * @param {number} location - the location the texture will be bound to.
     */
    update_texture(texture, location) {
        const gl = this.gl;

        const is_render_texture = !!texture._gl_render_targets;

        if (!texture.has_loaded) {
            return null;
        }

        const bound_textures = this.renderer.bound_textures;

        // if the location is undefined then this may have been called by n event.
        // this being the case the texture may already be bound to a slot. As a texture can only be bound once
        // we need to find its current location if it exists.
        if (location === undefined) {
            location = 0;

            // TODO maybe we can use texture bound ids later on...
            // check if texture is already bound..
            for (let i = 0; i < bound_textures.length; ++i) {
                if (bound_textures[i] === texture) {
                    location = i;
                    break;
                }
            }
        }

        bound_textures[location] = texture;

        gl.activeTexture(gl.TEXTURE0 + location);

        let gl_texture = texture._gl_textures[this.renderer.CONTEXT_UID];

        if (!gl_texture) {
            if (is_render_texture) {
                const render_target = new RenderTarget(
                    this.gl,
                    texture.width,
                    texture.height,
                    texture.scale_mode,
                    texture.resolution
                );

                render_target.resize(texture.width, texture.height);
                texture._gl_render_targets[this.renderer.CONTEXT_UID] = render_target;
                gl_texture = render_target.texture;

                // framebuffer constructor disactivates current framebuffer
                if (!this.renderer._active_render_target.root) {
                    this.renderer._active_render_target.frame_buffer.bind();
                }
            } else {
                gl_texture = new GLTexture(this.gl, null, null, null, null);
                gl_texture.bind(location);
                gl_texture.premultiply_alpha = true;
                gl_texture.upload(texture.source);
            }

            texture._gl_textures[this.renderer.CONTEXT_UID] = gl_texture;

            texture.connect('update', this.update_texture, this);
            texture.connect('dispose', this.destroy_texture, this);

            this._managed_textures.push(texture);

            if (texture.is_power_of_two) {
                if (texture.mipmap) {
                    gl_texture.enable_mipmap();
                }

                if (texture.wrap_mode === WRAP_MODES.CLAMP) {
                    gl_texture.enable_wrap_clamp();
                } else if (texture.wrap_mode === WRAP_MODES.REPEAT) {
                    gl_texture.enable_wrap_repeat();
                } else {
                    gl_texture.enable_wrap_mirror_repeat();
                }
            } else {
                gl_texture.enable_wrap_clamp();
            }

            if (texture.scale_mode === SCALE_MODES.NEAREST) {
                gl_texture.enable_nearest_scaling();
            } else {
                gl_texture.enable_linear_scaling();
            }
        } else if (is_render_texture) {
            // the texture already exists so we only need to update it..
            texture._gl_render_targets[this.renderer.CONTEXT_UID].resize(texture.width, texture.height);
        } else {
            gl_texture.upload(texture.source);
        }

        return gl_texture;
    }

    /**
     * Deletes the texture from WebGL
     *
     * @param {BaseTexture|Texture} texture_or_base_texture - the texture to destroy
     * @param {boolean} [skip_remove=false] - Whether to skip removing the texture from the TextureManager.
     */
    destroy_texture(texture_or_base_texture, skip_remove) {
        /** @type {BaseTexture} */
        let texture = null;
        if (texture_or_base_texture instanceof Texture) {
            texture = texture_or_base_texture.base_texture;
        } else {
            texture = texture_or_base_texture;
        }

        if (!texture.has_loaded) {
            return;
        }

        const uid = this.renderer.CONTEXT_UID;
        const gl_textures = texture._gl_textures;
        const gl_render_targets = texture._gl_render_targets;

        if (gl_textures[uid]) {
            this.renderer.unbind_texture(texture);

            gl_textures[uid].destroy();
            texture.disconnect('update', this.update_texture, this);
            texture.disconnect('dispose', this.destroy_texture, this);

            delete gl_textures[uid];

            if (!skip_remove) {
                const i = this._managed_textures.indexOf(texture);

                if (i !== -1) {
                    remove_items(this._managed_textures, i, 1);
                }
            }
        }

        if (gl_render_targets && gl_render_targets[uid]) {
            gl_render_targets[uid].destroy();
            delete gl_render_targets[uid];
        }
    }

    /**
     * Deletes all the textures from WebGL
     */
    remove_all() {
        // empty all the old gl textures as they are useless now
        for (let i = 0; i < this._managed_textures.length; ++i) {
            const texture = this._managed_textures[i];

            if (texture._gl_textures[this.renderer.CONTEXT_UID]) {
                delete texture._gl_textures[this.renderer.CONTEXT_UID];
            }
        }
    }

    /**
     * Destroys this manager and removes all its textures
     */
    destroy() {
        // destroy managed textures
        for (let i = 0; i < this._managed_textures.length; ++i) {
            const texture = this._managed_textures[i];

            this.destroy_texture(texture, true);

            texture.disconnect('update', this.update_texture, this);
            texture.disconnect('dispose', this.destroy_texture, this);
        }

        this._managed_textures = null;
    }
}
