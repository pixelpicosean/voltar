import GLShader from 'engine/drivers/webgl/gl_shader';

const Vert = `
    uniform mat3 projection_matrix;
    uniform vec4 u_color;

    attribute vec2 a_vertex_position;
    attribute vec2 a_texture_coord;
    attribute vec4 a_color;

    attribute vec2 a_position_coord;
    attribute float a_rotation;

    varying vec2 v_texture_coord;
    varying vec4 v_color;

    void main(void) {
        float x = (a_vertex_position.x) * cos(a_rotation) - (a_vertex_position.y) * sin(a_rotation);
        float y = (a_vertex_position.x) * sin(a_rotation) + (a_vertex_position.y) * cos(a_rotation);

        vec2 v = vec2(x, y);
        v = v + a_position_coord;

        gl_Position = vec4((projection_matrix * vec3(v, 1.0)).xy, 0.0, 1.0);

        v_texture_coord = a_texture_coord;
        v_color = a_color * u_color;
    }
`;

const Frag = `
    uniform sampler2D u_sampler;

    varying vec2 v_texture_coord;
    varying vec4 v_color;

    void main(void) {
        vec4 color = texture2D(u_sampler, v_texture_coord) * v_color;
        gl_FragColor = color;
    }
`;

export default class ParticleShader extends GLShader {
    /**
     * @param {WebGLRenderingContext} gl
     */
    constructor(gl) {
        super(gl, Vert, Frag);
    }
}
