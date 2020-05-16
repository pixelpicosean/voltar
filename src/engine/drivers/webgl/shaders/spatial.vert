uniform highp mat4 CAMERA_MATRIX;
uniform highp mat4 INV_CAMERA_MATRIX;
uniform highp mat4 PROJECTION_MATRIX;
uniform highp mat4 INV_PROJECTION_MATRIX;
uniform highp mat4 WORLD_MATRIX;

uniform highp float TIME;

uniform highp float viewport_size;

#ifdef RENDER_DEPTH
    uniform float light_bias;
    uniform float light_normal_bias;
#endif

#if defined(USE_SHADOW) && defined(USE_LIGHTING)
    uniform highp mat4 light_shadow_matrix;
    varying highp vec4 shadow_coord;
#endif

/* GLOBALS */

attribute highp vec3 position;
attribute vec3 normal;
attribute vec2 uv;

varying highp vec3 vertex_interp;
varying vec3 normal_interp;
varying vec2 uv_interp;

void main() {
    vec3 VERTEX = position;
    vec3 NORMAL = normal;

    mat4 MODELVIEW_MATRIX = INV_CAMERA_MATRIX * WORLD_MATRIX;

    float POINT_SIZE = 1.0;

    /* VERTEX_CODE_BEGIN */
    /* VERTEX_CODE_END */

    gl_PointSize = POINT_SIZE;

    vec4 vertex = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
    NORMAL = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);

    vertex_interp = vertex.xyz;
    normal_interp = NORMAL;
    uv_interp = uv;

    #ifdef RENDER_DEPTH
        float z_ofs = light_bias;
        z_ofs += (1.0 - abs(normal_interp.z)) * light_normal_bias;

        vertex_interp.z -= z_ofs;
    #endif

    #if defined(USE_SHADOW) && defined(USE_LIGHTING)
        vec4 vi4 = vec4(vertex_interp, 1.0);
        shadow_coord = light_shadow_matrix * vi4;
    #endif

    gl_Position = PROJECTION_MATRIX * vec4(vertex.xyz, 1.0);
}
