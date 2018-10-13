import settings from 'engine/settings';
import generateBlurVertSource from './generateBlurVertSource';
import generateBlurFragSource from './generateBlurFragSource';
import getMaxBlurKernelSize from './getMaxBlurKernelSize';
import Filter from 'engine/renderers/webgl/filters/Filter';
import FilterManager from 'engine/renderers/webgl/managers/FilterManager';
import RenderTarget from 'engine/renderers/webgl/utils/RenderTarget';

/**
 * The BlurYFilter applies a horizontal Gaussian blur to an object.
 */
export default class BlurYFilter extends Filter {
    /**
     * @param {number} strength - The strength of the blur filter.
     * @param {number} quality - The quality of the blur filter.
     * @param {number} resolution - The resolution of the blur filter.
     * @param {number} [kernelSize=5] - The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15.
     */
    constructor(strength, quality, resolution, kernelSize) {
        kernelSize = kernelSize || 5;
        const vertSrc = generateBlurVertSource(kernelSize, false);
        const fragSrc = generateBlurFragSource(kernelSize);

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

            this.vertexSrc = generateBlurVertSource(kernelSize, false);
            this.fragmentSrc = generateBlurFragSource(kernelSize);

            this.firstRun = false;
        }

        this.uniforms.strength = (1 / output.size.height) * (output.size.height / input.size.height);

        this.uniforms.strength *= this.strength;
        this.uniforms.strength /= this.passes;

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
     * @default 2
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
