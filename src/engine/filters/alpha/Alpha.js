import Filter from 'engine/renderers/filters/Filter';

/**
 * Does nothing. Very handy.
 */
export default class Alpha extends Filter {
    /**
     * @param {number} [alpha=1] Amount of alpha from 0 to 1, where 0 is transparent
     */
    constructor(alpha = 1.0) {
        super(
            // vertex shader
            require('../fragments/default.vert'),
            // fragment shader
            require('./alpha.frag')
        );

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
