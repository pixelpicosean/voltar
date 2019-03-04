attribute vec2 a_vertex_position;
attribute vec2 a_texture_coord;

uniform mat3 projection_matrix;

varying vec2 v_texture_coord;

void main(void) {
    gl_Position = vec4((projection_matrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);
    v_texture_coord = a_texture_coord;
}
