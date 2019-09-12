import SpriteMaskFilter from '../filters/spriteMask/SpriteMaskFilter';
import RenderTexture from '../renderTexture/RenderTexture';

/**
 * System plugin to the renderer to manage masks.
 */
export default class MaskSystem
{
    /**
     * @param {import('../rasterizer_canvas').RasterizerCanvas} renderer - The renderer this System works for.
     */
    constructor(renderer)
    {
        this.renderer = renderer;

        // TODO - we don't need both!
        /**
         * `true` if current pushed masked is scissor
         * @type {boolean}
         * @readonly
         */
        this.scissor = false;

        /**
         * Mask data
         * @type {any}
         * @readonly
         */
        this.scissorData = null;

        /**
         * Target to mask
         * @type {any}
         * @readonly
         */
        this.scissorRenderTarget = null;

        /**
         * Enable scissor
         * @type {boolean}
         * @readonly
         */
        this.enableScissor = false;

        /**
         * Pool of used sprite mask filters
         * @type {SpriteMaskFilter[]}
         * @readonly
         */
        this.alphaMaskPool = [];

        /**
         * Current index of alpha mask pool
         * @type {number}
         * @default 0
         * @readonly
         */
        this.alphaMaskIndex = 0;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {any} target - Display Object to push the mask to
     * @param {any} maskData - The masking data.
     */
    push(target, maskData)
    {
        // TODO the root check means scissor rect will not
        // be used on render textures more info here:
        // https://github.com/pixijs/pixi.js/pull/3545

        if (maskData.isSprite)
        {
            this.pushSpriteMask(target, maskData);
        }
        else if (this.enableScissor
            && !this.scissor
            && this.renderer._activeRenderTarget.root
            && !this.renderer.stencil.stencilMaskStack.length
            && maskData.isFastRect())
        {
            const matrix = maskData.worldTransform;

            let rot = Math.atan2(matrix.b, matrix.a);

            // use the nearest degree!
            rot = Math.round(rot * (180 / Math.PI));

            if (rot % 90)
            {
                this.pushStencilMask(maskData);
            }
            else
            {
                this.pushScissorMask(target, maskData);
            }
        }
        else
        {
            this.pushStencilMask(maskData);
        }
    }

    /**
     * Removes the last mask from the mask stack and doesn't return it.
     *
     * @param {any} target - Display Object to pop the mask from
     * @param {any} maskData - The masking data.
     */
    pop(target, maskData)
    {
        if (maskData.isSprite)
        {
            this.popSpriteMask();
        }
        else if (this.enableScissor && !this.renderer.stencil.stencilMaskStack.length)
        {
            this.popScissorMask();
        }
        else
        {
            this.popStencilMask();
        }
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {RenderTexture} target - Display Object to push the sprite mask to
     * @param {any} maskData - Sprite to be used as the mask
     */
    pushSpriteMask(target, maskData)
    {
        let alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex];

        if (!alphaMaskFilter)
        {
            alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex] = [new SpriteMaskFilter(maskData)];
        }

        alphaMaskFilter[0].resolution = this.renderer.resolution;
        alphaMaskFilter[0].maskSprite = maskData;

        const stashFilterArea = target.filterArea;

        target.filterArea = maskData.getBounds(true);
        this.renderer.filter.push(target, alphaMaskFilter);
        target.filterArea = stashFilterArea;

        this.alphaMaskIndex++;
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    popSpriteMask()
    {
        this.renderer.filter.pop();
        this.alphaMaskIndex--;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {any} maskData - The masking data.
     */
    pushStencilMask(maskData)
    {
        this.renderer.batch.flush();
        this.renderer.stencil.pushStencil(maskData);
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    popStencilMask()
    {
        // this.renderer.currentRenderer.stop();
        this.renderer.stencil.popStencil();
    }

    /**
     *
     * @param {any} target - Display Object to push the mask to
     * @param {any} maskData - The masking data.
     */
    pushScissorMask(target, maskData)
    {
        maskData.renderable = true;

        const renderTarget = this.renderer._activeRenderTarget;

        const bounds = maskData.getBounds();

        bounds.fit(renderTarget.size);
        maskData.renderable = false;

        this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);

        const resolution = this.renderer.resolution;

        this.renderer.gl.scissor(
            bounds.x * resolution,
            (renderTarget.root ? renderTarget.size.height - bounds.y - bounds.height : bounds.y) * resolution,
            bounds.width * resolution,
            bounds.height * resolution
        );

        this.scissorRenderTarget = renderTarget;
        this.scissorData = maskData;
        this.scissor = true;
    }

    /**
     * Pop scissor mask
     *
     */
    popScissorMask()
    {
        this.scissorRenderTarget = null;
        this.scissorData = null;
        this.scissor = false;

        // must be scissor!
        const { gl } = this.renderer;

        gl.disable(gl.SCISSOR_TEST);
    }
}
