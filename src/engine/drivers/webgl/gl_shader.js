import settings from 'engine/settings';

import compile_program from './shader/compile_program';
import extract_attributes from './shader/extract_attributes';
import extract_uniforms from './shader/extract_uniforms';
import generate_uniform_access_object from './shader/generate_uniform_access_object';

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

export default class GLShader {
    /**
     * Helper class to create a webGL Shader
     *
     * @param {WebGLRenderingContext} gl
     * @param {string} vertex_src The vertex shader source as string.
     * @param {string} fragment_src The fragment shader source asstring.
     * @param {Object<string, number>} [attribute_locations] A key value pair showing which location eact attribute should sit eg {position:0, uvs:1}
     * @param {string} [precision] The float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
     */
    constructor(gl, vertex_src, fragment_src, attribute_locations, precision) {
        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        vertex_src = check_precision(vertex_src, precision || settings.PRECISION_VERTEX);
        fragment_src = check_precision(fragment_src, precision || settings.PRECISION_FRAGMENT);

        /**
         * The shader program
         */
        this.program = compile_program(gl, vertex_src, fragment_src, attribute_locations);

        /**
         * The attributes of the shader as an object
         */
        this.attributes = extract_attributes(gl, this.program);

        /**
         * The uniforms of the shader as an object
         */
        this.uniformData = extract_uniforms(gl, this.program);

        /**
         * The uniforms of the shader as an object
         */
        this.uniforms = generate_uniform_access_object(gl, this.uniformData);
    }
    /**
     * Uses this shader
     */
    bind() {
        this.gl.useProgram(this.program);
        return this;
    }

    /**
     * Destroys this shader
     */
    destroy() {
        this.attributes = null;
        this.uniformData = null;
        this.uniforms = null;

        this.gl.deleteProgram(this.program);
    }
}
