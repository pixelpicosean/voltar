uniform vec4 shadow_color;
uniform sampler2D u_samplers[%count%];
uniform vec2 u_sampler_size[%count%];

varying vec2 v_texture_coord;
varying vec4 v_frame;
varying float v_texture_id;

void main(void) {
   vec2 texture_coord = clamp(v_texture_coord, v_frame.xy, v_frame.zw);
   float texture_id = floor(v_texture_id + 0.5);

   vec4 color;
   %forloop%
   gl_FragColor = color;
}
