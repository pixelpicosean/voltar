varying vec2 v_texture_coord;

uniform sampler2D u_sampler;
uniform float u_alpha;

void main(void)
{
    gl_FragColor = texture2D(u_sampler, v_texture_coord) * u_alpha;
}
