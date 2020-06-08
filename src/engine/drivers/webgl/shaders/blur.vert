attribute vec2 vertex_attrib;
attribute vec2 uv_attrib;

varying vec2 uv_interp;

#ifdef USE_BLUR_SECTION
    uniform vec4 blur_section;
#endif

void main() {
    uv_interp = uv_attrib;
    gl_Position = vec4(vertex_attrib, 0.0, 1.0);

    #ifdef USE_BLUR_SECTION
        uv_interp = blur_section.xy + uv_interp * blur_section.zw;
        gl_Position.xy = (blur_section.xy + (gl_Position.xy * 0.5 + 0.5) * blur_section.zw) * 2.0 - 1.0;
    #endif
}
