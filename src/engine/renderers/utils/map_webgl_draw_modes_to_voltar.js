import { DRAW_MODES } from 'engine/const';

/**
 * Generic Mask Stack data structure.
 *
 * @param {WebGLRenderingContext} gl - The current WebGL drawing context
 * @param {Object<number, number>} [object] - The object to map into
 */
export default function map_webgl_draw_modes_to_voltar(gl, object = {}) {
    object[DRAW_MODES.POINTS] = gl.POINTS;
    object[DRAW_MODES.LINES] = gl.LINES;
    object[DRAW_MODES.LINE_LOOP] = gl.LINE_LOOP;
    object[DRAW_MODES.LINE_STRIP] = gl.LINE_STRIP;
    object[DRAW_MODES.TRIANGLES] = gl.TRIANGLES;
    object[DRAW_MODES.TRIANGLE_STRIP] = gl.TRIANGLE_STRIP;
    object[DRAW_MODES.TRIANGLE_FAN] = gl.TRIANGLE_FAN;

    return object;
}
