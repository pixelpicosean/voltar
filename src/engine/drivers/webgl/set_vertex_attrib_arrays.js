/**
 * @param gl {WebGLRenderingContext} The current WebGL context
 * @param attribs {any}
 * @param state {{ temp_attrib_state: boolean[], attrib_state: boolean[] }}
 */
export default function set_vertex_attrib_arrays(gl, attribs, state) {
    let i = 0;
    if (state) {
        const temp_attrib_state = state.temp_attrib_state,
            attrib_state = state.attrib_state;

        for (i = 0; i < temp_attrib_state.length; i++) {
            temp_attrib_state[i] = false;
        }

        // set the new attribs
        for (i = 0; i < attribs.length; i++) {
            temp_attrib_state[attribs[i].attribute.location] = true;
        }

        for (i = 0; i < attrib_state.length; i++) {
            if (attrib_state[i] !== temp_attrib_state[i]) {
                attrib_state[i] = temp_attrib_state[i];

                if (state.attrib_state[i]) {
                    gl.enableVertexAttribArray(i);
                } else {
                    gl.disableVertexAttribArray(i);
                }
            }
        }
    } else {
        for (i = 0; i < attribs.length; i++) {
            const attrib = attribs[i];
            gl.enableVertexAttribArray(attrib.attribute.location);
        }
    }
}
