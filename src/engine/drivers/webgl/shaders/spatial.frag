precision mediump float;

#define M_PI 3.14159265359

uniform highp mat4 CAMERA_MATRIX;

uniform highp float TIME;

#ifdef USE_LIGHTMAP
    uniform mediump sampler2D lightmap; // texunit: -4
    uniform mediump float lightmap_energy;
#endif

uniform vec4 bg_color;
uniform float bg_energy;

uniform vec4 ambient_color;
uniform float ambient_energy;

#ifdef USE_LIGHTING
    uniform highp vec4 shadow_color;

    uniform highp vec4 LIGHT_COLOR;
    uniform highp float LIGHT_SPECULAR;

    // light > directional
    uniform highp vec3 LIGHT_DIRECTION;
    // light > omni
    uniform highp vec3 LIGHT_POSITION;
    uniform highp float LIGHT_ATTENUATION;
    // light > spot
    uniform highp float LIGHT_SPOT_ATTENUATION;
    uniform highp float LIGHT_SPOT_RANGE;
    uniform highp float LIGHT_SPOT_ANGLE;

    uniform highp float light_range;
    #ifdef USE_SHADOW
        uniform highp vec2 shadow_pixel_size;

        #if defined(LIGHT_MODE_OMNI) || defined(LIGHT_MODE_SPOT)
            uniform highp sampler2D light_shadow_atlas; // tex: -3
        #endif

        #ifdef LIGHT_MODE_DIRECTIONAL
            uniform highp sampler2D light_directional_shadow; // tex: -3
            uniform highp vec4 light_split_offsets;
        #endif

        varying highp vec4 shadow_coord;

        uniform vec4 light_clamp;
    #endif
#endif

/* GLOBALS */

#ifdef RENDER_DEPTH_DUAL_PARABOLOID
    varying highp float dp_clip;
#endif

#if defined(RENDER_DEPTH) && defined(USE_RGBA_SHADOWS)
    varying highp vec4 position_interp;
#endif

varying highp vec3 vertex_interp;
varying vec3 normal_interp;

#if defined(ENABLE_UV_INTERP)
    varying vec2 uv_interp;
#endif

#if defined(ENABLE_UV2_INTERP) || defined(USE_LIGHTMAP)
    varying vec2 uv2_interp;
#endif

/* light */

vec3 F0(float metallic, float specular, vec3 albedo) {
	float dielectric = 0.16 * specular * specular;
	// use albedo * metallic as colored specular reflectance at 0 angle for metallic materials;
	// see https://google.github.io/filament/Filament.md.html
	return mix(vec3(dielectric), albedo, vec3(metallic));
}

