import * as core from '../../core';
import { join } from 'path';

/**
 * Does nothing. Very handy.
 *
 * @class
 * @extends V.Filter
 * @memberof V.filters
 */
export default class AlphaFilter extends core.Filter
{
    /**
     *
     */
    constructor()
    {
        super(
            // vertex shader
            require('../fragments/default.vert'),
            // fragment shader
            require('./alpha.frag')
        );

        this.alpha = 1.0;
        this.glShaderKey = 'alpha';
    }

    /**
     * Coefficient for alpha multiplication
     *
     * @member {number}
     * @default 1
     */
    get alpha()
    {
        return this.uniforms.uAlpha;
    }

    set alpha(value) // eslint-disable-line require-jsdoc
    {
        this.uniforms.uAlpha = value;
    }
}
