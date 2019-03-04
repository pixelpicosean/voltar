/**
 * @param gl {WebGLRenderingContext} The current WebGL context
 * @param attribs {any}
 * @param state {any}
 */
export default function setVertexAttribArrays(gl, attribs, state) {
    var i = 0;
    if (state) {
        var tempAttribState = state.tempAttribState,
            attribState = state.attribState;

        for (i = 0; i < tempAttribState.length; i++) {
            tempAttribState[i] = false;
        }

        // set the new attribs
        for (i = 0; i < attribs.length; i++) {
            tempAttribState[attribs[i].attribute.location] = true;
        }

        for (i = 0; i < attribState.length; i++) {
            if (attribState[i] !== tempAttribState[i]) {
                attribState[i] = tempAttribState[i];

                if (state.attribState[i]) {
                    gl.enableVertexAttribArray(i);
                } else {
                    gl.disableVertexAttribArray(i);
                }
            }
        }

    } else {
        for (i = 0; i < attribs.length; i++) {
            var attrib = attribs[i];
            gl.enableVertexAttribArray(attrib.attribute.location);
        }
    }
};
