import { GL } from 'engine/dep/index';
import settings from './settings';

const { GLShader } = GL;

/**
 * @param {string|string[]} src
 * @param {string} def
 */
function check_precision(src, def) {
    if (src instanceof Array) {
        if (src[0].substring(0, 9) !== 'precision') {
            const copy = src.slice(0);

            copy.unshift(`precision ${def} float;`);

            return copy;
        }
    } else if (src.trim().substring(0, 9) !== 'precision') {
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
     * @param {string|string[]} vertex_src - The vertex shader source as an array of strings.
     * @param {string|string[]} fragment_src - The fragment shader source as an array of strings.
     * * @param {object} [attribute_locations] - A key value pair showing which location eact attribute should sit.
                       e.g. {position:0, uvs:1}.
     * @param {string} [precision] - The float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
     */
    constructor(gl, vertex_src, fragment_src, attribute_locations, precision) {
        super(gl, check_precision(vertex_src, precision || settings.PRECISION_VERTEX),
            check_precision(fragment_src, precision || settings.PRECISION_FRAGMENT), undefined, attribute_locations);
    }
}
