import Filter from 'engine/servers/visual/filters/filter';

import Vert from '../fragments/default.vert';
import Frag from './alpha.frag';

/**
 * Does nothing. Very handy.
 */
export default class Alpha extends Filter {
    /**
     * @param {number} [alpha] Amount of alpha from 0 to 1, where 0 is transparent
     */
    constructor(alpha = 1.0) {
        super(Vert, Frag);

        this.alpha = alpha;
        this.gl_shader_key = 'alpha';
    }

    /**
     * Coefficient for alpha multiplication
     *
     * @type {number}
     */
    get alpha() {
        return this.uniforms.u_alpha;
    }
    set alpha(value) {
        this.uniforms.u_alpha = value;
    }
}
