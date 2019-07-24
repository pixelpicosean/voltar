varying vec2 v_texture_coord;
uniform sampler2D u_sampler;

uniform vec2 u_offset;
uniform vec4 filter_clamp;

void main(void) {
    vec4 color = vec4(0.0);

    // Sample top left pixel
    color += texture2D(u_sampler, clamp(vec2(v_texture_coord.x - u_offset.x, v_texture_coord.y + u_offset.y), filter_clamp.xy, filter_clamp.zw));

    // Sample top right pixel
    color += texture2D(u_sampler, clamp(vec2(v_texture_coord.x + u_offset.x, v_texture_coord.y + u_offset.y), filter_clamp.xy, filter_clamp.zw));

    // Sample bottom right pixel
    color += texture2D(u_sampler, clamp(vec2(v_texture_coord.x + u_offset.x, v_texture_coord.y - u_offset.y), filter_clamp.xy, filter_clamp.zw));

    // Sample bottom left pixel
    color += texture2D(u_sampler, clamp(vec2(v_texture_coord.x - u_offset.x, v_texture_coord.y - u_offset.y), filter_clamp.xy, filter_clamp.zw));

    // Average
    color *= 0.25;

    gl_FragColor = color;
}
