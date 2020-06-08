uniform highp mat4 projection_matrix;
uniform highp float TIME;

/* GLOBALS */

attribute highp vec2 position;
attribute highp vec2 uv;
attribute lowp vec4 color;

varying vec4 color_interp;
varying vec2 uv_interp;

void main() {
    vec2 VERTEX = position;

    /* VERTEX_CODE_BEGIN */
    /* VERTEX_CODE_END */

    gl_Position = projection_matrix * vec4(VERTEX, 0.0, 1.0);

    color_interp = color;
    uv_interp = uv;
}
