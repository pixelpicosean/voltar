import * as core from '../../core';
import { join } from 'path';

/**
 * Does nothing. Very handy.
 *
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI.filters
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
