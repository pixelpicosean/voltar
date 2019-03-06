const vert_template = `
    attribute vec2 a_vertex_position;
    attribute vec2 a_texture_coord;

    uniform float strength;
    uniform mat3 projection_matrix;

    varying vec2 v_blur_tex_coords[%size%];

    void main(void) {
        gl_Position = vec4((projection_matrix * vec3((a_vertex_position), 1.0)).xy, 0.0, 1.0);
        %blur%
    }
`;

/**
 * @param {number} kernel_size
 * @param {boolean} invert_uv
 */
export default function generate_vert_blur_source(kernel_size, invert_uv = false) {
    const half_length = Math.ceil(kernel_size / 2);

    let vert_source = vert_template;

    let blur_loop = '';
    let template;

    if (invert_uv) {
        template = 'v_blur_tex_coords[%index%] = a_texture_coord + vec2(%sample_index% * strength, 0.0);';
    } else {
        template = 'v_blur_tex_coords[%index%] = a_texture_coord + vec2(0.0, %sample_index% * strength);';
    }

    for (let i = 0; i < kernel_size; i++) {
        let blur = template.replace('%index%', `${i}`);

        blur = blur.replace('%sample_index%', `${i - (half_length - 1)}.0`);

        blur_loop += blur;
        blur_loop += '\n';
    }

    vert_source = vert_source.replace('%blur%', blur_loop);
    vert_source = vert_source.replace('%size%', `${kernel_size}`);

    return vert_source;
}
