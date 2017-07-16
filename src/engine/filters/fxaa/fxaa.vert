
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;

varying vec2 v_rgbNW;
varying vec2 v_rgbNE;
varying vec2 v_rgbSW;
varying vec2 v_rgbSE;
varying vec2 v_rgbM;

uniform vec4 filter_area;

varying vec2 vTextureCoord;

vec2 map_coord( vec2 coord )
{
    coord *= filter_area.xy;
    coord += filter_area.zw;

    return coord;
}

vec2 unmap_coord( vec2 coord )
{
    coord -= filter_area.zw;
    coord /= filter_area.xy;

    return coord;
}

void texcoords(vec2 fragCoord, vec2 resolution,
               out vec2 v_rgbNW, out vec2 v_rgbNE,
               out vec2 v_rgbSW, out vec2 v_rgbSE,
               out vec2 v_rgbM) {
    vec2 inverseVP = 1.0 / resolution.xy;
    v_rgbNW = (fragCoord + vec2(-1.0, -1.0)) * inverseVP;
    v_rgbNE = (fragCoord + vec2(1.0, -1.0)) * inverseVP;
    v_rgbSW = (fragCoord + vec2(-1.0, 1.0)) * inverseVP;
    v_rgbSE = (fragCoord + vec2(1.0, 1.0)) * inverseVP;
    v_rgbM = vec2(fragCoord * inverseVP);
}

void main(void) {

   gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

   vTextureCoord = aTextureCoord;

   vec2 fragCoord = vTextureCoord * filter_area.xy;

   texcoords(fragCoord, filter_area.xy, v_rgbNW, v_rgbNE, v_rgbSW, v_rgbSE, v_rgbM);
}
