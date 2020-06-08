uniform highp mat4 CAMERA_MATRIX;
uniform highp mat4 INV_CAMERA_MATRIX;
uniform highp mat4 PROJECTION_MATRIX;
uniform highp mat4 INV_PROJECTION_MATRIX;
uniform highp mat4 world_matrix;

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

#ifdef RENDER_DEPTH_DUAL_PARABOLOID
    varying highp float dp_clip;
    uniform highp float shadow_dual_paraboloid_render_zfar;
    uniform highp float shadow_dual_paraboloid_render_side;
#endif

/* GLOBALS */

attribute highp vec3 position;
attribute vec3 normal;
attribute vec2 uv;

#if defined(RENDER_DEPTH) && defined(USE_RGBA_SHADOWS)
    varying highp vec4 position_interp;
#endif

varying highp vec3 vertex_interp;
varying vec3 normal_interp;

#if defined(ENABLE_UV_INTERP)
    varying vec2 uv_interp;
#endif

#ifdef USE_SKELETON
    #ifdef USE_SKELETON_SOFTWARE
        attribute highp vec4 bone_transform_row_0; // attrib:13
        attribute highp vec4 bone_transform_row_1; // attrib:14
        attribute highp vec4 bone_transform_row_2; // attrib:15
    #else
        attribute vec4 bone_ids;
        attribute highp vec4 bone_weights;

        uniform highp sampler2D bone_transforms;
        uniform ivec2 skeleton_texture_size;
    #endif
#endif

// helpers
highp mat4 transpose(highp mat4 m) {
    return mat4(
        vec4(m[0].x, m[1].x, m[2].x, m[3].x),
        vec4(m[0].y, m[1].y, m[2].y, m[3].y),
        vec4(m[0].z, m[1].z, m[2].z, m[3].z),
        vec4(m[0].w, m[1].w, m[2].w, m[3].w)
    );
}

highp vec4 texel2DFetch(highp sampler2D tex, ivec2 size, ivec2 coord) {
	float x_coord = float(2 * coord.x + 1) / float(size.x * 2);
	float y_coord = float(2 * coord.y + 1) / float(size.y * 2);

	return texture2DLod(tex, vec2(x_coord, y_coord), 0.0);
}

void main() {
    vec3 VERTEX = position;
    vec3 NORMAL = normal;

    #if defined(ENABLE_UV_INTERP)
        uv_interp = uv;
    #endif

    mat4 WORLD_MATRIX = world_matrix;

    #ifdef USE_SKELETON
        highp mat4 bone_transform = mat4(0.0);

        #ifdef USE_SKELETON_SOFTWARE
            bone_transforms[0] = vec4(bone_transform_row_0.x, bone_transform_row_1.x, bone_transform_row_2.x, 0.0);
            bone_transforms[1] = vec4(bone_transform_row_0.y, bone_transform_row_1.y, bone_transform_row_2.y, 0.0);
            bone_transforms[2] = vec4(bone_transform_row_0.z, bone_transform_row_1.z, bone_transform_row_2.z, 0.0);
            bone_transforms[3] = vec4(bone_transform_row_0.w, bone_transform_row_1.w, bone_transform_row_2.w, 1.0);
        #else
            {
                for (int i = 0; i < 4; i++) {
                    ivec2 tex_ofs = ivec2(int(bone_ids[i]) * 3, 0);

                    highp mat4 b = mat4(
                        texel2DFetch(bone_transforms, skeleton_texture_size, tex_ofs + ivec2(0, 0)),
                        texel2DFetch(bone_transforms, skeleton_texture_size, tex_ofs + ivec2(1, 0)),
                        texel2DFetch(bone_transforms, skeleton_texture_size, tex_ofs + ivec2(2, 0)),
                        vec4(0.0, 0.0, 0.0, 1.0)
                    );

                    bone_transform += transpose(b) * bone_weights[i];
                }
            }
        #endif

        WORLD_MATRIX = WORLD_MATRIX * bone_transform;
    #endif

    #ifdef USE_INSTANCING
        vec4 instance_custom = vec4(0.0);
    #else
        vec4 instance_custom = vec4(0.0);
    #endif

    mat4 MODELVIEW_MATRIX = INV_CAMERA_MATRIX * WORLD_MATRIX;

    float POINT_SIZE = 1.0;

    /* VERTEX_CODE_BEGIN */
    /* VERTEX_CODE_END */

    gl_PointSize = POINT_SIZE;

    vec4 vertex = MODELVIEW_MATRIX * vec4(VERTEX, 1.0);
    NORMAL = normalize((MODELVIEW_MATRIX * vec4(NORMAL, 0.0)).xyz);

    vertex_interp = vertex.xyz;
    normal_interp = NORMAL;

    #ifdef RENDER_DEPTH
        #ifdef RENDER_DEPTH_DUAL_PARABOLOID
            vertex.z *= shadow_dual_paraboloid_render_side;
            normal_interp.z *= shadow_dual_paraboloid_render_side;

            dp_clip = vertex.z;

            highp vec3 vtx = vertex.xyz + normalize(vertex_interp) * light_bias;
            highp float distance = length(vtx);
            vtx = normalize(vtx);
            vtx.xy /= 1.0 - vtx.z;
            vtx.z = (distance / shadow_dual_paraboloid_render_zfar);
            vtx.z = vtx.z * 2.0 - 1.0;

            vertex.xyz = vtx;
        #else
            float z_ofs = light_bias;
            z_ofs += (1.0 - abs(normal_interp.z)) * light_normal_bias;

            vertex.z -= z_ofs;
        #endif
    #endif

    #if defined(USE_SHADOW) && defined(USE_LIGHTING)
        vec4 vi4 = vec4(vertex_interp, 1.0);
        shadow_coord = light_shadow_matrix * vi4;
    #endif

    gl_Position = PROJECTION_MATRIX * vec4(vertex.xyz, 1.0);

    #if defined(RENDER_DEPTH) && defined(USE_RGBA_SHADOWS)
        position_interp = gl_Position;
    #endif
}
