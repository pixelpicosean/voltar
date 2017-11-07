attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute vec4 aFrame;
attribute float aTextureId;

uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;
varying float vTextureId;
varying vec4 vFrame;

void main(void){
   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
   vTextureCoord = aTextureCoord;
   vFrame = aFrame;
   vTextureId = aTextureId;
}
