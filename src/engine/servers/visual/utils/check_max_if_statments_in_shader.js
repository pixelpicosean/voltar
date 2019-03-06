import create_context from 'engine/drivers/webgl/create_context';

const frag_template = `
precision mediump float;
void main(void) {
    float test = 0.1;
    %forloop%
    gl_FragColor = vec4(0.0);
}
`;

/**
 * @param {number} max_ifs
 * @param {WebGLRenderingContext} gl
 */
export default function check_max_if_statments_in_shader(max_ifs, gl) {
    const create_temp_context = !gl;

    if (max_ifs === 0) {
        throw new Error('Invalid value of `0` passed to `checkMaxIfStatementsInShader`');
    }

    if (create_temp_context) {
        const tiny_canvas = document.createElement('canvas');

        tiny_canvas.width = 1;
        tiny_canvas.height = 1;

        gl = create_context(tiny_canvas);
    }

    const shader = gl.createShader(gl.FRAGMENT_SHADER);

    while (true) {
        const fragment_src = frag_template.replace(/%forloop%/gi, generate_if_test_src(max_ifs));

        gl.shaderSource(shader, fragment_src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            max_ifs = (max_ifs / 2) | 0;
        } else {
            // valid!
            break;
        }
    }

    if (create_temp_context) {
        // get rid of context
        if (gl.getExtension('WEBGL_lose_context')) {
            gl.getExtension('WEBGL_lose_context').loseContext();
        }
    }

    return max_ifs;
}

/**
 * @param {number} max_ifs
 */
function generate_if_test_src(max_ifs) {
    let src = '';

    for (let i = 0; i < max_ifs; ++i) {
        if (i > 0) {
            src += '\nelse ';
        }

        if (i < max_ifs - 1) {
            src += `if(test == ${i}.0){}`;
        }
    }

    return src;
}
