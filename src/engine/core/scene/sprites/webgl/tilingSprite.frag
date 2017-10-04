varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform vec4 uColor;
uniform mat3 uMapCoord;
uniform vec4 u_clamp_frame;
uniform vec2 u_clamp_offset;

void main(void)
{
    vec2 coord = mod(vTextureCoord - u_clamp_offset, vec2(1.0, 1.0)) + u_clamp_offset;
    coord = (uMapCoord * vec3(coord, 1.0)).xy;
    coord = clamp(coord, u_clamp_frame.xy, u_clamp_frame.zw);

    vec4 sample = texture2D(uSampler, coord);
    gl_FragColor = sample * uColor ;
}
