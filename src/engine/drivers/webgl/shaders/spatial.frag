precision mediump float;

uniform highp mat4 camera_matrix;
uniform highp mat4 camera_inverse_matrix;
uniform highp mat4 projection_matrix;
uniform highp mat4 projection_inverse_matrix;
uniform highp mat4 world_transform;
uniform highp float TIME;

uniform sampler2D TEXTURE;
uniform sampler2D SCREEN_TEXTURE;
uniform vec2 SCREEN_PIXEL_SIZE;

uniform vec4 bg_color;
uniform float bg_energy;

uniform vec4 ambient_color;
uniform float ambient_energy;

/* UNIFORM */

varying vec2 uv_interp;

void main() {
    vec2 UV = uv_interp;
    vec2 SCREEN_UV = gl_FragCoord.xy * SCREEN_PIXEL_SIZE;

    vec3 ALBEDO = vec3(1.0, 1.0, 1.0);
    float ALPHA = 1.0;

    /* SHADER_BEGIN */
    /* SHADER_END */

    vec3 specular_light = vec3(0.0, 0.0, 0.0);
    vec3 diffuse_light = vec3(0.0, 0.0, 0.0);
    vec3 ambient_light = vec3(0.0, 0.0, 0.0);

    ambient_light = ambient_color.rgb;
    ambient_light *= ambient_energy;

    // mode: unshaded
    // {
    //     gl_FragColor = vec4(ALBEDO, ALPHA);
    // }

    ambient_light *= ALBEDO;

    gl_FragColor = vec4(ambient_light + diffuse_light + specular_light, ALPHA);
}
