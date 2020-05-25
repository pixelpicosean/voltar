#extension GL_EXT_shader_texture_lod : enable

precision highp float;
precision highp int;

varying vec2 uv_interp;

uniform sampler2D source_color;

uniform float lod;
uniform vec2 pixel_size;

#if defined(GLOW_GAUSSIAN_HORIZONTAL) || defined(GLOW_GAUSSIAN_VERTICAL)
    uniform float glow_strength;
#endif

#if defined(DOF_FAR_BLUR) || defined(DOF_NEAR_BLUR)
    uniform sampler2D dof_source_depth;
    uniform float dof_begin;
    uniform float dof_end;
    uniform vec2 dof_dir;
    uniform float dof_radius;
#endif

#ifdef GLOW_FIRST_PASS
    uniform highp float luminance_cap;

    uniform float glow_bloom;
    uniform float glow_hdr_threshold;
    uniform float glow_hdr_scale;
#endif

uniform float camera_z_far;
uniform float camera_z_near;

void main() {
    #ifdef GLOW_GAUSSIAN_HORIZONTAL
        vec2 pix_size = pixel_size;
        pix_size * 0.5;
        vec4 color = texture2DLodEXT(source_color, uv_interp + vec2(0.0, 0.0) * pix_size, lod) * 0.174938;
        color += texture2DLodEXT(source_color, uv_interp + vec2(1.0, 0.0) * pix_size, lod) * 0.165569;
        color += texture2DLodEXT(source_color, uv_interp + vec2(2.0, 0.0) * pix_size, lod) * 0.140367;
        color += texture2DLodEXT(source_color, uv_interp + vec2(3.0, 0.0) * pix_size, lod) * 0.106595;
        color += texture2DLodEXT(source_color, uv_interp + vec2(-1.0, 0.0) * pix_size, lod) * 0.165569;
        color += texture2DLodEXT(source_color, uv_interp + vec2(-2.0, 0.0) * pix_size, lod) * 0.140367;
        color += texture2DLodEXT(source_color, uv_interp + vec2(-3.0, 0.0) * pix_size, lod) * 0.106595;
        color *= glow_strength;
        gl_FragColor = color;
    #endif

    #ifdef GLOW_GAUSSIAN_VERTICAL
        vec4 color = texture2DLodEXT(source_color, uv_interp + vec2(0.0, 0.0) * pixel_size, lod) * 0.288713;
        color += texture2DLodEXT(source_color, uv_interp + vec2(0.0, 1.0) * pixel_size, lod) * 0.233062;
        color += texture2DLodEXT(source_color, uv_interp + vec2(0.0, 2.0) * pixel_size, lod) * 0.122581;
        color += texture2DLodEXT(source_color, uv_interp + vec2(0.0, -1.0) * pixel_size, lod) * 0.233062;
        color += texture2DLodEXT(source_color, uv_interp + vec2(0.0, -2.0) * pixel_size, lod) * 0.122581;
        color *= glow_strength;
        gl_FragColor = color;
    #endif

    #if defined(DOF_FAR_BLUR) || defined(DOF_NEAR_BLUR)
        #ifdef DOF_QUALITY_LOW
            const int dof_kernel_size = 5;
            const int dof_kernel_from = 2;
            float dof_kernel[5];
            dof_kernel[0] = 0.153388;
            dof_kernel[1] = 0.221461;
            dof_kernel[2] = 0.250301;
            dof_kernel[3] = 0.221461;
            dof_kernel[4] = 0.153388;
        #endif

        #ifdef DOF_QUALITY_MEDIUM
            const int dof_kernel_size = 11;
            const int dof_kernel_from = 5;
            float dof_kernel[11];
            dof_kernel[0] = 0.055037;
            dof_kernel[1] = 0.072806;
            dof_kernel[2] = 0.090506;
            dof_kernel[3] = 0.105726;
            dof_kernel[4] = 0.116061;
            dof_kernel[5] = 0.119726;
            dof_kernel[6] = 0.116061;
            dof_kernel[7] = 0.105726;
            dof_kernel[8] = 0.090506;
            dof_kernel[9] = 0.072806;
            dof_kernel[10] = 0.055037;
        #endif

        #ifdef DOF_QUALITY_HIGH
            const int dof_kernel_size = 21;
            const int dof_kernel_from = 10;
            float dof_kernel[21];
            dof_kernel[0] = 0.028174;
            dof_kernel[1] = 0.032676;
            dof_kernel[2] = 0.037311;
            dof_kernel[3] = 0.041944;
            dof_kernel[4] = 0.046421;
            dof_kernel[5] = 0.050582;
            dof_kernel[6] = 0.054261;
            dof_kernel[7] = 0.057307;
            dof_kernel[8] = 0.059587;
            dof_kernel[9] = 0.060998;
            dof_kernel[10] = 0.061476;
            dof_kernel[11] = 0.060998;
            dof_kernel[12] = 0.059587;
            dof_kernel[13] = 0.057307;
            dof_kernel[14] = 0.054261;
            dof_kernel[15] = 0.050582;
            dof_kernel[16] = 0.046421;
            dof_kernel[17] = 0.041944;
            dof_kernel[18] = 0.037311;
            dof_kernel[19] = 0.032676;
            dof_kernel[20] = 0.028174;
        #endif
    #endif

    #ifdef DOF_FAR_BLUR
        vec4 color_accum = vec4(0.0);

        float depth = texture2DLodEXT(dof_source_depth, uv_interp, 0.0).r;
        depth = depth * 2.0 - 1.0;

        #ifdef USE_ORTHOGONAL_PROJECTION
            depth = ((depth + (camera_z_far + camera_z_near) / (camera_z_far - camera_z_near)) * (camera_z_far - camera_z_near)) / 2.0;
        #else
            depth = 2.0 * camera_z_near * camera_z_far / (camera_z_far + camera_z_near - depth * (camera_z_far - camera_z_near));
        #endif

        float amount = smoothstep(dof_begin, dof_end, depth);
        float k_accum = 0.0;

        for (int i = 0; i < dof_kernel_size; i++) {
            int int_ofs = i - dof_kernel_from;
            vec2 tap_uv = uv_interp + dof_dir * float(int_ofs) * amount * dof_radius;

            float tap_k = dof_kernel[i];

            float tap_depth = texture2D(dof_source_depth, tap_uv, 0.0).r;
            tap_depth = tap_depth * 2.0 - 1.0;

            #ifdef USE_ORTHOGONAL_PROJECTION
                tap_depth = ((tap_depth + (camera_z_far + camera_z_near) / (camera_z_far - camera_z_near)) * (camera_z_far - camera_z_near)) / 2.0;
            #else
                tap_depth = 2.0 * camera_z_near * camera_z_far / (camera_z_far + camera_z_near - tap_depth * (camera_z_far - camera_z_near));
            #endif

            float tap_amount = int_ofs == 0 ? 1.0 : smoothstep(dof_begin, dof_end, tap_depth);
            tap_amount *= tap_amount * tap_amount; //prevent undesired glow effect

            vec4 tap_color = texture2DLodEXT(source_color, tap_uv, 0.0) * tap_k;

            k_accum += tap_k * tap_amount;
            color_accum += tap_color * tap_amount;
        }

        if (k_accum > 0.0) {
            color_accum /= k_accum;
        }

        gl_FragColor = color_accum; ///k_accum;

    #endif

    #ifdef DOF_NEAR_BLUR
        vec4 color_accum = vec4(0.0);
        float max_accum = 0.0;

        for (int i = 0; i < dof_kernel_size; i++) {
            int int_ofs = i - dof_kernel_from;
            vec2 tap_uv = uv_interp + dof_dir * float(int_ofs) * dof_radius;
            float ofs_influence = max(0.0, 1.0 - abs(float(int_ofs)) / float(dof_kernel_from));

            float tap_k = dof_kernel[i];

            vec4 tap_color = texture2DLodEXT(source_color, tap_uv, 0.0);

            float tap_depth = texture2D(dof_source_depth, tap_uv, 0.0).r;
            tap_depth = tap_depth * 2.0 - 1.0;

            #ifdef USE_ORTHOGONAL_PROJECTION
                tap_depth = ((tap_depth + (camera_z_far + camera_z_near) / (camera_z_far - camera_z_near)) * (camera_z_far - camera_z_near)) / 2.0;
            #else
                tap_depth = 2.0 * camera_z_near * camera_z_far / (camera_z_far + camera_z_near - tap_depth * (camera_z_far - camera_z_near));
            #endif

            float tap_amount = 1.0 - smoothstep(dof_end, dof_begin, tap_depth);
            tap_amount *= tap_amount * tap_amount; //prevent undesired glow effect

            #ifdef DOF_NEAR_FIRST_TAP
                tap_color.a = 1.0 - smoothstep(dof_end, dof_begin, tap_depth);
            #endif

            max_accum = max(max_accum, tap_amount * ofs_influence);
            color_accum += tap_color * tap_k;
        }

        color_accum.a = max(color_accum.a, sqrt(max_accum));

        gl_FragColor = color_accum;
    #endif

    #ifdef GLOW_FIRST_PASS
        float luminance = max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b));
        float feedback = max(smoothstep(glow_hdr_threshold, glow_hdr_threshold + glow_hdr_scale, luminance), glow_bloom);

        gl_FragColor = min(gl_FragColor * feedback, vec4(luminance_cap));
    #endif
}
