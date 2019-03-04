/**
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 */
export default function map_type(gl, type) {
    if (!GL_TABLE) {
        GL_TABLE = {};

        const type_names = Object.keys(GL_TO_GLSL_TYPES);
        for (const tn of type_names) {
            GL_TABLE[gl[tn]] = GL_TO_GLSL_TYPES[tn];
        }
    }

    return GL_TABLE[type];
}

/**
 * @type {Object<string, string>}
 */
let GL_TABLE = null;

/** @type {Object<string, string>} */
const GL_TO_GLSL_TYPES = {
    'FLOAT': 'float',
    'FLOAT_VEC2': 'vec2',
    'FLOAT_VEC3': 'vec3',
    'FLOAT_VEC4': 'vec4',

    'INT': 'int',
    'INT_VEC2': 'ivec2',
    'INT_VEC3': 'ivec3',
    'INT_VEC4': 'ivec4',

    'BOOL': 'bool',
    'BOOL_VEC2': 'bvec2',
    'BOOL_VEC3': 'bvec3',
    'BOOL_VEC4': 'bvec4',

    'FLOAT_MAT2': 'mat2',
    'FLOAT_MAT3': 'mat3',
    'FLOAT_MAT4': 'mat4',

    'SAMPLER_2D': 'sampler2D',
};
