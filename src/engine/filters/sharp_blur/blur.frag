varying vec2 v_texture_coord;
uniform sampler2D u_sampler;

uniform vec2 u_offset;

void main(void) {
    vec4 color = vec4(0.0);

    // Sample top left pixel
    color += texture2D(u_sampler, vec2(v_texture_coord.x - u_offset.x, v_texture_coord.y + u_offset.y));

    // Sample top right pixel
    color += texture2D(u_sampler, vec2(v_texture_coord.x + u_offset.x, v_texture_coord.y + u_offset.y));

    // Sample bottom right pixel
    color += texture2D(u_sampler, vec2(v_texture_coord.x + u_offset.x, v_texture_coord.y - u_offset.y));

    // Sample bottom left pixel
    color += texture2D(u_sampler, vec2(v_texture_coord.x - u_offset.x, v_texture_coord.y - u_offset.y));

    vec4 tex_color = texture2D(u_sampler, v_texture_coord);

    if (tex_color.a < 0.01) {
        gl_FragColor = color * 0.25;
    } else {
        gl_FragColor = tex_color;
    }
}
