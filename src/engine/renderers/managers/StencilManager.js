import WebGLManager from './WebGLManager';
import WebGLRenderer from '../WebGLRenderer';
import Graphics from 'engine/scene/graphics/Graphics';

export default class StencilManager extends WebGLManager {
    /**
     * @param {WebGLRenderer} renderer - The renderer this manager works for.
     */
    constructor(renderer) {
        super(renderer);
        this.stencil_mask_stack = null;
    }

    /**
     * Changes the mask stack that is used by this manager.
     *
     * @param {Graphics[]} stencil_mask_stack - The mask stack
     */
    set_mask_stack(stencil_mask_stack) {
        this.stencil_mask_stack = stencil_mask_stack;

        const gl = this.renderer.gl;

        if (stencil_mask_stack.length === 0) {
            gl.disable(gl.STENCIL_TEST);
        }
        else {
            gl.enable(gl.STENCIL_TEST);
        }
    }

    /**
     * Applies the Mask and adds it to the current filter stack. @alvin
     *
     * @param {Graphics} graphics - The mask
     */
    push_stencil(graphics) {
        this.renderer.set_object_renderer(this.renderer.plugins.graphics);

        this.renderer._active_render_target.attachStencilBuffer();

        const gl = this.renderer.gl;
        const prevMaskCount = this.stencil_mask_stack.length;

        if (prevMaskCount === 0) {
            gl.enable(gl.STENCIL_TEST);
        }

        this.stencil_mask_stack.push(graphics);

        // Increment the refference stencil value where the new mask overlaps with the old ones.
        gl.colorMask(false, false, false, false);
        gl.stencilFunc(gl.EQUAL, prevMaskCount, this._get_bitwise_mask());
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.INCR);
        this.renderer.plugins.graphics.render(graphics);

        this._use_current();
    }

    /**
     * Removes the last mask from the stencil stack. @alvin
     */
    pop_stencil() {
        this.renderer.set_object_renderer(this.renderer.plugins.graphics);

        const gl = this.renderer.gl;
        const graphics = this.stencil_mask_stack.pop();

        if (this.stencil_mask_stack.length === 0) {
            // the stack is empty!
            gl.disable(gl.STENCIL_TEST);
            gl.clear(gl.STENCIL_BUFFER_BIT);
            gl.clearStencil(0);
        }
        else {
            // Decrement the refference stencil value where the popped mask overlaps with the other ones
            gl.colorMask(false, false, false, false);
            gl.stencilOp(gl.KEEP, gl.KEEP, gl.DECR);
            this.renderer.plugins.graphics.render(graphics);

            this._use_current();
        }
    }

    /**
     * Setup renderer to use the current stencil data.
     */
    _use_current() {
        const gl = this.renderer.gl;

        gl.colorMask(true, true, true, true);
        gl.stencilFunc(gl.EQUAL, this.stencil_mask_stack.length, this._get_bitwise_mask());
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    }

    /**
     * Fill 1s equal to the number of acitve stencil masks.
     *
     * @return {number} The bitwise mask.
     */
    _get_bitwise_mask() {
        return (1 << this.stencil_mask_stack.length) - 1;
    }

    /**
     * Destroys the mask stack.
     *
     */
    destroy() {
        WebGLManager.prototype.destroy.call(this);
    }
}
