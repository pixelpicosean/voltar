/**
 * @param {HTMLCanvasElement} canvas
 * @param {any} [options]
 */
export default function(canvas, options) {
    const gl = canvas.getContext('webgl', options) ||
        canvas.getContext('experimental-webgl', options);

    if (!gl) {
        // fail, not able to get a context
        throw new Error('This browser does not support webGL. Try using the canvas renderer');
    }

    return gl;
}
