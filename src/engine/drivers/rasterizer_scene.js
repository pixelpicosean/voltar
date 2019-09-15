export class RasterizerScene {
    constructor() {
        /** @type {import('./rasterizer_storage').RasterizerStorage} */
        this.storage = null;

        // private
        this.gl = null;
    }

    /**
     * @param {WebGLRenderingContext} gl
     */
    initialize(gl) {
        this.context_change(gl);
    }
    /**
     * @param {WebGLRenderingContext} gl
     */
    context_change(gl) {
        this.gl = gl;
    }

    free_rid(p_rid) {
        return false;
    }
    update() { }

    iteration() { }
}
