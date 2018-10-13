import settings from 'engine/settings';
import BlurX from './BlurX';
import BlurY from './BlurY';
import Filter from 'engine/renderers/webgl/filters/Filter';
import FilterManager from 'engine/renderers/webgl/managers/FilterManager';
import RenderTarget from 'engine/renderers/webgl/utils/RenderTarget';

/**
 * The BlurFilter applies a Gaussian blur to an object.
 * The strength of the blur can be set for x- and y-axis separately.
 */
export default class Blur extends Filter {
    /**
     * @param {number} strength - The strength of the blur filter.
     * @param {number} quality - The quality of the blur filter.
     * @param {number} resolution - The resolution of the blur filter.
     * @param {number} [kernelSize=5] - The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15.
     */
    constructor(strength, quality, resolution, kernelSize) {
        super();

        this.blurXFilter = new BlurX(strength, quality, resolution, kernelSize);
        this.blurYFilter = new BlurY(strength, quality, resolution, kernelSize);

        this.padding = 0;
        this.resolution = resolution || settings.RESOLUTION;
        this.quality = quality || 4;
        this.blur = strength || 8;
    }

    /**
     * Applies the filter.
     *
     * @param {FilterManager} filter_manager - The manager.
     * @param {RenderTarget} input - The input target.
     * @param {RenderTarget} output - The output target.
     */
    apply(filter_manager, input, output) {
        const render_target = filter_manager.get_render_rarget(true);

        this.blurXFilter.apply(filter_manager, input, render_target, true);
        this.blurYFilter.apply(filter_manager, render_target, output, false);

        filter_manager.return_render_rarget(render_target);
    }

    /**
     * Sets the strength of both the blur_x and blur_y properties simultaneously
     *
     * @member {number}
     * @default 2
     */
    get blur() {
        return this.blurXFilter.blur;
    }

    set blur(value) // eslint-disable-line require-jsdoc
    {
        this.blurXFilter.blur = this.blurYFilter.blur = value;
        this.padding = Math.max(Math.abs(this.blurXFilter.strength), Math.abs(this.blurYFilter.strength)) * 2;
    }

    /**
     * Sets the number of passes for blur. More passes means higher quaility bluring.
     *
     * @member {number}
     * @default 1
     */
    get quality() {
        return this.blurXFilter.quality;
    }

    set quality(value) // eslint-disable-line require-jsdoc
    {
        this.blurXFilter.quality = this.blurYFilter.quality = value;
    }

    /**
     * Sets the strength of the blur_x property
     *
     * @member {number}
     * @default 2
     */
    get blur_x() {
        return this.blurXFilter.blur;
    }

    set blur_x(value) // eslint-disable-line require-jsdoc
    {
        this.blurXFilter.blur = value;
        this.padding = Math.max(Math.abs(this.blurXFilter.strength), Math.abs(this.blurYFilter.strength)) * 2;
    }

    /**
     * Sets the strength of the blur_y property
     *
     * @member {number}
     * @default 2
     */
    get blur_y() {
        return this.blurYFilter.blur;
    }

    set blur_y(value) // eslint-disable-line require-jsdoc
    {
        this.blurYFilter.blur = value;
        this.padding = Math.max(Math.abs(this.blurXFilter.strength), Math.abs(this.blurYFilter.strength)) * 2;
    }

    /**
     * Sets the blendmode of the filter
     *
     * @member {number}
     * @default PIXI.BLEND_MODES.NORMAL
     */
    get blend_mode() {
        return this.blurYFilter._blend_mode;
    }

    set blend_mode(value) // eslint-disable-line require-jsdoc
    {
        this.blurYFilter._blend_mode = value;
    }
}
