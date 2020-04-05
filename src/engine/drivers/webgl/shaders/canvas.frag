precision mediump float;

uniform sampler2D TEXTURE;
uniform highp float TIME;

/* UNIFORM */

varying vec4 color_interp;
varying vec2 uv_interp;

void main() {
    vec4 COLOR = color_interp;
    vec2 UV = uv_interp;

    /* SHADER_BEGIN */
    COLOR = texture2D(TEXTURE, UV);
    /* SHADER_END */

    COLOR *= color_interp;

    gl_FragColor = vec4(COLOR.rgb * COLOR.a, COLOR.a);
}
