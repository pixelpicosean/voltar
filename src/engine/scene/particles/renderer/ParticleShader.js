import Shader from 'engine/Shader';

export default class ParticleShader extends Shader {
    /**
     * @param {WebGLRenderingContext} gl
     */
    constructor(gl) {
        super(
            gl,
            // vertex shader
            [
                'attribute vec2 aVertexPosition;',
                'attribute vec2 aTextureCoord;',
                'attribute vec4 aColor;',

                'attribute vec2 aPositionCoord;',
                'attribute float aRotation;',

                'uniform mat3 projectionMatrix;',
                'uniform vec4 uColor;',

                'varying vec2 vTextureCoord;',
                'varying vec4 vColor;',

                'void main(void){',
                '   float x = (aVertexPosition.x) * cos(aRotation) - (aVertexPosition.y) * sin(aRotation);',
                '   float y = (aVertexPosition.x) * sin(aRotation) + (aVertexPosition.y) * cos(aRotation);',

                '   vec2 v = vec2(x, y);',
                '   v = v + aPositionCoord;',

                '   gl_Position = vec4((projectionMatrix * vec3(v, 1.0)).xy, 0.0, 1.0);',

                '   vTextureCoord = aTextureCoord;',
                '   vColor = aColor * uColor;',
                '}',
            ].join('\n'),
            // fragment shader
            [
                'varying vec2 vTextureCoord;',
                'varying vec4 vColor;',

                'uniform sampler2D uSampler;',

                'void main(void){',
                '  vec4 color = texture2D(uSampler, vTextureCoord) * vColor;',
                '  gl_FragColor = color;',
                '}',
            ].join('\n')
        );
    }
}
