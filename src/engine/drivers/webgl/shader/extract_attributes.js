import mapType from './map_type';
import mapSize from './map_size';

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
export default function extractAttributes(gl, program) {
    /**
     * @type {Object<string, AttributeObject>}
     */
    var attributes = {};

    var totalAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

    for (var i = 0; i < totalAttributes; i++) {
        var attribData = gl.getActiveAttrib(program, i);
        var type = mapType(gl, attribData.type);

        // TODO: make an attribute object
        attributes[attribData.name] = {
            type: type,
            size: mapSize(type),
            location: gl.getAttribLocation(program, attribData.name),
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
