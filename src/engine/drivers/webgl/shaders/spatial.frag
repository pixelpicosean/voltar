precision mediump float;

#define M_PI 3.14159265359

uniform highp float TIME;

uniform vec4 bg_color;
uniform float bg_energy;

uniform vec4 ambient_color;
uniform float ambient_energy;

uniform float specular;
uniform float metallic;
uniform float roughness;

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

/* UNIFORM */

varying highp vec3 vertex_interp;
varying vec3 normal_interp;
varying lowp vec4 color_interp;
varying vec2 uv_interp;
varying vec2 uv2_interp;

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
    // TODO: support light shader, or do we need this?

    float NdotL = dot(N, L);
    float cNdotL = max(NdotL, 0.0); // clamped NdotL
    float NdotV = dot(N, V);
    float cNdotV = max(abs(NdotV), 1e-6);

    // diffuse
    float diffuse_NL = 0.0;
    // vec3 diffuse_NL;
    // - lambert wrap
    // {
    //     diffuse_NL = max(0.0, (NdotL + roughness) / ((1.0 + roughness) * (1.0 + roughness)));
    // }
    // - oren nayar
    // {
    //     float LdotV = dot(L, V);
    //     float s = LdotV - NdotL * NdotV;
    //     float t = mix(1.0, max(NdotL, NdotV), step(0.0, s));
    //     float sigma2 = roughness * roughness;
    //     vec3 A = 1.0 + sigma2 * (-0.5 / (sigma2 + 0.33) + 0.17 * diffuse_color / (sigma2 + 0.13));
    //     float B = 0.45 * sigma2 / (sigma2 + 0.09);
    //     diffuse_NL = cNdotL * (A + vec3(B) * s / t) * (1.0 / M_PI);
    // }
    // - toon
    // {
    //     diffuse_NL = smoothstep(-roughness, max(roughness, 0.01), NdotL);
    // }
    // - burley
    {
        vec3 H = normalize(V + L);
        float cLdotH = max(dot(L, H), 0.0);

        float FD90_minus_1 = 2.0 * cLdotH * cLdotH * roughness - 0.5;
        float FdV = 1.0 + FD90_minus_1 * SchlickFresnel(cNdotV);
        float FdL = 1.0 + FD90_minus_1 * SchlickFresnel(cNdotL);
        diffuse_NL = (1.0 / M_PI) * FdV * FdL * cNdotL;
    }
    // lambert
    // {
    //     diffuse_NL = cNdotL * (1.0 / M_PI);
    // }

    // specular
    float specular_NL = 0.0;
    // - blinn
    // {
    //     vec3 H = normalize(V + L);
    //     float cNdotH = max(dot(N, H), 0.0);

    //     float shininess = exp2(15.0 * (1.0 - roughness) + 1.0) * 0.25;
    //     float blinn = pow(cNdotH, shininess) * cNdotL;
    //     blinn *= (shininess + 8.0) * (1.0 / (8.0 * M_PI));
    //     specular_NL = blinn;
    // }
    // - phone
    // {
    //     vec3 R = normalize(-reflect(L, N));
    //     float cRdotV = max(0.0, dot(R, V));
    //     float shininess = exp2(15.0 * (1.0 - roughness) + 1.0) * 0.25;
    //     float phong = pow(cRdotV, shininess);
    //     phong *= (shininess + 8.0) * (1.0 / (8.0 * M_PI));
    //     specular_NL = phong / max(4.0 * cNdotV * cNdotL, 0.75);
    // }
    // - toon
    {
        vec3 R = normalize(-reflect(L, N));
        float RdotV = dot(R, V);
        float mid = 1.0 - roughness;
        mid *= mid;
        specular_NL = smoothstep(mid - roughness * 0.5, mid + roughness * 0.5, RdotV) * mid;
    }

    diffuse_light += light_color * diffuse_color * diffuse_NL * attenuation;
    specular_light += light_color * specular_NL * specular_blob_intensity * attenuation;
}

void main() {
    vec2 UV = uv_interp;

    vec3 ALBEDO = vec3(1.0);
    float ALPHA = 1.0;

    float ROUGHNESS = roughness;
    float METALLIC = metallic;
    float SPECULAR = specular;

    /* SHADER_BEGIN */
    /* SHADER_END */

    vec3 view = -normalize(vertex_interp);

    vec3 specular_light = vec3(0.0);
    vec3 diffuse_light = vec3(0.0);
    vec3 ambient_light = vec3(0.0);

    vec3 light_att = vec3(1.0);
    float specular_blob_intensity = 1.0;

    ambient_light = ambient_color.rgb;
    specular_light = bg_color.rgb * bg_energy;

    ambient_light *= ambient_energy;

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

    ambient_light *= ALBEDO;

    diffuse_light *= 1.0 - METALLIC;
    ambient_light *= 1.0 - METALLIC;

    // gl_FragColor = vec4(ambient_light, ALPHA);
    // gl_FragColor = vec4(diffuse_light, ALPHA);
    // gl_FragColor = vec4(specular_light, ALPHA);

    gl_FragColor = vec4(ambient_light + diffuse_light + specular_light, ALPHA);
}
