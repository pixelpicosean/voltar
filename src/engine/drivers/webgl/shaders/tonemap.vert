precision highp float;

attribute vec4 vertex_attrib; // attrib:0
attribute vec2 uv_in; // attrib:4

varying vec2 uv_interp;

#if defined(USE_FXAA)
    uniform vec2 pixel_size;

    varying vec2 v_rgbNW;
    varying vec2 v_rgbNE;
    varying vec2 v_rgbSW;
    varying vec2 v_rgbSE;
    varying vec2 v_rgbM;

    void texcoords(vec2 fragCoord, vec2 pixel_size,
                    out vec2 v_rgbNW, out vec2 v_rgbNE,
                    out vec2 v_rgbSW, out vec2 v_rgbSE,
                    out vec2 v_rgbM)
    {
        v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * pixel_size;
        v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * pixel_size;
        v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * pixel_size;
        v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * pixel_size;
        v_rgbM = vec2(fragCoord * pixel_size);
    }
#endif

void main() {
    gl_Position = vertex_attrib;
    uv_interp = uv_in;

    #if defined(USE_FXAA)
        vec2 frag_coord = uv_interp / pixel_size;
        texcoords(frag_coord, pixel_size, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
    #endif
}