#ifdef USE_LIGHTING

    // This approximates G_GGX_2cos(cos_theta_l, alpha) * G_GGX_2cos(cos_theta_v, alpha)
    // See Filament docs, Specular G section.
    float V_GGX(float cos_theta_l, float cos_theta_v, float alpha) {
        return 0.5 / mix(2.0 * cos_theta_l * cos_theta_v, cos_theta_l + cos_theta_v, alpha);
    }

    float D_GGX(float cos_theta_m, float alpha) {
        float alpha2 = alpha * alpha;
        float d = 1.0 + (alpha2 - 1.0) * cos_theta_m * cos_theta_m;
        return alpha2 / (M_PI * d * d);
    }

    float SchlickFresnel(float u) {
        float m = 1.0 - u;
        float m2 = m * m;
        return m2 * m2 * m;
    }

    void light_compute(
        vec3 N,
        vec3 L,
        vec3 V,

        vec3 light_color,
        vec3 attenuation,
        vec3 diffuse_color,
        vec3 transmission,

        float specular_blob_intensity,
        float roughness,
        float metallic,
        float specular,
        float rim,
        float rim_tint,

        inout vec3 diffuse_light,
        inout vec3 specular_light,
        inout float alpha
    ) {
        /* LIGHT_CODE_BEGIN */

        float NdotL = dot(N, L);
        float cNdotL = max(NdotL, 0.0); // clamped NdotL
        float NdotV = dot(N, V);
        float cNdotV = max(abs(NdotV), 1e-6);

        #if defined(DIFFUSE_BURLEY) || defined(SPECULAR_BLINN) || defined(SPECULAR_SCHLICK_GGX)
            vec3 H = normalize(V + L);
        #endif

        #if defined(SPECULAR_BLINN) || defined(SPECULAR_SCHLICK_GGX)
            float cNdotH = max(dot(N, H), 0.0);
        #endif

        #if defined(DIFFUSE_BURLEY) || defined(SPECULAR_SCHLICK_GGX)
            float cLdotH = max(dot(L, H), 0.0);
        #endif

        // diffuse
        if (metallic < 1.0) {
            #if defined(DIFFUSE_OREN_NAYAR)
                vec3 diffuse_NL;
            #else
                float diffuse_NL;
            #endif

            #if defined(DIFFUSE_LAMBERT_WRAP)
                diffuse_NL = max(0.0, (NdotL + roughness) / ((1.0 + roughness) * (1.0 + roughness)));
            #elif defined(DIFFUSE_OREN_NAYAR)
                {
                    float LdotV = dot(L, V);
                    float s = LdotV - NdotL * NdotV;
                    float t = mix(1.0, max(NdotL, NdotV), step(0.0, s));
                    float sigma2 = roughness * roughness;
                    vec3 A = 1.0 + sigma2 * (-0.5 / (sigma2 + 0.33) + 0.17 * diffuse_color / (sigma2 + 0.13));
                    float B = 0.45 * sigma2 / (sigma2 + 0.09);
                    diffuse_NL = cNdotL * (A + vec3(B) * s / t) * (1.0 / M_PI);
                }
            #elif defined(DIFFUSE_TOON)
                diffuse_NL = smoothstep(-roughness, max(roughness, 0.01), NdotL);
            #elif defined(DIFFUSE_BURLEY)
                {
                    float FD90_minus_1 = 2.0 * cLdotH * cLdotH * roughness - 0.5;
                    float FdV = 1.0 + FD90_minus_1 * SchlickFresnel(cNdotV);
                    float FdL = 1.0 + FD90_minus_1 * SchlickFresnel(cNdotL);
                    diffuse_NL = (1.0 / M_PI) * FdV * FdL * cNdotL;
                }
            #else
                // lambert
                diffuse_NL = cNdotL * (1.0 / M_PI);
            #endif

            diffuse_light += light_color * diffuse_color * diffuse_NL * attenuation;
            #if defined(TRANSMISSION_USED)
                diffuse_light += light_color * diffuse_color * (vec3(1.0 / M_PI) - diffuse_NL) * transmission * attenuation;
            #endif

            #if defined(LIGHT_USE_RIM)
                float rim_light = pow(max(0.0, 1.0 - cNdotV), max(0.0, (1.0 - roughness) * 16.0));
                diffuse_light += rim_light * rim * mix(vec3(1.0), diffuse_color, rim_tint) * light_color;
            #endif
        }

        // specular
        if (roughness > 0.0) {
            #if defined(SPECULAR_SCHLICK_GGX)
                vec3 specular_NL = vec3(0.0);
            #else
                float specular_NL = 0.0;
            #endif

            #if defined(SPECULAR_BLINN)
                {
                    float shininess = exp2(15.0 * (1.0 - roughness) + 1.0) * 0.25;
                    float blinn = pow(cNdotH, shininess) * cNdotL;
                    blinn *= (shininess + 8.0) * (1.0 / (8.0 * M_PI));
                    specular_NL = blinn;
                }
            #elif defined(SPECULAR_PHONE)
                {
                    vec3 R = normalize(-reflect(L, N));
                    float cRdotV = max(0.0, dot(R, V));
                    float shininess = exp2(15.0 * (1.0 - roughness) + 1.0) * 0.25;
                    float phong = pow(cRdotV, shininess);
                    phong *= (shininess + 8.0) * (1.0 / (8.0 * M_PI));
                    specular_NL = phong / max(4.0 * cNdotV * cNdotL, 0.75);
                }
            #elif defined(SPECULAR_TOON)
                {
                    vec3 R = normalize(-reflect(L, N));
                    float RdotV = dot(R, V);
                    float mid = 1.0 - roughness;
                    mid *= mid;
                    specular_NL = smoothstep(mid - roughness * 0.5, mid + roughness * 0.5, RdotV) * mid;
                }
            #elif defined(SPECULAR_SCHLICK_GGX)
                float alpha_ggx = roughness * roughness;
                float D = D_GGX(cNdotH, alpha_ggx);
                float G = V_GGX(cNdotL, cNdotV, alpha_ggx);

                vec3 f0 = F0(metallic, specular, diffuse_color);
                float cLdotH5 = SchlickFresnel(cLdotH);
                vec3 F = mix(vec3(cLdotH5), vec3(1.0), f0);

                specular_NL = cNdotL * D * F * G;
            #endif

            specular_light += light_color * specular_NL * specular_blob_intensity * attenuation;
        }

        #ifdef USE_SHADOW_TO_OPACITY
            alpha = min(alpha, clamp(1.0 - length(attenuation), 0.0, 1.0));
        #endif

        /* LIGHT_CODE_END */
    }
