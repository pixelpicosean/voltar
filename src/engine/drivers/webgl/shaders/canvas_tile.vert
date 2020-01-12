uniform highp mat4 projection_matrix;
uniform highp float time;

attribute highp vec2 position;
attribute highp vec2 uv;
attribute lowp vec4 color;

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 flags_n_interp;

void main() {
    gl_Position = projection_matrix * vec4(position, 0.0, 1.0);

    color_interp = color;
    uv_interp = uv;
}
