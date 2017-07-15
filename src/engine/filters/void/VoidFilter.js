import * as core from '../../core';
import { join } from 'path';

/**
 * Does nothing. Very handy.
 *
 * @class
 * @extends V.Filter
 * @memberof V.filters
 */
export default class VoidFilter extends core.Filter
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
            require('./void.frag')
        );

        this.glShaderKey = 'void';
    }
}
