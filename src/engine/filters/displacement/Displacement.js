import Filter from 'engine/renderers/filters/Filter';
import Matrix from 'engine/math/Matrix';
import Sprite from 'engine/scene/sprites/Sprite';
import Point from 'engine/math/Point';
import FilterManager from 'engine/renderers/managers/FilterManager';
import RenderTarget from 'engine/renderers/utils/RenderTarget';

/**
 * The Displacement class uses the pixel values from the specified texture
 * (called the displacement map) to perform a displacement of an object. You can
 * use this filter to apply all manor of crazy warping effects. Currently the r
 * property of the texture is used to offset the x and the g property of the texture
 * is used to offset the y.
 */
export default class Displacement extends Filter {
    /**
     * @param {Sprite} sprite - The sprite used for the displacement map. (make sure its added to the scene!)
     * @param {number} scale - The scale of the displacement
     */
    constructor(sprite, scale) {
        const mask_matrix = new Matrix();

        sprite.renderable = false;

        super(
            // vertex shader
            require('../fragments/default-filter-matrix.vert'),
            // fragment shader
            require('./displacement.frag')
        );

        this.mask_sprite = sprite;
        this.mask_matrix = mask_matrix;

        this.uniforms.mapSampler = sprite._texture;
        this.uniforms.filterMatrix = mask_matrix;
        this.uniforms.scale = { x: 1, y: 1 };

        if (scale === null || scale === undefined) {
            scale = 20;
        }

        this.scale = new Point(scale, scale);
    }

    /**
     * Applies the filter.
     *
     * @param {FilterManager} filter_manager - The manager.
     * @param {RenderTarget} input - The input target.
     * @param {RenderTarget} output - The output target.
     */
    apply(filter_manager, input, output) {
        this.uniforms.scale.x = this.scale.x;
        this.uniforms.scale.y = this.scale.y;

        // draw the filter...
        filter_manager.apply_filter(this, input, output);
    }

    /**
     * The texture used for the displacement map. Must be power of 2 sized texture.
     *
     * @member {Texture}
     */
    get map() {
        return this.uniforms.mapSampler;
    }

    set map(value) // eslint-disable-line require-jsdoc
    {
        this.uniforms.mapSampler = value;
    }
}
