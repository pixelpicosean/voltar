import Node2D from 'engine/scene/node_2d';
import Sprite from 'engine/scene/sprites/sprite';
import Graphics from 'engine/scene/graphics/graphics';
import WebGLRenderer from '../webgl_renderer';
import RenderTarget from '../utils/render_target';
import AlphaMaskFilter from '../filters/sprite_mask/sprite_mask_filter';
import WebGLManager from './webgl_manager';

export default class MaskManager extends WebGLManager {
    /**
     * @param {WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        super(renderer);

        // TODO - we don't need both!
        this.scissor = false;
        this.scissor_data = null;
        this.scissor_render_target = null;

        this.enable_scissor = true;

        this.alpha_mask_pool = [];
        this.alpha_mask_index = 0;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {Node2D} target - Display Object to push the mask to
     * @param {Sprite|Graphics} mask_data - The masking data.
     */
    push_mask(target, mask_data) {
        // @ts-ignore
        if (mask_data.texture) {
            // @ts-ignore
            this.push_sprite_mask(target, mask_data);
        } else if (this.enable_scissor
            && !this.scissor
            && this.renderer._active_render_target.root
            && !this.renderer.stencil_manager.stencil_mask_stack.length
            // @ts-ignore
            && mask_data.is_fast_rect()) {
            const matrix = mask_data.world_transform;

            let rot = Math.atan2(matrix.b, matrix.a);

            // use the nearest degree!
            rot = Math.round(rot * (180 / Math.PI));

            if (rot % 90) {
                this.push_stencil_mask(mask_data);
            } else {
                // @ts-ignore
                this.push_scissor_mask(target, mask_data);
            }
        } else {
            this.push_stencil_mask(mask_data);
        }
    }

    /**
     * Removes the last mask from the mask stack and doesn't return it.
     */
    pop_mask(target, maskData) {
        if (maskData.texture) {
            this.pop_sprite_mask();
        }
        else if (this.enable_scissor && !this.renderer.stencil_manager.stencil_mask_stack.length) {
            this.pop_scissor_mask();
        }
        else {
            this.pop_stencil_mask();
        }
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {RenderTarget} target - Display Object to push the sprite mask to
     * @param {Sprite} mask_data - Sprite to be used as the mask
     */
    push_sprite_mask(target, mask_data) {
        let alphaMaskFilter = this.alpha_mask_pool[this.alpha_mask_index];

        if (!alphaMaskFilter) {
            alphaMaskFilter = this.alpha_mask_pool[this.alpha_mask_index] = [new AlphaMaskFilter(mask_data)];
        }

        alphaMaskFilter[0].resolution = this.renderer.resolution;
        alphaMaskFilter[0].maskSprite = mask_data;

        // TODO - may cause issues!
        target.filter_area = mask_data.get_bounds(true);

        // @ts-ignore
        this.renderer.filter_manager.push_filter(target, alphaMaskFilter);

        this.alpha_mask_index++;
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    pop_sprite_mask() {
        this.renderer.filter_manager.pop_filter();
        this.alpha_mask_index--;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {Sprite|Graphics} mask_data - The masking data.
     */
    push_stencil_mask(mask_data) {
        this.renderer.current_renderer.stop();
        // @ts-ignore
        this.renderer.stencil_manager.push_stencil(mask_data);
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     */
    pop_stencil_mask() {
        this.renderer.current_renderer.stop();
        this.renderer.stencil_manager.pop_stencil();
    }

    /**
     * @param {Node2D} target - Display Object to push the mask to
     * @param {Graphics} mask_data - The masking data.
     */
    push_scissor_mask(target, mask_data) {
        mask_data.renderable = true;

        const render_target = this.renderer._active_render_target;

        const bounds = mask_data.get_bounds();

        bounds.fit_to(render_target.size);
        mask_data.renderable = false;

        this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);

        const resolution = this.renderer.resolution;

        this.renderer.gl.scissor(
            bounds.x * resolution,
            (render_target.root ? render_target.size.height - bounds.y - bounds.height : bounds.y) * resolution,
            bounds.width * resolution,
            bounds.height * resolution
        );

        this.scissor_render_target = render_target;
        this.scissor_data = mask_data;
        this.scissor = true;
    }

    pop_scissor_mask() {
        this.scissor_render_target = null;
        this.scissor_data = null;
        this.scissor = false;

        // must be scissor!
        const gl = this.renderer.gl;

        gl.disable(gl.SCISSOR_TEST);
    }
}
