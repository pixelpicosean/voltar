uniform highp mat4 CAMERA_MATRIX;
uniform highp mat4 INV_CAMERA_MATRIX;
uniform highp mat4 PROJECTION_MATRIX;
uniform highp mat4 INV_PROJECTION_MATRIX;
uniform highp mat4 WORLD_MATRIX;
uniform highp float TIME;

/* UNIFORM */

attribute highp vec3 position;
attribute vec3 normal;
attribute vec3 tangent;
attribute vec2 uv;

varying vec2 uv_interp;
varying float light_direction;

void main() {
    uv_interp = uv;

    vec3 VERTEX = position;
    vec3 NORMAL = normal;
    vec3 TANGENT = tangent;

    mat4 MODELVIEW_MATRIX = INV_CAMERA_MATRIX * WORLD_MATRIX;

    float POINT_SIZE = 1.0;

    /* SHADER */

    gl_PointSize = POINT_SIZE;

    vec4 position = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
    NORMAL = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);

    gl_Position = PROJECTION_MATRIX * vec4(position.xyz, 1.0);

    // light
    vec3 directional_vector = normalize(vec3(0.85, 0.8, 0.75));

    light_direction = max(dot(NORMAL, directional_vector), 0.0);
}
