import { rgb2hex, hex2rgb } from 'engine/utils/index';
import Filter from 'engine/servers/visual/filters/filter';

import vertex from '../fragments/default.vert';
import fragment from './outline.frag';

/**
 * OutlineFilter, originally by mishaa
 * http://www.html5gamedevs.com/topic/10640-outline-a-sprite-change-certain-colors/?p=69966
 * http://codepen.io/mishaa/pen/emGNRB<br>
 *
 * @param {number} [thickness=1] The tickness of the outline. Make it 2 times more for resolution 2
 * @param {number} [color=0x000000] The color of the outline.
 * @param {number} [quality=0.1] The quality of the outline from `0` to `1`, using a higher quality
 *        setting will result in slower performance and more accuracy.
 *
 * @example
 *  someSprite.filter = new OutlineFilter(9, 0xFF0000);
 */
export default class OutlineFilter extends Filter {

    constructor(thickness = 1, color = 0x000000, quality = 0.1) {
        const samples =  Math.max(
            quality * OutlineFilter.MAX_SAMPLES,
            OutlineFilter.MIN_SAMPLES
        );
        const angle_step = (Math.PI * 2 / samples).toFixed(7);

        super(vertex, fragment.replace(/\$\{angle_step\}/, angle_step));
        this.uniforms.thickness = new Float32Array([0, 0]);

        /**
         * The thickness of the outline.
         * @member {number}
         * @default 1
         */
        this.thickness = thickness;

        this.uniforms.outline_color = new Float32Array([0, 0, 0, 1]);
        this.color = color;

        this.quality = quality;
    }

    apply(filter_manager, input, output, clear) {
        this.uniforms.thickness[0] = this.thickness / input.size.width;
        this.uniforms.thickness[1] = this.thickness / input.size.height;

        filter_manager.apply_filter(this, input, output, clear);
    }

    /**
     * The color of the glow.
     * @type {number}
     * @default 0x000000
     */
    get color() {
        return rgb2hex(this.uniforms.outline_color);
    }
    set color(value) {
        hex2rgb(value, this.uniforms.outline_color);
    }
}

/**
 * The minimum number of samples for rendering outline.
 * @static
 * @type {number}
 * @default 1
 */
OutlineFilter.MIN_SAMPLES = 1;

/**
 * The maximum number of samples for rendering outline.
 * @static
 * @type {number}
 * @default 100
 */
OutlineFilter.MAX_SAMPLES = 100;
