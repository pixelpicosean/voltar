import WebGLManager from './WebGLManager';
import AlphaMaskFilter from '../filters/sprite_mask/SpriteMaskFilter';
import WebGLRenderer from '../WebGLRenderer';
import Node2D from 'engine/scene/Node2D';
import Sprite from 'engine/scene/sprites/Sprite';
import Graphics from 'engine/scene/graphics/Graphics';

export default class MaskManager extends WebGLManager {
    /**
     * @param {WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        super(renderer);

        // TODO - we don't need both!
        this.scissor = false;
        this.scissorData = null;
        this.scissorRenderTarget = null;

        this.enableScissor = true;

        this.alphaMaskPool = [];
        this.alphaMaskIndex = 0;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {Node2D} target - Display Object to push the mask to
     * @param {Sprite|Graphics} maskData - The masking data.
     */
    push_mask(target, maskData) {
        // TODO the root check means scissor rect will not
        // be used on render textures more info here:
        // https://github.com/pixijs/pixi.js/pull/3545

        if (maskData.texture) {
            this.push_sprite_mask(target, maskData);
        }
        else if (this.enableScissor
            && !this.scissor
            && this.renderer._active_render_target.root
            && !this.renderer.stencilManager.stencilMaskStack.length
            && maskData.is_fast_rect()) {
            const matrix = maskData.world_transform;

            let rot = Math.atan2(matrix.b, matrix.a);

            // use the nearest degree!
            rot = Math.round(rot * (180 / Math.PI));

            if (rot % 90) {
                this.push_stencil_mask(maskData);
            }
            else {
                this.push_scissor_mask(target, maskData);
            }
        }
        else {
            this.push_stencil_mask(maskData);
        }
    }

    /**
     * Removes the last mask from the mask stack and doesn't return it.
     */
    pop_mask(target, maskData) {
        if (maskData.texture) {
            this.pop_sprite_mask();
        }
        else if (this.enableScissor && !this.renderer.stencilManager.stencilMaskStack.length) {
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
     * @param {Sprite} maskData - Sprite to be used as the mask
     */
    push_sprite_mask(target, maskData) {
        let alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex];

        if (!alphaMaskFilter) {
            alphaMaskFilter = this.alphaMaskPool[this.alphaMaskIndex] = [new AlphaMaskFilter(maskData)];
        }

        alphaMaskFilter[0].resolution = this.renderer.resolution;
        alphaMaskFilter[0].maskSprite = maskData;

        // TODO - may cause issues!
        target.filter_area = maskData.get_bounds(true);

        this.renderer.filter_manager.push_filter(target, alphaMaskFilter);

        this.alphaMaskIndex++;
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     *
     */
    pop_sprite_mask() {
        this.renderer.filter_manager.pop_filter();
        this.alphaMaskIndex--;
    }

    /**
     * Applies the Mask and adds it to the current filter stack.
     *
     * @param {Sprite|Graphics} maskData - The masking data.
     */
    push_stencil_mask(maskData) {
        this.renderer.current_renderer.stop();
        this.renderer.stencilManager.pushStencil(maskData);
    }

    /**
     * Removes the last filter from the filter stack and doesn't return it.
     */
    pop_stencil_mask() {
        this.renderer.current_renderer.stop();
        this.renderer.stencilManager.popStencil();
    }

    /**
     * @param {Node2D} target - Display Object to push the mask to
     * @param {Graphics} maskData - The masking data.
     */
    push_scissor_mask(target, maskData) {
        maskData.renderable = true;

        const render_target = this.renderer._active_render_target;

        const bounds = maskData.get_bounds();

        bounds.fit(render_target.size);
        maskData.renderable = false;

        this.renderer.gl.enable(this.renderer.gl.SCISSOR_TEST);

        const resolution = this.renderer.resolution;

        this.renderer.gl.scissor(
            bounds.x * resolution,
            (render_target.root ? render_target.size.height - bounds.y - bounds.height : bounds.y) * resolution,
            bounds.width * resolution,
            bounds.height * resolution
        );

        this.scissorRenderTarget = render_target;
        this.scissorData = maskData;
        this.scissor = true;
    }

    pop_scissor_mask() {
        this.scissorRenderTarget = null;
        this.scissorData = null;
        this.scissor = false;

        // must be scissor!
        const gl = this.renderer.gl;

        gl.disable(gl.SCISSOR_TEST);
    }
}
