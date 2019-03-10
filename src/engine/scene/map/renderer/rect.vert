uniform mat3 projection_matrix;

attribute vec2 a_vertex_position;
attribute vec2 a_texture_coord;
attribute vec4 a_frame;
attribute float a_texture_id;

varying vec2 v_texture_coord;
varying float v_texture_id;
varying vec4 v_frame;

void main(void) {
   gl_Position = vec4((projection_matrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);
   v_texture_coord = a_texture_coord;
   v_frame = a_frame;
   v_texture_id = a_texture_id;
}
