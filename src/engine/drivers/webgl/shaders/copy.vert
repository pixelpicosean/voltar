attribute highp vec4 vertex_attrib; // attrib:0
#if defined(USE_CUBEMAP) || defined(USE_PANORAMA)
    attribute vec3 cube_in; // attrib:4
#else
    attribute vec2 uv_in; // attrib:4
#endif

#if defined(USE_CUBEMAP) || defined(USE_PANORAMA)
    varying vec3 cube_interp;
#else
    varying vec2 uv_interp;
#endif

// These definitions are here because the shader-wrapper builder does
// not understand `#elif defined()`
#ifdef USE_DISPLAY_TRANSFORM
#endif

#ifdef USE_COPY_SECTION
    uniform highp vec4 copy_section;
#elif defined(USE_DISPLAY_TRANSFORM)
    uniform highp mat4 display_transform;
#endif

void main() {
    #if defined(USE_CUBEMAP) || defined(USE_PANORAMA)
        cube_interp = cube_in;
    #else
        uv_interp = uv_in;
    #endif

    gl_Position = vertex_attrib;

    #ifdef USE_COPY_SECTION
        uv_interp = copy_section.xy + uv_interp * copy_section.zw;
        gl_Position.xy = (copy_section.xy + (gl_Position.xy * 0.5 + 0.5) * copy_section.zw) * 2.0 - 1.0;
    #elif defined(USE_DISPLAY_TRANSFORM)
        uv_interp = (display_transform * vec4(uv_in, 1.0, 1.0)).xy;
    #endif
}
