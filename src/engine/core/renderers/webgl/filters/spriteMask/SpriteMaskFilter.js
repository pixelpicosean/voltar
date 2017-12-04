import Filter from '../Filter';
import { Matrix } from '../../../../math';
import TextureMatrix from '../../../../textures/TextureMatrix';
import { join } from 'path';

/**
 * The SpriteMaskFilter class
 *
 * @class
 * @extends Filter
 */
export default class SpriteMaskFilter extends Filter
{
    /**
     * @param {Sprite} sprite - the target sprite
     */
    constructor(sprite)
    {
        const maskMatrix = new Matrix();

        super(
            require('./spriteMaskFilter.vert'),
            require('./spriteMaskFilter.frag'),
        );

        sprite.renderable = false;

        this.maskSprite = sprite;
        this.maskMatrix = maskMatrix;
    }

    /**
     * Applies the filter
     *
     * @param {V.FilterManager} filterManager - The renderer to retrieve the filter from
     * @param {V.RenderTarget} input - The input render target.
     * @param {V.RenderTarget} output - The target to output to.
     */
    apply(filterManager, input, output)
    {
        const maskSprite = this.maskSprite;
        const tex = this.maskSprite.texture;

        if (!tex.valid)
        {
            return;
        }
        if (!tex.transform)
        {
            // margin = 0.0, let it bleed a bit, shader code becomes easier
            // assuming that atlas textures were made with 1-pixel padding
            tex.transform = new TextureMatrix(tex, 0.0);
        }
        tex.transform.update();
        this.uniforms.mask = tex;
        this.uniforms.otherMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, maskSprite)
            .prepend(tex.transform.map_coord);
        this.uniforms.alpha = maskSprite.world_alpha;
        this.uniforms.maskClamp = tex.transform.u_clamp_frame;

        filterManager.applyFilter(this, input, output);
    }
}
