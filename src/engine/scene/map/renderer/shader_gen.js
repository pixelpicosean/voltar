export function fill_samplers(shader, max_textures) {
    var sample_values = [];
    for (var i = 0; i < max_textures; i++) {
        sample_values[i] = i;
    }
    shader.bind();
    shader.uniforms.uSamplers = sample_values;

    var sampler_size = [];
    for (i = 0; i < max_textures; i++) {
        sampler_size.push(1.0 / 2048);
        sampler_size.push(1.0 / 2048);
    }
    shader.uniforms.uSamplerSize = sampler_size;
}

export function generate_fragment_src(max_textures, fragment_src) {
    return fragment_src.replace(/%count%/gi, max_textures + "")
        .replace(/%forloop%/gi, generate_sample_src(max_textures));
}

export function generate_sample_src(max_textures) {
    var src = '';

    src += '\n';
    src += '\n';

    src += 'if(vTextureId <= -1.0) {';
    src += '\n\tcolor = vec4(0.0, 0.0, 0.0, 0.5);';
    src += '\n}';

    for (var i = 0; i < max_textures; i++) {
        src += '\nelse ';

        if (i < max_textures - 1) {
            src += 'if(textureId == ' + i + '.0)';
        }

        src += '\n{';
        src += '\n\tcolor = texture2D(uSamplers[' + i + '], textureCoord * uSamplerSize[' + i + ']);';
        src += '\n}';
    }

    src += '\n';
    src += '\n';

    return src;
}
