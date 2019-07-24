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

    // Average
    color *= 0.25;

    gl_FragColor = color;
}
