import Filter from 'engine/renderers/webgl/filters/Filter';

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
        super(
            // vertex shader
            require('./fxaa.vert'),
            // fragment shader
            require('./fxaa.frag')
        );
    }
}
