import compile_program from './shader/compile_program';
import extract_attributes from './shader/extract_attributes';
import extract_uniforms from './shader/extract_uniforms';
import set_precision from './shader/set_precision';
import generate_uniform_access_object from './shader/generate_uniform_access_object';

export default class GLShader {
    /**
     * Helper class to create a webGL Shader
     *
     * @param gl {WebGLRenderingContext}
     * @param vertex_src {string} The vertex shader source as string.
     * @param fragment_src {string} The fragment shader source asstring.
     * @param precision {string} The float precision of the shader. Options are 'lowp', 'mediump' or 'highp'.
     * @param attribute_locations {{ [key:string]: number }} A key value pair showing which location eact attribute should sit eg {position:0, uvs:1}
     */
    constructor(gl, vertex_src, fragment_src, precision, attribute_locations) {
        /**
         * The current WebGL rendering context
         *
         * @type {WebGLRenderingContext}
         */
        this.gl = gl;

        if (precision) {
            vertex_src = set_precision(vertex_src, precision);
            fragment_src = set_precision(fragment_src, precision);
        }

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
