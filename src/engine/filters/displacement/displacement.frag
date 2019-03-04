varying vec2 v_filter_coord;
varying vec2 v_texture_coord;

uniform vec2 scale;

uniform sampler2D u_sampler;
uniform sampler2D map_sampler;

uniform vec4 filter_area;
uniform vec4 filter_clamp;

void main(void) {
   vec4 map = texture2D(map_sampler, v_filter_coord);

   map -= 0.5;
   map.xy *= scale / filter_area.xy;

   gl_FragColor = texture2D(u_sampler, clamp(vec2(v_texture_coord.x + map.x, v_texture_coord.y + map.y), filter_clamp.xy, filter_clamp.zw));
}
