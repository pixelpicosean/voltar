/**
 * @param {WebGLRenderingContext} gl
 */
export default function get_max_kernel_size(gl) {
    const max_varyings = (gl.getParameter(gl.MAX_VARYING_VECTORS));
    let kernel_size = 15;

    while (kernel_size > max_varyings) {
        kernel_size -= 2;
    }

    return kernel_size;
}
