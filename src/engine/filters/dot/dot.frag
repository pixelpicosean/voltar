precision mediump float;

varying vec2 v_texture_coord;
varying vec4 v_color;

uniform vec4 filter_area;
uniform sampler2D u_sampler;

uniform float angle;
uniform float scale;

float pattern() {
   float s = sin(angle), c = cos(angle);
   vec2 tex = v_texture_coord * filter_area.xy;
   vec2 point = vec2(
       c * tex.x - s * tex.y,
       s * tex.x + c * tex.y
   ) * scale;
   return (sin(point.x) * sin(point.y)) * 4.0;
}

void main() {
   vec4 color = texture2D(u_sampler, v_texture_coord);
   float average = (color.r + color.g + color.b) / 3.0;
   gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);
}
