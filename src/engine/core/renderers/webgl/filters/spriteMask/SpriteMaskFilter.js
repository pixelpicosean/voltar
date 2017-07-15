import Filter from '../Filter';
import { Matrix } from '../../../../math';
import { join } from 'path';

/**
 * The SpriteMaskFilter class
 *
 * @class
 * @extends V.Filter
 * @memberof V
 */
export default class SpriteMaskFilter extends Filter
{
    /**
     * @param {V.Sprite} sprite - the target sprite
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

        this.uniforms.mask = maskSprite._texture;
        this.uniforms.otherMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, maskSprite);
        this.uniforms.alpha = maskSprite.worldAlpha;

        filterManager.applyFilter(this, input, output);
    }
}
