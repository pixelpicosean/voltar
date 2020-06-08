precision mediump float;

uniform sampler2D TEXTURE;
uniform highp float TIME;

/* GLOBALS */

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 instance_custom;

void main() {
    /* FRAGMENT_CODE_BEGIN */
    /* FRAGMENT_CODE_END */

    vec4 color = texture2D(TEXTURE, uv_interp) * color_interp;

    gl_FragColor = vec4(color.rgb * color.a, color.a);
}
