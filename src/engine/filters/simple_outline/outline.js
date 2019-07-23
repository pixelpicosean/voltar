import Filter from 'engine/servers/visual/filters/filter';

import vertex from '../fragments/default.vert';
import fragment from './outline.frag';
import { rgb2hex, hex2rgb } from 'engine/utils/index';

/**
 * SimpleOutlineFilter
 *
 * @param {number} [thickness=1] The tickness of the outline. Make it 2 times more for resolution 2
 * @param {number} [color=0x000000] The color of the outline.
 *
 * @example
 *  someSprite.filter = new SimpleOutlineFilter(9, 0xFF0000);
 */
export default class SimpleOutlineFilter extends Filter {

    constructor(thickness = 1, color = 0x000000) {
        super(vertex, fragment);
        this.uniforms.thickness = new Float32Array([0, 0]);

        /**
         * The thickness of the outline.
         * @member {number}
         * @default 1
         */
        this.thickness = thickness;

        this.uniforms.outline_color = new Float32Array([0, 0, 0, 1]);
        this.color = color;
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
