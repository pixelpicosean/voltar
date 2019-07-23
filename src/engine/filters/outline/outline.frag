varying vec2 v_texture_coord;
uniform sampler2D u_sampler;

uniform vec2 thickness;
uniform vec4 outline_color;
uniform vec4 filter_clamp;

const float DOUBLE_PI = 3.14159265358979323846264 * 2.;

void main(void) {
    vec4 own_color = texture2D(u_sampler, v_texture_coord);
    vec4 cur_color;
    float max_alpha = 0.;
    vec2 displaced;
    for (float angle = 0.; angle <= DOUBLE_PI; angle += ${angle_step}) {
        displaced.x = v_texture_coord.x + thickness.x * cos(angle);
        displaced.y = v_texture_coord.y + thickness.y * sin(angle);
        cur_color = texture2D(u_sampler, clamp(displaced, filter_clamp.xy, filter_clamp.zw));
        max_alpha = max(max_alpha, cur_color.a);
    }
    float result_alpha = max(max_alpha, own_color.a);
    gl_FragColor = vec4((own_color.rgb + outline_color.rgb * (1. - own_color.a)) * result_alpha, result_alpha);
}
