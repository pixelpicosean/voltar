precision mediump float;

#define M_PI 3.14159265359

uniform highp float TIME;

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

    #ifdef USE_SHADOW
        uniform highp vec2 shadow_pixel_size;

        #ifdef LIGHT_MODE_DIRECTIONAL
            uniform highp sampler2D light_directional_shadow; // tex: -3
        #endif

        varying highp vec4 shadow_coord;

        uniform vec4 light_clamp;
    #endif
#endif

uniform float specular;
uniform float metallic;
uniform float roughness;

/* GLOBALS */

varying highp vec3 vertex_interp;
varying vec3 normal_interp;
varying vec2 uv_interp;

vec3 F0(float metallic, float specular, vec3 albedo) {
	float dielectric = 0.16 * specular * specular;
	// use albedo * metallic as colored specular reflectance at 0 angle for metallic materials;
	// see https://google.github.io/filament/Filament.md.html
	return mix(vec3(dielectric), albedo, vec3(metallic));
}

#ifdef USE_LIGHTING

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

        float specular_blob_intensity,
        float roughness,
        float metallic,
        float specular,

        inout vec3 diffuse_light,
        inout vec3 specular_light,
        inout float alpha
    ) {
        /* LIGHT_CODE_BEGIN */

        float NdotL = dot(N, L);
        float cNdotL = max(NdotL, 0.0); // clamped NdotL
        float NdotV = dot(N, V);
        float cNdotV = max(abs(NdotV), 1e-6);

        #if defined(DIFFUSE_BURLEY) || defined(SPECULAR_BLINN)
            vec3 H = normalize(V + L);
        #endif

        #if defined(SPECULAR_BLINN)
            float cNdotH = max(dot(N, H), 0.0);
        #endif

        #if defined(DIFFUSE_BURLEY)
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
        }

        // specular
        if (roughness > 0.0) {
            float specular_NL = 0.0;

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
            #endif

            specular_light += light_color * specular_NL * specular_blob_intensity * attenuation;
        }

        /* LIGHT_CODE_END */
    }
#endif

#ifdef USE_SHADOW
    #define SHADOW_DEPTH(m_val) (m_val).r

    #define SAMPLE_SHADOW_TEXEL(p_shadow, p_pos, p_depth) step(p_depth, SHADOW_DEPTH(texture2D(p_shadow, p_pos)))
    #define SAMPLE_SHADOW_TEXEL_PROJ(p_shadow, p_pos) step(p_pos.z, SHADOW_DEPTH(texture2DProj(p_shadow, p_pos)))

    float sample_shadow(highp sampler2D shadow, highp vec4 spos) {
        return SAMPLE_SHADOW_TEXEL_PROJ(shadow, spos);
    }
#endif

void main() {
    vec3 NORMAL = normalize(normal_interp);
    vec2 UV = uv_interp;
    vec3 view = -normalize(vertex_interp);
    vec3 ALBEDO = vec3(1.0);
    float ALPHA = 1.0;

    float ROUGHNESS = roughness;
    float METALLIC = metallic;
    float SPECULAR = specular;

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

    vec3 light_att = vec3(1.0);

    #ifdef BASE_PASS

        // IBL precalculations
        float ndotv = clamp(dot(NORMAL, view), 0.0, 1.0);
        vec3 f0 = F0(METALLIC, SPECULAR, ALBEDO);
        vec3 F = f0 + (max(vec3(1.0 - ROUGHNESS), f0) - f0) * pow(1.0 - ndotv, 5.0);

        ambient_light = ambient_color.rgb;
        specular_light = bg_color.rgb * bg_energy;

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
                vec4 r = roughness * c0 + c1;
                float a004 = min(r.x * r.x, exp2(-9.28 * ndotv)) * r.x + r.y;
                vec2 env = vec2(-1.04, 1.04) * a004 + r.zw;
                specular_light *= env.x * F + env.y;
            #endif
        }
    #endif // BASE PASS

    #ifdef USE_LIGHTING
        vec3 L;

        #ifdef LIGHT_MODE_OMNI
        #endif

        #ifdef LIGHT_MODE_SPOT
        #endif

        #ifdef LIGHT_MODE_DIRECTIONAL
            #ifdef USE_SHADOW
                light_att *= mix(shadow_color.rgb, vec3(1.0), sample_shadow(light_directional_shadow, shadow_coord));
            #endif
        #endif

        light_compute(
            normal_interp,
            normalize(-LIGHT_DIRECTION),
            view,

            LIGHT_COLOR.rgb,
            light_att,
            ALBEDO,

            specular_blob_intensity * LIGHT_SPECULAR,
            ROUGHNESS,
            METALLIC,
            SPECULAR,

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
                // TODO: gl_FragColor.rgb += emission;
            #endif
        #endif
    #endif
}
