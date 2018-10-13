import settings from 'engine/settings';
import generate_blur_vert_source from './generate_blur_vert_source';
import generate_blur_frag_source from './generate_blur_frag_source';
import getMaxBlurKernelSize from './get_max_kernel_size';
import Filter from 'engine/renderers/webgl/filters/Filter';
import FilterManager from 'engine/renderers/webgl/managers/FilterManager';
import RenderTarget from 'engine/renderers/webgl/utils/RenderTarget';

/**
 * The BlurXFilter applies a horizontal Gaussian blur to an object.
 */
export default class BlurX extends Filter {
    /**
     * @param {number} strength - The strength of the blur filter.
     * @param {number} quality - The quality of the blur filter.
     * @param {number} resolution - The resolution of the blur filter.
     * @param {number} [kernelSize=5] - The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15.
     */
    constructor(strength, quality, resolution, kernelSize) {
        kernelSize = kernelSize || 5;
        const vertSrc = generate_blur_vert_source(kernelSize, true);
        const fragSrc = generate_blur_frag_source(kernelSize);

        super(
            // vertex shader
            vertSrc,
            // fragment shader
            fragSrc
        );

        this.resolution = resolution || settings.RESOLUTION;

        this._quality = 0;

        this.quality = quality || 4;
        this.strength = strength || 8;

        this.firstRun = true;
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
        if (this.firstRun) {
            const gl = filter_manager.renderer.gl;
            const kernelSize = getMaxBlurKernelSize(gl);

            this.vertexSrc = generate_blur_vert_source(kernelSize, true);
            this.fragmentSrc = generate_blur_frag_source(kernelSize);

            this.firstRun = false;
        }

        this.uniforms.strength = (1 / output.size.width) * (output.size.width / input.size.width);

        // screen space!
        this.uniforms.strength *= this.strength;
        this.uniforms.strength /= this.passes;// / this.passes//Math.pow(1, this.passes);

        if (this.passes === 1) {
            filter_manager.apply_filter(this, input, output, clear);
        }
        else {
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
     * @member {number}
     * @default 16
     */
    get blur() {
        return this.strength;
    }

    set blur(value) // eslint-disable-line require-jsdoc
    {
        this.padding = Math.abs(value) * 2;
        this.strength = value;
    }

    /**
     * Sets the quality of the blur by modifying the number of passes. More passes means higher
     * quaility bluring but the lower the performance.
     *
     * @member {number}
     * @default 4
     */
    get quality() {
        return this._quality;
    }

    set quality(value) // eslint-disable-line require-jsdoc
    {
        this._quality = value;
        this.passes = value;
    }
}
