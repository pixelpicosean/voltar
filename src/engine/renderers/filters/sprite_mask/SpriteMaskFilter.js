import Filter from '../Filter';
import { Matrix } from 'engine/math/index';
import TextureMatrix from 'engine/textures/TextureMatrix';
import Sprite from 'engine/scene/sprites/Sprite';
import RenderTarget from '../../utils/RenderTarget';
import FilterManager from '../../managers/FilterManager';

/**
 * The SpriteMaskFilter class
 */
export default class SpriteMaskFilter extends Filter {
    /**
     * @param {Sprite} sprite - the target sprite
     */
    constructor(sprite) {
        const mask_matrix = new Matrix();

        super(
            require('./sprite_mask_filter.vert'),
            require('./sprite_mask_filter.frag')
        );

        sprite.renderable = false;

        this.mask_sprite = sprite;
        this.mask_matrix = mask_matrix;
    }

    /**
     * Applies the filter
     *
     * @param {FilterManager} filter_manager - The renderer to retrieve the filter from
     * @param {RenderTarget} input - The input render target.
     * @param {RenderTarget} output - The target to output to.
     */
    apply(filter_manager, input, output) {
        const maskSprite = this.mask_sprite;
        const tex = this.mask_sprite.texture;

        if (!tex.valid) {
            return;
        }
        if (!tex.transform) {
            // margin = 0.0, let it bleed a bit, shader code becomes easier
            // assuming that atlas textures were made with 1-pixel padding
            tex.transform = new TextureMatrix(tex, 0.0);
        }
        tex.transform.update();
        this.uniforms.mask = tex;
        this.uniforms.otherMatrix = filter_manager.calculate_sprite_matrix(this.mask_matrix, maskSprite)
            .prepend(tex.transform.map_coord);
        this.uniforms.alpha = maskSprite.world_alpha;
        this.uniforms.maskClamp = tex.transform.u_clamp_frame;

        filter_manager.apply_filter(this, input, output);
    }
}