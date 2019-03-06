import settings from 'engine/settings';
import Filter from 'engine/servers/visual/filters/filter';
import FilterManager from 'engine/servers/visual/managers/filter_manager';
import RenderTarget from 'engine/servers/visual/utils/render_target';

import getMaxBlurKernelSize from './get_max_kernel_size';

import generate_blur_vert_source from './generate_blur_vert_source';
import generate_blur_frag_source from './generate_blur_frag_source';

/**
 * The BlurYFilter applies a horizontal Gaussian blur to an object.
 */
export default class BlurY extends Filter {
    /**
     * @param {number} [strength] - The strength of the blur filter.
     * @param {number} [quality] - The quality of the blur filter.
     * @param {number} [resolution] - The resolution of the blur filter.
     * @param {number} [kernel_size] - The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15.
     */
    constructor(strength = 8, quality = 4, resolution, kernel_size = 5) {
        kernel_size = kernel_size || 5;
        const vert_src = generate_blur_vert_source(kernel_size, false);
        const frag_src = generate_blur_frag_source(kernel_size);

        super(
            // vertex shader
            vert_src,
            // fragment shader
            frag_src
        );

        this.resolution = resolution || settings.RESOLUTION;

        this._quality = 0;

        this.quality = quality;
        this.strength = strength;

        this.first_run = true;
    }

    /**
     * Applies the filter.
     *
     * @param {FilterManager} filter_manager - The manager.
     * @param {RenderTarget} input - The input target.
     * @param {RenderTarget} output - The output target.
     * @param {boolean} clear - Should the output be cleared before rendering?
     */
    apply(filter_manager, input, output, clear) {
        if (this.first_run) {
            const gl = filter_manager.renderer.gl;
            const kernel_size = getMaxBlurKernelSize(gl);

            this.vertex_src = generate_blur_vert_source(kernel_size, false);
            this.fragment_src = generate_blur_frag_source(kernel_size);

            this.first_run = false;
        }

        this.uniforms.strength = (1 / output.size.height) * (output.size.height / input.size.height);

        this.uniforms.strength *= this.strength;
        this.uniforms.strength /= this.passes;

        if (this.passes === 1) {
            filter_manager.apply_filter(this, input, output, clear);
        } else {
            const render_target = filter_manager.get_render_rarget(true);
            let flip = input;
            let flop = render_target;

            for (let i = 0; i < this.passes - 1; i++) {
                filter_manager.apply_filter(this, flip, flop, true);

                const temp = flop;

                flop = flip;
                flip = temp;
            }

            filter_manager.apply_filter(this, flip, output, clear);

            filter_manager.return_render_rarget(render_target);
        }
    }

    /**
     * Sets the strength of both the blur.
     *
     * @type {number}
     * @default 2
     */
    get blur() {
        return this.strength;
    }
    set blur(value) {
        this.padding = Math.abs(value) * 2;
        this.strength = value;
    }

    /**
     * Sets the quality of the blur by modifying the number of passes. More passes means higher
     * quaility bluring but the lower the performance.
     *
     * @type {number}
     * @default 4
     */
    get quality() {
        return this._quality;
    }
    set quality(value) {
        this._quality = value;
        this.passes = value;
    }
}
