import settings from 'engine/settings';
import BlurX from './blur_x';
import BlurY from './blur_y';
import Filter from 'engine/renderers/filters/Filter';
import FilterManager from 'engine/renderers/managers/FilterManager';
import RenderTarget from 'engine/renderers/utils/RenderTarget';

/**
 * The BlurFilter applies a Gaussian blur to an object.
 * The strength of the blur can be set for x- and y-axis separately.
 */
export default class Blur extends Filter {
    /**
     * @param {number} strength - The strength of the blur filter.
     * @param {number} quality - The quality of the blur filter.
     * @param {number} resolution - The resolution of the blur filter.
     * @param {number} [kernel_size] - The kernelSize of the blur filter.Options: 5, 7, 9, 11, 13, 15.
     */
    constructor(strength = 8, quality = 4, resolution, kernel_size = 5) {
        super();

        this.blur_x_filter = new BlurX(strength, quality, resolution, kernel_size);
        this.blur_y_filter = new BlurY(strength, quality, resolution, kernel_size);

        this.padding = 0;
        this.resolution = resolution || settings.RESOLUTION;
        this.quality = quality;
        this.blur = strength;
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

        this.blur_x_filter.apply(filter_manager, input, render_target, true);
        this.blur_y_filter.apply(filter_manager, render_target, output, false);

        filter_manager.return_render_rarget(render_target);
    }

    /**
     * Sets the strength of both the blur_x and blur_y properties simultaneously
     *
     * @type {number}
     * @default 1
     */
    get blur() {
        return this.blur_x_filter.blur;
    }
    set blur(value) {
        this.blur_x_filter.blur = this.blur_y_filter.blur = value;
        this.padding = Math.max(Math.abs(this.blur_x_filter.strength), Math.abs(this.blur_y_filter.strength)) * 2;
    }

    /**
     * Sets the number of passes for blur. More passes means higher quaility bluring.
     *
     * @type {number}
     * @default 1
     */
    get quality() {
        return this.blur_x_filter.quality;
    }
    set quality(value) {
        this.blur_x_filter.quality = this.blur_y_filter.quality = value;
    }

    /**
     * Sets the strength of the blur_x property
     *
     * @type {number}
     * @default 2
     */
    get blur_x() {
        return this.blur_x_filter.blur;
    }
    set blur_x(value) {
        this.blur_x_filter.blur = value;
        this.padding = Math.max(Math.abs(this.blur_x_filter.strength), Math.abs(this.blur_y_filter.strength)) * 2;
    }

    /**
     * Sets the strength of the blur_y property
     *
     * @type {number}
     * @default 2
     */
    get blur_y() {
        return this.blur_y_filter.blur;
    }
    set blur_y(value) {
        this.blur_y_filter.blur = value;
        this.padding = Math.max(Math.abs(this.blur_x_filter.strength), Math.abs(this.blur_y_filter.strength)) * 2;
    }

    /**
     * Sets the blendmode of the filter
     *
     * @type {number}
     * @default BLEND_MODES.NORMAL
     */
    get blend_mode() {
        return this.blur_y_filter._blend_mode;
    }
    set blend_mode(value) {
        this.blur_y_filter._blend_mode = value;
    }
}
