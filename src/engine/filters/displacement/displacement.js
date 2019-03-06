import Matrix from 'engine/core/math/matrix';
import Vector2 from 'engine/core/math/vector2';
import Filter from 'engine/servers/visual/filters/filter';
import FilterManager from 'engine/servers/visual/managers/filter_manager';
import RenderTarget from 'engine/servers/visual/utils/render_target';
import Texture from 'engine/scene/resources/textures/texture';
import Sprite from 'engine/scene/sprites/sprite';

import VertShader from '../fragments/default_filter_matrix.vert';
import FragShader from './displacement.frag';

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
     * @param {number} [scale] - The scale of the displacement
     */
    constructor(sprite, scale = 20) {
        const mask_matrix = new Matrix();

        sprite.renderable = false;

        super(VertShader, FragShader);

        this.mask_sprite = sprite;
        this.mask_matrix = mask_matrix;

        this.uniforms.map_sampler = sprite._texture;
        this.uniforms.filter_matrix = mask_matrix;
        this.uniforms.scale = { x: 1, y: 1 };

        this.scale = new Vector2(scale, scale);
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
     * @type {Texture}
     */
    get map() {
        return this.uniforms.map_sampler;
    }
    set map(value) {
        this.uniforms.map_sampler = value;
    }
}
