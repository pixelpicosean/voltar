import { GL } from 'engine/dep/index';

const frag_template = [
    'precision mediump float;',
    'void main(void){',
    'float test = 0.1;',
    '%forloop%',
    'gl_FragColor = vec4(0.0);',
    '}',
].join('\n');

export default function check_max_if_statments_in_shader(max_ifs, gl) {
    const create_temp_context = !gl;

    // @if DEBUG
    if (max_ifs === 0) {
        throw new Error('Invalid value of `0` passed to `checkMaxIfStatementsInShader`');
    }
    // @endif

    if (create_temp_context) {
        const tiny_canvas = document.createElement('canvas');

        tiny_canvas.width = 1;
        tiny_canvas.height = 1;

        gl = GL.createContext(tiny_canvas);
    }

    const shader = gl.createShader(gl.FRAGMENT_SHADER);

    while (true) // eslint-disable-line no-constant-condition
    {
        const fragment_src = frag_template.replace(/%forloop%/gi, generateIfTestSrc(max_ifs));

        gl.shaderSource(shader, fragment_src);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            max_ifs = (max_ifs / 2) | 0;
        }
        else {
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

function generateIfTestSrc(max_ifs) {
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
