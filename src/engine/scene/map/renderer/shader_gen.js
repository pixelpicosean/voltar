export function fillSamplers(shader, maxTextures) {
    var sampleValues = [];
    for (var i = 0; i < maxTextures; i++)
    {
        sampleValues[i] = i;
    }
    shader.bind();
    shader.uniforms.uSamplers = sampleValues;

    var samplerSize = [];
    for (i = 0; i < maxTextures; i++) {
        samplerSize.push(1.0 / 2048);
        samplerSize.push(1.0 / 2048);
    }
    shader.uniforms.uSamplerSize = samplerSize;
}

export function generateFragmentSrc(maxTextures, fragmentSrc) {
    return fragmentSrc.replace(/%count%/gi, maxTextures + "")
        .replace(/%forloop%/gi, generateSampleSrc(maxTextures));
}

export function generateSampleSrc(maxTextures) {
    var src = '';

    src += '\n';
    src += '\n';

    src += 'if(vTextureId <= -1.0) {';
    src += '\n\tcolor = vec4(0.0, 0.0, 0.0, 0.5);';
    src += '\n}';

    for (var i = 0; i < maxTextures; i++)
    {
        src += '\nelse ';

        if(i < maxTextures-1)
        {
            src += 'if(textureId == ' + i + '.0)';
        }

        src += '\n{';
        src += '\n\tcolor = texture2D(uSamplers['+i+'], textureCoord * uSamplerSize['+i+']);';
        src += '\n}';
    }

    src += '\n';
    src += '\n';

    return src;
}
