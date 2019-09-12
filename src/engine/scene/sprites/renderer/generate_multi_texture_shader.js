import GLShader from 'engine/drivers/pixi/gl_shader';

import vertex_src from './texture.vert';

const frag_template = `
    uniform sampler2D u_samplers[%count%];

    varying vec2 v_texture_coord;
    varying vec4 v_color;
    varying float v_color_mode;
    varying float v_texture_id;

    void main(void) {
        vec4 color;
        %forloop%
        if (v_color_mode == 0.0) {
            // multiply texture and color
            gl_FragColor = color * v_color;
        } else {
            // solid color + texture alpha
            gl_FragColor = vec4(v_color) * color.a;
        }
    }
`

/**
 * @param {WebGLRenderingContext} gl
 * @param {number} max_textures
 */
export default function generate_multi_texture_shader(gl, max_textures) {
    let fragment_src = frag_template;

    fragment_src = fragment_src.replace(/%count%/gi, `${max_textures}`);
    fragment_src = fragment_src.replace(/%forloop%/gi, generate_sample_src(max_textures));

    const shader = new GLShader(gl, vertex_src, fragment_src);

    /** @type {number[]} */
    const sample_values = [];

    for (let i = 0; i < max_textures; i++) {
        sample_values[i] = i;
    }

    shader.bind();
    shader.uniforms.u_samplers = sample_values;

    return shader;
}

/**
 * @param {number} max_textures
 */
function generate_sample_src(max_textures) {
    let src = '';

    src += '\n';
    src += '\n';

    for (let i = 0; i < max_textures; i++) {
        if (i > 0) {
            src += '\nelse ';
        }

        if (i < max_textures - 1) {
            src += `if (v_texture_id < ${i}.5)`;
        }

        src += '\n{';
        src += `\n    color = texture2D(u_samplers[${i}], v_texture_coord);`;
        src += '\n}';
    }

    src += '\n';
    src += '\n';

    return src;
}
