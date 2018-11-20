import { WRAP_MODES, SCALE_MODES } from 'engine/const';
import { GL, remove_items } from 'engine/dep/index';
const { GLTexture } = GL;
import RenderTarget from './utils/RenderTarget';
import WebGLRenderer from './WebGLRenderer';
import BaseTexture from 'engine/textures/BaseTexture';
import Texture from 'engine/textures/Texture';

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
         * @member {WebGLRenderer}
         */
        this.renderer = renderer;

        /**
         * The current WebGL rendering context
         *
         * @member {WebGLRenderingContext}
         */
        this.gl = renderer.gl;

        /**
         * Track textures in the renderer so we can no longer listen to them on destruction.
         *
         * @member {Array<*>}
         * @private
         */
        this._managed_textures = [];
    }

    /**
     * Binds a texture.
     *
     */
    bind_texture() {
        // empty
    }

    /**
     * Gets a texture.
     *
     */
    get_texture() {
        // empty
    }

    /**
     * Updates and/or Creates a WebGL texture for the renderer's context.
     *
     * @param {BaseTexture|Texture} texture - the texture to update
     * @param {number} location - the location the texture will be bound to.
     * @return {GLTexture} The gl texture.
     */
    update_texture(texture, location) {
        // assume it good!
        // texture = texture.base_texture || texture;

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

        let glTexture = texture._gl_textures[this.renderer.CONTEXT_UID];

        if (!glTexture) {
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
                glTexture = render_target.texture;

                // framebuffer constructor disactivates current framebuffer
                if (!this.renderer._active_render_target.root) {
                    this.renderer._active_render_target.frame_buffer.bind();
                }
            }
            else {
                glTexture = new GLTexture(this.gl, null, null, null, null);
                glTexture.bind(location);
                glTexture.premultiplyAlpha = true;
                glTexture.upload(texture.source);
            }

            texture._gl_textures[this.renderer.CONTEXT_UID] = glTexture;

            texture.connect('update', this.update_texture, this);
            texture.connect('dispose', this.destroy_texture, this);

            this._managed_textures.push(texture);

            if (texture.is_power_of_two) {
                if (texture.mipmap) {
                    glTexture.enableMipmap();
                }

                if (texture.wrap_mode === WRAP_MODES.CLAMP) {
                    glTexture.enableWrapClamp();
                }
                else if (texture.wrap_mode === WRAP_MODES.REPEAT) {
                    glTexture.enableWrapRepeat();
                }
                else {
                    glTexture.enableWrapMirrorRepeat();
                }
            }
            else {
                glTexture.enableWrapClamp();
            }

            if (texture.scale_mode === SCALE_MODES.NEAREST) {
                glTexture.enableNearestScaling();
            }
            else {
                glTexture.enableLinearScaling();
            }
        }
        // the texture already exists so we only need to update it..
        else if (is_render_texture) {
            texture._gl_render_targets[this.renderer.CONTEXT_UID].resize(texture.width, texture.height);
        }
        else {
            glTexture.upload(texture.source);
        }

        return glTexture;
    }

    /**
     * Deletes the texture from WebGL
     *
     * @param {BaseTexture|Texture} texture - the texture to destroy
     * @param {boolean} [skip_remove=false] - Whether to skip removing the texture from the TextureManager.
     */
    destroy_texture(texture, skip_remove) {
        texture = texture.base_texture || texture;

        if (!texture.has_loaded) {
            return;
        }

        const uid = this.renderer.CONTEXT_UID;
        const glTextures = texture._gl_textures;
        const glRenderTargets = texture._gl_render_targets;

        if (glTextures[uid]) {
            this.renderer.unbind_texture(texture);

            glTextures[uid].destroy();
            texture.disconnect('update', this.update_texture, this);
            texture.disconnect('dispose', this.destroy_texture, this);

            delete glTextures[uid];

            if (!skip_remove) {
                const i = this._managed_textures.indexOf(texture);

                if (i !== -1) {
                    remove_items(this._managed_textures, i, 1);
                }
            }
        }

        if (glRenderTargets && glRenderTargets[uid]) {
            glRenderTargets[uid].destroy();
            delete glRenderTargets[uid];
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
