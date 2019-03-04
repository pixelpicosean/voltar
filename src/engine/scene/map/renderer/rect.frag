varying vec2 v_texture_coord;
varying vec4 vFrame;
varying float v_texture_id;
uniform vec4 shadowColor;
uniform sampler2D u_samplers[%count%];
uniform vec2 uSamplerSize[%count%];

void main(void){
   vec2 textureCoord = clamp(v_texture_coord, vFrame.xy, vFrame.zw);
   float textureId = floor(v_texture_id + 0.5);

   vec4 color;
   %forloop%
   gl_FragColor = color;
}
