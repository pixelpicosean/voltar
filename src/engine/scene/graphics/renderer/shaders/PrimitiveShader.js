import Shader from 'engine/Shader';

const vert = `
    attribute vec2 a_vertex_position;
    attribute vec4 a_color;

    uniform mat3 translation_matrix;
    uniform mat3 projection_matrix;

    uniform float alpha;
    uniform vec3 tint;

    varying vec4 v_color;

    void main(void) {
        gl_Position = vec4((projection_matrix * translation_matrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);
        v_color = a_color * vec4(tint * alpha, alpha);
    }
`;

const frag = `
    varying vec4 v_color;

    void main(void) {
        gl_FragColor = v_color;
    }
`;

/**
 * This shader is used to draw simple primitive shapes for Graphics.
 */
export default class PrimitiveShader extends Shader {
    /**
     * @param {WebGLRenderingContext} gl - The webgl shader manager this shader works for.
     */
    constructor(gl) {
        super(gl, vert, frag);
    }
}
