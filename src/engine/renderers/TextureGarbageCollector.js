import { GC_MODES } from '../const';
import settings from '../settings';
import TextureManager from './TextureManager';

/**
 * @typedef HasTextureManager
 * @property {TextureManager} texture_manager
 */

/**
 * TextureGarbageCollector. This class manages the GPU and ensures that it does not get clogged
 * up with textures that are no longer being used.
 */
export default class TextureGarbageCollector {
    /**
     * @param {HasTextureManager} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        this.renderer = renderer;

        this.count = 0;
        this.check_count = 0;
        this.max_idle = settings.GC_MAX_IDLE;
        this.check_count_max = settings.GC_MAX_CHECK_COUNT;
        this.mode = settings.GC_MODE;
    }

    /**
     * Checks to see when the last time a texture was used
     * if the texture has not been used for a specified amount of time it will be removed from the GPU
     */
    update() {
        this.count++;

        if (this.mode === GC_MODES.MANUAL) {
            return;
        }

        this.check_count++;

        if (this.check_count > this.check_count_max) {
            this.check_count = 0;

            this.run();
        }
    }

    /**
     * Checks to see when the last time a texture was used
     * if the texture has not been used for a specified amount of time it will be removed from the GPU
     */
    run() {
        const tm = this.renderer.texture_manager;
        const managed_textures = tm._managed_textures;
        let was_removed = false;

        for (let i = 0; i < managed_textures.length; i++) {
            const texture = managed_textures[i];

            // only supports non generated textures at the moment!
            if (!texture._gl_render_targets && this.count - texture.touched > this.max_idle) {
                tm.destroy_texture(texture, true);
                managed_textures[i] = null;
                was_removed = true;
            }
        }

        if (was_removed) {
            let j = 0;

            for (let i = 0; i < managed_textures.length; i++) {
                if (managed_textures[i] !== null) {
                    managed_textures[j++] = managed_textures[i];
                }
            }

            managed_textures.length = j;
        }
    }

    /**
     * Removes all the textures within the specified node and its children from the GPU
     *
     * @param {import('../scene/Node2D').default} node - the node to remove the textures from.
     */
    unload(node) {
        const tm = this.renderer.texture_manager;

        const sprite = /** @type {import('../scene/sprites/Sprite').default} */(node);

        // only destroy non generated textures
        if (sprite._texture && sprite._texture.base_texture && sprite._texture.base_texture._gl_render_targets) {
            tm.destroy_texture(sprite._texture, true);
        }

        for (let i = node.children.length - 1; i >= 0; i--) {
            this.unload(node.children[i]);
        }
    }
}