#endif

/* shadow */

#ifdef USE_SHADOW
    #ifdef USE_RGBA_SHADOWS
        #define SHADOW_DEPTH(m_val) dot(m_val, vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0))
    #else
        #define SHADOW_DEPTH(m_val) (m_val).r
    #endif

    #define SAMPLE_SHADOW_TEXEL(p_shadow, p_pos, p_depth) step(p_depth, SHADOW_DEPTH(texture2D(p_shadow, p_pos)))
    #define SAMPLE_SHADOW_TEXEL_PROJ(p_shadow, p_pos) step(p_pos.z, SHADOW_DEPTH(texture2DProj(p_shadow, p_pos)))

    float sample_shadow(highp sampler2D shadow, highp vec4 spos) {
        return SAMPLE_SHADOW_TEXEL_PROJ(shadow, spos);
    }
#endif

/* fog */

#if defined(FOG_DEPTH_ENABLED) || defined(FOG_HEIGHT_ENABLED)
    uniform mediump vec4 fog_color_base;
    #ifdef LIGHT_MODE_DIRECTIONAL
        uniform mediump vec4 fog_sun_color_amount;
    #endif

    uniform float fog_transmit_enabled;
    uniform mediump float fog_transmit_curve;

    #ifdef FOG_DEPTH_ENABLED
        uniform highp float fog_depth_begin;
        uniform mediump float fog_depth_curve;
        uniform mediump float fog_max_distance;
    #endif

    #ifdef FOG_HEIGHT_ENABLED
        uniform highp float fog_height_min;
        uniform highp float fog_height_max;
        uniform mediump float fog_height_curve;
    #endif
#endif

