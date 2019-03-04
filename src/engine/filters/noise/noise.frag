precision highp float;

varying vec2 v_texture_coord;
varying vec4 vColor;

uniform float u_noise;
uniform float u_seed;
uniform sampler2D u_sampler;

float rand(vec2 co)
{
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{
    vec4 color = texture2D(u_sampler, v_texture_coord);
    float randomValue = rand(gl_FragCoord.xy * u_seed);
    float diff = (randomValue - 0.5) * u_noise;

    // Un-premultiply alpha before applying the color matrix. See issue #3539.
    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    color.r += diff;
    color.g += diff;
    color.b += diff;

    // Premultiply alpha again.
    color.rgb *= color.a;

    gl_FragColor = color;
}
