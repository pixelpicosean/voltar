import Filter from 'engine/renderers/filters/Filter';

import Vert from './fxaa.vert';
import Frag from './fxaa.frag';

/**
 *
 * Basic FXAA implementation based on the code on geeks3d.com with the
 * modification that the texture2DLod stuff was removed since it's
 * unsupported by WebGL.
 *
 * @see https://github.com/mitsuhiko/webgl-meincraft
 */
export default class FXAA extends Filter {
    /**
     *
     */
    constructor() {
        // TODO - needs work
        super(Vert, Frag);
    }
}
