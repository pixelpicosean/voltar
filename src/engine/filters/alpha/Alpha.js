import Filter from 'engine/renderers/filters/Filter';

import Vert from '../fragments/default.vert';
import Frag from './alpha.frag';

/**
 * Does nothing. Very handy.
 */
export default class Alpha extends Filter {
    /**
     * @param {number} [alpha=1] Amount of alpha from 0 to 1, where 0 is transparent
     */
    constructor(alpha = 1.0) {
        super(Vert, Frag);

        this.alpha = alpha;
        this.glShaderKey = 'alpha';
    }

    /**
     * Coefficient for alpha multiplication
     *
     * @member {number}
     * @default 1
     */
    get alpha() {
        return this.uniforms.uAlpha;
    }

    set alpha(value) // eslint-disable-line require-jsdoc
    {
        this.uniforms.uAlpha = value;
    }
}
