uniform highp mat4 CAMERA_MATRIX;
uniform highp mat4 INV_CAMERA_MATRIX;
uniform highp mat4 PROJECTION_MATRIX;
uniform highp mat4 INV_PROJECTION_MATRIX;
uniform highp mat4 WORLD_MATRIX;

uniform highp vec4 LIGHT_COLOR;
uniform highp float LIGHT_SPECULAR;
uniform highp vec3 LIGHT_DIRECTION;

uniform highp float TIME;

/* UNIFORM */

attribute highp vec3 position;
attribute vec3 normal;
attribute vec4 tangent;
attribute lowp vec4 color;
attribute vec2 uv;
attribute vec2 uv2;

varying highp vec3 vertex_interp;
varying vec3 normal_interp;
varying lowp vec4 color_interp;
varying vec2 uv_interp;
varying vec2 uv2_interp;

void main() {
    vec3 VERTEX = position;
    vec3 NORMAL = normal;
    vec3 TANGENT = tangent.xyz;

    mat4 MODELVIEW_MATRIX = INV_CAMERA_MATRIX * WORLD_MATRIX;

    float POINT_SIZE = 1.0;

    /* SHADER */

    gl_PointSize = POINT_SIZE;

    vec4 vertex = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
    NORMAL = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);

    vertex_interp = vertex.xyz;
    normal_interp = NORMAL;
    uv_interp = uv;

    gl_Position = PROJECTION_MATRIX * vec4(vertex.xyz, 1.0);
}
