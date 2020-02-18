precision mediump float;

uniform sampler2D texture;

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 instance_custom;

void main() {
    vec4 color = texture2D(texture, uv_interp) * color_interp;
    gl_FragColor = vec4(color.rgb * color.a, color.a);
}
