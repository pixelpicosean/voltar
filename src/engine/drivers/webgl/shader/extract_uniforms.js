import map_type from './map_type';
import default_value from './default_value';

/**
 * @typedef UniformObject
 * @property {string} type
 * @property {number} size
 * @property {WebGLUniformLocation} location
 * @property {any} value
 */

/**
 * Extracts the uniforms
 * @param gl {WebGLRenderingContext} The current WebGL rendering context
 * @param program {WebGLProgram} The shader program to get the uniforms from
 */
export default function extract_uniforms(gl, program) {
    /**
     * @type {Object<string, UniformObject>}
     */
    const uniforms = {};

    const total_uniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (let i = 0; i < total_uniforms; i++) {
        const uniform_data = gl.getActiveUniform(program, i);
        const name = uniform_data.name.replace(/\[.*?\]/, "");
        const type = map_type(gl, uniform_data.type);

        uniforms[name] = {
            type: type,
            size: uniform_data.size,
            location: gl.getUniformLocation(program, name),
            value: default_value(type, uniform_data.size)
        };
    }

    return uniforms;
}
