import GLShader from 'engine/drivers/webgl/gl_shader';
import settings from './settings';

/**
 * @param {string} src
 * @param {string} def
 */
function check_precision(src, def) {
    if (src.trim().substring(0, 9) !== 'precision') {
        return `precision ${def} float;\n${src}`;
    }

    return src;
}

/**
 * Wrapper class, WebGL Shader.
 * Adds precision string if vertex_src or fragment_src have no mention of it.
 */
export default class Shader extends GLShader {
    /**
     *
     * @param {WebGLRenderingContext} gl - The current WebGL rendering context
     * @param {string} vertex_src - The vertex shader source as string.
     * @param {string} fragment_src - The fragment shader source as string.
     * * @param {object} [attribute_locations] - A key value pair showing which location eact attribute should sit.
                       e.g. {position:0, uvs:1}.
     * @param {string} [precision] - The float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
     */
    constructor(gl, vertex_src, fragment_src, attribute_locations, precision) {
        super(gl, check_precision(vertex_src, precision || settings.PRECISION_VERTEX),
            check_precision(fragment_src, precision || settings.PRECISION_FRAGMENT), undefined, attribute_locations);
    }
}