void main() {
    #ifdef RENDER_DEPTH_DUAL_PARABOLOID
        if (dp_clip > 0.0) {
            discard;
        }
    #endif

    highp vec3 vertex = vertex_interp;
    vec3 NORMAL = normalize(normal_interp);
    vec2 UV = vec2(0.0);

    #if defined(ENABLE_UV_INTERP)
        UV = uv_interp;
    #endif

    vec3 view = -normalize(vertex_interp);
    vec3 eye_position = view;

    vec3 ALBEDO = vec3(1.0);
    vec3 TRANSMISSION = vec3(0.0);
    float METALLIC = 0.0;
    float SPECULAR = 0.5;
    vec3 EMISSION = vec3(0.0);
    float ROUGHNESS = 1.0;
    float RIM = 0.0;
    float RIM_TINT = 0.0;

    float ALPHA = 1.0;

    float specular_blob_intensity = 1.0;
    #if defined(SPECULAR_TOON)
        specular_blob_intensity *= SPECULAR * 2.0;
    #endif

    /* FRAGMENT_CODE_BEGIN */
    /* FRAGMENT_CODE_END */

    vec3 specular_light = vec3(0.0);
    vec3 diffuse_light = vec3(0.0);
    vec3 ambient_light = vec3(0.0);

    #if !defined(USE_SHADOW_TO_OPACITY)
        #ifdef USE_DEPTH_PREPASS
            if (ALPHA < 0.1) {
                discard;
            }
        #endif
    #endif

    #ifdef BASE_PASS

        // IBL precalculations
        float ndotv = clamp(dot(NORMAL, view), 0.0, 1.0);
        vec3 f0 = F0(METALLIC, SPECULAR, ALBEDO);
        vec3 F = f0 + (max(vec3(1.0 - ROUGHNESS), f0) - f0) * pow(1.0 - ndotv, 5.0);

        #ifdef AMBIENT_LIGHT_DISABLED
            ambient_light = vec3(0.0, 0.0, 0.0);
        #else
            ambient_light = ambient_color.rgb;
            specular_light = bg_color.rgb * bg_energy;
        #endif

        ambient_light *= ambient_energy;

        // environment BRDF approximation
        {
            #if defined(DIFFUSE_TOON)
                specular_light *= SPECULAR * METALLIC * ALBEDO * 2.0;
            #else
                // scales the specular reflections, needs to be be computed before lighting happens,
                // but after environment and reflection probes are added
                //TODO: this curve is not really designed for gammaspace, should be adjusted
                const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
                const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
                vec4 r = ROUGHNESS * c0 + c1;
                float a004 = min(r.x * r.x, exp2(-9.28 * ndotv)) * r.x + r.y;
                vec2 env = vec2(-1.04, 1.04) * a004 + r.zw;
                specular_light *= env.x * F + env.y;
            #endif
        }

        #ifdef USE_LIGHTMAP
            ambient_light = texture2D(lightmap, uv2_interp).rgb * lightmap_energy;
        #endif
    #endif // BASE PASS

    //
    // Lighting
    //
    #ifdef USE_LIGHTING
        vec3 L;
        vec3 light_att = vec3(1.0);

        #ifdef LIGHT_MODE_OMNI
            vec3 light_vec = LIGHT_POSITION - vertex;
            float light_length = length(light_vec);

            float normalized_distance = light_length / light_range;
            if (normalized_distance < 1.0) {
                float omni_attenuation = pow(1.0 - normalized_distance, LIGHT_ATTENUATION);
                light_att = vec3(omni_attenuation);
            } else {
                light_att = vec3(0.0);
            }
            L = normalize(light_vec);

            #ifdef USE_SHADOW
                {
                    highp vec4 splane = shadow_coord;
                    float shadow_len = length(splane.xyz);

                    splane.xyz = normalize(splane.xyz);

                    vec4 clamp_rect = light_clamp;

                    if (splane.z >= 0.0) {
                        splane.z += 1.0;

                        clamp_rect.y += clamp_rect.w;
                    } else {
                        splane.z = 1.0 - splane.z;
                    }

                    splane.xy /= splane.z;
                    splane.xy = splane.xy * 0.5 + 0.5;
                    splane.z = shadow_len / light_range;

                    splane.xy = clamp_rect.xy + splane.xy * clamp_rect.zw;
                    splane.w = 1.0;

                    float shadow = sample_shadow(light_shadow_atlas, splane);

                    light_att *= mix(shadow_color.rgb, vec3(1.0), shadow);
                }
            #endif
        #endif

        #ifdef LIGHT_MODE_SPOT
            light_att = vec3(1.0);

            vec3 light_rel_vec = LIGHT_POSITION - vertex;
            float light_length = length(light_rel_vec);
            float normalized_distance = light_length / light_range;

            if (normalized_distance < 1.0) {
                float spot_attenuation = pow(1.0 - normalized_distance, LIGHT_ATTENUATION);
                vec3 spot_dir = LIGHT_DIRECTION;

                float spot_cutoff = LIGHT_SPOT_ANGLE;
                float angle = dot(-normalize(light_rel_vec), spot_dir);

                if (angle > spot_cutoff) {
                    float scos = max(angle, spot_cutoff);
                    float spot_rim = max(0.0001, (1.0 - scos) / (1.0 - spot_cutoff));
                    spot_attenuation *= 1.0 - pow(spot_rim, LIGHT_SPOT_ATTENUATION);

                    light_att = vec3(spot_attenuation);
                } else {
                    light_att = vec3(0.0);
                }
            } else {
                light_att = vec3(0.0);
            }

            L = normalize(light_rel_vec);

            #ifdef USE_SHADOW
                {
                    highp vec4 splane = shadow_coord;

                    float shadow = sample_shadow(light_shadow_atlas, splane);
                    light_att *= mix(shadow_color.rgb, vec3(1.0), shadow);
                }
            #endif
        #endif

        #ifdef LIGHT_MODE_DIRECTIONAL
            vec3 light_vec = -LIGHT_DIRECTION;
            L = normalize(light_vec);

            float depth_z = -vertex_interp.z;

            #ifdef USE_SHADOW
                if (depth_z < light_split_offsets.x) {
                    float shadow = sample_shadow(light_directional_shadow, shadow_coord);
                    light_att *= mix(shadow_color.rgb, vec3(1.0), shadow);
                }
            #endif
        #endif

        light_compute(
            normal_interp,
            L,
            view,

            LIGHT_COLOR.rgb,
            light_att,
            ALBEDO,
            TRANSMISSION,

            specular_blob_intensity * LIGHT_SPECULAR,
            ROUGHNESS,
            METALLIC,
            SPECULAR,
            RIM,
            RIM_TINT,

            diffuse_light,
            specular_light,
            ALPHA
        );
    #endif // USE_LIGHTING

    #ifdef USE_SHADOW_TO_OPACITY
        ALPHA = min(ALPHA, clamp(length(ambient_light), 0.0, 1.0));

        #ifdef USE_DEPTH_PREPASS
            if (ALPHA < 0.1) {
                discard;
            }
        #endif
    #endif

    #ifndef RENDER_DEPTH
        #ifdef SHADELESS
            gl_FragColor = vec4(ALBEDO, ALPHA);
        #else
            ambient_light *= ALBEDO;

            diffuse_light *= 1.0 - METALLIC;
            ambient_light *= 1.0 - METALLIC;

            gl_FragColor = vec4(ambient_light + diffuse_light + specular_light, ALPHA);

            #ifdef BASE_PASS
                gl_FragColor.rgb += EMISSION;
            #endif

            #if defined(FOG_DEPTH_ENABLED) || defined(FOG_HEIGHT_ENABLED)
                float fog_amount = 0.0;

                #ifdef LIGHT_MODE_DIRECTIONAL
                    vec3 fog_color = mix(fog_color_base.rgb, fog_sun_color_amount.rgb, fog_sun_color_amount.a * pow(max(dot(eye_position, LIGHT_DIRECTION), 0.0), 8.0));
                #else
                    vec3 fog_color = fog_color_base.rgb;
                #endif

                #ifdef FOG_DEPTH_ENABLED
                    {
                        float fog_z = smoothstep(fog_depth_begin, fog_max_distance, length(vertex));

                        fog_amount = pow(fog_z, fog_depth_curve) * fog_color_base.a;

                        if (fog_transmit_enabled > 0.0) {
                            vec3 total_light = gl_FragColor.rgb;
                            float transmit = pow(fog_z, fog_transmit_curve);
                            fog_color = mix(max(total_light, fog_color), fog_color, transmit);
                        }
                    }
                #endif

                #ifdef FOG_HEIGHT_ENABLED
                    {
                        float y = (CAMERA_MATRIX * vec4(vertex, 1.0)).y;
                        fog_amount = max(fog_amount, pow(smoothstep(fog_height_min, fog_height_max, y), fog_height_curve));
                    }
                #endif

                #if defined(BASE_PASS)
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, fog_color, fog_amount);
                #else
                    gl_FragColor.rgb *= (1.0 - fog_amount);
                #endif
            #endif
        #endif
    #else
        #ifdef USE_RGBA_SHADOWS
            highp float depth = ((position_interp.z / position_interp.w) + 1.0) * 0.5 + 0.0; // bias
            highp vec4 comp = fract(depth * vec4(255.0 * 255.0 * 255.0, 255.0 * 255.0, 255.0, 1.0));
            comp -= comp.xxyz * vec4(0.0, 1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0);
            gl_FragColor = comp;
        #endif
    #endif
}
