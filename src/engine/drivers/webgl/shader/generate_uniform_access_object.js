/**
 * Extracts the attributes
 * @param gl {WebGLRenderingContext} The current WebGL rendering context
 * @param uniform_data {Object<string, import("./extract_uniforms").UniformObject>}
 */
export default function generate_uniform_access_object(gl, uniform_data) {
    // this is the object we will be sending back.
    // an object hierachy will be created for structs
    const uniforms = { data: {}, gl: gl };

    const uniform_keys = Object.keys(uniform_data);

    for (let i = 0; i < uniform_keys.length; i++) {
        const full_name = uniform_keys[i];

        const name_tokens = full_name.split('.');
        const name = name_tokens[name_tokens.length - 1];

        const uniform_group = get_uniform_group(name_tokens, uniforms);

        const uniform = uniform_data[full_name];
        uniform_group.data[name] = uniform;
        uniform_group.gl = gl;

        Object.defineProperty(uniform_group, name, {
            get: generate_getter(name),
            set: generate_setter(name, uniform)
        });
    }

    return uniforms;
}

const GLSL_SINGLE_SETTERS = {
    float: function setSingleFloat(gl, location, value) { gl.uniform1f(location, value); },
    vec2: function setSingleVec2(gl, location, value) { gl.uniform2f(location, value[0], value[1]); },
    vec3: function setSingleVec3(gl, location, value) { gl.uniform3f(location, value[0], value[1], value[2]); },
    vec4: function setSingleVec4(gl, location, value) { gl.uniform4f(location, value[0], value[1], value[2], value[3]); },

    int: function setSingleInt(gl, location, value) { gl.uniform1i(location, value); },
    ivec2: function setSingleIvec2(gl, location, value) { gl.uniform2i(location, value[0], value[1]); },
    ivec3: function setSingleIvec3(gl, location, value) { gl.uniform3i(location, value[0], value[1], value[2]); },
    ivec4: function setSingleIvec4(gl, location, value) { gl.uniform4i(location, value[0], value[1], value[2], value[3]); },

    bool: function setSingleBool(gl, location, value) { gl.uniform1i(location, value); },
    bvec2: function setSingleBvec2(gl, location, value) { gl.uniform2i(location, value[0], value[1]); },
    bvec3: function setSingleBvec3(gl, location, value) { gl.uniform3i(location, value[0], value[1], value[2]); },
    bvec4: function setSingleBvec4(gl, location, value) { gl.uniform4i(location, value[0], value[1], value[2], value[3]); },

    mat2: function setSingleMat2(gl, location, value) { gl.uniformMatrix2fv(location, false, value); },
    mat3: function setSingleMat3(gl, location, value) { gl.uniformMatrix3fv(location, false, value); },
    mat4: function setSingleMat4(gl, location, value) { gl.uniformMatrix4fv(location, false, value); },

    sampler2D: function setSingleSampler2D(gl, location, value) { gl.uniform1i(location, value); },
};

const GLSL_ARRAY_SETTERS = {
    float: function setFloatArray(gl, location, value) { gl.uniform1fv(location, value); },
    vec2: function setVec2Array(gl, location, value) { gl.uniform2fv(location, value); },
    vec3: function setVec3Array(gl, location, value) { gl.uniform3fv(location, value); },
    vec4: function setVec4Array(gl, location, value) { gl.uniform4fv(location, value); },
    int: function setIntArray(gl, location, value) { gl.uniform1iv(location, value); },
    ivec2: function setIvec2Array(gl, location, value) { gl.uniform2iv(location, value); },
    ivec3: function setIvec3Array(gl, location, value) { gl.uniform3iv(location, value); },
    ivec4: function setIvec4Array(gl, location, value) { gl.uniform4iv(location, value); },
    bool: function setBoolArray(gl, location, value) { gl.uniform1iv(location, value); },
    bvec2: function setBvec2Array(gl, location, value) { gl.uniform2iv(location, value); },
    bvec3: function setBvec3Array(gl, location, value) { gl.uniform3iv(location, value); },
    bvec4: function setBvec4Array(gl, location, value) { gl.uniform4iv(location, value); },
    sampler2D: function setSampler2DArray(gl, location, value) { gl.uniform1iv(location, value); },
};

/**
 * @param {string} name
 */
function generate_getter(name) {
    return function() {
        return this.data[name].value;
    };
}

/**
 * @param {string} name
 * @param {import("./extract_uniforms").UniformObject} uniform
 */
function generate_setter(name, uniform) {
    return function(/** @type {number} */value) {
        this.data[name].value = value;
        const location = this.data[name].location;
        if (uniform.size === 1) {
            GLSL_SINGLE_SETTERS[uniform.type](this.gl, location, value);
        } else {
            GLSL_ARRAY_SETTERS[uniform.type](this.gl, location, value);
        }
    };
}

/**
 * @param {string[]} name_tokens
 * @param {{ data: any, gl: WebGLRenderingContext }} uniform
 */
function get_uniform_group(name_tokens, uniform) {
    let cur = uniform;

    for (let i = 0; i < name_tokens.length - 1; i++) {
        let o = cur[name_tokens[i]] || { data: {}, gl: null };
        cur[name_tokens[i]] = o;
        cur = o;
    }

    return cur;
}
