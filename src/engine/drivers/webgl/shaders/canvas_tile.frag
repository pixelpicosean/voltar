precision mediump float;

uniform sampler2D texture;
uniform highp vec4 frame_uv;

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 flags_n_interp; // 4 comp = fill mode, unused, unused, unused

void main() {
    vec4 color;

    vec2 uv_pct = mod(uv_interp, vec2(1.0, 1.0));
    vec2 real_uv = frame_uv.xy + (frame_uv.zw - frame_uv.xy) * uv_pct;
    vec4 img_color = texture2D(texture, real_uv);

    if (uv_interp.x < 0.0) {
        /* flat shading when uv is negative */
        color = color_interp;
    } else if (flags_n_interp.x > 0.5) {
        /* fill mode */
        color = vec4(color_interp.rgb, img_color.a);
    } else {
        /* normal mode */
        color = img_color * color_interp;
    }

    gl_FragColor = vec4(color.rgb * color.a, color.a);
}
