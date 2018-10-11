import * as core from '../../core';
import { join } from 'path';

/**
 * The DisplacementFilter class uses the pixel values from the specified texture
 * (called the displacement map) to perform a displacement of an object. You can
 * use this filter to apply all manor of crazy warping effects. Currently the r
 * property of the texture is used to offset the x and the g property of the texture
 * is used to offset the y.
 *
 * @class
 * @extends V.Filter
 * @memberof V.filters
 */
export default class DisplacementFilter extends core.Filter
{
    /**
     * @param {V.Sprite} sprite - The sprite used for the displacement map. (make sure its added to the scene!)
     * @param {number} scale - The scale of the displacement
     */
    constructor(sprite, scale)
    {
        const maskMatrix = new core.Matrix();

        sprite.renderable = false;

        super(
            // vertex shader
            require('../fragments/default-filter-matrix.vert'),
            // fragment shader
            require('./displacement.frag')
        );

        this.maskSprite = sprite;
        this.maskMatrix = maskMatrix;

        this.uniforms.mapSampler = sprite._texture;
        this.uniforms.filterMatrix = maskMatrix;
        this.uniforms.scale = { x: 1, y: 1 };

        if (scale === null || scale === undefined)
        {
            scale = 20;
        }

        this.scale = new core.Point(scale, scale);
    }

    /**
     * Applies the filter.
     *
     * @param {V.FilterManager} filterManager - The manager.
     * @param {V.RenderTarget} input - The input target.
     * @param {V.RenderTarget} output - The output target.
     */
    apply(filterManager, input, output)
    {
        this.uniforms.scale.x = this.scale.x;
        this.uniforms.scale.y = this.scale.y;

         // draw the filter...
        filterManager.applyFilter(this, input, output);
    }

    /**
     * The texture used for the displacement map. Must be power of 2 sized texture.
     *
     * @member {V.Texture}
     */
    get map()
    {
        return this.uniforms.mapSampler;
    }

    set map(value) // eslint-disable-line require-jsdoc
    {
        this.uniforms.mapSampler = value;
    }
}
