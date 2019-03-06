import GLShader from "engine/drivers/webgl/gl_shader";

/**
 * @param {GLShader} shader
 * @param {number} max_textures
 */
export function fill_samplers(shader, max_textures) {
    var sample_values = [];
    for (var i = 0; i < max_textures; i++) {
        sample_values[i] = i;
    }
    shader.bind();
    shader.uniforms.u_samplers = sample_values;

    var sampler_size = [];
    for (i = 0; i < max_textures; i++) {
        sampler_size.push(1.0 / 2048);
        sampler_size.push(1.0 / 2048);
    }
    shader.uniforms.u_sampler_size = sampler_size;
}

/**
 * @param {number} max_textures
 * @param {string} fragment_src
 */
export function generate_fragment_src(max_textures, fragment_src) {
    return fragment_src.replace(/%count%/gi, max_textures + "")
        .replace(/%forloop%/gi, generate_sample_src(max_textures));
}

/**
 * @param {number} max_textures
 */
export function generate_sample_src(max_textures) {
    var src = '';

    src += '\n';
    src += '\n';

    src += 'if (v_texture_id <= -1.0) {';
    src += '\n\tcolor = vec4(0.0, 0.0, 0.0, 0.5);';
    src += '\n}';

    for (var i = 0; i < max_textures; i++) {
        src += '\nelse ';

        if (i < max_textures - 1) {
            src += 'if (texture_id == ' + i + '.0)';
        }

        src += '\n{';
        src += '\n    color = texture2D(u_samplers[' + i + '], texture_coord * u_sampler_size[' + i + ']);';
        src += '\n}';
    }

    src += '\n';
    src += '\n';

    return src;
}
