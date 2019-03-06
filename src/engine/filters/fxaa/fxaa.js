import Filter from 'engine/servers/visual/filters/filter';

import Vert from './fxaa.vert';
import Frag from './fxaa.frag';

/**
 * Basic FXAA implementation based on the code on geeks3d.com with the
 * modification that the texture2DLod stuff was removed since it's
 * unsupported by WebGL.
 *
 * @see https://github.com/mitsuhiko/webgl-meincraft
 */
export default class FXAA extends Filter {
    constructor() {
        super(Vert, Frag);
    }
}
