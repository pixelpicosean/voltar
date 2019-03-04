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
                'attribute vec2 a_vertex_position;',
                'attribute vec2 a_texture_coord;',
                'attribute vec4 a_color;',

                'attribute vec2 aPositionCoord;',
                'attribute float aRotation;',

                'uniform mat3 projection_matrix;',
                'uniform vec4 uColor;',

                'varying vec2 v_texture_coord;',
                'varying vec4 v_color;',

                'void main(void){',
                '   float x = (a_vertex_position.x) * cos(aRotation) - (a_vertex_position.y) * sin(aRotation);',
                '   float y = (a_vertex_position.x) * sin(aRotation) + (a_vertex_position.y) * cos(aRotation);',

                '   vec2 v = vec2(x, y);',
                '   v = v + aPositionCoord;',

                '   gl_Position = vec4((projection_matrix * vec3(v, 1.0)).xy, 0.0, 1.0);',

                '   v_texture_coord = a_texture_coord;',
                '   v_color = a_color * uColor;',
                '}',
            ].join('\n'),
            // fragment shader
            [
                'varying vec2 v_texture_coord;',
                'varying vec4 v_color;',

                'uniform sampler2D u_sampler;',

                'void main(void){',
                '  vec4 color = texture2D(u_sampler, v_texture_coord) * v_color;',
                '  gl_FragColor = color;',
                '}',
            ].join('\n')
        );
    }
}
