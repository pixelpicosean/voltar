precision highp float;
attribute vec2 a_vertex_position;
attribute vec2 a_texture_coord;
attribute vec4 a_color;
attribute float a_texture_id;

uniform mat3 projection_matrix;

varying vec2 v_texture_coord;
varying vec4 v_color;
varying float v_texture_id;

void main(void){
    gl_Position = vec4((projection_matrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);

    v_texture_coord = a_texture_coord;
    v_texture_id = a_texture_id;
    v_color = a_color;
}
