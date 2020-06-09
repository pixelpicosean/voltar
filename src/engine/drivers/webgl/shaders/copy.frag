precision mediump float;
precision mediump int;

#define M_PI 3.14159265359

#if defined(USE_CUBEMAP) || defined(USE_PANORAMA)
    varying vec3 cube_interp;
#else
    varying vec2 uv_interp;
#endif

#ifdef USE_CUBEMAP
    uniform samplerCube source_cube; // texunit:0
#else
    uniform sampler2D source; // texunit:0
#endif

#ifdef SEP_CBCR_TEXTURE
    uniform sampler2D CbCr; //texunit:1
#endif

#ifdef USE_MULTIPLIER
    uniform float multiplier;
#endif

#ifdef USE_CUSTOM_ALPHA
    uniform float custom_alpha;
#endif

#if defined(USE_PANORAMA)
    uniform highp mat4 sky_transform;

    vec4 texturePanorama(sampler2D pano, vec3 normal) {
        vec2 st = vec2(
            atan(normal.x, normal.z),
            acos(normal.y)
        );

        if (st.x < 0.0) {
            st.x += M_PI * 2.0;
        }

        st /= vec2(M_PI * 2.0, M_PI);

        return texture2D(pano, st);
    }
#endif

void main() {
    #ifdef USE_PANORAMA
        vec3 cube_normal = normalize(cube_interp);
        cube_normal.z = -cube_normal.z;
        cube_normal = mat3(sky_transform) * cube_normal;
        cube_normal.z = -cube_normal.z;

        vec4 color = texturePanorama(source, cube_normal);
    #elif defined(USE_CUBEMAP)
        vec4 color = textureCube(source_cube, normalize(cube_interp));
    #elif defined(SEP_CBCR_TEXTURE)
        vec4 color;
        color.r = texture2D(source, uv_interp).r;
        color.gb = texture2D(CbCr, uv_interp).rg - vec2(0.5, 0.5);
        color.a = 1.0;
    #else
        vec4 color = texture2D(source, uv_interp);
    #endif

    #ifdef YCBCR_TO_RGB
        // YCbCr -> RGB conversion

        // Using BT.601, which is the standard for SDTV is provided as a reference
        color.rgb = mat3(
            vec3(1.00000, 1.00000, 1.00000),
            vec3(0.00000, -0.34413, 1.77200),
            vec3(1.40200, -0.71414, 0.00000)
        ) * color.rgb;
    #endif

    #ifdef USE_NO_ALPHA
        color.a = 1.0;
    #endif

    #ifdef USE_CUSTOM_ALPHA
        color.a = custom_alpha;
    #endif

    #ifdef USE_MULTIPLIER
        color.rgb *= multiplier;
    #endif

	gl_FragColor = color;
}
