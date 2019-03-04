/**
 * @param gl {WebGLRenderingContext} The current WebGL context {WebGLProgram}
 * @param vertex_src {string} The vertex shader source as string.
 * @param fragment_src {string} The fragment shader source as string.
 * @param attribute_locations {{ [key:string]: number }} An attribute location map that lets you manually set the attribute locations
 */
export default function compile_program(gl, vertex_src, fragment_src, attribute_locations) {
    var gl_vert_shader = compile_shader(gl, gl.VERTEX_SHADER, vertex_src);
    var gl_frag_shader = compile_shader(gl, gl.FRAGMENT_SHADER, fragment_src);

    var program = gl.createProgram();

    gl.attachShader(program, gl_vert_shader);
    gl.attachShader(program, gl_frag_shader);

    // optionally, set the attributes manually for the program rather than letting WebGL decide..
    if (attribute_locations) {
        for (var i in attribute_locations) {
            gl.bindAttribLocation(program, attribute_locations[i], i);
        }
    }

    gl.linkProgram(program);

    // if linking fails, then log and cleanup
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error: Could not initialize shader.');
        console.error('gl.VALIDATE_STATUS', gl.getProgramParameter(program, gl.VALIDATE_STATUS));
        console.error('gl.getError()', gl.getError());

        // if there is a program info log, log it
        if (gl.getProgramInfoLog(program) !== '') {
            console.warn('Pixi.js Warning: gl.getProgramInfoLog()', gl.getProgramInfoLog(program));
        }

        gl.deleteProgram(program);
        program = null;
    }

    // clean up some shaders
    gl.deleteShader(gl_vert_shader);
    gl.deleteShader(gl_frag_shader);

    return program;
}

/**
 * @param gl {WebGLRenderingContext} The current WebGL context {WebGLProgram}
 * @param type {Number} the type, can be either VERTEX_SHADER or FRAGMENT_SHADER
 * @param vertexSrc {string} The vertex shader source as string.
 */
function compile_shader(gl, type, vertexSrc) {
    var shader = gl.createShader(type);

    gl.shaderSource(shader, vertexSrc);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}
