import Shader from '../../../../Shader';

/**
 * This shader is used to draw simple primitive shapes for {@link V.Graphics}.
 *
 * @class
 * @memberof V
 * @extends V.Shader
 */
export default class PrimitiveShader extends Shader
{
    /**
     * @param {WebGLRenderingContext} gl - The webgl shader manager this shader works for.
     */
    constructor(gl)
    {
        super(gl,
            // vertex shader
            [
                'attribute vec2 a_vertex_position;',
                'attribute vec4 aColor;',

                'uniform mat3 translationMatrix;',
                'uniform mat3 projection_matrix;',

                'uniform float alpha;',
                'uniform vec3 tint;',

                'varying vec4 vColor;',

                'void main(void){',
                '   gl_Position = vec4((projection_matrix * translationMatrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);',
                '   vColor = aColor * vec4(tint * alpha, alpha);',
                '}',
            ].join('\n'),
            // fragment shader
            [
                'varying vec4 vColor;',

                'void main(void){',
                '   gl_FragColor = vColor;',
                '}',
            ].join('\n')
        );
    }
}
