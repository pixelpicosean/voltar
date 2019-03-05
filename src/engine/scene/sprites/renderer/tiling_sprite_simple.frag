varying vec2 v_texture_coord;

uniform sampler2D u_sampler;
uniform vec4 u_color;

void main(void)
{
    vec4 sample = texture2D(u_sampler, v_texture_coord);
    gl_FragColor = sample * u_color;
}
