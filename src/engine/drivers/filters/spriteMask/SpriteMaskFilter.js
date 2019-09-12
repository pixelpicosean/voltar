import Filter from '../Filter';
import vertex from './spriteMaskFilter.vert';
import fragment from './spriteMaskFilter.frag';
import { default as TextureMatrix } from '../../textures/TextureMatrix';
import { Transform2D } from 'engine/core/math/transform_2d';
import RenderTexture from 'engine/drivers/renderTexture/RenderTexture';

/**
 * This handles a Sprite acting as a mask, as opposed to a Graphic.
 *
 * WebGL only.
 */
export default class SpriteMaskFilter extends Filter
{
    /**
     * @param {any} sprite - the target sprite
     */
    constructor(sprite)
    {
        const maskMatrix = new Transform2D();

        super(vertex, fragment);

        sprite.renderable = false;

        /**
         * Sprite mask
         * @member {Sprite}
         */
        this.maskSprite = sprite;

        /**
         * Mask matrix
         * @member {Transform2D}
         */
        this.maskMatrix = maskMatrix;
    }

    /**
     * Applies the filter
     *
     * @param {import('../FilterSystem').default} filterManager - The renderer to retrieve the filter from
     * @param {RenderTexture} input - The input render target.
     * @param {RenderTexture} output - The target to output to.
     * @param {boolean} clear - Should the output be cleared before rendering to it.
     */
    apply(filterManager, input, output, clear)
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

        this.uniforms.npmAlpha = tex.baseTexture.premultiplyAlpha ? 0.0 : 1.0;
        this.uniforms.mask = tex;
        // get _normalized sprite texture coords_ and convert them to _normalized atlas texture coords_ with `prepend`
        this.uniforms.otherMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, maskSprite)
            .prepend(tex.transform.mapCoord);
        this.uniforms.alpha = maskSprite.worldAlpha;
        this.uniforms.maskClamp = tex.transform.uClampFrame;

        filterManager.applyFilter(this, input, output, clear);
    }
}
