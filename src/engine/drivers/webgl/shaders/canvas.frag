precision mediump float;

uniform sampler2D texture;

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 flags_n_interp; // 4 bytes = flat, fill mode, unused, unused

void main() {
    vec4 color;

    // flat shading?
    if (flags_n_interp.r > 0.5) {
        color = color_interp;
    } else {
        color = texture2D(texture, uv_interp) * color_interp;
    }

    if (flags_n_interp.g > 0.5) {
        color.rgb = vec3(1.0, 1.0, 1.0);
    }

    gl_FragColor = vec4(color.rgb * color.a, color.a);
}
