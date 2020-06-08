precision mediump float;

uniform sampler2D TEXTURE;
uniform sampler2D SCREEN_TEXTURE;
uniform highp float TIME;
uniform vec2 SCREEN_PIXEL_SIZE;

uniform highp vec4 frame_uv;

/* GLOBALS */

varying vec4 color_interp;
varying vec2 uv_interp;

void main() {
    vec4 COLOR = color_interp;

    vec2 uv_pct = mod(uv_interp, vec2(1.0, 1.0));
    vec2 UV = frame_uv.xy + (frame_uv.zw - frame_uv.xy) * uv_pct;
    vec2 SCREEN_UV = gl_FragCoord.xy * SCREEN_PIXEL_SIZE;

    /* FRAGMENT_CODE_BEGIN */
    COLOR = texture2D(TEXTURE, UV);
    /* FRAGMENT_CODE_END */

    COLOR *= color_interp;

    gl_FragColor = vec4(COLOR.rgb * COLOR.a, COLOR.a);
}
