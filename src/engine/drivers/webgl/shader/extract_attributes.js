import map_type from './map_type';
import map_size from './map_size';

/**
 * @typedef AttributeObject
 * @property {string} type
 * @property {number} size
 * @property {number} location
 * @property {( type?: number, normalized?: boolean, stride?: number, start?: number) => void} pointer
 */

/**
 * Extracts the attributes
 * @param gl {WebGLRenderingContext} The current WebGL rendering context
 * @param program {WebGLProgram} The shader program to get the attributes from
 */
export default function extract_attributes(gl, program) {
    /**
     * @type {Object<string, AttributeObject>}
     */
    const attributes = {};

    const total_attributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (let i = 0; i < total_attributes; i++) {
        const attrib_data = gl.getActiveAttrib(program, i);
        const type = map_type(gl, attrib_data.type);

        attributes[attrib_data.name] = {
            type: type,
            size: map_size(type),
            location: gl.getAttribLocation(program, attrib_data.name),
            /**
             * @param {number} [type]
             * @param {boolean} [normalized]
             * @param {number} [stride]
             * @param {number} [start]
             */
            pointer: function (type = gl.FLOAT, normalized = false, stride = 0, start = 0) {
                gl.vertexAttribPointer(this.location, this.size, type, normalized, stride, start);
            },
        };
    }

    return attributes;
}
