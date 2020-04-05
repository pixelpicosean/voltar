uniform highp mat4 projection_matrix;
uniform highp mat3 item_matrix;
uniform highp float TIME;

attribute highp vec2 position;
attribute highp vec2 uv;
attribute lowp vec4 color;

attribute highp vec4 instance_xform0;
attribute highp vec4 instance_xform1;
attribute highp vec4 instance_xform2;
attribute lowp vec4 instance_color;
attribute highp vec4 instance_custom_data;

varying vec4 color_interp;
varying vec2 uv_interp;
varying vec4 instance_custom;

highp mat4 transpose(in highp mat4 in_mat) {
    highp vec4 i0 = in_mat[0];
    highp vec4 i1 = in_mat[1];
    highp vec4 i2 = in_mat[2];
    highp vec4 i3 = in_mat[3];

    highp mat4 out_mat = mat4(
        vec4(i0.x, i1.x, i2.x, i3.x),
        vec4(i0.y, i1.y, i2.y, i3.y),
        vec4(i0.z, i1.z, i2.z, i3.z),
        vec4(i0.w, i1.w, i2.w, i3.w)
    );

    return out_mat;
}

void main() {
    mat4 real_item_matrix = mat4(
        vec4(item_matrix[0], 0.0),
        vec4(item_matrix[1], 0.0),
        vec4(  0.0, 0.0, 1.0, 0.0),
        vec4(item_matrix[2], 1.0)
    );
    mat4 instance_matrix = transpose(
        mat4(
            instance_xform0,
            instance_xform1,
            instance_xform2,
            vec4(0.0, 0.0, 0.0, 1.0)
        )
    );

    gl_Position = projection_matrix * real_item_matrix * instance_matrix * vec4(position, 0.0, 1.0);

    color_interp = color * instance_color;
    uv_interp = uv;
    instance_custom = instance_custom_data;
}
