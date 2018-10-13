import { GC_MODES } from '../../const';
import settings from '../../settings';

/**
 * TextureGarbageCollector. This class manages the GPU and ensures that it does not get clogged
 * up with textures that are no longer being used.
 *
 * @class
 * @memberof V
 */
export default class TextureGarbageCollector
{
    /**
     * @param {V.WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        this.count = 0;
        this.checkCount = 0;
        this.maxIdle = settings.GC_MAX_IDLE;
        this.checkCountMax = settings.GC_MAX_CHECK_COUNT;
        this.mode = settings.GC_MODE;
    }

    /**
     * Checks to see when the last time a texture was used
     * if the texture has not been used for a specified amount of time it will be removed from the GPU
     */
    update()
    {
        this.count++;

        if (this.mode === GC_MODES.MANUAL)
        {
            return;
        }

        this.checkCount++;

        if (this.checkCount > this.checkCountMax)
        {
            this.checkCount = 0;

            this.run();
        }
    }

    /**
     * Checks to see when the last time a texture was used
     * if the texture has not been used for a specified amount of time it will be removed from the GPU
     */
    run()
    {
        const tm = this.renderer.texture_manager;
        const managedTextures =  tm._managed_textures;
        let wasRemoved = false;

        for (let i = 0; i < managedTextures.length; i++)
        {
            const texture = managedTextures[i];

            // only supports non generated textures at the moment!
            if (!texture._gl_render_targets && this.count - texture.touched > this.maxIdle)
            {
                tm.destroy_texture(texture, true);
                managedTextures[i] = null;
                wasRemoved = true;
            }
        }

        if (wasRemoved)
        {
            let j = 0;

            for (let i = 0; i < managedTextures.length; i++)
            {
                if (managedTextures[i] !== null)
                {
                    managedTextures[j++] = managedTextures[i];
                }
            }

            managedTextures.length = j;
        }
    }

    /**
     * Removes all the textures within the specified node and its children from the GPU
     *
     * @param {V.Node2D} node - the node to remove the textures from.
     */
    unload(node)
    {
        const tm = this.renderer.texture_manager;

        // only destroy non generated textures
        if (node._texture && node._texture._gl_render_targets)
        {
            tm.destroy_texture(node._texture, true);
        }

        for (let i = node.children.length - 1; i >= 0; i--)
        {
            this.unload(node.children[i]);
        }
    }
}
