import mapType from './map_type';
import defaultValue from './default_value';

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
export default function extractUniforms(gl, program) {
    /**
     * @type {Object<string, UniformObject>}
     */
    var uniforms = {};

    var totalUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (var i = 0; i < totalUniforms; i++) {
        var uniformData = gl.getActiveUniform(program, i);
        var name = uniformData.name.replace(/\[.*?\]/, "");
        var type = mapType(gl, uniformData.type);

        uniforms[name] = {
            type: type,
            size: uniformData.size,
            location: gl.getUniformLocation(program, name),
            value: defaultValue(type, uniformData.size)
        };
    }

    return uniforms;
}
