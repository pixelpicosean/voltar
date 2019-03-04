attribute vec2 a_vertex_position;
attribute vec2 a_texture_coord;

uniform mat3 projection_matrix;
uniform mat3 translationMatrix;
uniform mat3 uTransform;

varying vec2 v_texture_coord;

void main(void)
{
    gl_Position = vec4((projection_matrix * translationMatrix * vec3(a_vertex_position, 1.0)).xy, 0.0, 1.0);

    v_texture_coord = (uTransform * vec3(a_texture_coord, 1.0)).xy;
}
