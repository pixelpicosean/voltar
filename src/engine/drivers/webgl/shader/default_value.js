/**
 * @param type {string} Type of value
 * @param size {number}
 */
export default function defaultValue(type, size) {
    switch (type) {
        case 'float':
            return 0;

        case 'vec2':
            return new Float32Array(2 * size);

        case 'vec3':
            return new Float32Array(3 * size);

        case 'vec4':
            return new Float32Array(4 * size);

        case 'int':
        case 'sampler2D':
            return 0;

        case 'ivec2':
            return new Int32Array(2 * size);

        case 'ivec3':
            return new Int32Array(3 * size);

        case 'ivec4':
            return new Int32Array(4 * size);

        case 'bool':
            return false;

        case 'bvec2':

            return boolean_array(2 * size);

        case 'bvec3':
            return boolean_array(3 * size);

        case 'bvec4':
            return boolean_array(4 * size);

        case 'mat2':
            return new Float32Array([1, 0,
                0, 1]);

        case 'mat3':
            return new Float32Array([1, 0, 0,
                0, 1, 0,
                0, 0, 1]);

        case 'mat4':
            return new Float32Array([1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1]);
    }
}

/**
 * @param {number} size
 */
function boolean_array(size) {
    var array = new Array(size);

    for (var i = 0; i < array.length; i++) {
        array[i] = false;
    }

    return array;
}
