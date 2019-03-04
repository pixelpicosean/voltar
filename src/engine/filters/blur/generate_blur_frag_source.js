const GAUSSIAN_VALUES = {
    5: [0.153388, 0.221461, 0.250301],
    7: [0.071303, 0.131514, 0.189879, 0.214607],
    9: [0.028532, 0.067234, 0.124009, 0.179044, 0.20236],
    11: [0.0093, 0.028002, 0.065984, 0.121703, 0.175713, 0.198596],
    13: [0.002406, 0.009255, 0.027867, 0.065666, 0.121117, 0.174868, 0.197641],
    15: [0.000489, 0.002403, 0.009246, 0.02784, 0.065602, 0.120999, 0.174697, 0.197448],
};

const frag_template = `
    varying vec2 v_blur_tex_coords[%size%];
    uniform sampler2D u_sampler;

    void main(void) {
        gl_FragColor = vec4(0.0);
        %blur%
    }
`;

/**
 * @param {number} kernel_size
 */
export default function generate_frag_blur_source(kernel_size) {
    const kernel = GAUSSIAN_VALUES[kernel_size];
    const halfLength = kernel.length;

    let frag_source = frag_template;

    let blur_loop = '';
    const template = 'gl_FragColor += texture2D(u_sampler, v_blur_tex_coords[%index%]) * %value%;';
    let value;
    for (let i = 0; i < kernel_size; i++) {
        let blur = template.replace('%index%', `${i}`);

        value = i;

        if (i >= halfLength) {
            value = kernel_size - i - 1;
        }

        blur = blur.replace('%value%', kernel[value]);

        blur_loop += blur;
        blur_loop += '\n';
    }

    frag_source = frag_source.replace('%blur%', blur_loop);
    frag_source = frag_source.replace('%size%', `${kernel_size}`);

    return frag_source;
}
