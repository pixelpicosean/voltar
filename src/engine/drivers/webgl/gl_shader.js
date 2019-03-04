import compileProgram from './shader/compile_program';
import extractAttributes from './shader/extract_attributes';
import extractUniforms from './shader/extract_uniforms';
import setPrecision from './shader/set_precision';
import generateUniformAccessObject from './shader/generate_uniform_access_object';

export default class GLShader {
    /**
     * Helper class to create a webGL Shader
     *
     * @param gl {WebGLRenderingContext}
     * @param vertexSrc {string} The vertex shader source as string.
     * @param fragmentSrc {string} The fragment shader source asstring.
     * @param precision {string} The float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
     * @param attributeLocations {any} A key value pair showing which location eact attribute should sit eg {position:0, uvs:1}
     */
    constructor(gl, vertexSrc, fragmentSrc, precision, attributeLocations) {
        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        if (precision) {
            vertexSrc = setPrecision(vertexSrc, precision);
            fragmentSrc = setPrecision(fragmentSrc, precision);
        }

        /**
         * The shader program
         */
        this.program = compileProgram(gl, vertexSrc, fragmentSrc, attributeLocations);

        /**
         * The attributes of the shader as an object
         */
        this.attributes = extractAttributes(gl, this.program);

        /**
         * The uniforms of the shader as an object
         */
        this.uniformData = extractUniforms(gl, this.program);

        /**
         * The uniforms of the shader as an object
         */
        this.uniforms = generateUniformAccessObject(gl, this.uniformData);
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

        var gl = this.gl;
        gl.deleteProgram(this.program);
    }
}
