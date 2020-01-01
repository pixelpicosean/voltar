precision mediump float;

uniform sampler2D texture;

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 flags_n_interp; // 4 comp = fill mode, unused, unused, unused

void main() {
    vec4 color;

    if (uv_interp.x < 0.0) {
        /* flat shading when uv is negative */
        color = color_interp;
    } else if (flags_n_interp.x > 0.5) {
        /* fill mode */
        color = vec4(color_interp.rgb, texture2D(texture, uv_interp).a);
    } else {
        /* normal mode */
        color = texture2D(texture, uv_interp) * color_interp;
    }

    gl_FragColor = vec4(color.rgb * color.a, color.a);
}
