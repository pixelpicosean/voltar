precision mediump float;

uniform highp mat4 camera_matrix;
uniform highp mat4 camera_inverse_matrix;
uniform highp mat4 projection_matrix;
uniform highp mat4 projection_inverse_matrix;
uniform highp mat4 world_transform;
uniform highp float TIME;

uniform sampler2D TEXTURE;
uniform sampler2D SCREEN_TEXTURE;
uniform vec2 SCREEN_PIXEL_SIZE;

uniform vec4 bg_color;
uniform float bg_energy;

uniform vec4 ambient_color;
uniform float ambient_energy;

/* UNIFORM */

varying vec2 uv_interp;

void main() {
    vec4 COLOR;
    vec2 UV = uv_interp;
    vec2 SCREEN_UV = gl_FragCoord.xy * SCREEN_PIXEL_SIZE;

    /* SHADER_BEGIN */
    COLOR = texture2D(TEXTURE, UV);
    /* SHADER_END */

    gl_FragColor = vec4(COLOR.rgb * COLOR.a, COLOR.a);
}
